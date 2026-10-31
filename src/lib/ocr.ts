import type { Worker } from 'tesseract.js';
import { encode } from './image';
import { betterPass, extractLines, needsInvertedPass, TILT_LIMIT, TILT_RESIDUAL, tiltOf } from './ocr-lines';
import type { OcrLine } from './parse';

let worker: Promise<Worker> | undefined;

type Progress = (stage: 'loading' | 'reading', ratio: number) => void;
let onProgress: Progress = () => {};

/** One worker per page session; assets are self-hosted under /ocr/ */
function getWorker() {
	worker ??= import('tesseract.js').then(async ({ createWorker, PSM }) => {
		const w = await createWorker(['eng', 'fra', 'deu'], 1, {
			workerPath: '/ocr/worker.min.js',
			corePath: '/ocr/',
			langPath: '/ocr/lang',
			workerBlobURL: false,
			gzip: true,
			logger: (m) => {
				if (m.status === 'recognizing text') onProgress('reading', m.progress);
				else onProgress('loading', m.progress);
			}
		});
		// Labels are sparse text in many sizes. The default (one uniform block) drops the
		// big title lines, which are usually the wine's name, and sometimes the vintage.
		await w.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
		return w;
	});
	// a failed load (offline, broken download) must not poison later scans
	worker.catch(() => (worker = undefined));
	return worker;
}

/** Inverted, grey, contrast-stretched copy for light-on-dark labels */
async function invertedCopy(image: Blob): Promise<Blob> {
	const bitmap = await createImageBitmap(image);
	const canvas = document.createElement('canvas');
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	const ctx = canvas.getContext('2d')!;
	ctx.drawImage(bitmap, 0, 0);
	bitmap.close();
	const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const px = img.data;
	// pixel loop instead of ctx.filter, which older Safari versions ignore
	let lo = 255;
	let hi = 0;
	const grey = new Uint8ClampedArray(px.length / 4);
	for (let i = 0, j = 0; i < px.length; i += 4, j++) {
		const g = 255 - (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114);
		grey[j] = g;
		if (g < lo) lo = g;
		if (g > hi) hi = g;
	}
	const range = Math.max(1, hi - lo);
	for (let i = 0, j = 0; i < px.length; i += 4, j++) {
		const v = ((grey[j] - lo) * 255) / range;
		px[i] = px[i + 1] = px[i + 2] = v;
	}
	ctx.putImageData(img, 0, 0);
	return encode(canvas, 0.9);
}

export async function readLabel(
	image: Blob,
	progress: Progress
): Promise<{ lines: OcrLine[]; text: string }> {
	onProgress = progress;
	progress('loading', 0);
	const w = await getWorker();
	const read = async (img: Blob, rotateRadians = 0) => {
		const { data } = await w.recognize(img, { rotateRadians }, { text: true, blocks: true });
		return { lines: extractLines(data), text: data.text, tilt: tiltOf(data) };
	};
	let pass = await read(image);
	let source = image;
	// light text on a dark label: try the inverted image
	if (needsInvertedPass(pass.lines)) {
		const inverted = await invertedCopy(image);
		const second = await read(inverted);
		if (betterPass(pass, second) === second) [pass, source] = [second, inverted];
	}
	// a tilted photo breaks lines apart: straighten it by the measured angle and read again,
	// correcting once more for what is left of the tilt (the first measure is rough)
	if (pass.tilt !== null && Math.abs(pass.tilt) > TILT_LIMIT) {
		const turn = -pass.tilt;
		let straight = await read(source, turn);
		if (straight.tilt !== null && Math.abs(straight.tilt) > TILT_RESIDUAL)
			straight = betterPass(straight, await read(source, turn - straight.tilt));
		pass = betterPass(pass, straight);
	}
	return { lines: pass.lines, text: pass.text };
}
