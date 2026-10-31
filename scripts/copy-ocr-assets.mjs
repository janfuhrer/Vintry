// Copies the tesseract.js worker, wasm core and language data to static/ocr,
// so label scanning never talks to a CDN.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
// The file names carry no version, so the service worker keys its OCR cache on this marker:
// a tesseract upgrade changes the name and installed apps fetch the new engine.
const version = (name) => JSON.parse(readFileSync(join(pkgDir(name), 'package.json'), 'utf8')).version;
const marker = `version-${version('tesseract.js')}-${version('tesseract.js-core')}.txt`;
for (const file of readdirSync(out))
	if (file.startsWith('version-') && file !== marker) rmSync(join(out, file));
writeFileSync(join(out, marker), '');

console.log('OCR assets ready in static/ocr');
