import type { Color } from '#lib/wine.ts';
import { sql } from './db';

export interface Wine {
	id: string;
	name: string;
	producer: string | null;
	vintage: number | null;
	color: Color;
	country: string | null;
	region: string | null;
	grapes: string[];
	alcohol: number | null;
	size_ml: number | null;
	quantity: number;
	drink_from: number | null;
	drink_to: number | null;
	body: number | null;
	acidity: number | null;
	tannin: number | null;
	sweetness: number | null;
	rating: number | null;
	notes: string | null;
	purchased_on: string | null;
	purchased_at: string | null;
	price: number | null;
	gifted_by: string | null;
	location: string | null;
	has_photo: boolean;
	photo_version: number | null;
	created_at: Date;
	updated_at: Date;
}

export type WineListItem = Pick<
	Wine,
	| 'id'
	| 'name'
	| 'producer'
	| 'vintage'
	| 'color'
	| 'country'
	| 'region'
	| 'grapes'
	| 'quantity'
	| 'drink_from'
	| 'drink_to'
	| 'rating'
	| 'location'
	| 'has_photo'
	| 'photo_version'
>;

export type WineInput = Omit<Wine, 'id' | 'has_photo' | 'photo_version' | 'created_at' | 'updated_at'> & {
	ocr_text: string | null;
};

export async function listWines(userId: string): Promise<WineListItem[]> {
	return sql<WineListItem[]>`
		select w.id, w.name, w.producer, w.vintage, w.color, w.country, w.region, w.grapes,
			w.quantity, w.drink_from, w.drink_to, w.rating, w.location, w.has_photo, (extract(epoch from p.updated_at) * 1000)::int8 as photo_version
		from wines w left join wine_photos p on p.wine_id = w.id
		where w.user_id = ${userId}
		order by w.updated_at desc
	`;
}

export async function getWine(userId: string, id: string): Promise<Wine | null> {
	if (!isUuid(id)) return null;
	const [row] = await sql<Wine[]>`
		select w.*, (extract(epoch from p.updated_at) * 1000)::int8 as photo_version
		from wines w left join wine_photos p on p.wine_id = w.id
		where w.id = ${id} and w.user_id = ${userId}
	`;
	if (!row) return null;
	delete (row as Partial<WineInput>).ocr_text;
	return row;
}

export const isUuid = (s: string) =>
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ---- writes ----

const columns = [
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
	'drink_from',
	'drink_to',
	'body',
	'acidity',
	'tannin',
	'sweetness',
	'rating',
	'notes',
	'purchased_on',
	'purchased_at',
	'price',
	'gifted_by',
	'location',
	'ocr_text'
] as const;

export async function createWine(
	userId: string,
	input: WineInput,
	photo: { image: Buffer; thumb: Buffer } | null | undefined
): Promise<string> {
	return sql.begin(async (tx) => {
		const [{ id }] = await tx<{ id: string }[]>`
			insert into wines ${tx({ ...input, user_id: userId, has_photo: !!photo }, ...columns, 'user_id', 'has_photo')}
			returning id
		`;
		if (photo) {
			await tx`insert into wine_photos (wine_id, image, thumb) values (${id}, ${photo.image}::bytea, ${photo.thumb}::bytea)`;
		}
		return id;
	});
}

export async function updateWine(
	userId: string,
	id: string,
	input: WineInput,
	photo: { image: Buffer; thumb: Buffer } | null | undefined
): Promise<boolean> {
	return sql.begin(async (tx) => {
		const { ocr_text, ...rest } = input;
		const fields: Partial<WineInput> = rest;
		// editing never clears the text read from the label
		if (ocr_text) fields.ocr_text = ocr_text;
		const result = await tx`
			update wines set ${tx(fields, ...(Object.keys(fields) as (keyof WineInput)[]))}, updated_at = now()
			where id = ${id} and user_id = ${userId}
		`;
		if (!result.count) return false;
		if (photo === null) {
			await tx`delete from wine_photos where wine_id = ${id}`;
			await tx`update wines set has_photo = false where id = ${id}`;
		} else if (photo) {
			await tx`
				insert into wine_photos (wine_id, image, thumb) values (${id}, ${photo.image}::bytea, ${photo.thumb}::bytea)
				on conflict (wine_id) do update set image = excluded.image, thumb = excluded.thumb, updated_at = now()
			`;
			await tx`update wines set has_photo = true where id = ${id}`;
		}
		return true;
	});
}

export async function deleteWine(userId: string, id: string) {
	if (!isUuid(id)) return;
	await sql`delete from wines where id = ${id} and user_id = ${userId}`;
}

export async function setQuantity(userId: string, id: string, delta: number) {
	if (!isUuid(id)) return;
	await sql`
		update wines set quantity = greatest(0, quantity + ${delta}), updated_at = now()
		where id = ${id} and user_id = ${userId}
	`;
}

export async function setRating(userId: string, id: string, rating: number | null) {
	if (!isUuid(id)) return;
	await sql`update wines set rating = ${rating} where id = ${id} and user_id = ${userId}`;
}

export async function drinkOne(
	userId: string,
	wineId: string,
	drink: { drunk_on: string; rating: number | null; note: string | null }
): Promise<boolean> {
	if (!isUuid(wineId)) return false;
	return sql.begin(async (tx) => {
		const result = await tx`
			update wines set quantity = quantity - 1, updated_at = now(),
				rating = coalesce(${drink.rating}::smallint, rating)
			where id = ${wineId} and user_id = ${userId} and quantity > 0
		`;
		if (!result.count) return false;
		await tx`
			insert into drinks (wine_id, user_id, drunk_on, rating, note)
			values (${wineId}, ${userId}, ${drink.drunk_on}, ${drink.rating}, ${drink.note})
		`;
		return true;
	});
}

export interface Drink {
	id: string;
	wine_id: string;
	drunk_on: string;
	rating: number | null;
	note: string | null;
}

export async function drinksForWine(userId: string, wineId: string): Promise<Drink[]> {
	return sql<Drink[]>`
		select id, wine_id, drunk_on, rating, note from drinks
		where wine_id = ${wineId} and user_id = ${userId}
		order by drunk_on desc, created_at desc
	`;
}

/** Undoes a "drink one": removes the entry and puts the bottle back */
export async function deleteDrink(userId: string, id: string) {
	if (!isUuid(id)) return;
	await sql.begin(async (tx) => {
		const [drink] = await tx<{ wine_id: string }[]>`
			delete from drinks where id = ${id} and user_id = ${userId} returning wine_id
		`;
		if (drink) {
			await tx`
				update wines set quantity = quantity + 1, updated_at = now()
				where id = ${drink.wine_id} and user_id = ${userId}
			`;
		}
	});
}

export type HistoryItem = Drink &
	Pick<
		Wine,
		'name' | 'producer' | 'vintage' | 'color' | 'grapes' | 'country' | 'has_photo' | 'photo_version'
	>;

export async function history(userId: string): Promise<HistoryItem[]> {
	return sql<HistoryItem[]>`
		select d.id, d.wine_id, d.drunk_on, d.rating, d.note,
			w.name, w.producer, w.vintage, w.color, w.grapes, w.country, w.has_photo,
			(extract(epoch from p.updated_at) * 1000)::int8 as photo_version
		from drinks d
		join wines w on w.id = d.wine_id
		left join wine_photos p on p.wine_id = w.id
		where d.user_id = ${userId}
		order by d.drunk_on desc, d.created_at desc
		limit 500
	`;
}

export interface Suggestions {
	locations: string[];
	shops: string[];
	givers: string[];
}

/** Values the user typed before, most recent first, for the form's datalists */
export async function suggestions(userId: string): Promise<Suggestions> {
	const pick = async (column: 'location' | 'purchased_at' | 'gifted_by') => {
		const rows = await sql<{ v: string }[]>`
			select ${sql(column)} as v from wines
			where user_id = ${userId} and ${sql(column)} is not null
			group by ${sql(column)} order by max(updated_at) desc limit 30
		`;
		return rows.map((r) => r.v);
	};
	const [locations, shops, givers] = await Promise.all([
		pick('location'),
		pick('purchased_at'),
		pick('gifted_by')
	]);
	return { locations, shops, givers };
}

/** Everything a user owns except photos, for the export downloads */
export async function exportData(userId: string) {
	const wines = await sql<(Omit<Wine, 'photo_version'> & { id: string })[]>`
		select id, name, producer, vintage, color, country, region, grapes, alcohol, size_ml, quantity,
			location, drink_from, drink_to, body, acidity, tannin, sweetness, rating, purchased_on,
			purchased_at, price, gifted_by, notes, has_photo, created_at, updated_at
		from wines where user_id = ${userId} order by name, vintage
	`;
	const drinks = await sql<
		{
			wine_id: string;
			drunk_on: string;
			name: string;
			producer: string | null;
			vintage: number | null;
			rating: number | null;
			note: string | null;
		}[]
	>`
		select d.wine_id, d.drunk_on, w.name, w.producer, w.vintage, d.rating, d.note
		from drinks d join wines w on w.id = d.wine_id
		where d.user_id = ${userId} order by d.drunk_on desc, d.created_at desc
	`;
	return { wines, drinks };
}
