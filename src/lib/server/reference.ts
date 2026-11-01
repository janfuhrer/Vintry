// The reference list of wines (data/xwines.tsv.gz, from X-Wines): loaded into the database on
// start, then used to fill in what a label didn't say, the grapes above all.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { Color } from '#lib/wine.ts';
import { sql } from './db.ts';
import { nameKey, pickMatch, producerKey, refFields, type Label, type Ref } from './reference-match.ts';
import type { WineInput } from './wines.ts';

// next to build/ in the image, the repository root in development and tests
const FILE = join(process.cwd(), 'data', 'xwines.tsv.gz');
const SOURCE = 'xwines';
const LOCK = 7_461_002;

/**
 * Loads the file when it differs from what the database has. Meant to run in the background
 * after start: until it is done, lookups find nothing, which is what they do without it anyway.
 */
export async function loadReference(): Promise<void> {
	if (!existsSync(FILE)) return;
	const gz = readFileSync(FILE);
	const version = createHash('sha256').update(gz).digest('hex').slice(0, 16);
	const [meta] = await sql<{ version: string }[]>`select version from ref_meta where source = ${SOURCE}`;
	if (meta?.version === version) return;

	const started = Date.now();
	const lines = gunzipSync(gz).toString('utf8').split('\n').slice(1).filter(Boolean);
	const rows = lines.map((line) => {
		const [producer, name, color, country, region, grapes, alcohol, body] = line.split('\t');
		return {
			producer,
			name,
			producer_key: producerKey(producer),
			name_key: nameKey(name, producer),
			color: color || null,
			country: country || null,
			region: region || null,
			grapes: grapes ? grapes.split('|') : [],
			alcohol: alcohol ? Number(alcohol) : null,
			body: body ? Number(body) : null
		};
	});
	await sql.begin(async (tx) => {
		// another instance starting at the same time does the same work: let one do it
		const [{ locked }] = await tx<{ locked: boolean }[]>`select pg_try_advisory_xact_lock(${LOCK}) as locked`;
		if (!locked) return;
		await tx`truncate ref_wines`;
		const columns = [
			'producer',
			'name',
			'producer_key',
			'name_key',
			'color',
			'country',
			'region',
			'grapes',
			'alcohol',
			'body'
		] as const;
		for (let i = 0; i < rows.length; i += 2000)
			await tx`insert into ref_wines ${tx(rows.slice(i, i + 2000), ...columns)}`;
		await tx`
			insert into ref_meta (source, version) values (${SOURCE}, ${version})
			on conflict (source) do update set version = excluded.version, loaded_at = now()
		`;
	});
	console.log(
		`[vintry] reference list: ${rows.length} wines loaded in ${Math.round((Date.now() - started) / 1000)} s`
	);
}

/** The reference wine a label is, if that is clear */
export async function findReference(label: Label): Promise<Ref | null> {
	const key = producerKey(label.producer);
	let candidates: Ref[] = [];
	const select = sql`select producer, name, color, country, region, grapes, alcohol::float8 as alcohol, body from ref_wines`;
	if (key.length >= 3) {
		candidates = await sql<Ref[]>`${select} where producer_key = ${key} limit 500`;
		// "Dauphins" read, "Dauphins Prestige" listed, or the other way round
		if (!candidates.length && key.length >= 5)
			candidates = await sql<
				Ref[]
			>`${select} where producer_key like ${key.replace(/[%_\\]/g, '') + ' %'} limit 500`;
	} else {
		const name = nameKey(label.name);
		if (name.split(' ').length >= 2)
			candidates = await sql<Ref[]>`${select} where name_key = ${name} limit 20`;
	}
	return pickMatch(label, candidates as (Ref & { color: Color | null })[]);
}

/**
 * Fills grapes, alcohol, country and region a wine left empty from the reference list; for
 * wines added by import or MCP, before the suggestions are worked out
 */
export async function enrich(input: WineInput): Promise<WineInput> {
	const ref = await findReference(input).catch(() => null);
	if (!ref) return input;
	const f = refFields(ref);
	return {
		...input,
		grapes: input.grapes.length ? input.grapes : (f.grapes ?? []),
		alcohol: input.alcohol ?? (f.alcohol ? Number(f.alcohol) : null),
		country: input.country ?? f.country ?? null,
		region: input.region ?? f.region ?? null
	};
}
