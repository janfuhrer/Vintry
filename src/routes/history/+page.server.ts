import { cellarValue, history } from '#lib/server/wines.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [drinks, value] = await Promise.all([history(locals.user!.id), cellarValue(locals.user!.id)]);
	return { drinks, value };
};
