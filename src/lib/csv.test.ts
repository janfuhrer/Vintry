import { expect, test } from 'vitest';
import { csvField, toCsv } from './csv';

test('quotes separators, quotes and line breaks', () => {
	expect(csvField('Château, "Grand"')).toBe('"Château, ""Grand"""');
	expect(csvField('line\nbreak')).toBe('"line\nbreak"');
	expect(csvField(['Merlot', 'Cabernet'])).toBe('"Merlot; Cabernet"');
});

test('neutralises spreadsheet formulas but keeps negative numbers', () => {
	expect(csvField('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
	expect(csvField('@SUM(A1)')).toBe("'@SUM(A1)");
	expect(csvField(-3)).toBe('-3');
});

test('empty values and a header row', () => {
	expect(toCsv([{ a: 1, b: null }], ['a', 'b'])).toBe('﻿a,b\r\n1,\r\n');
});
