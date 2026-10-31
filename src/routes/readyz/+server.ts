import { sql } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

/** Readiness: the database answers too. While it doesn't, traffic is held back. */
export const GET: RequestHandler = async () => {
	const headers = { 'content-type': 'text/plain', 'cache-control': 'no-store' };
	try {
		await Promise.race([
			sql`select 1`,
			new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
		]);
		return new Response('ready', { headers });
	} catch {
		return new Response('database unavailable', { status: 503, headers });
	}
};
