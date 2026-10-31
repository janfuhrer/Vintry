// Maps a spreadsheet (CSV rows) onto wine form fields. Runs in the browser for the preview;
// the server validates every row again with the same rules as the wine form.
import type { CsvRecord } from './csv';
import { COLORS, type Color } from './data/types';
import { countryIndex, findGrape, normalize } from './wine';

/** Form fields of one wine, plus the spreadsheet row it came from (`_row`) for error messages */
export type ImportRow = Record<string, string | string[]>;

/** Header names people use, normalised (lower case, no accents), per form field */
const ALIASES: Record<string, string[]> = {
	name: ['name', 'wine', 'wein', 'vin', 'bezeichnung', 'weinname', 'nom', 'wine name'],
	producer: ['producer', 'produzent', 'weingut', 'winery', 'domaine', 'erzeuger', 'hersteller', 'producteur'],
	vintage: ['vintage', 'jahrgang', 'year', 'jahr', 'millesime'],
	color: ['color', 'colour', 'farbe', 'art', 'type', 'typ', 'couleur', 'wine type'],
	country: ['country', 'land', 'pays'],
	region: ['region', 'gebiet', 'anbaugebiet', 'appellation'],
	grapes: [
		'grapes',
		'grape',
		'trauben',
		'traube',
		'rebsorte',
		'rebsorten',
		'sorte',
		'cepage',
		'cepages',
		'variety'
	],
	alcohol: ['alcohol', 'alkohol', 'alc', 'vol', 'abv'],
	size_ml: ['size ml', 'size', 'grosse', 'flaschengrosse', 'inhalt', 'volume', 'ml'],
	quantity: [
		'quantity',
		'anzahl',
		'menge',
		'bottles',
		'flaschen',
		'stuck',
		'qty',
		'bestand',
		'user cellar count'
	],
	location: ['location', 'lagerort', 'ort', 'regal', 'platz', 'fach'],
	drink_from: ['drink from', 'trinken ab', 'ab', 'from'],
	drink_to: ['drink to', 'drink by', 'trinken bis', 'bis', 'to', 'until'],
	// "Average rating" (a community score, e.g. Vivino's) is deliberately not the user's rating
	rating: ['rating', 'bewertung', 'note', 'sterne', 'stars', 'score', 'your rating', 'my rating'],
	notes: [
		'notes',
		'notizen',
		'notiz',
		'kommentar',
		'comment',
		'bemerkung',
		'remarks',
		'your review',
		'personal note'
	],
	purchased_on: ['purchased on', 'gekauft am', 'kaufdatum', 'datum', 'date', 'bought'],
	purchased_at: ['purchased at', 'gekauft bei', 'handler', 'shop', 'laden', 'bezugsquelle', 'store'],
	price: ['price', 'preis', 'kosten', 'prix', 'cost', 'wine price'],
	gifted_by: ['gifted by', 'geschenk von', 'geschenkt von', 'gift from', 'geschenk']
};
const FIELD_BY_HEADER = new Map(
	Object.entries(ALIASES).flatMap(([field, names]) => names.map((n) => [n, field] as const))
);

const COLOR_WORDS: Record<string, Color> = {
	rot: 'red',
	rotwein: 'red',
	rouge: 'red',
	rosso: 'red',
	tinto: 'red',
	weiss: 'white',
	weisswein: 'white',
	blanc: 'white',
	bianco: 'white',
	blanco: 'white',
	rosato: 'rose',
	rosado: 'rose',
	schaumwein: 'sparkling',
	sekt: 'sparkling',
	champagner: 'sparkling',
	champagne: 'sparkling',
	prosecco: 'sparkling',
	cava: 'sparkling',
	cremant: 'sparkling',
	mousseux: 'sparkling',
	spumante: 'sparkling',
	petillant: 'sparkling',
	effervescent: 'sparkling',
	susswein: 'sweet',
	suss: 'sweet',
	dessertwein: 'sweet',
	dessert: 'sweet',
	liquoreux: 'sweet',
	doux: 'sweet',
	moelleux: 'sweet',
	likorwein: 'fortified',
	port: 'fortified',
	portwein: 'fortified',
	porto: 'fortified',
	sherry: 'fortified',
	madeira: 'fortified',
	marsala: 'fortified'
};

export interface ColumnMapping {
	header: string;
	field: string | null;
}

/** Undoes the export's formula guard and trims */
const cell = (s: string | undefined) => (s ?? '').trim().replace(/^'(?=[=+\-@])/, '');

/** "Rot", "White wine", "Rosé", "Champagne" → a colour; unknown → '' (decided later) */
function color(v: string): string {
	for (const word of normalize(v).split(' ')) {
		if ((COLORS as readonly string[]).includes(word)) return word;
		if (COLOR_WORDS[word]) return COLOR_WORDS[word];
	}
	return '';
}

/** "1.5.2024", "01/05/2024", US "12/31/2024", "2024-05-01" → "2024-05-01" (validated server-side) */
function isoDate(v: string): string {
	const s = v.trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
	if (!m) return '';
	let [day, month] = [Number(m[1]), Number(m[2])];
	// day first, as in Europe, unless that can't be: "12/31/2024" is month first
	if (month > 12 && day <= 12) [day, month] = [month, day];
	return `${m[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "CHF 32.50", "SFr. 25.-", "29,90 €", "€ 1.250", "1'250.50" → "32.50", "25", "29.90", "1250", "1250.50" */
function number(v: string): string {
	let s = v
		.replace(/[\p{L}$€£¥]+\.?/gu, '') // currency words and symbols, "SFr." included
		.replace(/['’\s]/g, '')
		.replace(/[.,]-+$/, '') // "25.-"
		.replace(/^[.,]+/, '');
	if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return s.replace(/[.,]/g, ''); // thousands only: "1.250"
	if (/,\d{1,2}$/.test(s))
		s = s.replace(/\./g, '').replace(',', '.'); // decimal comma
	else s = s.replace(/,/g, '');
	return /^-?\d+(\.\d+)?$/.test(s) ? s : '';
}

/** "75 cl", "0,75 l", "750" → "750" */
function sizeMl(v: string): string {
	const m = v.replace(',', '.').match(/([\d.]+)\s*(ml|cl|l)?/i);
	if (!m) return '';
	const n = Number(m[1]);
	const unit = (m[2] ?? (n < 10 ? 'l' : n < 100 ? 'cl' : 'ml')).toLowerCase();
	const ml = Math.round(unit === 'ml' ? n : unit === 'cl' ? n * 10 : n * 1000);
	return ml > 0 && ml <= 30000 ? String(ml) : '';
}

/** Ratings out of 5, or scores out of 20 or 100, as 1–5 stars; anything else is dropped */
function stars(v: string): string {
	const n = Number(number(v));
	if (!n || n < 0) return '';
	const out = n <= 5 ? n : n <= 20 ? n / 4 : n <= 100 ? n / 20 : NaN;
	return Number.isFinite(out) ? String(Math.min(5, Math.max(1, Math.round(out)))) : '';
}

const year = (v: string) => (/^(1[89]\d{2}|2[01]\d{2})$/.test(v.trim()) ? v.trim() : '');

/**
 * Optional fields with a value that can't be right are left empty instead of rejecting
 * the whole row ("NV" vintage, a 92-point score, "75 cl" in an alcohol column).
 */
const FIELD: Record<string, (v: string) => string | string[]> = {
	grapes: (v) =>
		v
			.split(/[;,/|+]| und | and | et | e /)
			.map((g) => g.trim())
			.filter(Boolean),
	color,
	purchased_on: isoDate,
	price: number,
	alcohol: (v) => {
		if (/\b(cl|ml|l)\b/i.test(v)) return '';
		const n = Number(number(v));
		return n >= 4 && n <= 25 ? String(n) : '';
	},
	size_ml: sizeMl,
	vintage: year,
	drink_from: year,
	drink_to: year,
	quantity: (v) => (/^\d{1,4}$/.test(v.trim()) ? v.trim() : ''),
	rating: stars,
	country: (v) => countryIndex.get(normalize(v))?.code ?? ''
};

export function mapTable(records: CsvRecord[]): { columns: ColumnMapping[]; rows: ImportRow[] } {
	const [header, ...body] = records;
	const columns = (header?.cells ?? []).map((h) => {
		const n = normalize(h);
		return { header: h.trim(), field: FIELD_BY_HEADER.get(n) ?? null };
	});
	// first column wins when two headers map to the same field
	const seen = new Set<string>();
	for (const c of columns) {
		if (c.field && seen.has(c.field)) c.field = null;
		else if (c.field) seen.add(c.field);
	}
	const rows = body.map((record) => {
		const row: ImportRow = { _row: String(record.row) };
		columns.forEach((c, i) => {
			const raw = cell(record.cells[i]);
			if (!c.field || !raw) return;
			const v = FIELD[c.field] ? FIELD[c.field](raw) : raw;
			if (v.length) row[c.field] = v;
		});
		// no usable colour: decide from the grapes, as the label parser does
		if (!row.color && Array.isArray(row.grapes)) {
			const colors = new Set(row.grapes.map((g) => findGrape(g)?.color).filter(Boolean));
			if (colors.size === 1) row.color = [...colors][0]!;
		}
		return row;
	});
	return { columns, rows: rows.filter((r) => typeof r.name === 'string' && r.name) };
}
