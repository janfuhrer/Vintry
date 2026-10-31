import postgres, { type Sql } from 'postgres';
import { DATABASE_URL } from '$app/env/private';
import { migrations } from './migrations';

let instance: Sql | undefined;

function connect(): Sql {
	if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');
	return postgres(DATABASE_URL, {
		max: 10,
		onnotice: () => {},
		types: {
			// dates stay 'YYYY-MM-DD' strings; no timezone surprises
			date: { to: 1082, from: [1082], serialize: (v: string) => v, parse: (v: string) => v },
			numeric: { to: 1700, from: [1700], serialize: (v: number) => String(v), parse: Number },
			int8: { to: 20, from: [20], serialize: (v: number) => String(v), parse: Number }
		}
	});
}

/** Lazily connected so `vite build` never needs a database */
export const sql: Sql = new Proxy((() => {}) as unknown as Sql, {
	get: (_, key) => Reflect.get((instance ??= connect()), key),
	apply: (_, __, args) => (instance ??= connect())(...(args as [TemplateStringsArray]))
});

/** Closes the pool so the process can exit; a pool that never connected is left alone */
export async function closeDb() {
	await instance?.end({ timeout: 5 });
	instance = undefined;
}

const LOCK_ID = 7_312_004;

export async function migrate() {
	await sql.begin(async (tx) => {
		await tx`select pg_advisory_xact_lock(${LOCK_ID})`;
		await tx`create table if not exists schema_migrations (
			version int primary key,
			applied_at timestamptz not null default now()
		)`;
		const done = new Set(
			(await tx<{ version: number }[]>`select version from schema_migrations`).map((r) => r.version)
		);
		for (const [i, source] of migrations.entries()) {
			const version = i + 1;
			if (done.has(version)) continue;
			await tx.unsafe(source);
			await tx`insert into schema_migrations (version) values (${version})`;
			console.log(`[db] applied migration ${String(version).padStart(3, '0')}`);
		}
	});
}
