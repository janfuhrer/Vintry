import { expect, test } from 'vitest';
import { isISODate, localISODate } from './dates';

test('local date uses the local calendar day', () => {
	// 00:30 local on 1 Nov is still 31 Oct in UTC for zones east of Greenwich
	const d = new Date(2026, 10, 1, 0, 30);
	expect(localISODate(d)).toBe('2026-11-01');
});

test('real dates only', () => {
	expect(isISODate('2026-10-31')).toBe(true);
	expect(isISODate('2024-02-29')).toBe(true);
	expect(isISODate('2026-02-30')).toBe(false);
	expect(isISODate('2026-13-01')).toBe(false);
	expect(isISODate('31.10.2026')).toBe(false);
	expect(isISODate('')).toBe(false);
});
