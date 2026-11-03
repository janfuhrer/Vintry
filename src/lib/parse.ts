import { countries } from './data/countries';
import type { Color, Grape, Region } from './data/types';
import { findRegion, grapeIndex, normalize, regionIndex } from './wine';

export interface OcrLine {
	text: string;
	/** Text size in px (a line box's smaller side); the biggest text is usually the name */
	height: number;
	/** Where the line's box starts and how wide it is, in px, when the reader says */
	left?: number;
	width?: number;
}

export interface Parsed {
	name?: string;
	producer?: string;
	vintage?: number;
	color?: Color;
	country?: string;
	region?: string;
	grapes?: string[];
	alcohol?: number;
	size_ml?: number;
}

// names only: two-letter codes would match random OCR tokens ("it", "de")
const countryNames = new Map<string, string>();
for (const c of countries) for (const n of c.names) countryNames.set(normalize(n), c.code);
// Adjectives labels use for the origin ("Schweizer Rotwein", "vino italiano"). Some are
// surnames too ("Weingut Schweizer"), so they only count when nothing better names the country.
const countryAdjectives = new Map(
	Object.entries({
		schweizer: 'CH',
		svizzero: 'CH',
		svizzera: 'CH',
		italiano: 'IT',
		italienischer: 'IT',
		francais: 'FR',
		francaise: 'FR',
		franzosischer: 'FR',
		espanol: 'ES',
		spanischer: 'ES',
		portugues: 'PT',
		deutscher: 'DE',
		osterreichischer: 'AT',
		osterreichisch: 'AT'
	})
);

type Place = { kind: 'grape'; grape: Grape } | { kind: 'region'; region: Region };
const places = new Map<string, Place>();
for (const [k, region] of regionIndex) places.set(k, { kind: 'region', region });
for (const [k, grape] of grapeIndex) places.set(k, { kind: 'grape', grape });

const PRODUCER_WORDS = [
	'chateau',
	'domaine',
	'domaines',
	'weingut',
	'tenuta',
	'tenute',
	'finca',
	'bodega',
	'bodegas',
	'cantina',
	'cantine',
	'maison',
	'azienda',
	'cave',
	'caves',
	'clos',
	'castello',
	'fattoria',
	'quinta',
	'herdade',
	'podere',
	'winery',
	'vineyards',
	'cellars',
	'estate',
	'weinbau',
	'kellerei',
	'cellier',
	'mas',
	'schloss'
];

const COLOR_WORDS: [Color, string[]][] = [
	// most specific first: "rosé brut" is sparkling, "vin rouge doux" is sweet
	[
		'sparkling',
		[
			'brut',
			'spumante',
			'cremant',
			'cava',
			'prosecco',
			'champagne',
			'sekt',
			'frizzante',
			'franciacorta',
			'mousseux',
			'extra dry',
			'pet nat'
		]
	],
	['fortified', ['porto', 'port wine', 'sherry', 'jerez', 'madeira', 'marsala', 'vin doux naturel']],
	[
		'sweet',
		[
			'sauternes',
			'auslese',
			'beerenauslese',
			'trockenbeerenauslese',
			'eiswein',
			'ice wine',
			'tokaji',
			'passito',
			'recioto',
			'selection de grains nobles',
			'vendange tardive',
			'liquoreux',
			'moelleux'
		]
	],
	['rose', ['rose', 'rosato', 'rosado', 'oeil de perdrix', 'weissherbst']],
	['white', ['blanc', 'bianco', 'blanco', 'weiss', 'weisswein', 'white', 'branco']],
	['red', ['rouge', 'rosso', 'tinto', 'rot', 'rotwein', 'red', 'tinta']]
];

const VINTAGE = /\b(19[5-9]\d|20[0-4]\d)\b/g;
// "13,5% vol", and "12,5° vol" as older French and Spanish labels write it (° only before
// "vol", so "serve at 16°" never counts); OCR may break the line before the sign or "vol"
const ALCOHOL = /\b(\d{1,2})\s?[.,]\s?(\d)\s{0,2}(?:%|°(?=\s{0,2}vol))\s{0,2}(vol)?/i;
const ALCOHOL_INT = /\b(\d{1,2})\s{0,2}[%°]\s{0,2}vol/i;
// "el" is OCR's reading of "cl"
const SIZE = /\b(\d{1,4}(?:[.,]\d{1,3})?)\s?(ml|cl|el|l|ltr|litre|liter)\b/i;
// OCR reads the "l" of "0,75 l" as 1, I or |
const SIZE_OCR_LITRE = /\b(0[.,]\d{2,3}|1[.,]5|3[.,]0)\s?[1Il|](?![\d%])/;

/** Tokens that only describe the appellation, colour or origin, never the wine's own name */
const META_WORDS = new Set(
	(
		'aoc aop doc docg dop do doca dac igt igp qba vdp vqa ava cru grand premier ' +
		'appellation controlee protegee denominazione denominacion origine origen controllata garantita calificada ' +
		'vin vino vinho wein wine qualitatswein landwein tafelwein rotwein weisswein rosewein schaumwein susswein ' +
		'rouge rosso tinto rot red blanc bianco blanco weiss white ' +
		'rose rosato rosado du de di del della des d la le et and of from von aus'
	).split(' ')
);
/** Words that make a line boilerplate on their own; articles and colours alone don't ("La Rose") */
const STRONG_META = new Set(
	(
		'aoc aop doc docg dop do doca dac igt igp qba vdp vqa ava appellation controlee protegee denominazione ' +
		'denominacion origine origen controllata garantita calificada vin vino vinho wein wine qualitatswein landwein tafelwein ' +
		'rotwein weisswein rosewein schaumwein susswein'
	).split(' ')
);
const APPELLATION_TAG = /\s+\b(aoc|aop|doc|docg|dop|do|doca|dac|igt|igp)\b\.?$/i;

/** Finds the longest known names in the text; each span is used once */
function matchAll<T>(text: string, keys: Map<string, T>, minLength = 4): T[] {
	let work = ` ${text} `;
	const found: T[] = [];
	const sorted = [...keys.keys()].filter((k) => k.length >= minLength).sort((a, b) => b.length - a.length);
	for (const key of sorted) {
		const needle = ` ${key} `;
		const at = work.indexOf(needle);
		if (at === -1) continue;
		found.push(keys.get(key)!);
		work = work.slice(0, at) + ' '.repeat(needle.length - 1) + work.slice(at + needle.length - 1);
	}
	return found;
}

export function titleCase(s: string): string {
	const letters = s.replace(/[^\p{L}]/gu, '');
	if (!letters || letters !== letters.toUpperCase()) return s;
	return s.toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());
}

/** Drops OCR noise: stray symbols at the edges, mostly non-letter lines */
function clean(line: string): string {
	const s = line
		.replace(/^[^\p{L}\d]+|[^\p{L}\d.)]+$/gu, '')
		.replace(/\s+/g, ' ')
		.trim();
	const letters = (s.match(/\p{L}/gu) ?? []).length;
	return letters >= 3 && letters / s.replace(/\s/g, '').length >= 0.6 ? s : '';
}

/**
 * OCR splits letter-spaced capitals: "CHÂTEAU M ONTLAURENT". In an all-caps line a lone
 * capital before a capitalised word is glued back, except letters that are words themselves.
 */
export function joinSplitCaps(line: string): string {
	// in capitals, a lone |, l or 1 is OCR's reading of the letter I ("| SODI" → "I SODI")
	const capsOnly = line.replace(/(^|\s)[|l1](?=\s+\p{Lu}{2,})/gu, '$1I');
	if (capsOnly !== line) line = capsOnly;
	const letters = line.replace(/[^\p{L}]/gu, '');
	if (letters.length < 4 || letters !== letters.toUpperCase()) return line;
	// only right after a word of 2+ letters (or at the start), so initials like "J P MOUEIX"
	// stay apart; A, À, E, É, I, O, Y are words themselves ("I SODI", "ROSSO E BIANCO")
	return line.replace(/(^|\p{L}{2,}\s)([^\sAÀEÉIOY\P{Lu}])\s(?=\p{Lu}{3,})/gu, '$1$2');
}

/**
 * Drops text from around the bottle: a box behind it, a neighbouring bottle. A label's lines
 * share one centre; a line further off than half the label's widest line belongs to something
 * else. Only when the reader gave positions, and enough lines to tell.
 */
export function dropBackground(lines: OcrLine[]): OcrLine[] {
	const placed = lines.filter((l) => l.left !== undefined && l.width !== undefined);
	if (placed.length < 4) return lines;
	const centre = (l: OcrLine) => l.left! + l.width! / 2;
	const centres = placed.map(centre).sort((a, b) => a - b);
	const middle = centres[Math.floor(centres.length / 2)];
	const widths = placed.map((l) => l.width!).sort((a, b) => a - b);
	// the widest label lines, not a stray wide one: the 80th percentile
	const labelWidth = widths[Math.floor(widths.length * 0.8)];
	return lines.filter((l) => l.left === undefined || Math.abs(centre(l) - middle) <= labelWidth * 0.5);
}

// Sentences, addresses and company details: back-label prose, never a name or a producer
const PROSE = /[.;:!?]$|,|\b\d{4}-\d{3}\b|\b\d{4,5}\b.*\b[a-z]{3,}|www\.|@|https?:/i;
const COMPANY =
	/\b(lda|ld[aª]|soc|s\.?a\.?|s\.?l\.?|s\.?r\.?l\.?|s\.?p\.?a\.?|gmbh|ag|sarl|sas|ltd|inc)\b\.?/i;
const FOUNDED = /\b(fondee|founded|depuis|since|seit|dal|desde|est)\b/;
// medals and awards on the bottle: "Mundus Vini", "Wine Award", "Médaille d'or"
const AWARD =
	/\b(award|awards|medaille|medal|medaglia|medalla|concours|mundus|gold|silver|bronze|decanter|challenge)\b/;

function looksLikeProse(s: string): boolean {
	const words = s.split(/\s+/);
	if (words.length > 5) return true;
	// mostly lower-case words in a row: running text, not a label heading
	const lower = words.filter((w) => /^\p{Ll}/u.test(w)).length;
	return words.length >= 3 && lower >= words.length - 1;
}

/**
 * The lines worth offering to tap into name or producer: short, readable, no sentences or
 * pure numbers, each once, in the order read. The parser may pick the wrong one; with these
 * the right one is a tap away.
 */
export function labelLines(text: string, max = 14): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of text.split('\n')) {
		const line = clean(joinSplitCaps(raw)).replace(VINTAGE, '').replace(/\s+/g, ' ').trim();
		const key = normalize(line);
		if (!line || line.length > 40 || seen.has(key) || looksLikeProse(line) || PROSE.test(line)) continue;
		if (ALCOHOL.test(line) || ALCOHOL_INT.test(line) || SIZE.test(line)) continue;
		seen.add(key);
		out.push(line);
		if (out.length >= max) break;
	}
	return out;
}

export function parseLabel(input: OcrLine[], year = new Date().getFullYear()): Parsed {
	const lines = input.map((l) => ({ ...l, text: joinSplitCaps(l.text) }));
	const raw = lines.map((l) => l.text).join('\n');
	const text = normalize(raw);
	const out: Parsed = {};

	const vintages = [...raw.matchAll(VINTAGE)].map((m) => Number(m[1])).filter((y) => y <= year);
	if (vintages.length) out.vintage = Math.max(...vintages);

	const alc = raw.match(ALCOHOL) ?? null;
	if (alc) out.alcohol = Number(`${alc[1]}.${alc[2]}`);
	else {
		const alcInt = raw.match(ALCOHOL_INT);
		if (alcInt) out.alcohol = Number(alcInt[1]);
	}
	if (out.alcohol !== undefined && (out.alcohol < 4 || out.alcohol > 25)) delete out.alcohol;

	// the first size that is a real bottle: "Depuis 1898 L'Esprit…" reads as "1898 L" before "75 cl"
	const sizes = [
		...[...raw.matchAll(new RegExp(SIZE, 'gi'))].map((m) => [m[1], m[2]]),
		...[...raw.matchAll(new RegExp(SIZE_OCR_LITRE, 'g'))].map((m) => [m[1], 'l'])
	];
	for (const [num, u] of sizes) {
		const n = Number(num.replace(',', '.'));
		const unit = u.toLowerCase();
		const ml = Math.round(unit === 'ml' ? n : unit === 'cl' || unit === 'el' ? n * 10 : n * 1000);
		// within 1 % of a real bottle size: OCR reads "750ml" as "756ml" now and then
		const bottle = [187, 375, 500, 750, 1000, 1500, 3000, 6000].find((s) => Math.abs(ml - s) <= s * 0.01);
		if (bottle) {
			out.size_ml = bottle;
			break;
		}
	}

	// one longest-first pass, so "Müller-Thurgau" doesn't also count as the Thurgau region
	// and "Vino Nobile di Montepulciano" not as the Montepulciano grape
	const hits = matchAll(text, places);
	const region = hits.find((h) => h.kind === 'region')?.region;
	if (region) out.region = region.name;

	const grapes = [...new Set(hits.flatMap((h) => (h.kind === 'grape' ? [h.grape] : [])))];
	if (grapes.length) out.grapes = grapes.map((g) => g.name);

	const country = matchAll(text, countryNames)[0];
	out.country = country ?? region?.country ?? matchAll(text, countryAdjectives)[0];
	if (!out.country) delete out.country;

	for (const [color, words] of COLOR_WORDS) {
		if (words.some((w) => ` ${text} `.includes(` ${w} `))) {
			out.color = color;
			break;
		}
	}
	if (!out.color && region?.color) out.color = region.color;
	if (!out.color && grapes.length) {
		const colors = new Set(grapes.map((g) => g.color));
		if (colors.size === 1) out.color = grapes[0].color;
	}
	// OCR swaps 3 and 8: "13%" becomes "18%". Table wines stop around 16.5 %; above that only
	// fortified and sweet wines are plausible, so leave the field empty rather than wrong.
	if (out.alcohol !== undefined && out.alcohol > 16.5 && out.color !== 'fortified' && out.color !== 'sweet')
		delete out.alcohol;

	// producer and name: from the label only, not a box behind the bottle (alcohol, vintage
	// and the like above come from all lines: a back label's columns would look off-centre)
	const cleaned = dropBackground(lines)
		.map((l) => ({ text: clean(l.text), height: l.height }))
		.filter((l) => l.text);
	// bottling, import and distribution lines name a company, not the wine's producer
	const BOTTLING =
		/^(mis en bouteille|mise en bouteille|imbottigliato|abgefullt|embotellado|bottled|estate bottled|produced|prodotto|elabore|imported|importe|importiert|importato|importado|distributed|vertrieb)/;
	const isProducer = (l: { text: string }) => {
		const n = normalize(l.text);
		return (
			!BOTTLING.test(n) &&
			!FOUNDED.test(n) &&
			!PROSE.test(l.text) &&
			!COMPANY.test(l.text) &&
			!looksLikeProse(l.text) &&
			n.split(' ').length <= 6 &&
			n.split(' ').some((w) => PRODUCER_WORDS.includes(w))
		);
	};
	let producerLine = cleaned.find(isProducer);
	// "DOMAINE" on a line of its own, the name on the next: "Domaine Derron"
	if (producerLine && normalize(producerLine.text).split(' ').length === 1) {
		const next = cleaned[cleaned.indexOf(producerLine) + 1];
		if (
			next &&
			!PROSE.test(next.text) &&
			normalize(next.text).split(' ').length <= 4 &&
			!/\d/.test(next.text)
		)
			producerLine = {
				text: `${producerLine.text} ${next.text}`,
				height: Math.max(producerLine.height, next.height)
			};
		else producerLine = undefined;
	}
	if (producerLine) out.producer = titleCase(producerLine.text);

	// name: the tallest line that isn't just metadata
	// a line that is only appellation, colour, origin words and place names ("du Valais AOC",
	// "Vin blanc de Suisse") describes the wine but isn't its name. A grape alone ("Fendant")
	// often is the name, so grapes don't count here.
	// A region heading the line ("BAROLO DOCG", "Chablis Premier Cru") may well be the name;
	// after a preposition or a wine word ("du Valais AOC", "Grand Vin de Bordeaux") it only
	// says where the wine is from. Articles and colours alone don't make boilerplate ("La Rose").
	const PREPOSITIONS = new Set(['du', 'de', 'des', 'd', 'di', 'del', 'della', 'von', 'aus', 'from', 'of']);
	const WINE_WORDS = new Set(['vin', 'vino', 'vinho', 'wein', 'wine']);
	const onlyDescribes = (n: string) => {
		let rest = ` ${n} `;
		let afterPreposition = false;
		for (const r of [...regionIndex.keys()].sort((a, b) => b.length - a.length)) {
			const at = rest.indexOf(` ${r} `);
			if (at === -1) continue;
			const before = rest.slice(0, at).trim().split(' ').pop() ?? '';
			if (PREPOSITIONS.has(before)) afterPreposition = true;
			rest = rest.slice(0, at) + ' _region_ ' + rest.slice(at + r.length + 2);
		}
		// normalized text is [a-z0-9 ], so the marker can't collide with label words
		const hadRegion = rest.includes('_region_');
		const words = rest
			.replace(/_region_/g, ' ')
			.split(' ')
			.filter(Boolean);
		const origin = (w: string) => countryNames.has(w) || countryAdjectives.has(w);
		if (!words.every((w) => META_WORDS.has(w) || origin(w))) return false;
		if (hadRegion) return afterPreposition || words.some((w) => WINE_WORDS.has(w));
		return words.length > 0 && words.some((w) => STRONG_META.has(w) || origin(w));
	};
	const isMeta = (s: string) => {
		const n = normalize(s);
		const stripped = n.replace(VINTAGE, '').trim();
		return (
			!stripped ||
			ALCOHOL.test(s) ||
			ALCOHOL_INT.test(s) ||
			SIZE.test(s) ||
			countryNames.has(stripped) ||
			onlyDescribes(stripped) ||
			/^(appellation|denominazione|produce|product|produit|prodotto|producto|contains|contient|contiene|enthalt|mis en bouteille|imbottigliato|abgefullt)/.test(
				n
			)
		);
	};
	const candidates = cleaned
		.filter(
			(l) =>
				l !== producerLine &&
				(!producerLine || !producerLine.text.includes(l.text)) &&
				!isMeta(l.text) &&
				!looksLikeProse(l.text) &&
				!PROSE.test(l.text) &&
				!COMPANY.test(l.text) &&
				!FOUNDED.test(normalize(l.text)) &&
				!AWARD.test(normalize(l.text))
		)
		// biggest first; without sizes (all alike) the order on the label decides
		.sort((a, b) => b.height - a.height);
	// on château/domaine labels the estate is the biggest text and is the wine's name
	const nameLine =
		producerLine && (!candidates[0] || producerLine.height >= candidates[0].height)
			? producerLine
			: candidates[0];
	if (nameLine) {
		out.name = titleCase(nameLine.text.replace(VINTAGE, '').trim().replace(APPELLATION_TAG, ''));
	} else if (out.producer) {
		out.name = out.producer;
	} else if (region) {
		out.name = region.name;
	}
	// A region as the tallest line ("SAUTERNES" over the château) usually names the appellation:
	// a producer line of at least 60 % of its height is the better name. A tiny estate line
	// under a big "BAROLO" stays the producer.
	if (out.name && findRegion(out.name) && producerLine && producerLine.height >= nameLine!.height * 0.6) {
		out.name = titleCase(producerLine.text);
	}
	// a region line is a fine name ("Barolo"), but prefer a fancier one if it's as tall
	else if (
		out.name &&
		findRegion(out.name) &&
		candidates[1] &&
		candidates[1].height >= nameLine!.height * 0.9
	) {
		out.name = titleCase(candidates[1].text.replace(VINTAGE, '').trim().replace(APPELLATION_TAG, ''));
	}

	return out;
}
