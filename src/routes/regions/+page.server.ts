import { sql } from '#lib/server/db.ts';
import { bottlesByRegion, countryMap, mapCountries } from '#lib/server/map.ts';
import type { WineListItem } from '#lib/server/wines.ts';
import { findRegion, findRegionBySlug } from '#lib/wine.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// all of them: picking a region on the map shows its wines without asking the server again
	const wines = await sql<
		(Pick<WineListItem, 'id' | 'name' | 'producer' | 'vintage' | 'quantity'> & { region: string })[]
	>`
		select id, name, producer, vintage, quantity, region from wines
		where user_id = ${locals.user!.id} and region is not null and not wishlist
		order by quantity > 0 desc, name
	`;
	const owned = bottlesByRegion(wines);
	const mine = new Map<string, number>();
	for (const [name, bottles] of owned) {
		const country = findRegion(name)!.country;
		mine.set(country, (mine.get(country) ?? 0) + bottles);
	}
	// the asked-for country, else the one the cellar holds most bottles from
	const asked = url.searchParams.get('country')?.toUpperCase();
	const favourite = [...mine].filter(([c]) => mapCountries.includes(c)).sort((a, b) => b[1] - a[1])[0]?.[0];
	const country = asked && mapCountries.includes(asked) ? asked : (favourite ?? 'FR');
	const picked = findRegionBySlug(url.searchParams.get('region') ?? '');
	return {
		country,
		countries: mapCountries.map((code) => ({ code, bottles: mine.get(code) ?? 0 })),
		map: countryMap(country, { owned })!,
		selected: picked?.country === country && picked.at ? url.searchParams.get('region') : null,
		wines
	};
};
