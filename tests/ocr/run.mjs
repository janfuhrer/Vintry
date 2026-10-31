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
const { extractLines, needsInvertedPass, betterPass, tiltOf, TILT_LIMIT } =
	await server.ssrLoadModule('/src/lib/ocr-lines.ts');
const worker = await createWorker(['eng', 'fra', 'deu'], 1, {
	langPath: `${root}static/ocr/lang`,
	gzip: true
});
await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });

let failures = 0;
// small, typical and close-up label sizes in the photo
const widths = (process.env.OCR_WIDTHS ?? '600,1000,2200').split(',').map(Number);
// OCR_ONLY=napa,alsace runs just those labels while working on them
const only = process.env.OCR_ONLY?.split(',');
const picked = Object.entries(labels).filter(([name]) => !only || only.includes(name));
const cases = widths.flatMap((width) =>
	picked.map(([name, l]) => ({
		name: `${name} @${width}px`,
		svg: l.svg,
		expect: l.expect,
		width
	}))
);
// and as photographed: tilted, on a table, label filling ~60% of the frame
for (const [name, l] of picked)
	cases.push({ name: `${name} photo`, svg: inPhoto(l.svg), expect: l.expect, width: 2200 });
// and a carelessly held phone: 12°, read through the straightened second pass
for (const [name, l] of picked)
	if (!l.hardTilt)
		cases.push({ name: `${name} tilted`, svg: inPhoto(l.svg, { angle: 12 }), expect: l.expect, width: 2200 });

for (const { name, svg, expect, width } of cases) {
	const render = (source) =>
		new Resvg(source, { font: { loadSystemFonts: true }, fitTo: { mode: 'width', value: width } })
			.render()
			.asPng();
	const read = async (png, rotateRadians = 0) => {
		const { data } = await worker.recognize(png, { rotateRadians }, { text: true, blocks: true });
		return { lines: extractLines(data), tilt: tiltOf(data) };
	};
	// same flow as src/lib/ocr.ts: a second, inverted pass when the first finds almost nothing,
	// and a straightened one when the text is tilted
	let source = render(svg);
	let pass = await read(source);
	if (needsInvertedPass(pass.lines)) {
		const flipped = render(inverted(svg));
		const second = await read(flipped);
		if (betterPass(pass, second) === second) [pass, source] = [second, flipped];
	}
	if (pass.tilt !== null && Math.abs(pass.tilt) > TILT_LIMIT) {
		const turn = -pass.tilt;
		let straight = await read(source, turn);
		// what is left of the tilt after one turn, corrected once more
		if (straight.tilt !== null && Math.abs(straight.tilt) > TILT_LIMIT / 2)
			straight = betterPass(straight, await read(source, turn - straight.tilt));
		pass = betterPass(pass, straight);
	}
	const { lines } = pass;
	const got = parseLabel(lines, 2026);

	// Clean renders must be exact. On small or photographed labels a secondary field may be
	// missing (OCR couldn't read it), but it must never be filled with something wrong.
	const strict = !name.includes('photo') && !name.includes('tilted') && !name.includes('@600px');
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
