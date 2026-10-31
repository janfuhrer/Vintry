import { countries } from './data/countries';
import type { Color, Grape, Region } from './data/types';
import { findGrape, findRegion, grapeIndex, normalize, regionIndex } from './wine';

export interface OcrLine {
	text: string;
	/** Line box height in px; the tallest line is usually the wine's name */
	height: number;
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

type Place = { kind: 'grape'; grape: Grape } | { kind: 'region'; region: Region };
const places = new Map<string, Place>();
for (const [k, region] of regionIndex) places.set(k, { kind: 'region', region });
for (const [k, grape] of grapeIndex) places.set(k, { kind: 'grape', grape });

const PRODUCER_WORDS = [
	'chateau', 'domaine', 'weingut', 'tenuta', 'bodega', 'bodegas', 'cantina', 'cantine',
	'maison', 'azienda', 'cave', 'caves', 'clos', 'castello', 'fattoria', 'quinta', 'herdade',
	'podere', 'winery', 'vineyards', 'estate', 'weinbau', 'kellerei', 'cellier', 'mas', 'schloss'
];

const COLOR_WORDS: [Color, string[]][] = [
	// most specific first: "rosé brut" is sparkling, "vin rouge doux" is sweet
	['sparkling', ['brut', 'spumante', 'cremant', 'cava', 'prosecco', 'champagne', 'sekt', 'frizzante', 'franciacorta', 'mousseux', 'extra dry', 'pet nat']],
	['fortified', ['porto', 'port wine', 'sherry', 'jerez', 'madeira', 'marsala', 'vin doux naturel']],
	['sweet', ['sauternes', 'auslese', 'beerenauslese', 'trockenbeerenauslese', 'eiswein', 'ice wine', 'tokaji', 'passito', 'vendange tardive', 'liquoreux', 'moelleux']],
	['rose', ['rose', 'rosato', 'rosado', 'oeil de perdrix', 'weissherbst']],
	['white', ['blanc', 'bianco', 'blanco', 'weiss', 'weisswein', 'white', 'branco']],
	['red', ['rouge', 'rosso', 'tinto', 'rot', 'rotwein', 'red', 'tinta']]
];

const VINTAGE = /\b(19[5-9]\d|20[0-4]\d)\b/g;
const ALCOHOL = /\b(\d{1,2})\s?[.,]\s?(\d)\s?%\s?(vol)?/i;
const ALCOHOL_INT = /\b(\d{1,2})\s?%\s?vol/i;
const SIZE = /\b(\d{2,4}(?:[.,]\d{1,2})?)\s?(ml|cl|l|ltr|litre|liter)\b/i;

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

function titleCase(s: string): string {
	const letters = s.replace(/[^\p{L}]/gu, '');
	if (!letters || letters !== letters.toUpperCase()) return s;
	return s.toLowerCase().replace(/(^|[\s\-'’(])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase());
}

/** Drops OCR noise: stray symbols at the edges, mostly non-letter lines */
function clean(line: string): string {
	const s = line.replace(/^[^\p{L}\d]+|[^\p{L}\d.)]+$/gu, '').replace(/\s+/g, ' ').trim();
	const letters = (s.match(/\p{L}/gu) ?? []).length;
	return letters >= 3 && letters / s.replace(/\s/g, '').length >= 0.6 ? s : '';
}

export function parseLabel(lines: OcrLine[], year = new Date().getFullYear()): Parsed {
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

	const size = raw.match(SIZE);
	if (size) {
		const n = Number(size[1].replace(',', '.'));
		const unit = size[2].toLowerCase();
		const ml = Math.round(unit === 'ml' ? n : unit === 'cl' ? n * 10 : n * 1000);
		if ([187, 375, 500, 750, 1000, 1500, 3000, 6000].includes(ml)) out.size_ml = ml;
	}

	// one longest-first pass, so "Müller-Thurgau" doesn't also count as the Thurgau region
	// and "Vino Nobile di Montepulciano" not as the Montepulciano grape
	const hits = matchAll(text, places);
	const region = hits.find((h) => h.kind === 'region')?.region;
	if (region) out.region = region.name;

	const grapes = [...new Set(hits.flatMap((h) => (h.kind === 'grape' ? [h.grape] : [])))];
	if (grapes.length) out.grapes = grapes.map((g) => g.name);

	const country = matchAll(text, countryNames)[0];
	out.country = country ?? region?.country;
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

	// producer: a line naming an estate
	const cleaned = lines
		.map((l) => ({ text: clean(l.text), height: l.height }))
		.filter((l) => l.text);
	const producerLine = cleaned.find((l) =>
		normalize(l.text).split(' ').some((w) => PRODUCER_WORDS.includes(w))
	);
	if (producerLine) out.producer = titleCase(producerLine.text);

	// name: the tallest line that isn't just metadata
	const isMeta = (s: string) => {
		const n = normalize(s);
		const stripped = n.replace(VINTAGE, '').trim();
		return (
			!stripped ||
			ALCOHOL.test(s) ||
			ALCOHOL_INT.test(s) ||
			SIZE.test(s) ||
			countryNames.has(stripped) ||
			!!findGrape(stripped) ||
			/^(appellation|denominazione|produce|product|contains|enthalt|mis en bouteille|imbottigliato|abgefullt)/.test(n)
		);
	};
	const candidates = cleaned
		.filter((l) => l !== producerLine && !isMeta(l.text))
		.sort((a, b) => b.height - a.height);
	const nameLine = candidates[0];
	if (nameLine) {
		out.name = titleCase(nameLine.text.replace(VINTAGE, '').trim());
	} else if (out.producer) {
		out.name = out.producer;
	} else if (region) {
		out.name = region.name;
	}
	// a region line is a fine name ("Barolo"), but prefer a fancier one if it's as tall
	if (out.name && findRegion(out.name) && candidates[1] && candidates[1].height >= nameLine!.height * 0.9) {
		out.name = titleCase(candidates[1].text.replace(VINTAGE, '').trim());
	}

	return out;
}
