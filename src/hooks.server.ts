import { loadReference } from '#lib/server/reference.ts';
import { redirect, type RequestEvent } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/env';
import { RECOVERY_USER } from '$app/env/private';
import { bootstrap, cleanup, readSession, recoveryLink } from '#lib/server/auth.ts';
import { closeDb, migrate } from '#lib/server/db.ts';
import { allow } from '#lib/server/ratelimit.ts';
import { pickLocale } from '#lib/i18n.ts';

export const init: ServerInit = async () => {
	if (building) return;
	await migrate();
	await bootstrap();
	await recoveryLink(RECOVERY_USER);
	// in the background: the app works without it, and a first load takes a few seconds
	loadReference().catch((e) => console.error('[vintry] loading the reference list failed', e));
	setInterval(() => cleanup().catch((e) => console.error('[vintry] cleanup failed', e)), 3_600_000).unref();
	// adapter-node closes the HTTP server on SIGTERM and then emits this. Open database
	// connections would keep Node alive until the platform kills it at the end of its grace
	// period, so every rollout would wait the full timeout.
	process.once('sveltekit:shutdown', () => {
		closeDb().catch((e) => console.error('[vintry] closing the database failed', e));
	});
};

const PUBLIC_PREFIXES = [
	'/login',
	'/invite/',
	'/api/auth/',
	// a photo upload link from MCP carries its own one-hour token
	'/api/photo/',
	'/icons/',
	'/ocr/',
	'/_app/',
	'/screenshots/'
];
// /api/mcp checks its own bearer token instead of the session cookie
const PUBLIC_FILES = new Set([
	'/api/mcp',
	// the iPhone Shortcut's upload checks its own bearer token too
	'/api/scan',
	'/manifest.webmanifest',
	'/favicon.svg',
	'/logo.svg',
	'/robots.txt',
	'/healthz',
	'/readyz',
	'/service-worker.js'
]);

/**
 * adapter-node throws when ADDRESS_HEADER is configured but the proxy didn't send it.
 * Without a real address the limiter is skipped: one shared bucket would let a single
 * script lock every user out of sign-in.
 */
function clientAddress(event: RequestEvent): string | null {
	try {
		return event.getClientAddress();
	} catch {
		return null;
	}
}

const isPublic = (path: string) =>
	PUBLIC_FILES.has(path) || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	const address = path.startsWith('/api/auth/') ? clientAddress(event) : null;
	if (address && !allow(address)) {
		return new Response('Too many requests', { status: 429, headers: { 'retry-after': '60' } });
	}

	event.locals.user = await readSession(event.cookies);

	if (!event.locals.user && !isPublic(path)) {
		// Kit turns a redirect into the right shape for pages, data requests and form actions
		if (!path.startsWith('/api/') && !path.startsWith('/photo/')) redirect(303, '/login');
		return new Response('Unauthorized', { status: 401 });
	}
	if (event.locals.user && path === '/login') redirect(303, '/');

	const lang = event.locals.user?.locale ?? pickLocale(event.request.headers.get('accept-language'));
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%vintry.lang%', lang)
	});

	const h = response.headers;
	if (!dev) h.set('strict-transport-security', 'max-age=63072000; includeSubDomains');
	h.set('x-content-type-options', 'nosniff');
	h.set('referrer-policy', 'same-origin');
	h.set('permissions-policy', 'camera=(self), microphone=(), geolocation=()');
	h.set('x-frame-options', 'DENY');
	h.set('cross-origin-opener-policy', 'same-origin');
	return compress(event.request, response);
};

// pages and their data: a cellar of a few hundred wines is hundreds of KB of HTML
const COMPRESSIBLE = /^(text\/html|application\/json|text\/csv)\b/;

/**
 * gzip for pages, page data and exports; adapter-node only serves precompressed static
 * files. Only GET: action results can carry a fresh invite link next to text the user
 * typed, the mix that compression side channels (BREACH) feed on. Kit's streamed data
 * (text/sveltekit-data) stays as it is so promises arrive as they resolve.
 */
function compress(request: Request, response: Response): Response {
	const h = response.headers;
	if (
		request.method !== 'GET' ||
		!response.body ||
		h.has('content-encoding') ||
		!COMPRESSIBLE.test(h.get('content-type') ?? '') ||
		!/\bgzip\b/.test(request.headers.get('accept-encoding') ?? '')
	)
		return response;
	h.set('content-encoding', 'gzip');
	// Kit's strong ETag hashes the plain HTML; the gzipped bytes differ, so it can only be weak
	const etag = h.get('etag');
	if (etag && !etag.startsWith('W/')) h.set('etag', `W/${etag}`);
	h.append('vary', 'accept-encoding');
	h.delete('content-length');
	return new Response(response.body.pipeThrough(new CompressionStream('gzip')), {
		status: response.status,
		statusText: response.statusText,
		headers: h
	});
}
