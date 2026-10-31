import { redirect, type RequestEvent } from '@sveltejs/kit';
import type { Handle, ServerInit } from '@sveltejs/kit/hooks';
import { building, dev } from '$app/env';
import { bootstrap, cleanup, readSession } from '#lib/server/auth.ts';
import { migrate } from '#lib/server/db.ts';
import { allow } from '#lib/server/ratelimit.ts';
import { pickLocale } from '#lib/i18n.ts';

export const init: ServerInit = async () => {
	if (building) return;
	await migrate();
	await bootstrap();
	setInterval(() => cleanup().catch((e) => console.error('[vintry] cleanup failed', e)), 3_600_000).unref();
};

const PUBLIC_PREFIXES = ['/login', '/invite/', '/api/auth/', '/icons/', '/ocr/', '/_app/'];
const PUBLIC_FILES = new Set([
	'/manifest.webmanifest',
	'/favicon.svg',
	'/logo.svg',
	'/robots.txt',
	'/service-worker.js'
]);

/**
 * adapter-node throws when ADDRESS_HEADER is configured but the proxy didn't send it.
 * Rate limiting must never take sign-in down, so fall back to one shared bucket.
 */
function clientAddress(event: RequestEvent): string {
	try {
		return event.getClientAddress();
	} catch {
		return 'unknown';
	}
}

const isPublic = (path: string) =>
	PUBLIC_FILES.has(path) || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p));

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;

	if (path.startsWith('/api/auth/') && !allow(clientAddress(event))) {
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
	return response;
};
