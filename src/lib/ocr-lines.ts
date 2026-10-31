import type { OcrLine } from './parse';

/** The part of a tesseract result this app reads (structurally typed, no tesseract import) */
export interface OcrPage {
	text: string;
	blocks:
		| { paragraphs: { lines: { text: string; confidence: number; bbox: { y0: number; y1: number } }[] }[] }[]
		| null;
}

/** Confident text lines with their height (the tallest line is usually the name) */
export function extractLines(page: OcrPage): OcrLine[] {
	const lines: OcrLine[] = [];
	for (const block of page.blocks ?? [])
		for (const para of block.paragraphs)
			for (const line of para.lines)
				if (line.confidence > 30 && line.text.trim())
					lines.push({ text: line.text.trim(), height: line.bbox.y1 - line.bbox.y0 });
	return lines;
}

/**
 * Light text on a dark label photographed against a dark background often yields nothing:
 * page segmentation finds no text. Then a second pass on the inverted image is worth it.
 */
export function needsInvertedPass(lines: OcrLine[]): boolean {
	return lines.filter((l) => /\p{L}{3}/u.test(l.text)).length < 3;
}

/** Keeps the pass that found more readable lines */
export function betterPass<T extends { lines: OcrLine[] }>(a: T, b: T): T {
	const score = (p: T) => p.lines.reduce((n, l) => n + (l.text.match(/\p{L}/gu)?.length ?? 0), 0);
	return score(b) > score(a) ? b : a;
}
