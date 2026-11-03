// Label photos and their text from the iPhone Shortcut, waiting on the add page until used.
import { sql } from './db.ts';

const MAX_WAITING = 10;

export interface PendingScan {
	id: string;
	front_text: string;
	back_text: string | null;
	has_back: boolean;
	created_at: Date;
}

/**
 * One photo of a Shortcut run: the run's first makes a scan (the front), the second becomes
 * its back; further ones are ignored. Null when the user has too many waiting.
 */
export async function addPhoto(
	userId: string,
	batch: string,
	image: Buffer,
	text: string
): Promise<{ id: string; side: 'front' | 'back' } | null> {
	return sql.begin(async (tx) => {
		const [existing] = await tx<{ id: string; has_back: boolean }[]>`
			select id, back is not null as has_back from pending_scans
			where user_id = ${userId} and batch = ${batch} for update
		`;
		if (existing) {
			if (existing.has_back) return { id: existing.id, side: 'back' as const };
			await tx`update pending_scans set back = ${image}::bytea, back_text = ${text} where id = ${existing.id}`;
			return { id: existing.id, side: 'back' as const };
		}
		const [{ waiting }] = await tx<{ waiting: number }[]>`
			select count(*)::int as waiting from pending_scans where user_id = ${userId}
		`;
		if (waiting >= MAX_WAITING) return null;
		const [row] = await tx<{ id: string }[]>`
			insert into pending_scans (user_id, batch, front, front_text)
			values (${userId}, ${batch}, ${image}::bytea, ${text}) returning id
		`;
		return { id: row.id, side: 'front' as const };
	});
}

export async function pendingScans(userId: string): Promise<PendingScan[]> {
	return sql<PendingScan[]>`
		select id, front_text, back_text, back is not null as has_back, created_at from pending_scans
		where user_id = ${userId} order by created_at desc
	`;
}

export async function scanPhoto(userId: string, id: string, side: 'front' | 'back'): Promise<Buffer | null> {
	const [row] = await sql<{ data: Buffer | null }[]>`
		select ${side === 'back' ? sql`back` : sql`front`} as data from pending_scans
		where id = ${id} and user_id = ${userId}
	`;
	return row?.data ?? null;
}

export async function dropScan(userId: string, id: string) {
	await sql`delete from pending_scans where id = ${id} and user_id = ${userId}`;
}
