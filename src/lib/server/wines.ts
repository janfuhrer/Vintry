import type { Color } from '#lib/wine.ts';
import type { Owned } from '#lib/match.ts';
import type { Purchase } from './wine-form';
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
	/** wanted, not owned yet (quantity stays 0) */
	wishlist: boolean;
	/** the bottle's EAN/UPC, as normalizeGtin writes it */
	barcode: string | null;
	has_photo: boolean;
	photo_version: number | null;
	/** Set when there is a photo of the back label; changes with it, for the image URL */
	back_version: number | null;
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
	| 'purchased_at'
	| 'notes'
	| 'wishlist'
	| 'has_photo'
	| 'photo_version'
>;

export type WineInput = Omit<
	Wine,
	'id' | 'has_photo' | 'photo_version' | 'back_version' | 'created_at' | 'updated_at'
> & {
	ocr_text: string | null;
};

export async function listWines(userId: string): Promise<WineListItem[]> {
	return sql<WineListItem[]>`
		select w.id, w.name, w.producer, w.vintage, w.color, w.country, w.region, w.grapes,
			w.quantity, w.drink_from, w.drink_to, w.rating, w.location, w.purchased_at, w.notes, w.wishlist, w.has_photo, (extract(epoch from p.updated_at) * 1000)::int8 as photo_version
		from wines w left join wine_photos p on p.wine_id = w.id
		where w.user_id = ${userId}
		order by w.updated_at desc
	`;
}

export async function getWine(userId: string, id: string): Promise<Wine | null> {
	if (!isUuid(id)) return null;
	const [row] = await sql<Wine[]>`
		select w.*, (extract(epoch from p.updated_at) * 1000)::int8 as photo_version,
			(extract(epoch from b.updated_at) * 1000)::int8 as back_version
		from wines w
		left join wine_photos p on p.wine_id = w.id
		left join wine_back_photos b on b.wine_id = w.id
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
	'wishlist',
	'barcode',
	'ocr_text'
] as const;

export async function createWine(
	userId: string,
	input: WineInput,
	photo: { image: Buffer; thumb: Buffer } | null | undefined,
	back?: Buffer | null
): Promise<string> {
	return sql.begin(async (tx) => {
		const [{ id }] = await tx<{ id: string }[]>`
			insert into wines ${tx({ ...input, user_id: userId, has_photo: !!photo }, ...columns, 'user_id', 'has_photo')}
			returning id
		`;
		if (photo) {
			await tx`insert into wine_photos (wine_id, image, thumb) values (${id}, ${photo.image}::bytea, ${photo.thumb}::bytea)`;
		}
		if (back) await tx`insert into wine_back_photos (wine_id, image) values (${id}, ${back}::bytea)`;
		return id;
	});
}

export async function updateWine(
	userId: string,
	id: string,
	input: WineInput,
	photo: { image: Buffer; thumb: Buffer } | null | undefined,
	/** `undefined`: keep, `null`: remove */
	back?: Buffer | null
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
		if (back === null) await tx`delete from wine_back_photos where wine_id = ${id}`;
		else if (back) {
			await tx`
				insert into wine_back_photos (wine_id, image) values (${id}, ${back}::bytea)
				on conflict (wine_id) do update set image = excluded.image, updated_at = now()
			`;
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

/**
 * More bottles of a wine the user has already (or the first ones, for a wish), plus the
 * label photo when the wine had none. An existing photo is never replaced from here.
 */
export async function restock(
	userId: string,
	id: string,
	photo?: { image: Buffer; thumb: Buffer },
	bottles = 1,
	purchase: Partial<Purchase> = {}
) {
	if (!isUuid(id)) return false;
	const p = {
		location: null,
		purchased_on: null,
		purchased_at: null,
		price: null,
		gifted_by: null,
		notes: null,
		...purchase
	};
	return sql.begin(async (tx) => {
		// the latest purchase's details win; a new note is added to the old ones
		const [wine] = await tx<{ has_photo: boolean }[]>`
			update wines set
				quantity = case when wishlist then greatest(quantity, ${bottles}) else quantity + ${bottles} end,
				wishlist = false, updated_at = now(),
				location = coalesce(${p.location}::text, location),
				purchased_on = coalesce(${p.purchased_on}::date, purchased_on),
				purchased_at = coalesce(${p.purchased_at}::text, purchased_at),
				price = coalesce(${p.price}::numeric, price),
				gifted_by = coalesce(${p.gifted_by}::text, gifted_by),
				notes = case
					when ${p.notes}::text is null or position(${p.notes}::text in coalesce(notes, '')) > 0 then notes
					when notes is null then ${p.notes}::text
					else notes || E'\n' || ${p.notes}::text
				end
			where id = ${id} and user_id = ${userId}
			returning has_photo
		`;
		if (!wine) return false;
		if (photo && !wine.has_photo) {
			await tx`insert into wine_photos (wine_id, image, thumb) values (${id}, ${photo.image}::bytea, ${photo.thumb}::bytea)`;
			await tx`update wines set has_photo = true where id = ${id}`;
		}
		return true;
	});
}

export async function setRating(userId: string, id: string, rating: number | null) {
	if (!isUuid(id)) return;
	await sql`update wines set rating = ${rating} where id = ${id} and user_id = ${userId}`;
}

/** Takes a bottle out and logs the drink; the wine's rating before is returned for an undo */
export async function drinkOne(
	userId: string,
	wineId: string,
	drink: { drunk_on: string; rating: number | null; note: string | null }
): Promise<{ id: string; ratingBefore: number | null } | null> {
	if (!isUuid(wineId)) return null;
	return sql.begin(async (tx) => {
		const [before] = await tx<{ rating: number | null }[]>`
			select rating from wines where id = ${wineId} and user_id = ${userId} and quantity > 0 for update
		`;
		if (!before) return null;
		await tx`
			update wines set quantity = quantity - 1, updated_at = now(),
				rating = coalesce(${drink.rating}::smallint, rating)
			where id = ${wineId} and user_id = ${userId}
		`;
		const [{ id }] = await tx<{ id: string }[]>`
			insert into drinks (wine_id, user_id, drunk_on, rating, note)
			values (${wineId}, ${userId}, ${drink.drunk_on}, ${drink.rating}, ${drink.note})
			returning id
		`;
		return { id, ratingBefore: before.rating };
	});
}

export interface Drink {
	id: string;
	wine_id: string;
	drunk_on: string;
	rating: number | null;
	note: string | null;
}

/** The same wine (name and producer, ignoring case) in other vintages, newest first */
export async function otherVintages(userId: string, wine: Pick<Wine, 'id' | 'name' | 'producer'>) {
	return sql<{ id: string; vintage: number | null; quantity: number; wishlist: boolean }[]>`
		select id, vintage, quantity, wishlist from wines
		where user_id = ${userId} and id <> ${wine.id}
			and lower(name) = lower(${wine.name})
			and lower(coalesce(producer, '')) = lower(${wine.producer ?? ''})
		order by vintage desc nulls last
	`;
}

export async function drinksForWine(userId: string, wineId: string): Promise<Drink[]> {
	return sql<Drink[]>`
		select id, wine_id, drunk_on, rating, note from drinks
		where wine_id = ${wineId} and user_id = ${userId}
		order by drunk_on desc, created_at desc
	`;
}

export async function updateDrink(
	userId: string,
	id: string,
	drink: { drunk_on: string; rating: number | null; note: string | null }
): Promise<boolean> {
	if (!isUuid(id)) return false;
	const result = await sql`
		update drinks set drunk_on = ${drink.drunk_on}, rating = ${drink.rating}, note = ${drink.note}
		where id = ${id} and user_id = ${userId}
	`;
	return result.count > 0;
}

/** Undoes a "drink one": removes the entry and puts the bottle back */
/**
 * Removes a drink entry and puts the bottle back. An undo also hands back the wine's rating
 * from before the drink, restored only if nothing changed the rating since.
 */
export async function deleteDrink(userId: string, id: string, ratingBefore?: number | null) {
	if (!isUuid(id)) return;
	await sql.begin(async (tx) => {
		const [drink] = await tx<{ wine_id: string; rating: number | null }[]>`
			delete from drinks where id = ${id} and user_id = ${userId} returning wine_id, rating
		`;
		if (!drink) return;
		await tx`
			update wines set quantity = quantity + 1, updated_at = now()
			where id = ${drink.wine_id} and user_id = ${userId}
		`;
		if (ratingBefore !== undefined && drink.rating !== null) {
			await tx`
				update wines set rating = ${ratingBefore}
				where id = ${drink.wine_id} and user_id = ${userId} and rating = ${drink.rating}
			`;
		}
	});
}

export type HistoryItem = Drink &
	Pick<
		Wine,
		'name' | 'producer' | 'vintage' | 'color' | 'grapes' | 'country' | 'has_photo' | 'photo_version'
	>;

/** How many drinks the history lists before "show older" */
export const HISTORY_PAGE = 500;

export async function history(userId: string, all = false): Promise<HistoryItem[]> {
	return sql<HistoryItem[]>`
		select d.id, d.wine_id, d.drunk_on, d.rating, d.note,
			w.name, w.producer, w.vintage, w.color, w.grapes, w.country, w.has_photo,
			(extract(epoch from p.updated_at) * 1000)::int8 as photo_version
		from drinks d
		join wines w on w.id = d.wine_id
		left join wine_photos p on p.wine_id = w.id
		where d.user_id = ${userId}
		order by d.drunk_on desc, d.created_at desc
		${all ? sql`` : sql`limit ${HISTORY_PAGE + 1}`}
	`;
}

export interface YearStats {
	year: number;
	bottles: number;
	avgRating: number | null;
	topGrape: string | null;
	topCountry: string | null;
}

/**
 * Per year, over every drink (the history list itself is paged): bottles, average rating,
 * and the most drunk grape and country, ties going to the most recently drunk.
 */
export async function yearStats(userId: string): Promise<YearStats[]> {
	return sql<YearStats[]>`
		with d as (
			select extract(year from d.drunk_on)::int as year, d.drunk_on, d.created_at, d.rating,
				w.grapes, w.country,
				-- one sortable key per drink: the day drunk, then when it was entered
				to_char(d.drunk_on, 'YYYY-MM-DD') || to_char(d.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US') as recency
			from drinks d join wines w on w.id = d.wine_id
			where d.user_id = ${userId}
		),
		totals as (
			select year, count(*)::int as bottles, round(avg(rating), 1)::float8 as avg_rating
			from d group by year
		),
		grapes as (
			-- within one wine, the grape listed first (the main one) wins a tie
			select year, grape, row_number() over (
				partition by year order by count(*) desc, max(recency) desc, min(pos)
			) as n
			from d, unnest(grapes) with ordinality as g(grape, pos) group by year, grape
		),
		countries as (
			select year, country, row_number() over (
				partition by year order by count(*) desc, max(recency) desc
			) as n
			from d where country is not null group by year, country
		)
		select t.year, t.bottles, t.avg_rating as "avgRating", g.grape as "topGrape", c.country as "topCountry"
		from totals t
		left join grapes g on g.year = t.year and g.n = 1
		left join countries c on c.year = t.year and c.n = 1
		order by t.year desc
	`;
}

export interface Suggestions {
	locations: string[];
	shops: string[];
	givers: string[];
}

/** The same wine (name, producer and vintage, ignoring case) the user has already, if any */
export async function findDuplicate(userId: string, w: Pick<WineInput, 'name' | 'producer' | 'vintage'>) {
	const [row] = await sql<
		{ id: string; name: string; vintage: number | null; quantity: number; wishlist: boolean }[]
	>`
		select id, name, vintage, quantity, wishlist from wines
		where user_id = ${userId} and lower(name) = lower(${w.name})
			and lower(coalesce(producer, '')) = lower(${w.producer ?? ''})
			and vintage is not distinct from ${w.vintage}
		order by wishlist, quantity desc limit 1
	`;
	return row ?? null;
}

/** Just enough to recognise a scanned label as a wine the user already has */
export async function ownedWines(userId: string): Promise<Owned[]> {
	return sql<Owned[]>`
		select id, name, producer, vintage, quantity, wishlist, has_photo, barcode from wines where user_id = ${userId}
	`;
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

/** The user's label photos, front and back, one at a time, for the photo export */
export async function* exportPhotos(userId: string) {
	const cursor = sql<
		{ id: string; name: string; vintage: number | null; back: boolean; image: Buffer; updated_at: Date }[]
	>`
		select w.id, w.name, w.vintage, false as back, p.image, p.updated_at
		from wine_photos p join wines w on w.id = p.wine_id
		where w.user_id = ${userId}
		union all
		select w.id, w.name, w.vintage, true as back, b.image, b.updated_at
		from wine_back_photos b join wines w on w.id = b.wine_id
		where w.user_id = ${userId}
		order by name, vintage, id, back
	`.cursor(8);
	for await (const rows of cursor) yield* rows;
}

/** Everything a user owns except photos, for the export downloads */
export async function exportData(userId: string) {
	const wines = await sql<(Omit<Wine, 'photo_version'> & { id: string })[]>`
		select id, name, producer, vintage, color, country, region, grapes, alcohol, size_ml, quantity,
			location, drink_from, drink_to, body, acidity, tannin, sweetness, rating, purchased_on,
			purchased_at, price, gifted_by, notes, wishlist, barcode, has_photo, created_at, updated_at
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

/** Same name, producer and vintage, ignoring case: how imports recognise a wine already there */
const wineKey = (w: { name: string; producer: string | null; vintage: number | null }) =>
	[
		w.name.normalize('NFC').toLowerCase(),
		(w.producer ?? '').normalize('NFC').toLowerCase(),
		w.vintage ?? ''
	].join('\u0000');

/**
 * Adds many wines at once (CSV import), all or nothing. With skipOwned, a row for a wine
 * already in the cellar is left out; one for a wish or a finished wine brings its bottles
 * to that entry instead of making a second one.
 */
export async function importWines(
	userId: string,
	inputs: WineInput[],
	{ skipOwned = false } = {}
): Promise<{ imported: number; skipped: number; restocked: number }> {
	return sql.begin(async (tx) => {
		let fresh = inputs;
		let skipped = 0;
		let restocked = 0;
		if (skipOwned) {
			const owned = await tx<
				{
					id: string;
					name: string;
					producer: string | null;
					vintage: number | null;
					quantity: number;
					wishlist: boolean;
				}[]
			>`select id, name, producer, vintage, quantity, wishlist from wines where user_id = ${userId}`;
			const byKey = new Map(owned.map((w) => [wineKey(w), w]));
			fresh = [];
			for (const input of inputs) {
				const match = byKey.get(wineKey(input));
				if (!match) fresh.push(input);
				else if ((match.wishlist || match.quantity === 0) && input.quantity > 0 && !input.wishlist) {
					await tx`
						update wines set quantity = ${input.quantity}, wishlist = false, updated_at = now()
						where id = ${match.id} and user_id = ${userId}
					`;
					// a second row for it in the same sheet is then a wine in the cellar
					match.quantity = input.quantity;
					match.wishlist = false;
					restocked++;
				} else skipped++;
			}
		}
		if (!fresh.length) return { imported: 0, skipped, restocked };
		const rows = fresh.map((input) => ({ ...input, user_id: userId, has_photo: false }));
		const result = await tx`
			insert into wines ${tx(rows, ...columns, 'user_id', 'has_photo')}
		`;
		return { imported: result.count, skipped, restocked };
	});
}

/** Purchase value of the bottles still in the cellar, where a price was entered */
export async function cellarValue(userId: string): Promise<{ value: number; bottles: number }> {
	const [row] = await sql<{ value: number | null; bottles: number }[]>`
		select sum(price * quantity)::numeric(12, 2) as value, coalesce(sum(quantity), 0)::int as bottles
		from wines where user_id = ${userId} and quantity > 0 and price is not null
	`;
	return { value: row.value ?? 0, bottles: row.bottles };
}

/** Wishlist → cellar: the wine was bought, one bottle is in */
export async function markBought(userId: string, id: string) {
	if (!isUuid(id)) return;
	await sql`
		update wines set wishlist = false, quantity = greatest(quantity, 1), updated_at = now()
		where id = ${id} and user_id = ${userId}
	`;
}
