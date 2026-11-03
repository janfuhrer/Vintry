import { json } from '@sveltejs/kit';
import { APP_URL } from '$app/env/private';
import { allow } from '#lib/server/ratelimit.ts';
import { addPhoto } from '#lib/server/scans.ts';
import { userForToken } from '#lib/server/tokens.ts';
import type { RequestHandler } from './$types';

// the Shortcut resizes to 2000 px, one photo per request; as Base64 it must fit the 2 MB limit
const MAX_PHOTO = 1_450_000;

/**
 * A label photo and the text Live Text read from it, sent by the iPhone Shortcut. Like the MCP
 * endpoint, only a personal access token counts, never the browser's session.
 *
 * JSON with the photo as Base64, not a form: SvelteKit refuses form posts without an Origin
 * header as cross-site, and a Shortcut sends none.
 */
export const POST: RequestHandler = async ({ request }) => {
	const token = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
	const user = token ? await userForToken(token) : null;
	if (!user)
		return json(
			{ error: 'A personal access token from Vintry settings is required.' },
			{ status: 401, headers: { 'www-authenticate': 'Bearer realm="vintry"' } }
		);
	if (!allow(`scan:${user.id}`)) return json({ error: 'Too many photos at once.' }, { status: 429 });
	const body = await request.json().catch(() => null);
	const text = body?.text;
	const batch = String(body?.batch ?? '').slice(0, 64) || new Date().toISOString().slice(0, 16);
	// Base64 from the Shortcut may carry line breaks; Buffer skips them
	const bytes = typeof body?.image === 'string' ? Buffer.from(body.image, 'base64') : Buffer.alloc(0);
	if (!bytes.length || bytes.length > MAX_PHOTO)
		return json({ error: 'Send the photo Base64-encoded as "image", resized to 2000 px.' }, { status: 400 });
	if (!(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff))
		return json({ error: 'Convert the photo to JPEG in the Shortcut.' }, { status: 400 });
	const saved = await addPhoto(user.id, batch, bytes, typeof text === 'string' ? text.slice(0, 10_000) : '');
	if (!saved) return json({ error: 'Ten scans are already waiting in Vintry.' }, { status: 429 });
	return json({ ok: true, side: saved.side, open: `${APP_URL}/add` });
};
