import type { OcrLine } from './parse';

/** The part of a tesseract result this app reads (structurally typed, no tesseract import) */
export interface OcrPage {
	text: string;
	blocks:
		| {
				paragraphs: {
					lines: {
						text: string;
						confidence: number;
						bbox: { x0?: number; y0: number; x1?: number; y1: number };
						baseline?: { x0: number; y0: number; x1: number; y1: number };
					}[];
				}[];
		  }[]
		| null;
}

/** Confident text lines with their height (the tallest line is usually the name) */
export function extractLines(page: OcrPage): OcrLine[] {
	const lines: OcrLine[] = [];
	for (const block of page.blocks ?? [])
		for (const para of block.paragraphs)
			for (const line of para.lines)
				if (line.confidence > 30 && line.text.trim())
					lines.push({
						text: line.text.trim(),
						height: line.bbox.y1 - line.bbox.y0,
						// where the line sits, so text from around the label can be told apart
						...(line.bbox.x0 !== undefined && line.bbox.x1 !== undefined
							? { left: line.bbox.x0, width: line.bbox.x1 - line.bbox.x0 }
							: {})
					});
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

/**
 * How far the text is tilted, in radians (positive: lines fall to the right), from the
 * baselines of lines wide enough to measure; the median, so a stray word doesn't count.
 * null when nothing could be measured.
 */
export function tiltOf(page: OcrPage): number | null {
	const angles: number[] = [];
	for (const block of page.blocks ?? [])
		for (const para of block.paragraphs)
			for (const line of para.lines) {
				const b = line.baseline;
				if (!b || line.confidence < 20 || b.x1 - b.x0 < 60) continue;
				angles.push(Math.atan2(b.y1 - b.y0, b.x1 - b.x0));
			}
	if (angles.length < 2) return null;
	angles.sort((a, b) => a - b);
	return angles[Math.floor(angles.length / 2)];
}

/**
 * Past about 2° a straightened second pass is worth its time. Not higher: on a fragmented
 * reading the measured tilt comes out well below the real one (a 12° photo can measure under
 * 5° with Linux fonts), so a higher limit skips exactly the photos that need it. The cost is
 * one more reading for a photo tilted a few degrees.
 */
export const TILT_LIMIT = (2 * Math.PI) / 180;

/** Once straightening, what is left above 1° is worth correcting too (the first measure is rough) */
export const TILT_RESIDUAL = Math.PI / 180;
