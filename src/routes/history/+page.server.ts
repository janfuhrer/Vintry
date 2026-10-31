import { cellarValue, history, HISTORY_PAGE, yearStats } from '#lib/server/wines.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const userId = locals.user!.id;
	const all = url.searchParams.has('all');
	const [drinks, years, value] = await Promise.all([
		history(userId, all),
		yearStats(userId),
		cellarValue(userId)
	]);
	// one more than a page was asked for, to know whether there are older ones
	const more = !all && drinks.length > HISTORY_PAGE;
	return { drinks: more ? drinks.slice(0, HISTORY_PAGE) : drinks, more, years, value };
};
