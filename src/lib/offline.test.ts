import { describe, expect, test } from 'vitest';
import { dataPagePath, isReadable } from './offline';

describe('offline copies', () => {
	test('only reading pages are saved', () => {
		for (const p of ['/', '/history', '/grapes', '/grapes/pinot-noir', '/regions/barolo'])
			expect(isReadable(p), p).toBe(true);
		expect(isReadable('/wine/0b6c1c9e-4c1f-4e57-9a43-3f0f1b2c3d4e')).toBe(true);
		for (const p of [
			'/settings',
			'/add',
			'/wine/0b6c1c9e-4c1f-4e57-9a43-3f0f1b2c3d4e/edit',
			'/login',
			'/export/x'
		])
			expect(isReadable(p), p).toBe(false);
	});

	test('data requests map to their page', () => {
		expect(dataPagePath('/__data.json')).toBe('/');
		expect(dataPagePath('/wine/abc/__data.json')).toBe('/wine/abc');
		expect(dataPagePath('/wine/abc')).toBeNull();
	});
});
