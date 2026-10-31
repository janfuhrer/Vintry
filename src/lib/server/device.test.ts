import { expect, test } from 'vitest';
import { deviceLabel } from './device';

test('recognises common devices and browsers', () => {
	expect(
		deviceLabel(
			'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
		)
	).toBe('iPhone · Safari');
	expect(
		deviceLabel(
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
		)
	).toBe('Mac · Chrome');
	expect(
		deviceLabel(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0'
		)
	).toBe('Windows · Edge');
	expect(deviceLabel('Mozilla/5.0 (Android 15; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0')).toBe(
		'Android · Firefox'
	);
});

test('unknown or missing user agents', () => {
	expect(deviceLabel(undefined)).toBeNull();
	expect(deviceLabel('curl/8.0')).toBeNull();
});
