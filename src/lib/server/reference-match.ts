// Matching a scanned or typed wine against the reference list. Kept free of the database so it
// can be unit-tested.
import { canonicalGrape, findRegion, normalize, type Color } from '#lib/wine.ts';

// words that say what kind of business, not which one
const PRODUCER_WORDS = new Set(
	(
		'domaine domaines chateau weingut weinbau weinkellerei kellerei tenuta tenute cantina cantine ' +
		'bodega bodegas cave caves maison winery wines wine vineyards vineyard estate estates cellars ' +
		'azienda agricola fattoria castello quinta herdade schloss cellier vignerons famille family ' +
		'clos podere the de du des la le les di del della da do dos y et and of'
	).split(' ')
);
// words in a wine's name that every other wine has too
const NAME_WORDS = new Set(
	(
		'vin vino vinho wine wein rouge rosso red tinto blanc bianco white blanco branco rose rosato ' +
		'rosado doc docg aoc aop igt igp dop do ac cuvee the de du des la le les di del della da do d l ' +
		'y e et and'
	).split(' ')
);

const tokens = (s: string | null | undefined) =>
	normalize(s ?? '')
		.split(' ')
		.filter(Boolean);

/** The producer without the words for its kind of business: "Cellier des Dauphins" → "dauphins" */
export function producerKey(s: string | null | undefined): string {
	const words = tokens(s).filter((w) => !PRODUCER_WORDS.has(w));
	return (words.length ? words : tokens(s)).join(' ');
}

/** What tells a wine apart from its producer's others: no years, no filler, no producer */
export function nameTokens(name: string | null | undefined, producer?: string | null): string[] {
	const own = new Set(tokens(producer));
	return [
		...new Set(tokens(name).filter((w) => !NAME_WORDS.has(w) && !own.has(w) && !/^(19|20)\d\d$/.test(w)))
	];
}

export const nameKey = (name: string | null | undefined, producer?: string | null) =>
	nameTokens(name, producer).sort().join(' ');

export interface Ref {
	producer: string;
	name: string;
	color: Color | null;
	country: string | null;
	region: string | null;
	grapes: string[];
	alcohol: number | null;
	body: number | null;
}

export interface Label {
	producer?: string | null;
	name?: string | null;
	country?: string | null;
	/** breaks a tie between a producer's red and rosé of the same name */
	color?: Color | null;
}

function overlap(a: string[], b: string[]): number {
	if (!a.length || !b.length) return 0;
	const set = new Set(b);
	const shared = a.filter((w) => set.has(w)).length;
	return shared / new Set([...a, ...b]).size;
}

/**
 * The reference wine the label is, or null when that isn't clear. With a producer: the name
 * that shares most words, clearly ahead of the next. Without one: only an unmistakable name.
 * A label from another country is never matched.
 */
export function pickMatch(label: Label, candidates: Ref[]): Ref | null {
	const pool = candidates.filter((c) => !label.country || !c.country || c.country === label.country);
	if (!pool.length) return null;
	const want = nameTokens(label.name, label.producer);
	if (!label.producer) {
		return pool.length === 1 &&
			want.length >= 2 &&
			nameKey(pool[0].name, pool[0].producer) === want.sort().join(' ')
			? pool[0]
			: null;
	}
	// only the producer is known: fine if it makes a single wine
	if (!want.length) return pool.length === 1 ? pool[0] : null;
	const scored = pool
		.map((c) => ({ c, score: overlap(want, nameTokens(c.name, c.producer)) }))
		.sort((a, b) => b.score - a.score);
	const best = scored[0];
	if (best.score < 0.5) return null;
	const close = scored.filter((s) => s.score > best.score - 0.15).map((s) => s.c);
	if (close.length === 1) return best.c;
	// the same wine in two colours, say: the label's colour decides
	const sameColor = label.color ? close.filter((c) => c.color === label.color) : [];
	if (sameColor.length === 1) return sameColor[0];
	// or they agree on what matters, and only what they share is taken
	const same = (f: (c: Ref) => unknown) =>
		close.every((c) => JSON.stringify(f(c)) === JSON.stringify(f(close[0])));
	if (same((c) => c.grapes) && same((c) => c.country) && same((c) => c.region))
		return {
			...close[0],
			color: same((c) => c.color) ? close[0].color : null,
			alcohol: same((c) => c.alcohol) ? close[0].alcohol : null,
			body: same((c) => c.body) ? close[0].body : null
		};
	return null;
}

/** What the reference adds to a wine: canonical grape and region names, plausible values only */
export function refFields(r: Ref) {
	const grapes = [...new Set(r.grapes.map((g) => canonicalGrape(g.split('/')[0])))];
	return {
		...(grapes.length ? { grapes } : {}),
		...(r.alcohol && r.alcohol >= 3 && r.alcohol <= 25 ? { alcohol: String(r.alcohol) } : {}),
		...(r.color ? { color: r.color } : {}),
		...(r.country ? { country: r.country } : {}),
		...(r.region ? { region: findRegion(r.region)?.name ?? r.region } : {})
	};
}
