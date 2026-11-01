// Builds data/xwines.tsv.gz, Vintry's reference list of wines, from the X-Wines dataset
// (CC0, de Azambuja, Morais & Filipe 2023, https://doi.org/10.3390/bdcc7010020).
//
//   node scripts/xwines.mjs path/to/XWines_Full_100K_wines.csv
//
// Kept per wine: producer, name, type, country, region, grapes, alcohol and body. Left out:
// acidity (79 % of the wines say "High", which tells nothing), pairings, websites, vintages, ids.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const source = process.argv[2];
if (!source) {
	console.error('usage: node scripts/xwines.mjs XWines_Full_100K_wines.csv');
	process.exit(2);
}

/** RFC 4180: quoted fields may hold commas, quotes ("") and line breaks */
function* records(text) {
	let field = '';
	let row = [];
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i];
		if (quoted) {
			if (c === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') {
			row.push(field);
			field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && text[i + 1] === '\n') i++;
			row.push(field);
			yield row;
			row = [];
			field = '';
		} else field += c;
	}
	if (field || row.length) yield [...row, field];
}

const COLOR = {
	Red: 'red',
	White: 'white',
	Rosé: 'rose',
	Sparkling: 'sparkling',
	Dessert: 'sweet',
	'Dessert/Port': 'fortified'
};
const BODY = {
	'Very light-bodied': 1,
	'Light-bodied': 2,
	'Medium-bodied': 3,
	'Full-bodied': 4,
	'Very full-bodied': 5
};
/** "['Merlot', 'Syrah/Shiraz']" → ["Merlot", "Syrah/Shiraz"] */
const list = (s) =>
	[...s.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g)]
		.map((m) => (m[1] ?? m[2]).trim())
		.filter(Boolean);
const clean = (s) => s.replace(/[\t\r\n]+/g, ' ').trim();

const it = records(readFileSync(source, 'utf8'));
const header = it.next().value;
const col = Object.fromEntries(header.map((h, i) => [h, i]));
for (const need of ['WineName', 'WineryName', 'Type', 'Code', 'RegionName', 'Grapes', 'ABV', 'Body'])
	if (!(need in col)) throw new Error(`column ${need} missing`);

const lines = ['producer\tname\tcolor\tcountry\tregion\tgrapes\talcohol\tbody'];
const seen = new Set();
for (const r of it) {
	if (r.length < header.length) continue;
	const producer = clean(r[col.WineryName]);
	const name = clean(r[col.WineName]);
	if (!producer || !name) continue;
	const key = `${producer}\t${name}`.toLowerCase();
	if (seen.has(key)) continue;
	seen.add(key);
	const abv = Number(r[col.ABV]);
	lines.push(
		[
			producer,
			name,
			COLOR[r[col.Type]] ?? '',
			/^[A-Z]{2}$/.test(r[col.Code]) ? r[col.Code] : '',
			clean(r[col.RegionName]),
			list(r[col.Grapes]).join('|'),
			abv >= 3 && abv <= 25 ? String(abv) : '',
			BODY[r[col.Body]] ?? ''
		].join('\t')
	);
}

const root = new URL('..', import.meta.url);
mkdirSync(new URL('data/', root), { recursive: true });
const gz = gzipSync(lines.join('\n') + '\n', { level: 9 });
writeFileSync(new URL('data/xwines.tsv.gz', root), gz);
console.log(`${lines.length - 1} wines, ${(gz.length / 1024 / 1024).toFixed(1)} MB → data/xwines.tsv.gz`);
