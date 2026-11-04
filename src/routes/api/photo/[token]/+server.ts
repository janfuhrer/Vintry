import { json } from '@sveltejs/kit';
import { APP_URL } from '$app/env/private';
import { preparePhoto, uploadFor } from '#lib/server/photo-uploads.ts';
import { allow } from '#lib/server/ratelimit.ts';
import { setPhoto } from '#lib/server/wines.ts';
import type { RequestHandler } from './$types';

// the server's body limit is 2 MB; the MCP instructions ask for photos resized to 2000 px
const MAX_UPLOAD = 2_000_000;

/**
 * A label photo for one wine, sent to the link add_wines or update_wines gave out:
 * `curl -T label.jpg -H "content-type: image/jpeg" "<link>?side=back"`. The link is the
 * authorisation, for an hour. The raw file as the body with its image type: SvelteKit refuses
 * a form, or a body without a type, when no Origin header comes along.
 */
const upload: RequestHandler = async ({ params, request, url }) => {
	const link = await uploadFor(params.token);
	if (!link) return json({ error: 'This upload link is unknown or has expired.' }, { status: 404 });
	if (!allow(`photo:${link.user_id}`)) return json({ error: 'Too many photos at once.' }, { status: 429 });
	const side = url.searchParams.get('side') ?? 'front';
	if (side !== 'front' && side !== 'back') return json({ error: 'side is front or back.' }, { status: 400 });
	const file = Buffer.from(await request.arrayBuffer());
	if (!file.length) return json({ error: 'Send the photo file as the request body.' }, { status: 400 });
	if (file.length > MAX_UPLOAD)
		return json({ error: 'Resize the photo to 2000 px first (at most 2 MB).' }, { status: 413 });
	const photo = await preparePhoto(file);
	if (!photo)
		return json({ error: 'Not an image Vintry can read: send JPEG, PNG or WebP.' }, { status: 400 });
	if (!(await setPhoto(link.user_id, link.wine_id, side, photo)))
		return json({ error: 'The wine is gone.' }, { status: 404 });
	return json({ ok: true, side, url: `${APP_URL}/wine/${link.wine_id}` });
};

export const PUT = upload;
export const POST = upload;
