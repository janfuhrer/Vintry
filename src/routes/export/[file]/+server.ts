import { error } from '@sveltejs/kit';
import { toCsv } from '#lib/csv.ts';
import { localISODate } from '#lib/dates.ts';
import { exportData, exportPhotos } from '#lib/server/wines.ts';
import { zipStream } from '#lib/server/zip.ts';
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

/** "Château X 2015" → "Chateau X 2015": safe in any file system and unzip tool */
const fileName = (s: string) =>
	s
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^\w .-]+/g, '')
		.trim()
		.slice(0, 60) || 'wine';

async function* photoEntries(userId: string) {
	for await (const p of exportPhotos(userId)) {
		const name = fileName([p.name, p.vintage].filter(Boolean).join(' '));
		// the id keeps two photos of the same wine and vintage apart
		yield { name: `${name} ${p.id.slice(0, 8)}.jpg`, data: p.image, date: p.updated_at };
	}
}

/** The user's own data, for keeping or moving elsewhere */
export const GET: RequestHandler = async ({ params, locals }) => {
	const stamp = localISODate();
	if (params.file === 'photos.zip') {
		// streamed: a cellar's photos can be hundreds of MB
		return new Response(zipStream(photoEntries(locals.user!.id)), {
			headers: {
				'content-type': 'application/zip',
				'content-disposition': `attachment; filename="vintry-photos-${stamp}.zip"`,
				'cache-control': 'private, no-store'
			}
		});
	}
	const { wines, drinks } = await exportData(locals.user!.id);
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
