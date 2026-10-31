import { error, fail, redirect } from '@sveltejs/kit';
import { createInvite, destroySession } from '#lib/server/auth.ts';
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
