import { error } from '@sveltejs/kit';
import { sql } from '#lib/server/db.ts';
import { isUuid } from '#lib/server/wines.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	if (!isUuid(params.id)) error(404, 'Not found');
	const thumb = url.searchParams.get('s') === 't';
	const [row] = await sql<{ data: Buffer }[]>`
		select ${thumb ? sql`p.thumb` : sql`p.image`} as data
		from wine_photos p join wines w on w.id = p.wine_id
		where p.wine_id = ${params.id} and w.user_id = ${locals.user!.id}
	`;
	if (!row) error(404, 'Not found');
	return new Response(new Uint8Array(row.data), {
		headers: {
			'content-type': 'image/jpeg',
			// the URL carries the photo version, so it never changes
			'cache-control': 'private, max-age=31536000, immutable'
		}
	});
};
