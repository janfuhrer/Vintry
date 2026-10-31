/** Groups items by one or more keys each, keeping first-seen key order */
export function groupBy<T>(items: readonly T[], keys: (item: T) => string | string[]): [string, T[]][] {
	const groups: Record<string, T[]> = {};
	const order: string[] = [];
	for (const item of items) {
		const k = keys(item);
		for (const key of Array.isArray(k) ? k : [k]) {
			if (!(key in groups)) {
				groups[key] = [];
				order.push(key);
			}
			groups[key].push(item);
		}
	}
	return order.map((key) => [key, groups[key]]);
}
