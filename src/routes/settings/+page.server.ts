import { error, fail, redirect } from '@sveltejs/kit';
import {
	bootstrap,
	createInvite,
	currentSessionId,
	destroySession,
	SESSION_COOKIE
} from '#lib/server/auth.ts';
import { allowance, claudeEnabled, readerOf, setReader } from '#lib/server/claude.ts';
import { deviceLabel } from '#lib/server/device.ts';
import { createToken, listTokens, revokeToken } from '#lib/server/tokens.ts';
import { parseWineForm, withSuggestions } from '#lib/server/wine-form.ts';
import { importWines } from '#lib/server/wines.ts';
import { sql } from '#lib/server/db.ts';
import { isLocale } from '#lib/i18n.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = locals.user!;
	const current = currentSessionId(cookies);
	const sessionRows = await sql<
		{ id: string; user_agent: string | null; created_at: Date; last_seen_at: Date }[]
	>`
		select id, user_agent, created_at, last_seen_at from sessions
		where user_id = ${user.id} and expires_at > now()
		order by last_seen_at desc
	`;
	// the id is a token hash: a handle for revoking, useless for signing in
	const sessions = sessionRows.map((s) => ({
		id: s.id,
		device: deviceLabel(s.user_agent),
		created_at: s.created_at,
		last_seen_at: s.last_seen_at,
		current: s.id === current
	}));
	const passkeys = await sql<
		{ id: string; label: string | null; created_at: Date; last_used_at: Date | null }[]
	>`
		select id, label, created_at, last_used_at from credentials
		where user_id = ${user.id} order by created_at
	`;
	const locations = await sql<{ name: string; wines: number; bottles: number }[]>`
		select location as name, count(*)::int as wines, sum(quantity)::int as bottles from wines
		where user_id = ${user.id} and location is not null
		group by location order by location
	`;
	const claude = claudeEnabled
		? { reader: await readerOf(user.id), allowance: await allowance(user.id) }
		: null;
	const tokens = await listTokens(user.id);
	if (!user.is_admin) return { passkeys, sessions, locations, claude, tokens, admin: null };

	const users = await sql<{ id: string; name: string; is_admin: boolean; created_at: Date; wines: number }[]>`
		select u.id, u.name, u.is_admin, u.created_at,
			(select count(*)::int from wines w where w.user_id = u.id) as wines
		from users u order by u.created_at
	`;
	const invites = await sql<{ id: string; note: string | null; is_admin: boolean; expires_at: Date }[]>`
		select id, note, is_admin, expires_at from invites
		where used_at is null and expires_at > now() and for_user is null and created_by is not null
		order by created_at desc
	`;
	// the id is a token hash: fine to use as a handle, it can't be turned back into a link
	return { passkeys, sessions, locations, claude, tokens, admin: { users, invites, me: user.id } };
};

export const actions: Actions = {
	locale: async ({ request, locals }) => {
		const locale = String((await request.formData()).get('locale'));
		if (!isLocale(locale)) return fail(400);
		await sql`update users set locale = ${locale} where id = ${locals.user!.id}`;
	},
	createToken: async ({ request, locals }) => {
		const label = String((await request.formData()).get('label') ?? '')
			.trim()
			.slice(0, 60);
		const token = await createToken(locals.user!.id, label || 'Claude');
		if (!token) return fail(400, { tokenError: 'tooMany' });
		// shown this once; only a hash is kept
		return { token };
	},
	revokeToken: async ({ request, locals }) => {
		await revokeToken(locals.user!.id, String((await request.formData()).get('id') ?? ''));
	},
	reader: async ({ request, locals }) => {
		const fd = await request.formData();
		const reader = fd.get('reader');
		if (!claudeEnabled || (reader !== 'local' && reader !== 'claude')) return fail(400);
		// photos leave the phone only with an explicit yes
		if (reader === 'claude' && fd.get('consent') !== 'on') return fail(400, { readerError: 'consent' });
		await setReader(locals.user!.id, reader);
	},
	deletePasskey: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id'));
		const userId = locals.user!.id;
		// lock the user's passkeys so two devices can't each delete "one of two"
		const deleted = await sql.begin(async (tx) => {
			const creds = await tx<{ id: string }[]>`
				select id from credentials where user_id = ${userId} for update
			`;
			if (creds.length < 2) return 0;
			const result = await tx`delete from credentials where id = ${id} and user_id = ${userId}`;
			return result.count;
		});
		if (!deleted) return fail(400, { keepOne: true });
	},
	renamePasskey: async ({ request, locals }) => {
		const fd = await request.formData();
		const label =
			String(fd.get('label') ?? '')
				.trim()
				.slice(0, 40) || null;
		await sql`
			update credentials set label = ${label}
			where id = ${String(fd.get('id'))} and user_id = ${locals.user!.id}
		`;
	},
	// "Rack 1" becomes "Basement left" for every wine there; empty takes the place away
	renameLocation: async ({ request, locals }) => {
		const fd = await request.formData();
		const from = String(fd.get('from') ?? '');
		const to =
			String(fd.get('to') ?? '')
				.trim()
				.slice(0, 100) || null;
		if (!from) return fail(400);
		await sql`
			update wines set location = ${to}, updated_at = now()
			where user_id = ${locals.user!.id} and location = ${from}
		`;
	},
	deleteAccount: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const confirm = String((await request.formData()).get('confirm') ?? '').trim();
		if (confirm !== user.name) return fail(400, { deleteAccount: 'confirm' });
		const deleted = await sql.begin(async (tx) => {
			// someone has to be able to invite people: the last admin can't leave others behind
			if (user.is_admin) {
				// lock the admins so two of two can't each see "another admin remains" and both leave
				await tx`select id from users where is_admin for update`;
				const [{ admins, others }] = await tx<{ admins: number; others: number }[]>`
					select count(*) filter (where is_admin)::int as admins,
						count(*) filter (where id <> ${user.id})::int as others
					from users
				`;
				if (admins === 1 && others > 0) return false;
			}
			// wines, drinks, photos, passkeys, sessions and own invites go with the user (on delete cascade)
			await tx`delete from users where id = ${user.id}`;
			return true;
		});
		if (!deleted) return fail(400, { deleteAccount: 'lastAdmin' });
		cookies.delete(SESSION_COOKIE, { path: '/' });
		// an empty instance needs a fresh admin invite, as on first start
		await bootstrap();
		redirect(303, '/login');
	},
	revokeSession: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id'));
		await sql`delete from sessions where id = ${id} and user_id = ${locals.user!.id}`;
	},
	revokeOtherSessions: async ({ locals, cookies }) => {
		const current = currentSessionId(cookies);
		await sql`delete from sessions where user_id = ${locals.user!.id} and id <> ${current ?? ''}`;
	},
	import: async ({ request, locals }) => {
		let rows: unknown;
		const fd = await request.formData();
		// re-importing a sheet (or Vintry's own export) shouldn't double the cellar
		const skipOwned = fd.get('include_owned') !== 'on';
		try {
			rows = JSON.parse(String(fd.get('rows') ?? '[]'));
		} catch {
			return fail(400, { importError: 'format' });
		}
		if (!Array.isArray(rows) || rows.length === 0) return fail(400, { importError: 'empty' });
		if (rows.length > 2000) return fail(400, { importError: 'tooMany' });
		// every row goes through the same validation as the wine form
		const inputs = [];
		const rejected: number[] = [];
		for (const [i, row] of rows.entries()) {
			const fd = new FormData();
			let line = i + 2;
			if (row && typeof row === 'object')
				for (const [k, v] of Object.entries(row)) {
					if (k === '_row')
						line = Number(v) || line; // the spreadsheet row, for the message
					else for (const x of Array.isArray(v) ? v : [v]) if (typeof x === 'string') fd.append(k, x);
				}
			if (!fd.has('quantity')) fd.set('quantity', '1');
			const { input, errors } = parseWineForm(fd);
			if (Object.keys(errors).length) rejected.push(line);
			else inputs.push(withSuggestions(input));
		}
		const { imported, skipped, restocked } = await importWines(locals.user!.id, inputs, { skipOwned });
		return { imported, skipped, restocked, rejected: rejected.slice(0, 20), rejectedCount: rejected.length };
	},
	addDevice: async ({ locals }) => {
		const { url } = await createInvite({ createdBy: locals.user!.id, forUser: locals.user!.id, hours: 24 });
		return { deviceLink: url };
	},
	invite: async ({ request, locals }) => {
		if (!locals.user!.is_admin) error(403, 'Forbidden');
		const fd = await request.formData();
		const note =
			String(fd.get('note') ?? '')
				.trim()
				.slice(0, 100) || undefined;
		const { url } = await createInvite({
			createdBy: locals.user!.id,
			isAdmin: fd.get('is_admin') === 'on',
			note,
			hours: 24 * 7
		});
		return { inviteLink: url };
	},
	deviceLinkFor: async ({ request, locals }) => {
		// for someone who lost their phone: a one-time link to add a passkey to their account
		if (!locals.user!.is_admin) error(403, 'Forbidden');
		const id = String((await request.formData()).get('id'));
		if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(400);
		const [user] = await sql<{ name: string }[]>`select name from users where id = ${id}`;
		if (!user) return fail(404);
		const { url } = await createInvite({
			createdBy: locals.user!.id,
			forUser: id,
			note: 'recovery',
			hours: 24
		});
		return { recoveryLink: url, recoveryFor: user.name };
	},
	makeAdmin: async ({ request, locals }) => {
		if (!locals.user!.is_admin) error(403, 'Forbidden');
		const id = String((await request.formData()).get('id'));
		if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(400);
		await sql`update users set is_admin = true where id = ${id}`;
	},
	revoke: async ({ request, locals }) => {
		if (!locals.user!.is_admin) error(403, 'Forbidden');
		const id = String((await request.formData()).get('id'));
		await sql`delete from invites where id = ${id} and used_at is null`;
	},
	signOut: async ({ cookies }) => {
		await destroySession(cookies);
		redirect(303, '/login');
	}
};
