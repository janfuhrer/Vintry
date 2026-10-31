import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { newToken, setChallengeCookie } from '#lib/server/auth.ts';
import { sql } from '#lib/server/db.ts';
import { rpID } from '#lib/server/webauthn.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	// discoverable credentials: no allowCredentials, the authenticator picks the account
	const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred' });
	const id = newToken();
	await sql`
		insert into challenges (id, challenge, kind, expires_at)
		values (${id}, ${options.challenge}, 'login', now() + interval '5 minutes')
	`;
	setChallengeCookie(cookies, id);
	return Response.json(options);
};
