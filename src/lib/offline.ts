/**
 * Saved copies of pages for reading the cellar without signal (in the basement, say).
 * The service worker fills them; signing out or in on this device clears them.
 */

/** Page data (`__data.json`): kept across app updates. */
export const SAVED_DATA = 'vintry-saved-data';
/** Page HTML: references the build's scripts and styles, so it is kept per build. */
export const savedPagesCache = (version: string) => `vintry-saved-pages-${version}`;
export const SAVED_PREFIX = 'vintry-saved-';

/** Read-only pages worth having offline. Settings, adding and editing need the server. */
export function isReadable(path: string): boolean {
	return (
		path === '/' ||
		path === '/history' ||
		path === '/grapes' ||
		/^\/wine\/[0-9a-f-]{36}$/i.test(path) ||
		/^\/(grapes|regions)\/[a-z0-9-]+$/.test(path)
	);
}

/** The page a data request belongs to, or null if it isn't one. */
export function dataPagePath(path: string): string | null {
	if (!path.endsWith('/__data.json')) return null;
	return path.slice(0, -'/__data.json'.length) || '/';
}

export async function clearSaved(): Promise<void> {
	if (typeof caches === 'undefined') return;
	const keys = await caches.keys();
	await Promise.all(keys.filter((k) => k.startsWith(SAVED_PREFIX)).map((k) => caches.delete(k)));
}
