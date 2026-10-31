/** Fixed-window limiter. In memory: fine for a single replica. */
const WINDOW = 60_000;
const LIMIT = 30;
const hits = new Map<string, { start: number; count: number }>();

export function allow(key: string): boolean {
	const now = Date.now();
	const entry = hits.get(key);
	if (!entry || now - entry.start > WINDOW) {
		hits.set(key, { start: now, count: 1 });
		if (hits.size > 10_000) {
			for (const [k, v] of hits) if (now - v.start > WINDOW) hits.delete(k);
		}
		return true;
	}
	entry.count++;
	return entry.count <= LIMIT;
}
