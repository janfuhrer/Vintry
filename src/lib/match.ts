import { normalize } from './wine.ts';

export type Owned = {
	id: string;
	name: string;
	producer: string | null;
	vintage: number | null;
	quantity: number;
	wishlist: boolean;
	has_photo: boolean;
	barcode?: string | null;
};

const rank = (w: Owned) => (w.wishlist ? 2 : w.quantity > 0 ? 0 : 1);

/**
 * The wine a scanned label most likely is, if the user has it already. Its barcode decides
 * first, unless the label shows a different vintage (one code often serves several years).
 * Else: same name, no conflicting producer, and the same vintage (or, without one on the
 * label, the only wine of that name). Bottles in the cellar win over finished ones and the
 * wishlist.
 */
export function findSameWine(
	label: { name?: string | null; producer?: string | null; vintage?: number | null; barcode?: string | null },
	wines: Owned[]
): Owned | null {
	if (label.barcode) {
		const coded = wines
			.filter(
				(w) => w.barcode === label.barcode && (!label.vintage || !w.vintage || w.vintage === label.vintage)
			)
			.sort((a, b) => rank(a) - rank(b));
		if (coded.length) return coded[0];
	}
	const name = normalize(label.name ?? '');
	if (!name) return null;
	const producer = normalize(label.producer ?? '');
	const named = wines.filter(
		(w) => normalize(w.name) === name && !(producer && w.producer && normalize(w.producer) !== producer)
	);
	const vintage = label.vintage ?? null;
	const same =
		vintage === null ? (named.length === 1 ? named : []) : named.filter((w) => w.vintage === vintage);
	// two producers' wines fit (the label's producer wasn't read): don't guess
	const producers = new Set(same.map((w) => normalize(w.producer ?? '')));
	if (producers.size > 1) return null;
	return same.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}
