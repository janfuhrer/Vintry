// The label parser on real iPhone photos: Apple's recognised lines (test-data/vision.json, see
// vision.swift) parsed as the add page does, front label then back filling what is still
// empty, and compared with what each wine really is (test-data/truth.json). The photos are
// the owner's and private; without test-data/ this does nothing.
//
//   node tests/photos/score.mjs [-v]
//
// Two modes: "sizes" uses the text size (the smaller side of each line's box), "shortcut" has
// plain text in reading order, as the iOS Shortcut's "Extract Text from Image" gives it.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../..', import.meta.url));
const data = (f) => `${root}test-data/${f}`;
if (!existsSync(data('vision.json')) || !existsSync(data('truth.json'))) {
	console.log('no test-data/vision.json and truth.json: nothing to measure');
	process.exit(0);
}
const server = await createServer({
	root,
	configFile: false,
	logLevel: 'error',
	tsconfig: `${root}tsconfig.vitest.json`,
	server: { middlewareMode: true, hmr: false }
});
const { parseLabel } = await server.ssrLoadModule('/src/lib/parse.ts');
const vision = Object.fromEntries(
	JSON.parse(readFileSync(data('vision.json'), 'utf8')).map((p) => [p.file, p.lines])
);
const { wines } = JSON.parse(readFileSync(data('truth.json'), 'utf8'));
const verbose = process.argv.includes('-v');

const loose = (s) =>
	String(s ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
const has = (want, got) => want.every((w) => loose(got).includes(w));
const lines = (file, mode) =>
	(vision[file] ?? []).map((l) =>
		mode === 'sizes'
			? { text: l.text, height: Math.min(l.width, l.height), left: l.x, width: l.width }
			: { text: l.text, height: 1 }
	);

for (const mode of ['sizes', 'shortcut']) {
	const tally = {};
	const count = (field, ok) => {
		tally[field] ??= [0, 0];
		tally[field][1]++;
		if (ok) tally[field][0]++;
	};
	for (const w of wines) {
		const form = { ...parseLabel(lines(w.front, mode)) };
		if (w.back) for (const [k, v] of Object.entries(parseLabel(lines(w.back, mode)))) form[k] ??= v;
		const ok = {};
		if (w.name) ok.name = has(w.name, form.name);
		if (w.producer) ok.producer = has(w.producer, form.producer) || has(w.producer, form.name);
		if (w.vintage) ok.vintage = form.vintage === w.vintage;
		if (w.color) ok.color = form.color === w.color;
		if (w.country) ok.country = form.country === w.country;
		if (w.alcohol) ok.alcohol = form.alcohol === w.alcohol;
		// what matters most: the wine is recognisable from name and producer together
		ok.identified = has([...(w.name ?? []), ...(w.producer ?? [])], `${form.name} ${form.producer}`);
		for (const [f, v] of Object.entries(ok)) count(f, v);
		if (verbose)
			console.log(
				mode,
				w.front,
				Object.entries(ok)
					.filter(([, v]) => !v)
					.map(([f]) => f)
					.join(',') || 'all right',
				'|',
				form.name,
				'|',
				form.producer
			);
	}
	console.log(
		`${mode.padEnd(8)} ${Object.entries(tally)
			.map(([f, [a, b]]) => `${f} ${a}/${b}`)
			.join('  ')}`
	);
}
await server.close();
