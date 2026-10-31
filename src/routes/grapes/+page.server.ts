import { sql } from '#lib/server/db.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// bottles per grape in the cellar (grape names are stored canonical, as in the table)
	const rows = await sql<{ grape: string; bottles: number }[]>`
		select grape, sum(quantity)::int as bottles
		from wines, unnest(grapes) as grape
		where user_id = ${locals.user!.id} and not wishlist and quantity > 0
		group by grape
	`;
	return { bottles: Object.fromEntries(rows.map((r) => [r.grape, r.bottles])) as Record<string, number> };
};
