import { expect, test } from 'vitest';
import { groupBy } from './group';

test('groups by one key, first-seen order', () => {
	expect(groupBy([1, 2, 3, 4], (n) => (n % 2 ? 'odd' : 'even'))).toEqual([
		['odd', [1, 3]],
		['even', [2, 4]]
	]);
});

test('an item can sit in several groups', () => {
	const wines = [
		{ n: 'a', g: ['Merlot', 'Cabernet'] },
		{ n: 'b', g: ['Merlot'] }
	];
	expect(groupBy(wines, (w) => w.g).map(([k, v]) => [k, v.map((w) => w.n)])).toEqual([
		['Merlot', ['a', 'b']],
		['Cabernet', ['a']]
	]);
});
