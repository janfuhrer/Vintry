import { error } from '@sveltejs/kit';
import { toCsv } from '#lib/csv.ts';
import { localISODate } from '#lib/dates.ts';
import { exportData } from '#lib/server/wines.ts';
import type { RequestHandler } from './$types';

const WINE_COLUMNS = [
	'name',
	'producer',
	'vintage',
	'color',
	'country',
	'region',
	'grapes',
	'alcohol',
	'size_ml',
	'quantity',
	'wishlist',
	'location',
	'drink_from',
	'drink_to',
	'body',
	'acidity',
	'tannin',
	'sweetness',
	'rating',
	'purchased_on',
	'purchased_at',
	'price',
	'gifted_by',
	'notes',
	'created_at'
] as const;
const DRINK_COLUMNS = ['drunk_on', 'name', 'producer', 'vintage', 'rating', 'note'] as const;

/** The user's own data, for keeping or moving elsewhere. Photos are not included. */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { wines, drinks } = await exportData(locals.user!.id);
	const stamp = localISODate();
	const file = (body: string, type: string, name: string) =>
		new Response(body, {
			headers: {
				'content-type': `${type}; charset=utf-8`,
				'content-disposition': `attachment; filename="${name}"`,
				'cache-control': 'private, no-store'
			}
		});

	switch (params.file) {
		case 'wines.csv':
			return file(toCsv(wines, [...WINE_COLUMNS]), 'text/csv', `vintry-cellar-${stamp}.csv`);
		case 'drinks.csv':
			return file(toCsv(drinks, [...DRINK_COLUMNS]), 'text/csv', `vintry-history-${stamp}.csv`);
		case 'vintry.json':
			return file(
				JSON.stringify({ app: 'vintry', exported_at: new Date().toISOString(), wines, drinks }, null, 2),
				'application/json',
				`vintry-${stamp}.json`
			);
		default:
			error(404, 'Not found');
	}
};
