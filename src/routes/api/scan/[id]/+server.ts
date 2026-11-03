import { dropScan } from '#lib/server/scans.ts';
import { isUuid } from '#lib/server/wines.ts';
import type { RequestHandler } from './$types';

/** A waiting scan was used or dismissed */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (isUuid(params.id)) await dropScan(locals.user!.id, params.id);
	return new Response(null, { status: 204 });
};
