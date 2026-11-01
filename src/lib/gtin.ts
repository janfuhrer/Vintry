// Retail barcodes (EAN-8, UPC-A, EAN-13, GTIN-14): one way of writing them, and the check digit.

/** The barcode as stored: digits only, a 12-digit UPC-A as the EAN-13 it equals; null if invalid */
export function normalizeGtin(raw: string | null | undefined): string | null {
	const digits = (raw ?? '').replace(/[\s-]/g, '');
	if (!/^(\d{8}|\d{12,14})$/.test(digits)) return null;
	const code = digits.length === 12 ? `0${digits}` : digits;
	return checkDigitOk(code) ? code : null;
}

/** GS1 check digit: from the right, weights 3 and 1 alternating over the other digits */
function checkDigitOk(code: string): boolean {
	const body = code.slice(0, -1);
	let sum = 0;
	for (let i = 0; i < body.length; i++) {
		const d = Number(body[body.length - 1 - i]);
		sum += i % 2 === 0 ? d * 3 : d;
	}
	return (10 - (sum % 10)) % 10 === Number(code.at(-1));
}
