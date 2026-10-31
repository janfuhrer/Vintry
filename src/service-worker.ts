/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';
import { self } from '$app/service-worker';
import { clearSaved, dataPagePath, isReadable, SAVED_DATA, savedPagesCache } from '#lib/offline.ts';

const CACHE = `vintry-${version}`;
// manifest paths are relative to the base path ("ocr/x.js"); compare them as URL paths
const toPath = (p: string) => `/${p.replace(/^\//, '')}`;
const ALL = [...immutable, ...assets].map((a) => toPath(a.path));

// written by scripts/copy-ocr-assets.mjs, e.g. /ocr/version-7.0.0-7.0.0.txt
const ocrVersion = ALL.map((p) => p.match(/^\/ocr\/version-(.+)\.txt$/)?.[1]).find(Boolean);
const OCR_CACHE = `vintry-ocr-${ocrVersion ?? 'v1'}`;
// OCR assets are large (~27 MB); cached on first use instead.
// install screenshots are only for the browser's install dialog
const PRECACHE = ALL.filter((p) => !p.startsWith('/ocr/') && !p.startsWith('/screenshots/'));
const SAVED_PAGES = savedPagesCache(version);
// one entry per wine looked at; enough for a cellar, small enough to forget
const MAX_SAVED = 400;

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(PRECACHE))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				// also drops OCR caches of older engine versions and pages saved by older builds
				Promise.all(
					keys
						.filter((k) => ![CACHE, OCR_CACHE, SAVED_PAGES, SAVED_DATA].includes(k))
						.map((k) => caches.delete(k))
				)
			)
			.then(() => self.clients.claim())
			.then(() => {
				// the old build's saved pages are gone: save the start pages again while online.
				// Not awaited: fetches wait while the worker is still activating
				for (const path of ['/', '/history']) {
					const started = epoch;
					const url = new URL(path, self.location.origin);
					fetch(url)
						.then((res) => keep(url, res, SAVED_PAGES, started))
						.catch(() => {});
				}
			})
	);
});

// a page without a saved copy, without signal; colours follow the app's light and dark themes
const offline = () =>
	new Response(
		'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
			'<meta name="color-scheme" content="light dark"><title>Vintry</title><style>' +
			'body{font-family:system-ui;display:grid;place-items:center;min-height:90vh;margin:0;background:#faf7f4;color:#1f1a1c}' +
			'a{color:#7b2240}@media(prefers-color-scheme:dark){body{background:#141012;color:#f3edea}a{color:#d46a8a}}' +
			'</style><p>Offline · Keine Verbindung · <a href="/">Vintry</a></p>',
		{ status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
	);

/** Tell open pages whether what they show came from the network or a saved copy. */
async function announce(offline: boolean) {
	for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage({ offline });
}

/** Saved under the bare path: Kit adds varying query parameters to data requests. */
const savedKey = (url: URL) => url.origin + url.pathname;

// bumped whenever the copies are dropped: a save that set out before must not bring them back
let epoch = 0;
function forget() {
	epoch++;
	return clearSaved();
}

async function save(cacheName: string, url: URL, res: Response, started: number) {
	if (started !== epoch) return;
	const cache = await caches.open(cacheName);
	await cache.put(savedKey(url), res);
	// dropped while writing: open() may have recreated the cache after the clear
	if (started !== epoch) return void (await cache.delete(savedKey(url)));
	const keys = await cache.keys();
	// put() moves an updated entry to the end, so the oldest come first
	await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_SAVED)).map((k) => cache.delete(k)));
}

/**
 * Keep a copy of a response when it is a real page of this user.
 * A redirect to sign-in means the session is gone: then the copies go too.
 */
async function keep(url: URL, res: Response, cacheName: string, started: number) {
	if (res.redirected && new URL(res.url).pathname === '/login') return forget();
	if (!res.ok || res.redirected || res.type !== 'basic') return;
	if (cacheName !== SAVED_DATA) return save(cacheName, url, res, started);
	const text = await res.text();
	const first = text.slice(0, text.indexOf('\n') + 1 || undefined);
	const data = JSON.parse(first) as { type?: string; nodes?: ({ type?: string } | null)[] };
	// data requests answer redirects with 200 and {"type":"redirect"}
	if (data.type === 'redirect') return forget();
	// load errors also come as 200 "data"; a skipped node would borrow another page's data
	if (data.type !== 'data' || data.nodes?.some((n) => n && n.type !== 'data')) return;
	// an older build's version header would make Kit treat the next navigation as an update
	const headers = new Headers(res.headers);
	headers.delete('x-sveltekit-version');
	await save(cacheName, url, new Response(text, { status: res.status, headers }), started);
}

// one bar in a basement can leave a request hanging for a minute
const PATIENCE = 4000;

/**
 * Network first; the saved copy when the network fails or is slow and a copy exists.
 * The copy is refreshed in the background, so the page never waits for the cache.
 */
function networkFirst(
	event: FetchEvent,
	url: URL,
	cacheName: string,
	saved: () => Promise<Response | null>,
	notify?: (offline: boolean) => void
): Promise<Response> {
	const started = epoch;
	const network = fetch(event.request).then((res) => {
		const copy = res.clone();
		event.waitUntil(keep(url, copy, cacheName, started).catch(() => {}));
		return res;
	});
	// the copy still gets refreshed when the saved one was served after a timeout
	event.waitUntil(network.catch(() => {}));
	return new Promise((resolve, reject) => {
		let settled = false;
		const finish = (fn: () => void) => {
			if (settled) return;
			settled = true;
			fn();
		};
		const useSaved = async (orFail: boolean) => {
			const hit = await saved();
			if (hit)
				finish(() => {
					notify?.(true);
					resolve(hit);
				});
			else if (orFail) finish(() => reject(new TypeError('offline')));
		};
		network.then(
			(res) =>
				finish(() => {
					notify?.(false);
					resolve(res);
				}),
			() => useSaved(true)
		);
		setTimeout(() => !settled && useSaved(false), PATIENCE);
	});
}

async function savedPage(url: URL): Promise<Response | null> {
	const hit = await caches.match(savedKey(url), { cacheName: SAVED_PAGES });
	if (!hit) return null;
	// mark the document so the page shows it is a saved copy
	const html = (await hit.text()).replace('<html', '<html data-saved');
	return new Response(html, { status: 200, headers: hit.headers });
}

async function savedData(url: URL): Promise<Response | null> {
	return (await caches.match(savedKey(url), { cacheName: SAVED_DATA })) ?? null;
}

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin) return;

	// build output and static files: cache first
	if (PRECACHE.includes(url.pathname)) {
		event.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)));
		return;
	}

	// OCR engine and language data: cache on first use
	if (url.pathname.startsWith('/ocr/')) {
		event.respondWith(
			caches.open(OCR_CACHE).then(async (cache) => {
				const hit = await cache.match(req);
				if (hit) return hit;
				const res = await fetch(req);
				if (res.ok) cache.put(req, res.clone());
				return res;
			})
		);
		return;
	}

	const dataPage = dataPagePath(url.pathname);

	// signing in or accepting an invite: the copies may belong to someone else
	if (url.pathname === '/login' || url.pathname.startsWith('/invite/') || dataPage === '/login') {
		event.waitUntil(forget());
		return;
	}

	// reading pages: network first, the saved copy without signal
	if (dataPage && isReadable(dataPage)) {
		event.respondWith(networkFirst(event, url, SAVED_DATA, () => savedData(url), announce));
		return;
	}

	if (req.mode === 'navigate') {
		event.respondWith(
			isReadable(url.pathname)
				? networkFirst(event, url, SAVED_PAGES, () => savedPage(url)).catch(offline)
				: fetch(req).catch(offline)
		);
	}

	// everything else (photos, exports, actions): network only; photos sit in the HTTP cache
});
