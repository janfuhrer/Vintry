import { error } from '@sveltejs/kit';
import { sql } from '#lib/server/db.ts';
import type { WineListItem } from '#lib/server/wines.ts';
import { findGrapeBySlug } from '#lib/wine.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const grape = findGrapeBySlug(params.slug);
	if (!grape) error(404, 'Not found');
	// grape names are stored canonical, so the table name matches exactly
	const wines = await sql<Pick<WineListItem, 'id' | 'name' | 'producer' | 'vintage' | 'quantity'>[]>`
		select id, name, producer, vintage, quantity from wines
		-- wanted, not owned: the wishlist isn't part of "your wines"
		where user_id = ${locals.user!.id} and ${grape.name} = any(grapes) and not wishlist
		order by quantity > 0 desc, name
	`;
	return { name: grape.name, wines };
};
