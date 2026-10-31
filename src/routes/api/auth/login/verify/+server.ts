import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from '@simplewebauthn/server';
import { createSession, takeChallenge } from '#lib/server/auth.ts';
import { sql } from '#lib/server/db.ts';
import { expectedOrigin, rpID } from '#lib/server/webauthn.ts';
import type { RequestHandler } from './$types';

const fail = () => Response.json({ ok: false }, { status: 400 });

export const POST: RequestHandler = async ({ request, cookies }) => {
	const challenge = await takeChallenge(cookies, 'login');
	if (!challenge) return fail();

	let body: AuthenticationResponseJSON;
	try {
		body = await request.json();
	} catch {
		return fail();
	}
	if (typeof body?.id !== 'string') return fail();

	const [cred] = await sql<
		{ id: string; user_id: string; public_key: Buffer; counter: number; transports: string[] }[]
	>`select id, user_id, public_key, counter, transports from credentials where id = ${body.id}`;
	if (!cred) return fail();

	try {
		const { verified, authenticationInfo } = await verifyAuthenticationResponse({
			response: body,
			expectedChallenge: challenge.challenge,
			expectedOrigin,
			expectedRPID: rpID,
			credential: {
				id: cred.id,
				publicKey: new Uint8Array(cred.public_key),
				counter: cred.counter,
				transports: cred.transports
			}
		});
		if (!verified) return fail();
		await sql`
			update credentials set counter = ${authenticationInfo.newCounter}, last_used_at = now()
			where id = ${cred.id}
		`;
	} catch {
		return fail();
	}

	await createSession(cookies, cred.user_id);
	return Response.json({ ok: true });
};
