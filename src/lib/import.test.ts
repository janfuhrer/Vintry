import { describe, expect, test } from 'vitest';
import { parseCsv } from './csv';
import { mapTable } from './import';

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

	test('skips empty lines', () => {
		expect(parseCsv('a\n\n\nb\n')).toEqual([['a'], ['b']]);
	});
});

describe('mapTable', () => {
	test('German headers and Swiss formats', () => {
		const { columns, rows } = mapTable(
			parseCsv(
				'Wein;Weingut;Jahrgang;Farbe;Rebsorte;Anzahl;Preis;Gekauft am;Grösse\n' +
					'Cornalin;Rouvinez;2019;Rot;Cornalin / Humagne Rouge;3;CHF 32.50;1.5.2024;75 cl\n' +
					';;;;;;;;\n'
			)
		);
		expect(columns.every((c) => c.field)).toBe(true);
		expect(rows).toEqual([
			{
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
		const { rows } = mapTable(
			parseCsv(
				`name,producer,grapes,size_ml,price\n"'=HYPERLINK(""x"")",,"Merlot; Cabernet Franc",1500,"1'250.50"\n`
			)
		);
		expect(rows[0]).toEqual({
			name: '=HYPERLINK("x")',
			grapes: ['Merlot', 'Cabernet Franc'],
			size_ml: '1500',
			price: '1250.50'
		});
	});

	test('unknown columns are reported, rows without a name dropped', () => {
		const { columns, rows } = mapTable(parseCsv('Name,Lieblingsessen\nA,Käse\n,Brot'));
		expect(columns).toEqual([
			{ header: 'Name', field: 'name' },
			{ header: 'Lieblingsessen', field: null }
		]);
		expect(rows).toEqual([{ name: 'A' }]);
	});

	test('country names become ISO codes', () => {
		const { rows } = mapTable(parseCsv('name,land\nA,Schweiz\nB,Italy\nC,ch\nD,Atlantis'));
		expect(rows.map((r) => r.country)).toEqual(['CH', 'IT', 'CH', '']);
	});

	test('decimal comma and litre sizes', () => {
		const { rows } = mapTable(parseCsv('name;alkohol;inhalt\nX;13,5 %;0,75 l'));
		expect(rows[0]).toMatchObject({ alcohol: '13.5', size_ml: '750' });
	});
});
