// Small country maps. The outlines stay on the server; a page gets the one it shows.
import { shapes } from '#lib/data/shapes.ts';
import type { Region } from '#lib/data/types.ts';
import { regions } from '#lib/data/regions.ts';
import { normalize, regionIndex, regionSlug } from '#lib/wine.ts';

export interface MapPoint {
	name: string;
	slug: string;
	x: number;
	y: number;
	/** Bottles in the cellar from here; 0 when only finished wines are */
	bottles?: number;
	/** The region this page is about */
	here?: boolean;
}

export interface CountryMap {
	country: string;
	d: string;
	w: number;
	h: number;
	points: MapPoint[];
}

const located = (r: Region): r is Region & { at: [number, number] } => !!r.at && !!shapes[r.country];

/** Countries that can be drawn and have regions on them, by code */
export const mapCountries = [...new Set(regions.filter(located).map((r) => r.country))];

/**
 * The country's outline with its regions as points. `owned` maps region names to bottles
 * in the cellar, for regions the user has wines from.
 */
export function countryMap(
	country: string,
	{ here, owned }: { here?: string; owned?: Map<string, number> } = {}
): CountryMap | null {
	const shape = shapes[country];
	if (!shape) return null;
	const points = regions
		.filter((r) => r.country === country && located(r))
		.map((r) => {
			const [lat, lon] = r.at!;
			const p: MapPoint = {
				name: r.name,
				slug: regionSlug(r.name),
				x: Math.round((lon - shape.west) * shape.kx * 10) / 10,
				y: Math.round((shape.north - lat) * shape.ky * 10) / 10
			};
			if (r.name === here) p.here = true;
			if (owned?.has(r.name)) p.bottles = owned.get(r.name);
			return p;
		})
		// the page's own region last, so it is drawn on top of its neighbours
		.sort((a, b) => Number(!!a.here) - Number(!!b.here));
	return { country, d: shape.d, w: shape.w, h: shape.h, points };
}

/** Regions of the user's wines (free text, any spelling) → bottles in the cellar */
export function bottlesByRegion(wines: { region: string | null; quantity: number }[]): Map<string, number> {
	const out = new Map<string, number>();
	for (const w of wines) {
		const r = w.region && regionIndex.get(normalize(w.region));
		if (r) out.set(r.name, (out.get(r.name) ?? 0) + w.quantity);
	}
	return out;
}
