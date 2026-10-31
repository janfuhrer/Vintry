import { COLORS, canonicalGrape, type Color } from '#lib/wine.ts';
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
	| 'id' | 'name' | 'producer' | 'vintage' | 'color' | 'country' | 'region' | 'grapes'
	| 'quantity' | 'drink_from' | 'drink_to' | 'rating' | 'location' | 'has_photo' | 'photo_version'
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

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ---- form parsing ----

const MAX_PHOTO = 1_500_000;
const MAX_THUMB = 200_000;

export type FieldErrors = Partial<Record<keyof WineInput | 'photo', string>>;

function str(fd: FormData, key: string, max = 200): string | null {
	const v = fd.get(key);
	if (typeof v !== 'string') return null;
	const s = v.trim().slice(0, max);
	return s || null;
}

function int(fd: FormData, key: string, min: number, max: number, errors: FieldErrors): number | null {
	const s = str(fd, key);
	if (s === null) return null;
	const n = Number(s);
	if (!Number.isInteger(n) || n < min || n > max) {
		errors[key as keyof FieldErrors] = 'invalid';
		return null;
	}
	return n;
}

function decimal(fd: FormData, key: string, max: number, errors: FieldErrors): number | null {
	const s = str(fd, key);
	if (s === null) return null;
	const n = Number(s.replace(',', '.'));
	if (!Number.isFinite(n) || n < 0 || n > max) {
		errors[key as keyof FieldErrors] = 'invalid';
		return null;
	}
	return Math.round(n * 100) / 100;
}

export function parseWineForm(fd: FormData): { input: WineInput; errors: FieldErrors } {
	const errors: FieldErrors = {};
	const name = str(fd, 'name');
	if (!name) errors.name = 'required';

	const colorRaw = str(fd, 'color');
	const color = (COLORS as readonly string[]).includes(colorRaw ?? '') ? (colorRaw as Color) : 'red';

	const countryRaw = str(fd, 'country', 2);
	const country = countryRaw && /^[A-Z]{2}$/i.test(countryRaw) ? countryRaw.toUpperCase() : null;

	const grapes = [
		...new Set(
			fd
				.getAll('grapes')
				.filter((g): g is string => typeof g === 'string')
				.map((g) => canonicalGrape(g.slice(0, 60)))
				.filter(Boolean)
		)
	].slice(0, 12);

	const year = new Date().getFullYear();
	const purchasedOn = str(fd, 'purchased_on', 10);
	if (purchasedOn && !/^\d{4}-\d{2}-\d{2}$/.test(purchasedOn)) errors.purchased_on = 'invalid';

	const input: WineInput = {
		name: name ?? '',
		producer: str(fd, 'producer'),
		vintage: int(fd, 'vintage', 1800, year + 1, errors),
		color,
		country,
		region: str(fd, 'region', 100),
		grapes,
		alcohol: decimal(fd, 'alcohol', 99, errors),
		size_ml: int(fd, 'size_ml', 1, 30_000, errors),
		quantity: int(fd, 'quantity', 0, 9999, errors) ?? 0,
		drink_from: int(fd, 'drink_from', 1800, 2300, errors),
		drink_to: int(fd, 'drink_to', 1800, 2300, errors),
		body: int(fd, 'body', 1, 5, errors),
		acidity: int(fd, 'acidity', 1, 5, errors),
		tannin: int(fd, 'tannin', 1, 5, errors),
		sweetness: int(fd, 'sweetness', 1, 5, errors),
		rating: int(fd, 'rating', 1, 5, errors),
		notes: str(fd, 'notes', 5000),
		purchased_on: purchasedOn && !errors.purchased_on ? purchasedOn : null,
		purchased_at: str(fd, 'purchased_at'),
		price: decimal(fd, 'price', 99_999_999, errors),
		gifted_by: str(fd, 'gifted_by'),
		location: str(fd, 'location', 100),
		ocr_text: str(fd, 'ocr_text', 5000)
	};
	if (input.drink_from && input.drink_to && input.drink_from > input.drink_to) errors.drink_to = 'invalid';
	return { input, errors };
}

const isJpeg = (b: Uint8Array) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** `undefined`: keep the current photo, `null`: remove it */
export async function parsePhoto(
	fd: FormData,
	errors: FieldErrors
): Promise<{ image: Buffer; thumb: Buffer } | null | undefined> {
	if (fd.get('remove_photo') === '1') return null;
	const image = fd.get('photo');
	const thumb = fd.get('thumb');
	if (!(image instanceof File) || !image.size) return undefined;
	if (!(thumb instanceof File) || !thumb.size) {
		errors.photo = 'invalid';
		return undefined;
	}
	if (image.size > MAX_PHOTO || thumb.size > MAX_THUMB) {
		errors.photo = 'too_large';
		return undefined;
	}
	const [a, b] = await Promise.all([image.arrayBuffer(), thumb.arrayBuffer()]);
	const img = Buffer.from(a);
	const th = Buffer.from(b);
	if (!isJpeg(img) || !isJpeg(th)) {
		errors.photo = 'invalid';
		return undefined;
	}
	return { image: img, thumb: th };
}

// ---- writes ----

const columns = [
	'name', 'producer', 'vintage', 'color', 'country', 'region', 'grapes', 'alcohol', 'size_ml',
	'quantity', 'drink_from', 'drink_to', 'body', 'acidity', 'tannin', 'sweetness', 'rating', 'notes',
	'purchased_on', 'purchased_at', 'price', 'gifted_by', 'location', 'ocr_text'
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
	await sql`
		update wines set quantity = greatest(0, quantity + ${delta}), updated_at = now()
		where id = ${id} and user_id = ${userId}
	`;
}

export async function setRating(userId: string, id: string, rating: number | null) {
	await sql`update wines set rating = ${rating} where id = ${id} and user_id = ${userId}`;
}

export async function drinkOne(
	userId: string,
	wineId: string,
	drink: { drunk_on: string; rating: number | null; note: string | null }
): Promise<boolean> {
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

export async function deleteDrink(userId: string, id: string) {
	if (!isUuid(id)) return;
	await sql`delete from drinks where id = ${id} and user_id = ${userId}`;
}

export type HistoryItem = Drink & Pick<Wine, 'name' | 'producer' | 'vintage' | 'color' | 'has_photo' | 'photo_version'>;

export async function history(userId: string): Promise<HistoryItem[]> {
	return sql<HistoryItem[]>`
		select d.id, d.wine_id, d.drunk_on, d.rating, d.note,
			w.name, w.producer, w.vintage, w.color, w.has_photo, (extract(epoch from p.updated_at) * 1000)::int8 as photo_version
		from drinks d
		join wines w on w.id = d.wine_id
		left join wine_photos p on p.wine_id = w.id
		where d.user_id = ${userId}
		order by d.drunk_on desc, d.created_at desc
		limit 500
	`;
}
