import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { dev } from '$app/env';
import { APP_URL } from '$app/env/private';
import { sql } from './db';

export interface SessionUser {
	id: string;
	name: string;
	is_admin: boolean;
	locale: 'en' | 'de';
}

export const SESSION_COOKIE = dev ? 'vintry' : '__Host-vintry';
export const CHALLENGE_COOKIE = dev ? 'vintry-challenge' : '__Host-vintry-challenge';

const SESSION_DAYS = 30;
const DAY = 86_400_000;

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

const cookieOptions = (maxAge: number) =>
	({ path: '/', httpOnly: true, secure: !dev, sameSite: 'lax', maxAge }) as const;

export async function createSession(cookies: Cookies, userId: string, userAgent?: string | null) {
	const token = newToken();
	await sql`
		insert into sessions (id, user_id, expires_at, user_agent)
		values (
			${hashToken(token)}, ${userId}, ${new Date(Date.now() + SESSION_DAYS * DAY)},
			${userAgent?.slice(0, 300) ?? null}
		)
	`;
	cookies.set(SESSION_COOKIE, token, cookieOptions((SESSION_DAYS * DAY) / 1000));
}

export async function readSession(cookies: Cookies): Promise<SessionUser | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const id = hashToken(token);
	const [row] = await sql<(SessionUser & { expires_at: Date })[]>`
		select u.id, u.name, u.is_admin, u.locale, s.expires_at
		from sessions s join users u on u.id = s.user_id
		where s.id = ${id} and s.expires_at > now()
	`;
	if (!row) {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		return null;
	}
	// sliding expiry, refreshed at most once a day
	if (row.expires_at.getTime() - Date.now() < (SESSION_DAYS - 1) * DAY) {
		await sql`
			update sessions set expires_at = ${new Date(Date.now() + SESSION_DAYS * DAY)}, last_seen_at = now()
			where id = ${id}
		`;
		cookies.set(SESSION_COOKIE, token, cookieOptions((SESSION_DAYS * DAY) / 1000));
	}
	const { expires_at: _, ...user } = row;
	return user;
}

export async function destroySession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await sql`delete from sessions where id = ${hashToken(token)}`;
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Challenge ids live in a short-lived httpOnly cookie; the row is single use. */
export function setChallengeCookie(cookies: Cookies, id: string) {
	cookies.set(CHALLENGE_COOKIE, id, cookieOptions(300));
}

export async function takeChallenge(cookies: Cookies, kind: 'register' | 'login') {
	const id = cookies.get(CHALLENGE_COOKIE);
	cookies.delete(CHALLENGE_COOKIE, { path: '/' });
	if (!id) return null;
	const [row] = await sql<
		{
			challenge: string;
			invite_id: string | null;
			user_id: string | null;
			pending_name: string | null;
			pending_webauthn_id: string | null;
		}[]
	>`
		delete from challenges
		where id = ${id} and kind = ${kind} and expires_at > now()
		returning challenge, invite_id, user_id, pending_name, pending_webauthn_id
	`;
	return row ?? null;
}

export interface Invite {
	id: string;
	for_user: string | null;
	for_user_name: string | null;
	is_admin: boolean;
}

export async function findInvite(token: string): Promise<Invite | null> {
	const [row] = await sql<Invite[]>`
		select i.id, i.for_user, u.name as for_user_name, i.is_admin
		from invites i left join users u on u.id = i.for_user
		where i.id = ${hashToken(token)} and i.used_at is null and i.expires_at > now()
	`;
	return row ?? null;
}

export async function createInvite(opts: {
	createdBy: string | null;
	forUser?: string;
	isAdmin?: boolean;
	note?: string;
	hours: number;
}) {
	const token = newToken();
	await sql`
		insert into invites (id, created_by, for_user, is_admin, note, expires_at)
		values (
			${hashToken(token)}, ${opts.createdBy}, ${opts.forUser ?? null}, ${opts.isAdmin ?? false},
			${opts.note ?? null}, ${new Date(Date.now() + opts.hours * 3_600_000)}
		)
	`;
	return { token, url: `${APP_URL}/invite/${token}` };
}

/** On an empty database, print a one-time admin invite to the log. */
export async function bootstrap() {
	const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from users`;
	if (count > 0) return;
	await sql`delete from invites where created_by is null and used_at is null`;
	const { url } = await createInvite({ createdBy: null, isAdmin: true, note: 'bootstrap', hours: 24 });
	console.log(`[vintry] No users yet. Open this link within 24 h to create the admin account:\n${url}`);
}

/**
 * Recovery when someone lost every passkey, the only admin included: with RECOVERY_USER set,
 * start-up logs a one-time "add a device" link for that user. Needs access to the hosting's
 * environment and logs, which is the point.
 */
export async function recoveryLink(name: string | undefined) {
	if (!name) return;
	const users = await sql<{ id: string; name: string }[]>`
		select id, name from users where lower(name) = lower(${name})
	`;
	if (users.length !== 1) {
		console.log(
			`[vintry] RECOVERY_USER: ${users.length ? 'several' : 'no'} users named "${name}"; no link created.`
		);
		return;
	}
	const { url } = await createInvite({ createdBy: null, forUser: users[0].id, note: 'recovery', hours: 24 });
	console.log(
		`[vintry] Recovery for "${users[0].name}": open this link within 24 h on the new device, then remove RECOVERY_USER:\n${url}`
	);
}

export async function cleanup() {
	await sql`delete from sessions where expires_at < now()`;
	await sql`delete from challenges where expires_at < now()`;
	await sql`delete from invites where used_at is null and expires_at < now() - interval '30 days'`;
	// scans from the iPhone Shortcut that were never used
	await sql`delete from pending_scans where created_at < now() - interval '2 days'`;
	await sql`delete from photo_uploads where expires_at < now()`;
}

/** The id (token hash) of the current request's session, to mark "this device" */
export function currentSessionId(cookies: Cookies): string | null {
	const token = cookies.get(SESSION_COOKIE);
	return token ? hashToken(token) : null;
}
