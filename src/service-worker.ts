/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';
import { self } from '$app/service-worker';

const CACHE = `vintry-${version}`;
const OCR_CACHE = 'vintry-ocr-v1';
const PRECACHE = [...immutable, ...assets]
	.map((a) => a.path)
	// OCR assets are large; cached on first use instead
	.filter((p) => !p.startsWith('/ocr/'));

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
				Promise.all(keys.filter((k) => k !== CACHE && k !== OCR_CACHE).map((k) => caches.delete(k)))
			)
			.then(() => self.clients.claim())
	);
});

const offline = () =>
	new Response(
		'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Vintry</title>' +
			'<body style="font-family:system-ui;display:grid;place-items:center;min-height:90vh;margin:0;background:#FAF7F4;color:#1F1A1C">' +
			'<p>Offline · Keine Verbindung</p>',
		{ status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }
	);

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

	// pages, data and photos: always network, never cached (they're private)
	if (req.mode === 'navigate') {
		event.respondWith(fetch(req).catch(offline));
	}
});
