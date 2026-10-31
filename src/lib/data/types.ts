export const COLORS = ['red', 'white', 'rose', 'sparkling', 'sweet', 'fortified'] as const;
export type Color = (typeof COLORS)[number];

/** 1 = very low … 5 = very high */
export type Level = 1 | 2 | 3 | 4 | 5;

/** Years after the vintage: [ready from, drink by] */
export type Aging = [number, number];

export interface Grape {
	/** Canonical display name, e.g. "Pinot Noir" */
	name: string;
	/** Other names a label may use, e.g. ["Spätburgunder", "Blauburgunder"] */
	synonyms: string[];
	color: 'red' | 'white';
	body: Level;
	acidity: Level;
	tannin: Level;
	sweetness: Level;
	age: Aging;
	/** 3–4 plain aroma words per language */
	aroma: { en: string[]; de: string[] };
	/** 3–4 dishes or foods it goes well with, short and everyday, per language */
	pairing: { en: string[]; de: string[] };
}

export interface Region {
	/** Canonical display name, e.g. "Valais" */
	name: string;
	/** Other spellings/languages, e.g. ["Wallis"] */
	synonyms: string[];
	/** ISO 3166-1 alpha-2, upper case */
	country: string;
	/** Typical grapes, by Grape.name */
	grapes: string[];
	/** Overrides the grape-based window when set */
	age?: Aging;
	/** Set when the region implies a style, e.g. Champagne → sparkling */
	color?: Color;
}

export interface Country {
	/** ISO 3166-1 alpha-2, upper case */
	code: string;
	/** Names in en/de/fr/it/es (deduplicated) for matching OCR text */
	names: string[];
}
