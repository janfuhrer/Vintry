// Label scanning end to end: render each fixture label to an image, run the same
// tesseract.js setup the app uses (languages, sparse-text mode), parse, compare.
//
//   npm run test:ocr
import { Resvg } from '@resvg/resvg-js';
import { fileURLToPath } from 'node:url';
import { createWorker, PSM } from 'tesseract.js';
import { createServer } from 'vite';
import { labels } from './labels.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
const loose = (s) => s?.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const server = await createServer({
	root,
	configFile: false,
	logLevel: 'error',
	tsconfig: `${root}tsconfig.vitest.json`,
	server: { middlewareMode: true, hmr: false }
});
const { parseLabel } = await server.ssrLoadModule('/src/lib/parse.ts');
const worker = await createWorker(['eng', 'fra', 'deu'], 1, {
	langPath: `${root}static/ocr/lang`,
	gzip: true
});
await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });

let failures = 0;
for (const [name, { svg, expect }] of Object.entries(labels)) {
	const png = new Resvg(svg, { font: { loadSystemFonts: true }, fitTo: { mode: 'width', value: 1000 } })
		.render()
		.asPng();
	const { data } = await worker.recognize(png, {}, { text: true, blocks: true });
	const lines = [];
	for (const b of data.blocks ?? [])
		for (const p of b.paragraphs)
			for (const l of p.lines)
				if (l.confidence > 30) lines.push({ text: l.text.trim(), height: l.bbox.y1 - l.bbox.y0 });
	const got = parseLabel(lines, 2026);

	const misses = [];
	for (const [key, want] of Object.entries(expect)) {
		if (key === 'producerHas') {
			if (!loose(got.producer)?.includes(loose(want)))
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
