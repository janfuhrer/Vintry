import { expect, test } from 'vitest';
import { normalizeGtin } from './gtin.ts';

test('valid barcodes are kept, a UPC-A becomes its EAN-13', () => {
	expect(normalizeGtin('8009825001041')).toBe('8009825001041');
	expect(normalizeGtin('3179071003917')).toBe('3179071003917');
	expect(normalizeGtin('036000291452')).toBe('0036000291452');
	expect(normalizeGtin('9638-5074')).toBe('96385074');
	expect(normalizeGtin(' 4006381 333931 ')).toBe('4006381333931');
});

test('a wrong check digit or length is no barcode', () => {
	expect(normalizeGtin('8009825001042')).toBeNull();
	expect(normalizeGtin('12345')).toBeNull();
	expect(normalizeGtin('abc')).toBeNull();
	expect(normalizeGtin(null)).toBeNull();
});
