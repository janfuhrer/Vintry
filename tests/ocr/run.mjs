// Label scanning end to end: render each fixture label to an image, run the same
// tesseract.js setup the app uses (languages, sparse-text mode), parse, compare.
//
//   npm run test:ocr
import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'node:url';
import { createWorker, PSM } from 'tesseract.js';
import { createServer } from 'vite';
import { inPhoto, labels } from './labels.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
/** The app inverts pixels (src/lib/ocr.ts); an SVG colour matrix does the same here */
const inverted = (svg) =>
	svg
		.replace(
			/(<svg[^>]*>)/,
			'$1<filter id="inv"><feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/></filter><g filter="url(#inv)">'
		)
		.replace(/<\/svg>\s*$/, '</g></svg>');
const loose = (s) => s?.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const server = await createServer({
	root,
	configFile: false,
	logLevel: 'error',
	tsconfig: `${root}tsconfig.vitest.json`,
	server: { middlewareMode: true, hmr: false }
});
const { parseLabel } = await server.ssrLoadModule('/src/lib/parse.ts');
const { extractLines, needsInvertedPass, betterPass } = await server.ssrLoadModule('/src/lib/ocr-lines.ts');
const worker = await createWorker(['eng', 'fra', 'deu'], 1, {
	langPath: `${root}static/ocr/lang`,
	gzip: true
});
await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });

let failures = 0;
// small, typical and close-up label sizes in the photo
const widths = (process.env.OCR_WIDTHS ?? '600,1000,2200').split(',').map(Number);
const cases = widths.flatMap((width) =>
	Object.entries(labels).map(([name, l]) => ({
		name: `${name} @${width}px`,
		svg: l.svg,
		expect: l.expect,
		width
	}))
);
// and as photographed: tilted, on a table, label filling ~60% of the frame
for (const [name, l] of Object.entries(labels))
	cases.push({ name: `${name} photo`, svg: inPhoto(l.svg), expect: l.expect, width: 2200 });

for (const { name, svg, expect, width } of cases) {
	const render = (source) =>
		new Resvg(source, { font: { loadSystemFonts: true }, fitTo: { mode: 'width', value: width } })
			.render()
			.asPng();
	const read = async (png) => {
		const { data } = await worker.recognize(png, {}, { text: true, blocks: true });
		return { lines: extractLines(data) };
	};
	// same flow as src/lib/ocr.ts: a second, inverted pass when the first finds almost nothing
	let pass = await read(render(svg));
	if (needsInvertedPass(pass.lines)) pass = betterPass(pass, await read(render(inverted(svg))));
	const { lines } = pass;
	const got = parseLabel(lines, 2026);

	// Clean renders must be exact. On small or photographed labels a secondary field may be
	// missing (OCR couldn't read it), but it must never be filled with something wrong.
	const strict = !name.includes('photo') && !name.includes('@600px');
	const misses = [];
	for (const [key, want] of Object.entries(expect)) {
		const field = key === 'producerHas' ? 'producer' : key;
		const essential = key === 'name' || key === 'vintage';
		if (!strict && !essential && got[field] === undefined) continue;
		if (key === 'producerHas') {
			// a stray space ("Dela roche") is cosmetic, so compare without whitespace
			const squash = (v) => loose(v)?.replace(/\s+/g, '');
			if (!squash(got.producer)?.includes(squash(want)))
				misses.push(`producer should contain "${want}", got "${got.producer}"`);
		} else if (key === 'name') {
			if (loose(got.name) !== loose(want)) misses.push(`name: got "${got.name}", want "${want}"`);
		} else if (JSON.stringify(got[key]) !== JSON.stringify(want)) {
			misses.push(`${key}: got ${JSON.stringify(got[key])}, want ${JSON.stringify(want)}`);
		}
	}
	if (misses.length) {
		failures++;
		console.log(
			`✖ ${name}\n    ${misses.join('\n    ')}\n    OCR lines: ${lines.map((l) => l.text).join(' | ')}`
		);
	} else {
		console.log(`✔ ${name}`);
	}
}
await worker.terminate();
await server.close();
console.log(failures ? `\n${failures} label(s) misread` : '\nall labels read correctly');
process.exit(failures ? 1 : 0);
