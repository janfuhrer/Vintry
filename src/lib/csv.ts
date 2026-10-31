type Cell = string | number | boolean | null | undefined | Date | string[];

/**
 * One CSV field. Values that a spreadsheet would run as a formula (=, +, -, @, tab, CR)
 * get a leading apostrophe, so a wine named "=HYPERLINK(…)" stays text.
 */
export function csvField(value: Cell): string {
	if (value === null || value === undefined) return '';
	let s = Array.isArray(value)
		? value.join('; ')
		: value instanceof Date
			? value.toISOString()
			: String(value);
	if (/^[=+\-@\t\r]/.test(s) && typeof value !== 'number') s = `'${s}`;
	return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T extends Record<string, Cell>>(rows: T[], columns: (keyof T & string)[]): string {
	const lines = [columns.join(','), ...rows.map((r) => columns.map((c) => csvField(r[c])).join(','))];
	// BOM so Excel opens UTF-8 (accents in names) correctly
	return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

/**
 * Parses CSV text into rows of cells. Handles a UTF-8 BOM, quoted fields with "" escapes and
 * line breaks, CRLF, and guesses the delimiter: Excel writes ";" in German-speaking locales.
 */
export function parseCsv(text: string): string[][] {
	const src = text.replace(/^\uFEFF/, '');
	const firstLine = src.slice(0, src.search(/\r?\n|$/));
	const delimiter = [',', ';', '\t'].reduce((best, d) =>
		firstLine.split(d).length > firstLine.split(best).length ? d : best
	);
	const rows: string[][] = [];
	let row: string[] = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < src.length; i++) {
		const c = src[i];
		if (quoted) {
			if (c === '"' && src[i + 1] === '"') {
				field += '"';
				i++;
			} else if (c === '"') quoted = false;
			else field += c;
		} else if (c === '"' && field === '') quoted = true;
		else if (c === delimiter) {
			row.push(field);
			field = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && src[i + 1] === '\n') i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = '';
		} else field += c;
	}
	if (field !== '' || row.length) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}
