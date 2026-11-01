// docs/wine-rules.md explains how window and taste are suggested. This keeps it honest: a term,
// threshold or table value changed in the code without the page fails here.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { regions } from './data/regions.ts';
import { COLORS } from './data/types.ts';
import {
	DRY_WORDS,
	ENTRY_YEARS,
	PRICE,
	SPARKLING_SWEETNESS,
	STILL_SWEETNESS,
	TIERS,
	TIER_SHIFT
} from './terms.ts';
import { COLOR_AGING, normalize, servingTemp } from './wine.ts';

const page = readFileSync(new URL('../../docs/wine-rules.md', import.meta.url), 'utf8');
const words = ` ${normalize(page)} `;
// Prettier wraps long lines: compare phrases with single spaces
const flat = page.replace(/\s+/g, ' ');
const row = (...cells: string[]) =>
	new RegExp(
		`\\|\\s*${cells.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*\\|\\s*')}\\s*\\|`
	);
const LABEL = {
	red: 'Red',
	white: 'White',
	rose: 'Rosé',
	sparkling: 'Sparkling',
	sweet: 'Sweet',
	fortified: 'Fortified'
};

describe('docs/wine-rules.md matches the code', () => {
	test('every label word is listed', () => {
		const all = [
			...TIERS.flatMap(([, t]) => t.words),
			...SPARKLING_SWEETNESS.flatMap(([, w]) => w),
			...STILL_SWEETNESS.flatMap(([, w]) => w),
			...DRY_WORDS
		];
		for (const w of all) expect(words, `"${w}" is missing`).toContain(` ${w} `);
	});

	test('price thresholds and tier years', () => {
		expect(flat).toContain(`**${PRICE.entry} or less**`);
		expect(flat).toContain(`**${PRICE.keep} or more**`);
		for (const tier of ['premium', 'top'] as const) {
			const [from, to] = TIER_SHIFT[tier];
			expect(page).toMatch(
				row(
					tier[0].toUpperCase() + tier.slice(1),
					`**+${from} years** at the start, **+${to} years** at the end`
				)
			);
		}
		expect(flat).toContain(`**${ENTRY_YEARS.red} years** for red, **${ENTRY_YEARS.other} years** otherwise`);
	});

	test('the window per type and per region', () => {
		for (const c of COLORS) expect(page).toMatch(row(LABEL[c], COLOR_AGING[c].join('–')));
		for (const r of regions.filter((r) => r.age)) expect(page).toMatch(row(r.name, r.age!.join('–')));
	});

	test('serving temperatures', () => {
		const temp = (c: (typeof COLORS)[number], body: number | null) => servingTemp(c, body).join('–');
		expect(page).toMatch(row('Sparkling', temp('sparkling', null)));
		expect(page).toMatch(row('Rosé, sweet', temp('rose', null)));
		expect(page).toMatch(row('White, body 4 or more', temp('white', 4)));
		expect(page).toMatch(row('White, lighter', temp('white', 2)));
		expect(page).toMatch(row('Red, body 2 or less', temp('red', 2)));
		expect(page).toMatch(row('Red, body 3', temp('red', 3)));
		expect(page).toMatch(row('Red, body 4 or more', temp('red', 4)));
		expect(page).toMatch(row('Fortified', temp('fortified', null)));
	});
});
