import { countries } from './data/countries';
import { grapes } from './data/grapes';
import { regions } from './data/regions';
import type { Aging, Color, Country, Grape, Level, Region } from './data/types';

export { COLORS, type Color } from './data/types';

/** Lower case, accents stripped, punctuation to spaces */
export function normalize(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/ß/g, 'ss')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function index<T>(items: T[], keys: (item: T) => string[]) {
	const map = new Map<string, T>();
	for (const item of items) for (const k of keys(item)) map.set(normalize(k), item);
	return map;
}

export const grapeIndex = index(grapes, (g) => [g.name, ...g.synonyms]);
export const regionIndex = index(regions, (r) => [r.name, ...r.synonyms]);
export const countryIndex = index(countries, (c) => [c.code, ...c.names]);

export const findGrape = (name: string): Grape | undefined => grapeIndex.get(normalize(name));
export const findRegion = (name: string): Region | undefined => regionIndex.get(normalize(name));
export const findCountry = (code: string): Country | undefined =>
	countries.find((c) => c.code === code.toUpperCase());

export const grapeNames = grapes.map((g) => g.name).sort((a, b) => a.localeCompare(b));

/** URL-safe name: "Müller-Thurgau" → "muller-thurgau" */
export const grapeSlug = (name: string) => normalize(name).replace(/ /g, '-');
const grapeBySlug = new Map(grapes.map((g) => [grapeSlug(g.name), g]));
export const findGrapeBySlug = (slug: string): Grape | undefined => grapeBySlug.get(slug);

/** Regions where the grape is typical */
export const regionsForGrape = (name: string): Region[] => regions.filter((r) => r.grapes.includes(name));

export const regionSlug = grapeSlug;
const regionBySlug = new Map(regions.map((r) => [regionSlug(r.name), r]));
export const findRegionBySlug = (slug: string): Region | undefined => regionBySlug.get(slug);

export { grapes };

export function regionNames(country?: string | null): string[] {
	return regions
		.filter((r) => !country || r.country === country)
		.map((r) => r.name)
		.sort((a, b) => a.localeCompare(b));
}

/** Regional-indicator flag from an ISO code */
export function flag(code: string | null | undefined): string {
	if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
	return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

const displayNames = new Map<string, Intl.DisplayNames>();
export function countryName(code: string | null | undefined, locale: string): string {
	if (!code) return '';
	let dn = displayNames.get(locale);
	if (!dn) displayNames.set(locale, (dn = new Intl.DisplayNames([locale], { type: 'region' })));
	try {
		return dn.of(code.toUpperCase()) ?? code;
	} catch {
		return code;
	}
}

const COLOR_AGING: Record<Color, Aging> = {
	red: [2, 8],
	white: [1, 4],
	rose: [0, 2],
	sparkling: [1, 5],
	sweet: [3, 20],
	fortified: [5, 30]
};

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** region.age ?? avg(grape.age) ?? color default, in years after the vintage */
export function aging(input: { color: Color; region?: string | null; grapes?: string[] }): Aging {
	const region = input.region ? findRegion(input.region) : undefined;
	if (region?.age) return region.age;
	const known = (input.grapes ?? []).map(findGrape).filter((g): g is Grape => !!g);
	// grape tables describe dry still wine; styles age differently
	if (known.length && (input.color === 'red' || input.color === 'white' || input.color === 'rose')) {
		const from = Math.round(avg(known.map((g) => g.age[0])));
		const to = Math.round(avg(known.map((g) => g.age[1])));
		return input.color === 'rose' ? [0, Math.min(to, 3)] : [from, to];
	}
	return COLOR_AGING[input.color];
}

export function suggestWindow(input: {
	vintage?: number | null;
	color: Color;
	region?: string | null;
	grapes?: string[];
}): { from: number; to: number } | null {
	if (!input.vintage) return null;
	const [a, b] = aging(input);
	return { from: input.vintage + a, to: input.vintage + b };
}

export interface Taste {
	body: Level | null;
	acidity: Level | null;
	tannin: Level | null;
	sweetness: Level | null;
}

const clampLevel = (n: number) => Math.min(5, Math.max(1, Math.round(n))) as Level;

/** Average of the known grapes, falling back to the region's typical grapes */
export function suggestTaste(input: {
	color: Color;
	region?: string | null;
	grapes?: string[];
}): Taste & { aroma: { en: string[]; de: string[] } } {
	let known = (input.grapes ?? []).map(findGrape).filter((g): g is Grape => !!g);
	if (!known.length && input.region) {
		const region = findRegion(input.region);
		known = (region?.grapes ?? [])
			.map(findGrape)
			.filter((g): g is Grape => !!g && matchesColor(g, input.color))
			.slice(0, 2);
	}
	const aroma = { en: [] as string[], de: [] as string[] };
	if (!known.length) return { body: null, acidity: null, tannin: null, sweetness: null, aroma };
	for (const g of known) {
		aroma.en.push(...g.aroma.en);
		aroma.de.push(...g.aroma.de);
	}
	const sweet = input.color === 'sweet' ? 5 : input.color === 'fortified' ? 4 : null;
	return {
		body: clampLevel(avg(known.map((g) => g.body))),
		acidity: clampLevel(avg(known.map((g) => g.acidity))),
		tannin: input.color === 'red' ? clampLevel(avg(known.map((g) => g.tannin))) : clampLevel(1),
		sweetness: sweet ? clampLevel(sweet) : clampLevel(avg(known.map((g) => g.sweetness))),
		aroma: { en: [...new Set(aroma.en)].slice(0, 5), de: [...new Set(aroma.de)].slice(0, 5) }
	};
}

function matchesColor(g: Grape, color: Color) {
	if (color === 'red') return g.color === 'red';
	if (color === 'white') return g.color === 'white';
	return true;
}

export function aromas(grapeList: string[], locale: 'en' | 'de'): string[] {
	const words = grapeList.flatMap((n) => findGrape(n)?.aroma[locale] ?? []);
	return [...new Set(words)].slice(0, 5);
}

export type WindowStatus = 'wait' | 'ready' | 'soon' | 'past' | 'unknown';

export function windowStatus(
	from: number | null | undefined,
	to: number | null | undefined,
	year = new Date().getFullYear()
): WindowStatus {
	if (!from && !to) return 'unknown';
	if (from && year < from) return 'wait';
	if (to && year > to) return 'past';
	if (to && to - year <= 1) return 'soon';
	return 'ready';
}

/** Canonical grape name if known, else the trimmed input */
export function canonicalGrape(name: string): string {
	return findGrape(name)?.name ?? name.trim();
}
