import type { RequestHandler } from './$types';

/** Liveness: the process answers. No database check, so a database outage doesn't restart the app. */
export const GET: RequestHandler = () =>
	new Response('ok', { headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' } });
