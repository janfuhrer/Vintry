// Copies the tesseract.js worker, wasm core and language data to static/ocr,
// so label scanning never talks to a CDN.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const out = 'static/ocr';
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));

mkdirSync(join(out, 'lang'), { recursive: true });

cpSync(join(pkgDir('tesseract.js'), 'dist/worker.min.js'), join(out, 'worker.min.js'));

const core = pkgDir('tesseract.js-core');
for (const file of readdirSync(core)) {
	if (/^tesseract-core.*lstm\.wasm(\.js)?$/.test(file)) cpSync(join(core, file), join(out, file));
}

for (const lang of ['eng', 'fra', 'deu']) {
	const src = join(pkgDir(`@tesseract.js-data/${lang}`), '4.0.0_best_int', `${lang}.traineddata.gz`);
	const dest = join(out, 'lang', `${lang}.traineddata.gz`);
	if (!existsSync(dest)) cpSync(src, dest);
}
console.log('OCR assets ready in static/ocr');
