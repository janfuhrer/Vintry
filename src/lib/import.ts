// Maps a spreadsheet (CSV rows) onto wine form fields. Runs in the browser for the preview;
// the server validates every row again with the same rules as the wine form.
import { COLORS, type Color } from './data/types';
import { countryIndex, normalize } from './wine';

export type ImportRow = Record<string, string | string[]>;

/** Header names people use, normalised (lower case, no accents), per form field */
const ALIASES: Record<string, string[]> = {
	name: ['name', 'wine', 'wein', 'vin', 'bezeichnung', 'weinname', 'nom'],
	producer: ['producer', 'produzent', 'weingut', 'winery', 'domaine', 'erzeuger', 'hersteller', 'producteur'],
	vintage: ['vintage', 'jahrgang', 'year', 'jahr', 'millesime'],
	color: ['color', 'colour', 'farbe', 'art', 'type', 'typ', 'couleur'],
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
	quantity: ['quantity', 'anzahl', 'menge', 'bottles', 'flaschen', 'stuck', 'qty', 'bestand'],
	location: ['location', 'lagerort', 'ort', 'regal', 'platz', 'fach'],
	drink_from: ['drink from', 'trinken ab', 'ab', 'from'],
	drink_to: ['drink to', 'drink by', 'trinken bis', 'bis', 'to', 'until'],
	rating: ['rating', 'bewertung', 'note', 'sterne', 'stars', 'score'],
	notes: ['notes', 'notizen', 'notiz', 'kommentar', 'comment', 'bemerkung', 'remarks'],
	purchased_on: ['purchased on', 'gekauft am', 'kaufdatum', 'datum', 'date', 'bought'],
	purchased_at: ['purchased at', 'gekauft bei', 'handler', 'shop', 'laden', 'bezugsquelle', 'store'],
	price: ['price', 'preis', 'kosten', 'prix', 'cost'],
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
	prosecco: 'sparkling',
	cava: 'sparkling',
	cremant: 'sparkling',
	mousseux: 'sparkling',
	spumante: 'sparkling',
	susswein: 'sweet',
	suss: 'sweet',
	dessertwein: 'sweet',
	dessert: 'sweet',
	liquoreux: 'sweet',
	likorwein: 'fortified',
	port: 'fortified',
	portwein: 'fortified',
	sherry: 'fortified',
	madeira: 'fortified'
};

export interface ColumnMapping {
	header: string;
	field: string | null;
}

/** Undoes the export's formula guard and trims */
const cell = (s: string | undefined) => (s ?? '').trim().replace(/^'(?=[=+\-@])/, '');

function color(v: string): string {
	const n = normalize(v);
	if ((COLORS as readonly string[]).includes(n)) return n;
	return COLOR_WORDS[n] ?? COLOR_WORDS[n.split(' ')[0]] ?? '';
}

/** "1.5.2024", "01/05/2024", "2024-05-01" → "2024-05-01" */
function isoDate(v: string): string {
	const s = v.trim();
	if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
	const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
	return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s;
}

/** "CHF 32.50", "32,50 €", "1'250.–" → "32.50" / "1250" */
function number(v: string): string {
	const s = v
		.replace(/['’\s]/g, '')
		.replace(/[^\d.,-]/g, '')
		.replace(/[.,]-+$/, '');
	return /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
}

/** "75 cl", "0,75 l", "750" → "750" */
function sizeMl(v: string): string {
	const m = v.replace(',', '.').match(/([\d.]+)\s*(ml|cl|l)?/i);
	if (!m) return '';
	const n = Number(m[1]);
	const unit = (m[2] ?? (n < 10 ? 'l' : n < 100 ? 'cl' : 'ml')).toLowerCase();
	return String(Math.round(unit === 'ml' ? n : unit === 'cl' ? n * 10 : n * 1000));
}

export function mapTable(table: string[][]): { columns: ColumnMapping[]; rows: ImportRow[] } {
	const [header = [], ...body] = table;
	const columns = header.map((h) => {
		const n = normalize(h);
		return { header: h.trim(), field: FIELD_BY_HEADER.get(n) ?? null };
	});
	// first column wins when two headers map to the same field
	const seen = new Set<string>();
	for (const c of columns) {
		if (c.field && seen.has(c.field)) c.field = null;
		else if (c.field) seen.add(c.field);
	}
	const rows = body.map((r) => {
		const row: ImportRow = {};
		columns.forEach((c, i) => {
			const v = cell(r[i]);
			if (!c.field || !v) return;
			if (c.field === 'grapes')
				row.grapes = v
					.split(/[;,/|+]| und | and /)
					.map((g) => g.trim())
					.filter(Boolean);
			else if (c.field === 'color') row.color = color(v);
			else if (c.field === 'purchased_on') row.purchased_on = isoDate(v);
			else if (c.field === 'price' || c.field === 'alcohol') row[c.field] = number(v);
			else if (c.field === 'size_ml') row.size_ml = sizeMl(v);
			else if (c.field === 'country') row.country = countryIndex.get(normalize(v))?.code ?? '';
			else row[c.field] = v;
		});
		return row;
	});
	return { columns, rows: rows.filter((r) => typeof r.name === 'string' && r.name) };
}
