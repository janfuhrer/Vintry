import { expect, test } from 'vitest';
import { yearStats } from './stats';

const d = (drunk_on: string, rating: number | null, grapes: string[], country: string | null) => ({
	drunk_on,
	rating,
	grapes,
	country
});

test('counts only the given year', () => {
	const s = yearStats(
		[
			d('2026-10-01', 4, ['Pinot Noir'], 'CH'),
			d('2026-03-12', 5, ['Pinot Noir', 'Gamay'], 'CH'),
			d('2026-01-02', null, ['Merlot'], 'FR'),
			d('2025-12-31', 1, ['Merlot'], 'FR')
		],
		2026
	);
	expect(s).toEqual({ year: 2026, bottles: 3, avgRating: 4.5, topGrape: 'Pinot Noir', topCountry: 'CH' });
});

test('empty year', () => {
	expect(yearStats([], 2026)).toEqual({
		year: 2026,
		bottles: 0,
		avgRating: null,
		topGrape: null,
		topCountry: null
	});
});

test('ties go to the most recent', () => {
	const s = yearStats(
		[d('2026-05-01', null, ['Syrah'], 'AU'), d('2026-04-01', null, ['Riesling'], 'DE')],
		2026
	);
	expect(s.topGrape).toBe('Syrah');
});
