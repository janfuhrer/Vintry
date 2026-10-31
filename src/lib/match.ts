import { normalize } from './wine.ts';

export type Owned = {
	id: string;
	name: string;
	producer: string | null;
	vintage: number | null;
	quantity: number;
	wishlist: boolean;
};

/**
 * The wine a scanned label most likely is, if the user has it already: same name, no
 * conflicting producer, and the same vintage (or, without one on the label, the only
 * wine of that name). Bottles in the cellar win over finished ones and the wishlist.
 */
export function findSameWine(
	label: { name?: string | null; producer?: string | null; vintage?: number | null },
	wines: Owned[]
): Owned | null {
	const name = normalize(label.name ?? '');
	if (!name) return null;
	const producer = normalize(label.producer ?? '');
	const named = wines.filter(
		(w) => normalize(w.name) === name && !(producer && w.producer && normalize(w.producer) !== producer)
	);
	const vintage = label.vintage ?? null;
	const same =
		vintage === null ? (named.length === 1 ? named : []) : named.filter((w) => w.vintage === vintage);
	const rank = (w: Owned) => (w.wishlist ? 2 : w.quantity > 0 ? 0 : 1);
	return same.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}
