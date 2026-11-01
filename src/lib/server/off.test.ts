import { describe, expect, test } from 'vitest';
import { offToFields } from './off.ts';

describe('offToFields', () => {
	test('a wine: producer, name without brand and year, colour, country, appellation, size', () => {
		const f = offToFields({
			product_name: 'Côtes du Rhône Cuvée 2015',
			brands: 'Cellier des Dauphins',
			categories_tags: [
				'en:beverages',
				'en:alcoholic-beverages',
				'en:wines',
				'en:wines-from-france',
				'en:red-wines',
				'fr:cotes-du-rhone'
			],
			quantity: '750 ml',
			origins: 'France',
			nutriments: { alcohol_value: 13.5 }
		});
		expect(f).toEqual({
			name: 'Côtes du Rhône Cuvée',
			producer: 'Cellier des Dauphins',
			color: 'red',
			country: 'FR',
			region: 'Rhône',
			alcohol: '13.5',
			size_ml: '750'
		});
	});

	test('sparkling beats the colour; centilitres and litres are bottle sizes', () => {
		const f = offToFields({
			product_name: 'Brut Rosé',
			categories_tags: ['en:wines', 'en:rose-wines', 'en:champagnes'],
			quantity: '75 cl'
		});
		expect(f).toMatchObject({ color: 'sparkling', size_ml: '750' });
		expect(offToFields({ categories_tags: ['en:wines'], quantity: '1,5 l' })).toMatchObject({
			size_ml: '1500'
		});
		expect(offToFields({ categories_tags: ['en:wines'], quantity: '6 x 75cl box' })).toMatchObject({
			size_ml: '750'
		});
	});

	test('not a wine, nothing', () => {
		expect(
			offToFields({ product_name: 'Grape juice', categories_tags: ['en:beverages', 'en:juices'] })
		).toBeNull();
		expect(offToFields({})).toBeNull();
	});

	test('implausible values are left out', () => {
		const f = offToFields({ categories_tags: ['en:wines'], quantity: '25 ml', nutriments: { alcohol: 0 } })!;
		expect(f.size_ml).toBeUndefined();
		expect(f.alcohol).toBeUndefined();
	});
});
