import { describe, expect, test } from 'vitest';
import { betterPass, extractLines, needsInvertedPass, tiltOf } from './ocr-lines';

const page = (rows: [string, number, number][]) => ({
	text: rows.map((r) => r[0]).join('\n'),
	blocks: [
		{
			paragraphs: [
				{ lines: rows.map(([text, confidence, h]) => ({ text, confidence, bbox: { y0: 0, y1: h } })) }
			]
		}
	]
});

test('keeps confident, non-empty lines with their height', () => {
	expect(
		extractLines(
			page([
				['  Barolo ', 90, 80],
				['~~', 12, 10],
				[' ', 95, 5]
			])
		)
	).toEqual([{ text: 'Barolo', height: 80 }]);
	expect(extractLines({ text: '', blocks: null })).toEqual([]);
});

test('an almost empty pass asks for the inverted image', () => {
	expect(needsInvertedPass([])).toBe(true);
	expect(
		needsInvertedPass([
			{ text: '2018', height: 20 },
			{ text: 'Rioja', height: 30 }
		])
	).toBe(true);
	expect(
		needsInvertedPass([
			{ text: 'Rioja', height: 30 },
			{ text: 'Reserva', height: 20 },
			{ text: 'Bodegas X', height: 20 }
		])
	).toBe(false);
});

test('the pass with more letters wins', () => {
	const a = { lines: [{ text: 'ab', height: 1 }] };
	const b = { lines: [{ text: 'Barolo Riserva', height: 1 }] };
	expect(betterPass(a, b)).toBe(b);
	expect(betterPass(b, a)).toBe(b);
});

describe('tiltOf', () => {
	const line = (x0: number, y0: number, x1: number, y1: number, confidence = 90) => ({
		text: 'word',
		confidence,
		bbox: { y0: 0, y1: 10 },
		baseline: { x0, y0, x1, y1 }
	});
	const page = (...lines: ReturnType<typeof line>[]) => ({ text: '', blocks: [{ paragraphs: [{ lines }] }] });

	test('the median angle of measurable lines', () => {
		const tan = Math.tan((12 * Math.PI) / 180);
		const tilt = tiltOf(page(line(0, 0, 400, 400 * tan), line(0, 0, 300, 300 * tan), line(0, 0, 500, -50)));
		expect((tilt! * 180) / Math.PI).toBeCloseTo(12, 0);
	});

	test('short, unsure or missing baselines are not measured', () => {
		expect(tiltOf(page(line(0, 0, 30, 10), line(0, 0, 400, 80, 5)))).toBeNull();
		expect(tiltOf({ text: '', blocks: null })).toBeNull();
	});
});
