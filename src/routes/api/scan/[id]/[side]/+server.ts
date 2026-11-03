import { error } from '@sveltejs/kit';
import { scanPhoto } from '#lib/server/scans.ts';
import { isUuid } from '#lib/server/wines.ts';
import type { RequestHandler } from './$types';

/** A waiting scan's photo, to its owner */
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!isUuid(params.id) || (params.side !== 'front' && params.side !== 'back')) error(404, 'Not found');
	const data = await scanPhoto(locals.user!.id, params.id, params.side);
	if (!data) error(404, 'Not found');
	return new Response(new Uint8Array(data), {
		headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, no-store' }
	});
};
