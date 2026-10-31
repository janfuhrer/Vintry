import { verifyRegistrationResponse, type RegistrationResponseJSON } from '@simplewebauthn/server';
import { createSession, takeChallenge } from '#lib/server/auth.ts';
import { sql } from '#lib/server/db.ts';
import { expectedOrigin, rpID } from '#lib/server/webauthn.ts';
import type { RequestHandler } from './$types';

const fail = (error = 'failed') => Response.json({ ok: false, error }, { status: 400 });

function deviceLabel(ua: string | null): string {
	if (!ua) return 'Passkey';
	if (/iPhone/.test(ua)) return 'iPhone';
	if (/iPad/.test(ua)) return 'iPad';
	if (/Android/.test(ua)) return 'Android';
	if (/Macintosh/.test(ua)) return 'Mac';
	if (/Windows/.test(ua)) return 'Windows';
	if (/Linux/.test(ua)) return 'Linux';
	return 'Passkey';
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const challenge = await takeChallenge(cookies, 'register');
	if (!challenge?.invite_id || !challenge.pending_webauthn_id) return fail();

	let body: RegistrationResponseJSON;
	try {
		body = await request.json();
	} catch {
		return fail();
	}

	let info;
	try {
		const result = await verifyRegistrationResponse({
			response: body,
			expectedChallenge: challenge.challenge,
			expectedOrigin,
			expectedRPID: rpID,
			// options ask for 'preferred'; a security key without PIN must still work
			requireUserVerification: false
		});
		if (!result.verified) return fail();
		info = result.registrationInfo;
	} catch {
		return fail();
	}

	const { credential } = info;
	const label = deviceLabel(request.headers.get('user-agent'));

	const userId = await sql.begin(async (tx) => {
		// atomic: a link works exactly once, even with parallel requests
		const [invite] = await tx<{ for_user: string | null; is_admin: boolean }[]>`
			update invites set used_at = now()
			where id = ${challenge.invite_id} and used_at is null and expires_at > now()
			returning for_user, is_admin
		`;
		if (!invite) return null;

		let id = invite.for_user;
		if (!id) {
			[{ id }] = await tx<{ id: string }[]>`
				insert into users (name, webauthn_id, is_admin)
				values (${challenge.pending_name ?? 'Me'}, ${challenge.pending_webauthn_id}, ${invite.is_admin})
				returning id
			`;
		}
		await tx`
			insert into credentials (id, user_id, public_key, counter, transports, label)
			values (
				${credential.id}, ${id}, ${Buffer.from(credential.publicKey)}::bytea, ${credential.counter},
				${credential.transports ?? []}::text[], ${label}
			)
		`;
		return id;
	});
	if (!userId) return fail('invite');

	await createSession(cookies, userId);
	return Response.json({ ok: true });
};
