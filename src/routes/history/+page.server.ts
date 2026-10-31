import { history } from '#lib/server/wines.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => ({
	drinks: await history(locals.user!.id)
});
