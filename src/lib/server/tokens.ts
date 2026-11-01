// Personal access tokens: how an app such as Claude acts for a user over MCP, without a passkey.
import { hashToken, newToken, type SessionUser } from './auth.ts';
import { sql } from './db.ts';

const PREFIX = 'vintry_';
const MAX_TOKENS = 10;

export interface TokenInfo {
	id: string;
	label: string;
	created_at: Date;
	last_used_at: Date | null;
}

/** A new token for the user, shown once; only its hash is stored. Null when they have too many. */
export async function createToken(userId: string, label: string): Promise<string | null> {
	const token = PREFIX + newToken();
	const [row] = await sql<{ id: string }[]>`
		insert into api_tokens (id, user_id, label)
		select ${hashToken(token)}, ${userId}, ${label}
		where (select count(*) from api_tokens where user_id = ${userId}) < ${MAX_TOKENS}
		returning id
	`;
	return row ? token : null;
}

/** The id is a hash of the token: a handle for revoking, useless for signing in */
export async function listTokens(userId: string): Promise<TokenInfo[]> {
	return sql<TokenInfo[]>`
		select id, label, created_at, last_used_at from api_tokens
		where user_id = ${userId} order by created_at desc
	`;
}

export async function revokeToken(userId: string, id: string) {
	await sql`delete from api_tokens where id = ${id} and user_id = ${userId}`;
}

export async function userForToken(token: string): Promise<SessionUser | null> {
	if (!token.startsWith(PREFIX) || token.length > 100) return null;
	const id = hashToken(token);
	const [user] = await sql<SessionUser[]>`
		select u.id, u.name, u.is_admin, u.locale from api_tokens t join users u on u.id = t.user_id
		where t.id = ${id}
	`;
	if (!user) return null;
	// for "last used" in settings; once a minute is plenty
	await sql`
		update api_tokens set last_used_at = now()
		where id = ${id} and (last_used_at is null or last_used_at < now() - interval '1 minute')
	`;
	return user;
}
