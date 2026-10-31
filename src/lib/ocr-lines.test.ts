import { expect, test } from 'vitest';
import { betterPass, extractLines, needsInvertedPass } from './ocr-lines';

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
