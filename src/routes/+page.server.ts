import { listWines } from '#lib/server/wines.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	wines: await listWines(locals.user!.id)
});
