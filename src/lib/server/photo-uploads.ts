// Label photos sent over MCP. A model can't write a photo into a tool call, so add_wines and
// update_wines hand out a link per wine; the app (Claude Code, a script) uploads the file there.
import { APP_URL } from '$app/env/private';
import { hashToken, newToken } from './auth.ts';
import { sql } from './db.ts';

const VALID_MINUTES = 60;
/** what the app stores, as the add form makes it in the browser */
const PHOTO_PX = 1280;
const THUMB_PX = 320;

/** A link for the wine's photos, valid for an hour, for front and back alike */
export async function uploadLink(userId: string, wineId: string): Promise<string> {
	const token = newToken();
	await sql`
		insert into photo_uploads (token_hash, user_id, wine_id, expires_at)
		values (${hashToken(token)}, ${userId}, ${wineId}, now() + make_interval(mins => ${VALID_MINUTES}::int))
	`;
	return `${APP_URL}/api/photo/${token}`;
}

export async function uploadFor(token: string): Promise<{ user_id: string; wine_id: string } | null> {
	if (!/^[\w-]{20,100}$/.test(token)) return null;
	const [row] = await sql<{ user_id: string; wine_id: string }[]>`
		select user_id, wine_id from photo_uploads where token_hash = ${hashToken(token)} and expires_at > now()
	`;
	return row ?? null;
}

/**
 * Any photo sharp reads (JPEG, PNG, WebP…) → the stored JPEG and its thumbnail, turned upright
 * as the camera noted. Null when it isn't an image.
 */
export async function preparePhoto(file: Buffer): Promise<{ image: Buffer; thumb: Buffer } | null> {
	// loaded here, not at start: should the native library fail, only uploads fail with it
	const { default: sharp } = await import('sharp');
	try {
		const upright = sharp(file, { limitInputPixels: 100_000_000 }).rotate();
		const image = await upright
			.resize(PHOTO_PX, PHOTO_PX, { fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality: 82, mozjpeg: true })
			.toBuffer();
		const thumb = await sharp(image)
			.resize(THUMB_PX, THUMB_PX, { fit: 'inside', withoutEnlargement: true })
			.jpeg({ quality: 75, mozjpeg: true })
			.toBuffer();
		return { image, thumb };
	} catch {
		return null;
	}
}
