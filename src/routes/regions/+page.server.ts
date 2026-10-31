import { sql } from '#lib/server/db.ts';
import { bottlesByRegion, countryMap, mapCountries } from '#lib/server/map.ts';
import { findRegion } from '#lib/wine.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const rows = await sql<{ region: string; quantity: number }[]>`
		select region, quantity from wines
		where user_id = ${locals.user!.id} and region is not null and not wishlist
	`;
	const owned = bottlesByRegion(rows);
	const mine = new Map<string, number>();
	for (const [name, bottles] of owned) {
		const country = findRegion(name)!.country;
		mine.set(country, (mine.get(country) ?? 0) + bottles);
	}
	// the asked-for country, else the one the cellar holds most bottles from
	const asked = url.searchParams.get('country')?.toUpperCase();
	const favourite = [...mine].filter(([c]) => mapCountries.includes(c)).sort((a, b) => b[1] - a[1])[0]?.[0];
	const country = asked && mapCountries.includes(asked) ? asked : (favourite ?? 'FR');
	return {
		country,
		countries: mapCountries.map((code) => ({ code, bottles: mine.get(code) ?? 0 })),
		map: countryMap(country, { owned })!
	};
};
