import { describe, expect, test } from 'vitest';
import { parsePhoto, parseWineForm } from './wine-form';

function form(fields: Record<string, string | string[]>) {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) fd.append(k, x);
	return fd;
}

describe('parseWineForm', () => {
	test('valid input', () => {
		const { input, errors } = parseWineForm(
			form({
				name: '  Cornalin ',
				vintage: '2019',
				color: 'red',
				country: 'ch',
				grapes: ['cornalin', 'Cornalin', 'Humagne rouge'],
				alcohol: '13,5',
				quantity: '3',
				price: '32.50',
				purchased_on: '2024-05-01'
			})
		);
		expect(errors).toEqual({});
		expect(input).toMatchObject({
			name: 'Cornalin',
			vintage: 2019,
			country: 'CH',
			grapes: ['Cornalin', 'Humagne Rouge'],
			alcohol: 13.5,
			quantity: 3,
			price: 32.5,
			purchased_on: '2024-05-01'
		});
	});

	test('name is required', () => {
		expect(parseWineForm(form({ name: '   ' })).errors.name).toBe('required');
	});

	test('rejects out-of-range numbers', () => {
		const { errors } = parseWineForm(
			form({ name: 'x', vintage: '1700', body: '9', quantity: '-1', alcohol: 'abc' })
		);
		expect(Object.keys(errors).sort()).toEqual(['alcohol', 'body', 'quantity', 'vintage']);
	});

	test('window must not end before it starts', () => {
		expect(parseWineForm(form({ name: 'x', drink_from: '2030', drink_to: '2025' })).errors.drink_to).toBe(
			'invalid'
		);
	});

	test('unknown colour falls back to red, bad country is dropped', () => {
		const { input } = parseWineForm(form({ name: 'x', color: 'blue', country: 'XYZ' }));
		expect(input.color).toBe('red');
		expect(input.country).toBeNull();
	});

	test('bad dates are rejected', () => {
		expect(parseWineForm(form({ name: 'x', purchased_on: '01.05.2024' })).errors.purchased_on).toBe(
			'invalid'
		);
	});

	test('long text is truncated, grapes are capped', () => {
		const { input } = parseWineForm(
			form({ name: 'a'.repeat(500), grapes: Array.from({ length: 20 }, (_, i) => `G${i}`) })
		);
		expect(input.name.length).toBe(200);
		expect(input.grapes.length).toBe(12);
	});
});

describe('parsePhoto', () => {
	const jpeg = (size = 100) =>
		new File([new Uint8Array([0xff, 0xd8, 0xff, ...new Array(size).fill(1)])], 'p.jpg');

	test('no photo keeps the current one', async () => {
		expect(await parsePhoto(form({}), {})).toBeUndefined();
	});

	test('remove flag', async () => {
		expect(await parsePhoto(form({ remove_photo: '1' }), {})).toBeNull();
	});

	test('accepts JPEG image and thumb', async () => {
		const fd = new FormData();
		fd.append('photo', jpeg());
		fd.append('thumb', jpeg(10));
		const errors = {};
		const p = await parsePhoto(fd, errors);
		expect(errors).toEqual({});
		expect(p?.image.length).toBe(103);
	});

	test('rejects non-JPEG data', async () => {
		const fd = new FormData();
		fd.append('photo', new File([new TextEncoder().encode('<svg/>')], 'p.jpg'));
		fd.append('thumb', jpeg());
		const errors: Record<string, string> = {};
		expect(await parsePhoto(fd, errors)).toBeUndefined();
		expect(errors.photo).toBe('invalid');
	});

	test('rejects oversized photos', async () => {
		const fd = new FormData();
		fd.append('photo', jpeg(1_600_000));
		fd.append('thumb', jpeg());
		const errors: Record<string, string> = {};
		await parsePhoto(fd, errors);
		expect(errors.photo).toBe('too_large');
	});
});

describe('withSuggestions', () => {
	test('fills window and taste from vintage and grapes when empty', async () => {
		const { withSuggestions } = await import('./wine-form');
		const { input } = parseWineForm(
			form({ name: 'Gamaret', vintage: '2021', color: 'red', grapes: ['Gamaret'] })
		);
		const out = withSuggestions(input);
		expect(out.drink_from).toBeGreaterThanOrEqual(2021);
		expect(out.drink_to).toBeGreaterThan(out.drink_from!);
		expect(out.body).not.toBeNull();
	});

	test('keeps what the user entered', async () => {
		const { withSuggestions } = await import('./wine-form');
		const { input } = parseWineForm(
			form({ name: 'x', vintage: '2021', color: 'red', drink_from: '2030', drink_to: '2040', body: '2' })
		);
		const out = withSuggestions(input);
		expect([out.drink_from, out.drink_to, out.body]).toEqual([2030, 2040, 2]);
	});

	test('no vintage, no window', async () => {
		const { withSuggestions } = await import('./wine-form');
		const { input } = parseWineForm(form({ name: 'x', color: 'white' }));
		expect(withSuggestions(input).drink_from).toBeNull();
	});
});
