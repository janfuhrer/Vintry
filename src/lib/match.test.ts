import { describe, expect, test } from 'vitest';
import { findSameWine, type Owned } from './match';

const wine = (o: Partial<Owned>): Owned => ({
	id: o.name ?? 'x',
	name: 'Cornalin',
	producer: null,
	vintage: null,
	quantity: 1,
	wishlist: false,
	has_photo: false,
	...o
});

describe('findSameWine', () => {
	const cellar = [
		wine({ id: 'a', name: 'Cornalin', producer: 'Cave des Alpes', vintage: 2020 }),
		wine({ id: 'b', name: 'Cornalin', producer: 'Cave des Alpes', vintage: 2021, quantity: 0 }),
		wine({ id: 'c', name: 'Château Montrose', vintage: 2015 }),
		wine({ id: 'd', name: 'Barolo', vintage: 2019, wishlist: true, quantity: 0 }),
		wine({ id: 'e', name: 'Barolo', vintage: 2019, quantity: 2 })
	];

	test('same name and vintage, ignoring accents and case', () => {
		expect(findSameWine({ name: 'CORNALIN', vintage: 2021 }, cellar)?.id).toBe('b');
		expect(findSameWine({ name: 'chateau montrose', vintage: 2015 }, cellar)?.id).toBe('c');
	});

	test('a different vintage or producer is another wine', () => {
		expect(findSameWine({ name: 'Cornalin', vintage: 2022 }, cellar)).toBeNull();
		expect(findSameWine({ name: 'Cornalin', producer: 'Other Estate', vintage: 2020 }, cellar)).toBeNull();
	});

	test('without a vintage only an unambiguous name counts', () => {
		expect(findSameWine({ name: 'Château Montrose' }, cellar)?.id).toBe('c');
		expect(findSameWine({ name: 'Cornalin' }, cellar)).toBeNull();
		expect(findSameWine({}, cellar)).toBeNull();
	});

	test('two producers fit and the label named none: no guess', () => {
		const two = [
			wine({ id: 'x', name: 'Riesling', producer: 'Weingut A', vintage: 2020 }),
			wine({ id: 'y', name: 'Riesling', producer: 'Weingut B', vintage: 2020 })
		];
		expect(findSameWine({ name: 'Riesling', vintage: 2020 }, two)).toBeNull();
		expect(findSameWine({ name: 'Riesling', producer: 'Weingut B', vintage: 2020 }, two)?.id).toBe('y');
	});

	test('bottles in the cellar win over the wishlist', () => {
		expect(findSameWine({ name: 'Barolo', vintage: 2019 }, cellar)?.id).toBe('e');
	});
});
