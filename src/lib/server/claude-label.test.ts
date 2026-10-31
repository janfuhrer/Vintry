import { describe, expect, test } from 'vitest';
import { LabelReading, toLabelFields } from './claude-label.ts';

const reading = (over: Partial<LabelReading> = {}): LabelReading => ({
	is_wine_label: true,
	name: null,
	producer: null,
	vintage: null,
	color: null,
	country: null,
	region: null,
	grapes: [],
	alcohol: null,
	size_ml: null,
	drink_from: null,
	drink_to: null,
	body: null,
	acidity: null,
	tannin: null,
	sweetness: null,
	...over
});

describe('toLabelFields', () => {
	test('canonical names for region, country and grapes', () => {
		const f = toLabelFields(
			reading({ region: 'Tuscany', country: 'it ', grapes: ['sangiovese', 'Sangiovese', ' merlot '] })
		);
		expect(f).toMatchObject({ region: 'Toscana', country: 'IT', grapes: ['Sangiovese', 'Merlot'] });
	});

	test('values out of range are dropped, not stored', () => {
		const f = toLabelFields(
			reading({ vintage: 2099, alcohol: 140, size_ml: 5, country: 'XX', body: 0, drink_from: 1800 }),
			2026
		);
		expect(f.vintage).toBeUndefined();
		expect(f.alcohol).toBeUndefined();
		expect(f.size_ml).toBeUndefined();
		expect(f.country).toBeUndefined();
		expect(f.body).toBeUndefined();
		expect(f.drink_from).toBeUndefined();
	});

	test('a window Claude left out is suggested from the vintage', () => {
		const f = toLabelFields(reading({ vintage: 2017, color: 'red', name: 'Chianti Classico Riserva' }), 2026);
		expect(f).toMatchObject({ drink_from: '2021', drink_to: '2030' });
		const given = toLabelFields(reading({ vintage: 2017, drink_from: 2022, drink_to: 2035 }), 2026);
		expect(given).toMatchObject({ drink_from: '2022', drink_to: '2035' });
		// a window that ends before it starts is not taken
		const backwards = toLabelFields(reading({ vintage: 2017, drink_from: 2030, drink_to: 2022 }), 2026);
		expect(backwards.drink_from).not.toBe('2030');
	});

	test('text is tidied: one Unicode form, single spaces, no producer repeated as the name', () => {
		const f = toLabelFields(reading({ name: '  Côtés  du Rhône ', producer: ' Côtes du Rhône' }));
		expect(f.name).toBe('Côtés du Rhône'.normalize('NFC'));
		expect(f.producer).toBe('Côtes du Rhône');
		const same = toLabelFields(reading({ name: 'Ornellaia', producer: 'Ornellaia' }));
		expect(same).toEqual({ name: 'Ornellaia' });
	});

	test('no wine label, no fields', () => {
		expect(toLabelFields(reading({ is_wine_label: false, name: 'Coca-Cola' }))).toEqual({});
	});
});
