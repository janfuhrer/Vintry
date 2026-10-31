import { describe, expect, test } from 'vitest';
import { shapes } from '#lib/data/shapes.ts';
import { regions } from '#lib/data/regions.ts';
import { bottlesByRegion, countryMap, mapCountries } from './map.ts';

/** Outline path → polygons */
const polygons = (d: string) =>
	d
		.split('Z')
		.filter(Boolean)
		.map((ring) =>
			ring
				.slice(1)
				.split('L')
				.map((p) => p.split(' ').map(Number) as [number, number])
		);

function inside([x, y]: [number, number], ring: [number, number][]) {
	let hit = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
	}
	return hit;
}

function distance([x, y]: [number, number], ring: [number, number][]) {
	let best = Infinity;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [ax, ay] = ring[j];
		const [bx, by] = ring[i];
		const t = Math.max(
			0,
			Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1))
		);
		best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
	}
	return best;
}

describe('country maps', () => {
	test('every region has a place, and every country of a region an outline', () => {
		for (const r of regions) {
			expect(r.at, r.name).toBeDefined();
			expect(shapes[r.country], r.country).toBeDefined();
		}
		expect(mapCountries).toContain('CH');
	});

	// catches swapped or mistyped coordinates: a point must lie on its country, or just off
	// its simplified coast (a few map units, a few km)
	test('each region lies in its country', () => {
		for (const country of mapCountries) {
			const map = countryMap(country)!;
			const rings = polygons(map.d);
			for (const p of map.points) {
				const at: [number, number] = [p.x, p.y];
				const off = rings.some((r) => inside(at, r)) ? 0 : Math.min(...rings.map((r) => distance(at, r)));
				expect(off, `${p.name} is ${off.toFixed(1)} units off ${country}`).toBeLessThan(5);
			}
		}
	});

	test('the page’s region is marked and drawn last; owned regions carry their bottles', () => {
		const map = countryMap('IT', { here: 'Barolo', owned: new Map([['Etna', 3]]) })!;
		expect(map.points.at(-1)).toMatchObject({ name: 'Barolo', here: true });
		expect(map.points.find((p) => p.name === 'Etna')?.bottles).toBe(3);
		expect(countryMap('XX')).toBeNull();
	});

	test('any spelling of a region counts for it', () => {
		const owned = bottlesByRegion([
			{ region: 'Wallis', quantity: 2 },
			{ region: 'valais', quantity: 1 },
			{ region: 'Somewhere', quantity: 5 },
			{ region: null, quantity: 1 }
		]);
		expect([...owned]).toEqual([['Valais', 3]]);
	});
});
