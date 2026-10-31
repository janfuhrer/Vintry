import { describe, expect, test } from 'vitest';
import { countries } from './data/countries';
import { grapes } from './data/grapes';
import { regions } from './data/regions';
import {
	canonicalGrape,
	flag,
	normalize,
	suggestTaste,
	suggestWindow,
	windowStatus,
	findCountry,
	findGrape
} from './wine';

describe('normalize', () => {
	test('strips accents, case and punctuation', () => {
		expect(normalize('Châteauneuf-du-Pape')).toBe('chateauneuf du pape');
		expect(normalize('  Weißburgunder ')).toBe('weissburgunder');
	});
});

describe('lookups', () => {
	test('flag from ISO code', () => {
		expect(flag('ch')).toBe('🇨🇭');
		expect(flag(null)).toBe('');
		expect(flag('xyz')).toBe('');
	});

	test('synonyms resolve to the canonical grape', () => {
		expect(canonicalGrape('shiraz')).toBe('Syrah');
		expect(canonicalGrape('Spätburgunder')).toBe('Pinot Noir');
		expect(canonicalGrape('  Unknown Grape ')).toBe('Unknown Grape');
	});

	test('country by code', () => {
		expect(findCountry('it')?.code).toBe('IT');
	});
});

describe('drinking window', () => {
	test('region aging overrides grapes', () => {
		const barolo = suggestWindow({ vintage: 2018, color: 'red', region: 'Barolo', grapes: ['Nebbiolo'] })!;
		expect(barolo.from).toBeGreaterThanOrEqual(2018);
		expect(barolo.to).toBeGreaterThan(barolo.from);
	});

	test('colour default without grapes', () => {
		expect(suggestWindow({ vintage: 2020, color: 'white' })).toEqual({ from: 2021, to: 2024 });
		expect(suggestWindow({ color: 'red' })).toBeNull();
	});

	test('rosé stays short even with long-lived grapes', () => {
		const w = suggestWindow({ vintage: 2024, color: 'rose', grapes: ['Nebbiolo'] })!;
		expect(w.to - 2024).toBeLessThanOrEqual(3);
	});

	test('status', () => {
		expect(windowStatus(2030, 2040, 2026)).toBe('wait');
		expect(windowStatus(2020, 2030, 2026)).toBe('ready');
		expect(windowStatus(2020, 2027, 2026)).toBe('soon');
		expect(windowStatus(2010, 2020, 2026)).toBe('past');
		expect(windowStatus(null, null, 2026)).toBe('unknown');
		expect(windowStatus(null, 2030, 2026)).toBe('ready');
	});
});

describe('taste suggestion', () => {
	test('red blend', () => {
		const t = suggestTaste({ color: 'red', grapes: ['Cabernet Sauvignon', 'Merlot'] });
		expect(t.body).toBeGreaterThanOrEqual(3);
		expect(t.tannin).toBeGreaterThanOrEqual(3);
		expect(t.sweetness).toBe(1);
		expect(t.aroma.de.length).toBeGreaterThan(0);
	});

	test('falls back to the region’s grapes', () => {
		expect(suggestTaste({ color: 'red', region: 'Barolo' }).body).not.toBeNull();
	});

	test('sweet wines are sweet', () => {
		expect(suggestTaste({ color: 'sweet', grapes: ['Riesling'] }).sweetness).toBe(5);
	});

	test('nothing known gives nulls', () => {
		expect(suggestTaste({ color: 'red' })).toMatchObject({ body: null, tannin: null });
	});
});

describe('data tables', () => {
	test('every region grape exists', () => {
		for (const r of regions) for (const g of r.grapes) expect(findGrape(g), `${r.name}: ${g}`).toBeDefined();
	});

	test('every region country exists', () => {
		const codes = new Set(countries.map((c) => c.code));
		for (const r of regions) expect(codes.has(r.country), r.name).toBe(true);
	});

	test('levels and aging are in range', () => {
		for (const g of grapes) {
			for (const k of ['body', 'acidity', 'tannin', 'sweetness'] as const) {
				expect(g[k], `${g.name}.${k}`).toBeGreaterThanOrEqual(1);
				expect(g[k], `${g.name}.${k}`).toBeLessThanOrEqual(5);
			}
			expect(g.age[0], g.name).toBeLessThanOrEqual(g.age[1]);
			expect(g.aroma.en.length, g.name).toBeGreaterThan(0);
			expect(g.aroma.de.length, g.name).toBeGreaterThan(0);
		}
	});

	test('no synonym maps to two grapes', () => {
		const seen = new Map<string, string>();
		for (const g of grapes) {
			for (const n of [g.name, ...g.synonyms]) {
				const k = normalize(n);
				expect(seen.get(k) ?? g.name, `${n} in ${g.name} and ${seen.get(k)}`).toBe(g.name);
				seen.set(k, g.name);
			}
		}
	});
});

describe('serving temperature', () => {
	test('by style and body', async () => {
		const { servingTemp } = await import('./wine');
		expect(servingTemp('sparkling', null)).toEqual([6, 8]);
		expect(servingTemp('white', 2)).toEqual([8, 10]);
		expect(servingTemp('white', 4)).toEqual([10, 12]);
		expect(servingTemp('red', 2)).toEqual([12, 14]);
		expect(servingTemp('red', 3)).toEqual([14, 16]);
		expect(servingTemp('red', 5)).toEqual([16, 18]);
		expect(servingTemp('red', null)).toEqual([14, 16]);
	});
});

describe('pairings', () => {
	test('from the grapes, then from the region', async () => {
		const { pairings } = await import('./wine');
		expect(pairings({ grapes: ['Chasselas'], color: 'white' }, 'de')).toContain('Raclette');
		expect(pairings({ grapes: [], region: 'Barolo', color: 'red' }, 'en').length).toBeGreaterThan(0);
		expect(
			pairings({ grapes: ['Merlot', 'Cabernet Sauvignon'], color: 'red' }, 'en').length
		).toBeLessThanOrEqual(5);
		expect(pairings({ grapes: ['Unknown'], color: 'red' }, 'en')).toEqual([]);
	});
});
