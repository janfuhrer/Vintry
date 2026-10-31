import { error, fail, redirect } from '@sveltejs/kit';
import { bootstrap, createInvite, destroySession, SESSION_COOKIE } from '#lib/server/auth.ts';
import { sql } from '#lib/server/db.ts';
import { isLocale } from '#lib/i18n.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user!;
	const passkeys = await sql<
		{ id: string; label: string | null; created_at: Date; last_used_at: Date | null }[]
	>`
		select id, label, created_at, last_used_at from credentials
		where user_id = ${user.id} order by created_at
	`;
	if (!user.is_admin) return { passkeys, admin: null };

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
	return { passkeys, admin: { users, invites } };
};

export const actions: Actions = {
	locale: async ({ request, locals }) => {
		const locale = String((await request.formData()).get('locale'));
		if (!isLocale(locale)) return fail(400);
		await sql`update users set locale = ${locale} where id = ${locals.user!.id}`;
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
