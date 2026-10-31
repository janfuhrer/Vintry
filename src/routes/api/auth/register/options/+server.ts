import { generateRegistrationOptions } from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { randomBytes } from 'node:crypto';
import { findInvite, newToken, setChallengeCookie } from '#lib/server/auth.ts';
import { sql } from '#lib/server/db.ts';
import { rpID, rpName } from '#lib/server/webauthn.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { token?: unknown; name?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ ok: false }, { status: 400 });
	}
	const invite = typeof body.token === 'string' ? await findInvite(body.token) : null;
	if (!invite) return Response.json({ ok: false, error: 'invite' }, { status: 400 });

	let userName: string;
	let webauthnId: string;
	let exclude: { id: string; transports: string[] }[] = [];

	if (invite.for_user) {
		// adding a device to an existing account
		const [user] = await sql<{ name: string; webauthn_id: string }[]>`
			select name, webauthn_id from users where id = ${invite.for_user}
		`;
		if (!user) return Response.json({ ok: false, error: 'invite' }, { status: 400 });
		userName = user.name;
		webauthnId = user.webauthn_id;
		exclude = await sql<{ id: string; transports: string[] }[]>`
			select id, transports from credentials where user_id = ${invite.for_user}
		`;
	} else {
		const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
		if (!name) return Response.json({ ok: false, error: 'name' }, { status: 400 });
		userName = name;
		webauthnId = isoBase64URL.fromBuffer(randomBytes(32));
	}

	const options = await generateRegistrationOptions({
		rpName,
		rpID,
		userName,
		userDisplayName: userName,
		userID: isoBase64URL.toBuffer(webauthnId),
		attestationType: 'none',
		excludeCredentials: exclude.map((c) => ({ id: c.id, transports: c.transports })),
		authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }
	});

	const id = newToken();
	await sql`
		insert into challenges (id, challenge, kind, invite_id, user_id, pending_name, pending_webauthn_id, expires_at)
		values (
			${id}, ${options.challenge}, 'register', ${invite.id}, ${invite.for_user},
			${invite.for_user ? null : userName}, ${webauthnId}, now() + interval '5 minutes'
		)
	`;
	setChallengeCookie(cookies, id);
	return Response.json(options);
};
