// Barcode lookups on Open Food Facts, for users who turned them on. The server asks, so the
// service sees neither the user's address nor who they are; answers are kept for everyone.
import { OPEN_FOOD_FACTS_URL } from '$app/env/private';
import { sql } from './db.ts';
import { offToFields, type BarcodeFields, type OffProduct } from './off.ts';

const FOUND_DAYS = 60;
const MISSING_DAYS = 7;
const FIELDS = 'product_name,brands,categories_tags,quantity,origins,nutriments';

export async function lookupEnabled(userId: string): Promise<boolean> {
	const [row] = await sql<
		{ barcode_lookup: boolean }[]
	>`select barcode_lookup from users where id = ${userId}`;
	return row?.barcode_lookup ?? false;
}

export async function setLookup(userId: string, on: boolean) {
	await sql`update users set barcode_lookup = ${on} where id = ${userId}`;
}

export class LookupError extends Error {}

/** The wine's fields for a valid barcode, null when Open Food Facts has no wine under it */
export async function lookupBarcode(code: string): Promise<BarcodeFields | null> {
	const [cached] = await sql<{ found: boolean; data: OffProduct | null }[]>`
		select found, data from barcode_cache
		where code = ${code}
			and fetched_at > now() - make_interval(days => case when found then ${FOUND_DAYS}::int else ${MISSING_DAYS}::int end)
	`;
	if (cached) return cached.found && cached.data ? offToFields(cached.data) : null;

	let product: OffProduct | null = null;
	try {
		const res = await fetch(`${OPEN_FOOD_FACTS_URL}/api/v2/product/${code}.json?fields=${FIELDS}`, {
			headers: { 'user-agent': 'Vintry/1.0 (private wine cellar app)', accept: 'application/json' },
			signal: AbortSignal.timeout(6000)
		});
		// 404 is Open Food Facts' "product not found"; anything else unexpected is a failure
		if (!res.ok && res.status !== 404) throw new LookupError(`Open Food Facts answered ${res.status}`);
		const body = (await res.json()) as { status?: number; product?: OffProduct };
		if (body.status === 1 && body.product) product = body.product;
	} catch (e) {
		throw e instanceof LookupError ? e : new LookupError(String(e));
	}
	// only wines are kept: the cache is about bottles, not about whatever else was scanned
	const fields = product ? offToFields(product) : null;
	await sql`
		insert into barcode_cache (code, found, data)
		values (${code}, ${!!fields}, ${fields ? JSON.stringify(product) : null}::jsonb)
		on conflict (code) do update set found = excluded.found, data = excluded.data, fetched_at = now()
	`;
	return fields;
}
