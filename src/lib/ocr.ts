import type { Worker } from 'tesseract.js';
import type { OcrLine } from './parse';

let worker: Promise<Worker> | undefined;

type Progress = (stage: 'loading' | 'reading', ratio: number) => void;
let onProgress: Progress = () => {};

/** One worker per page session; assets are self-hosted under /ocr/ */
function getWorker() {
	return (worker ??= import('tesseract.js').then(({ createWorker }) =>
		createWorker(['eng', 'fra', 'deu'], 1, {
			workerPath: '/ocr/worker.min.js',
			corePath: '/ocr/',
			langPath: '/ocr/lang',
			workerBlobURL: false,
			gzip: true,
			logger: (m) => {
				if (m.status === 'recognizing text') onProgress('reading', m.progress);
				else onProgress('loading', m.progress);
			}
		})
	));
}

export async function readLabel(image: Blob, progress: Progress): Promise<{ lines: OcrLine[]; text: string }> {
	onProgress = progress;
	progress('loading', 0);
	const w = await getWorker();
	const { data } = await w.recognize(image, {}, { text: true, blocks: true });
	const lines: OcrLine[] = [];
	for (const block of data.blocks ?? [])
		for (const para of block.paragraphs)
			for (const line of para.lines)
				if (line.confidence > 30) lines.push({ text: line.text.trim(), height: line.bbox.y1 - line.bbox.y0 });
	return { lines, text: data.text };
}
