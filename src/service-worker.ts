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
			// the old build's saved cellar page is gone: save this build's one while still online
			.then(() => saveFresh(new Request('/'), SAVED_PAGES).catch(() => {}))
	);
});

const offline = () =>
	new Response(
		'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Vintry</title>' +
			'<body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;margin:0;background:#FAF7F4;color:#1F1A1C">' +
			'<p>Offline · Keine Verbindung · <a href="/" style="color:#7A2140">Vintry</a></p>',
		{ status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
	);

/** Tell open pages whether what they show came from the network or a saved copy. */
async function announce(offline: boolean) {
	for (const client of await self.clients.matchAll({ type: 'window' })) client.postMessage({ offline });
}

/** Saved under the bare path: Kit adds varying query parameters to data requests. */
const savedKey = (url: URL) => url.origin + url.pathname;

async function save(cacheName: string, url: URL, res: Response) {
	const cache = await caches.open(cacheName);
	await cache.put(savedKey(url), res);
	const keys = await cache.keys();
	// put() moves an updated entry to the end, so the oldest come first
	await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_SAVED)).map((k) => cache.delete(k)));
}

/**
 * Fetch from the network and keep a copy when it is a real page of this user.
 * A redirect to sign-in means the session is gone: then the copies go too.
 */
async function saveFresh(req: Request, cacheName: string): Promise<Response> {
	const res = await fetch(req);
	// a full disk or odd body must never cost the page its fresh response
	await keep(new URL(req.url), res, cacheName).catch(() => {});
	return res;
}

async function keep(url: URL, res: Response, cacheName: string) {
	if (res.redirected && new URL(res.url).pathname === '/login') return clearSaved();
	if (!res.ok || res.redirected || res.type !== 'basic') return;
	if (cacheName !== SAVED_DATA) return save(cacheName, url, res.clone());
	// data requests answer redirects with 200 and {"type":"redirect"}; only keep real data
	const text = await res.clone().text();
	const first = text.slice(0, text.indexOf('\n') + 1 || undefined);
	const type = (JSON.parse(first) as { type?: string }).type;
	if (type === 'data') await save(cacheName, url, new Response(text, res));
	else if (type === 'redirect') await clearSaved();
}

async function savedPage(url: URL): Promise<Response | null> {
	const hit = await caches.match(savedKey(url), { cacheName: SAVED_PAGES });
	if (!hit) return null;
	// mark the document so the page shows it is a saved copy
	const html = (await hit.text()).replace('<html', '<html data-saved');
	return new Response(html, { status: 200, headers: hit.headers });
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
		event.waitUntil(clearSaved());
		return;
	}

	// reading pages: network first, the saved copy without signal
	if (dataPage && isReadable(dataPage)) {
		event.respondWith(
			saveFresh(req, SAVED_DATA)
				.then((res) => (announce(false), res))
				.catch(async () => {
					const hit = await caches.match(savedKey(url), { cacheName: SAVED_DATA });
					if (!hit) throw new TypeError('offline');
					announce(true);
					return hit;
				})
		);
		return;
	}

	if (req.mode === 'navigate') {
		event.respondWith(
			(isReadable(url.pathname) ? saveFresh(req, SAVED_PAGES) : fetch(req)).catch(
				async () => (isReadable(url.pathname) && (await savedPage(url))) || offline()
			)
		);
	}

	// everything else (photos, exports, actions): network only; photos sit in the HTTP cache
});
