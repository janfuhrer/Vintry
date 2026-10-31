import { error } from '@sveltejs/kit';
import { sql } from '#lib/server/db.ts';
import { bottlesByRegion, countryMap } from '#lib/server/map.ts';
import type { WineListItem } from '#lib/server/wines.ts';
import { findRegionBySlug, normalize } from '#lib/wine.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const region = findRegionBySlug(params.slug);
	if (!region) error(404, 'Not found');
	// region is free text: match any of its spellings, ignoring case and accents
	const names = new Set([region.name, ...region.synonyms].map(normalize));
	const rows = await sql<
		(Pick<WineListItem, 'id' | 'name' | 'producer' | 'vintage' | 'quantity'> & { region: string })[]
	>`
		select id, name, producer, vintage, quantity, region from wines
		-- wanted, not owned: the wishlist isn't part of "your wines"
		where user_id = ${locals.user!.id} and region is not null and not wishlist
		order by quantity > 0 desc, name
	`;
	const map = region.at
		? countryMap(region.country, { here: region.name, owned: bottlesByRegion(rows) })
		: null;
	return { name: region.name, wines: rows.filter((w) => names.has(normalize(w.region))), map };
};
