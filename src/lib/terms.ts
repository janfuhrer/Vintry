// What the words on a label say about how long a wine keeps and how sweet it is. Grape and
// region tables describe a typical serious wine; these terms (and the price) tell an everyday
// bottle from a top one, and a dry Riesling from a sweet one.
import type { Color, Level } from './data/types';
import { normalize } from './wine.ts';

/** entry: drink young; standard: as the tables say; premium and top: made to keep */
export type Tier = 'entry' | 'standard' | 'premium' | 'top';

interface Term {
	/** accent-free, lower case, as normalize() writes it */
	words: string[];
	/** only on these countries' labels, when the country is known */
	countries?: string[];
	colors?: Color[];
}

/** Without a quality word on the label: up to `entry` an everyday bottle, from `keep` one made to keep */
export const PRICE = { entry: 12, keep: 60 };
/** Years added to the start and the end of the window */
export const TIER_SHIFT = { premium: [2, 5], top: [3, 8] } as const;
/** An everyday bottle is ready within a year and best within this many years */
export const ENTRY_YEARS = { red: 4, other: 2 };

// most specific first: "gran reserva" before "reserva", "grand cru classe" before "grand cru"
export const TIERS: [Tier, Term][] = [
	['top', { words: ['grand cru classe', 'premier grand cru classe', 'cru classe', 'grand cru'] }],
	['top', { words: ['gran reserva'], countries: ['ES'], colors: ['red', 'white'] }],
	['top', { words: ['gran selezione'], countries: ['IT'] }],
	['top', { words: ['grosses gewachs', 'grosse lage'], countries: ['DE'] }],
	[
		'top',
		{ words: ['trockenbeerenauslese', 'beerenauslese', 'eiswein', 'auslese'], countries: ['DE', 'AT'] }
	],
	['top', { words: ['vintage port'] }],
	['premium', { words: ['premier cru', '1er cru', 'cru bourgeois'] }],
	['premium', { words: ['riserva'], countries: ['IT', 'CH'], colors: ['red', 'white'] }],
	['premium', { words: ['reserva'], countries: ['ES'], colors: ['red', 'white'] }],
	['premium', { words: ['smaragd'], countries: ['AT'] }],
	['premium', { words: ['erste lage'], countries: ['DE', 'AT'] }],
	['premium', { words: ['spatlese'], countries: ['DE', 'AT'] }],
	['standard', { words: ['crianza'], countries: ['ES'] }],
	['entry', { words: ['steinfeder'], countries: ['AT'] }],
	[
		'entry',
		{
			words: ['vin de table', 'vino da tavola', 'vino de mesa', 'tafelwein', 'vin de france', 'vino d italia']
		}
	]
];

// Sparkling wine's dosage scale: "extra dry" is sweeter than "brut", "sec" sweeter still.
// Longer phrases first, so "extra brut" isn't read as "brut" nor "demi sec" as "sec".
export const SPARKLING_SWEETNESS: [Level, string[]][] = [
	[1, ['brut nature', 'pas dose', 'dosage zero', 'zero dosage', 'extra brut']],
	[4, ['demi sec', 'semi seco', 'abboccato']],
	[2, ['extra dry', 'extra sec', 'extra seco']],
	[1, ['brut']],
	[5, ['doux', 'dolce']],
	[3, ['sec', 'dry', 'trocken', 'secco', 'seco']]
];
export const STILL_SWEETNESS: [Level, string[]][] = [
	[
		5,
		[
			'trockenbeerenauslese',
			'beerenauslese',
			'eiswein',
			'ice wine',
			'selection de grains nobles',
			'passito',
			'recioto'
		]
	],
	[
		4,
		['auslese', 'vendanges tardives', 'vendange tardive', 'moelleux', 'liquoreux', 'dolce', 'doux', 'suss']
	],
	[3, ['spatlese', 'lieblich', 'amabile', 'demi sec', 'semi seco']],
	[2, ['kabinett', 'feinherb', 'halbtrocken', 'abboccato', 'off dry']],
	[1, ['trocken', 'sec', 'secco', 'seco', 'dry']]
];
// "Spätlese trocken" is dry: an explicit dryness word beats a ripeness level
export const DRY_WORDS = ['trocken', 'sec', 'secco', 'seco', 'dry'];

const has = (text: string, word: string) => ` ${text} `.includes(` ${word} `);

export interface LabelTerms {
	tier: Tier;
	/** what the label says about sweetness, if anything */
	sweetness?: Level;
	/** the words that decided it, for tests and explanations */
	matched: string[];
}

/**
 * Reads the label's words: the wine's name and, when there is one, the text read from the
 * label. `price` is per bottle in the user's currency; CHF and EUR are close enough here.
 */
export function readTerms(input: {
	text: string;
	color: Color;
	country?: string | null;
	price?: number | null;
}): LabelTerms {
	const text = normalize(input.text);
	const matched: string[] = [];
	let tier: Tier = 'standard';
	let tierFound = false;
	for (const [t, term] of TIERS) {
		if (term.countries && input.country && !term.countries.includes(input.country)) continue;
		if (term.colors && !term.colors.includes(input.color)) continue;
		const word = term.words.find((w) => has(text, w));
		if (word) {
			tier = t;
			tierFound = true;
			matched.push(word);
			break;
		}
	}
	// no word on the label: a cheap bottle is made to be drunk young, a costly one to keep
	if (!tierFound && input.price) {
		if (input.price <= PRICE.entry) tier = 'entry';
		else if (input.price >= PRICE.keep) tier = 'premium';
	}

	let sweetness: Level | undefined;
	const scale = input.color === 'sparkling' ? SPARKLING_SWEETNESS : STILL_SWEETNESS;
	for (const [level, words] of scale) {
		const word = words.find((w) => has(text, w));
		if (word) {
			sweetness = level;
			matched.push(word);
			break;
		}
	}
	if (input.color !== 'sparkling' && sweetness && sweetness > 1 && sweetness < 5) {
		const dry = DRY_WORDS.find((w) => has(text, w));
		if (dry) {
			sweetness = 1;
			matched.push(dry);
		}
	}
	return { tier, sweetness, matched };
}

/** The typical window, in years after the vintage, for this tier */
export function windowForTier([from, to]: [number, number], tier: Tier, color: Color): [number, number] {
	switch (tier) {
		case 'entry': {
			// ready on release, best within a few years
			const start = Math.min(from, 1);
			return [start, Math.min(to, start + (color === 'red' ? ENTRY_YEARS.red : ENTRY_YEARS.other))];
		}
		case 'premium':
		case 'top':
			return [from + TIER_SHIFT[tier][0], to + TIER_SHIFT[tier][1]];
		default:
			return [from, to];
	}
}
