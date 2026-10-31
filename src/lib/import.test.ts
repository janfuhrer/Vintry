import { describe, expect, test } from 'vitest';
import { decodeText, parseCsv, parseCsvRecords } from './csv';
import { mapTable } from './import';

const map = (text: string) => mapTable(parseCsvRecords(text));
const strip = (rows: Record<string, unknown>[]) => rows.map(({ _row, ...r }) => r);

describe('parseCsv', () => {
	test('commas, quotes, escaped quotes and line breaks in fields', () => {
		expect(parseCsv('﻿name,notes\r\n"Château ""X""","line 1\nline 2"\r\nB,\r\n')).toEqual([
			['name', 'notes'],
			['Château "X"', 'line 1\nline 2'],
			['B', '']
		]);
	});

	test('semicolon files from German Excel', () => {
		expect(parseCsv('Name;Jahrgang\nFendant;2023')).toEqual([
			['Name', 'Jahrgang'],
			['Fendant', '2023']
		]);
	});

	test('row numbers count blank rows and treat multi-line cells as one row', () => {
		expect(parseCsvRecords('a\n\n"x\ny"\nb').map((r) => r.row)).toEqual([1, 3, 4]);
	});

	test('Windows-1252 files keep their umlauts', () => {
		const cp1252 = new Uint8Array([0x47, 0x72, 0xf6, 0x73, 0x73, 0x65]); // "Grösse"
		expect(decodeText(cp1252.buffer)).toBe('Grösse');
		expect(decodeText(new TextEncoder().encode('Château').buffer as ArrayBuffer)).toBe('Château');
	});
});

describe('mapTable', () => {
	test('German headers and Swiss formats', () => {
		const { columns, rows } = map(
			'Wein;Weingut;Jahrgang;Farbe;Rebsorte;Anzahl;Preis;Gekauft am;Grösse\n' +
				'Cornalin;Rouvinez;2019;Rot;Cornalin / Humagne Rouge;3;CHF 32.50;1.5.2024;75 cl\n'
		);
		expect(columns.every((c) => c.field)).toBe(true);
		expect(rows).toEqual([
			{
				_row: '2',
				name: 'Cornalin',
				producer: 'Rouvinez',
				vintage: '2019',
				color: 'red',
				grapes: ['Cornalin', 'Humagne Rouge'],
				quantity: '3',
				price: '32.50',
				purchased_on: '2024-05-01',
				size_ml: '750'
			}
		]);
	});

	test('round-trips Vintry’s own export, including the formula guard', () => {
		const { rows } = map(
			`name,producer,grapes,size_ml,price\n"'=HYPERLINK(""x"")",,"Merlot; Cabernet Franc",1500,"1'250.50"\n`
		);
		expect(strip(rows)).toEqual([
			{
				name: '=HYPERLINK("x")',
				grapes: ['Merlot', 'Cabernet Franc'],
				color: 'red',
				size_ml: '1500',
				price: '1250.50'
			}
		]);
	});

	test('unknown columns are reported, rows without a name dropped', () => {
		const { columns, rows } = map('Name,Lieblingsessen\nA,Käse\n,Brot');
		expect(columns).toEqual([
			{ header: 'Name', field: 'name' },
			{ header: 'Lieblingsessen', field: null }
		]);
		expect(strip(rows)).toEqual([{ name: 'A' }]);
	});

	test('country names become ISO codes', () => {
		expect(map('name,land\nA,Schweiz\nB,Italy\nC,ch\nD,Atlantis').rows.map((r) => r.country)).toEqual([
			'CH',
			'IT',
			'CH',
			undefined
		]);
	});

	test('prices with currency words and Swiss dashes', () => {
		const prices = map(
			'name;preis\nA;SFr. 25.-\nB;Fr. 32.50\nC;€ 1.250\nD;29,90 €\nE;1.250,50\nF;gratis'
		).rows;
		expect(prices.map((r) => r.price)).toEqual(['25', '32.50', '1250', '29.90', '1250.50', undefined]);
	});

	test('colour words in several languages; unknown colour follows the grapes', () => {
		const rows = map(
			'name,colour,grapes\nA,White wine,\nB,Rosé,\nC,Champagne,\nD,Sparkling wine,\nE,,Riesling\nF,orange,Merlot'
		).rows;
		expect(rows.map((r) => r.color)).toEqual(['white', 'rose', 'sparkling', 'sparkling', 'white', 'red']);
	});

	test('implausible optional values are dropped, not imported', () => {
		const rows = map(
			'name,vintage,score,vol,anzahl\nA,NV,92,75 cl,sechs\nB,2019,4.5,13.5,2\nC,o.J.,17,,'
		).rows;
		expect(strip(rows)).toEqual([
			{ name: 'A', rating: '5' },
			{ name: 'B', vintage: '2019', rating: '5', alcohol: '13.5', quantity: '2' },
			{ name: 'C', rating: '4' }
		]);
	});

	test('dates: day first unless impossible', () => {
		const rows = map('name;gekauft am\nA;12/31/2024\nB;01/05/2024\nC;31.02.2024').rows;
		expect(rows.map((r) => r.purchased_on)).toEqual(['2024-12-31', '2024-05-01', '2024-02-31']);
	});

	test('duplicate and empty headers', () => {
		const { columns } = map('Name;Notiz;Notiz;;\nA;x;y;;');
		expect(columns.map((c) => c.field)).toEqual(['name', 'notes', null, null, null]);
	});
});
