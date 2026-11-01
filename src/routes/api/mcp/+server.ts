import { json } from '@sveltejs/kit';
import { APP_URL } from '$app/env/private';
import { handleMessage } from '#lib/server/mcp.ts';
import { allow } from '#lib/server/ratelimit.ts';
import { userForToken } from '#lib/server/tokens.ts';
import type { RequestHandler } from './$types';

// Only the bearer token counts here, never the session cookie: a web page the user visits
// must not be able to use the cellar through their signed-in browser.
const unauthorized = () =>
	json(
		{ error: 'A personal access token from Vintry settings is required.' },
		{ status: 401, headers: { 'www-authenticate': 'Bearer realm="vintry"' } }
	);

/** MCP over Streamable HTTP, stateless: every POST is answered right away, as JSON */
export const POST: RequestHandler = async ({ request }) => {
	// browsers send Origin; apps such as Claude don't. A foreign one is a page trying its luck
	const origin = request.headers.get('origin');
	if (origin && origin !== APP_URL) return json({ error: 'origin not allowed' }, { status: 403 });
	const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
	const user = token ? await userForToken(token) : null;
	if (!user) return unauthorized();
	if (!allow(`mcp:${user.id}`)) return json({ error: 'too many requests' }, { status: 429 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json(
			{ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
			{ status: 400 }
		);
	}
	const batch = Array.isArray(body);
	const answers = [];
	// in order: a later message may build on an earlier one
	for (const msg of (batch ? body : [body]) as unknown[]) {
		const answer = await handleMessage(user.id, msg);
		if (answer) answers.push(answer);
	}
	// only notifications: nothing to say
	if (!answers.length) return new Response(null, { status: 202 });
	return json(batch ? answers : answers[0]);
};

// no server-sent stream and no sessions to end
const notAllowed = () => new Response(null, { status: 405, headers: { allow: 'POST' } });
export const GET = notAllowed;
export const DELETE = notAllowed;
