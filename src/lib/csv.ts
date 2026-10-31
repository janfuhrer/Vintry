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
	return '﻿' + lines.join('\r\n') + '\r\n';
}
