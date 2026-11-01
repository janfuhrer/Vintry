// Matching a scanned or typed wine against the reference list. Kept free of the database so it
// can be unit-tested.
import { regions } from '#lib/data/regions.ts';
import { TIERS } from '#lib/terms.ts';
import { canonicalGrape, findRegion, grapes, normalize, type Color } from '#lib/wine.ts';

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

// the small print every label has, which says nothing about which wine it is
const LABEL_NOISE = new Set(
	(
		'vol alc contains sulfites sulphites sulfiti solfiti enthalt sulfite produit product prodotto ' +
		'producto produkt imbottigliato mis bouteille bottled abgefullt bottle propriete estate grown ' +
		'origin origine appellation controlee protegee denominazione controllata garantita qualitatswein'
	).split(' ')
);

/** Words worth looking for in the text read from a label */
export function labelWords(text: string): string[] {
	return [
		...new Set(
			tokens(text).filter(
				(w) =>
					w.length >= 3 &&
					!/^\d+$/.test(w) &&
					!NAME_WORDS.has(w) &&
					!PRODUCER_WORDS.has(w) &&
					!LABEL_NOISE.has(w)
			)
		)
	].slice(0, 40);
}

// words that thousands of wines share: appellations, grapes, quality terms ("Chianti Classico
// Riserva"). On their own they say nothing about which wine it is.
const GENERIC = new Set(
	[
		...regions.flatMap((r) => [r.name, ...r.synonyms]),
		...grapes.flatMap((g) => [g.name, ...g.synonyms]),
		...TIERS.flatMap(([, t]) => t.words),
		'classico superiore riserva reserva reserve cru grand selection selezione collezione famiglia'
	].flatMap((s) => normalize(s).split(' '))
);

export interface Candidate extends Ref {
	/** the wine's distinctive words (producer and name) found on the label, of how many */
	matched: number;
	total: number;
}

/**
 * The reference wines the label's text most likely shows, best first: a producer whose words
 * are all on the label counts most, then the share of the wine's own name found there. At most
 * `max`, and only those with the whole producer or most of a longer name.
 */
export function rankCandidates(words: string[], refs: Ref[], max = 3): Candidate[] {
	const seen = new Set(words);
	const out: (Candidate & { score: number })[] = [];
	for (const r of refs) {
		const producer = producerKey(r.producer).split(' ').filter(Boolean);
		const name = nameTokens(r.name, r.producer);
		const pHits = producer.filter((w) => seen.has(w)).length;
		const nHits = name.filter((w) => seen.has(w)).length;
		// "Cellier du Rhône" is all region: a producer counts by a word of its own
		const wholeProducer =
			producer.length > 0 && pHits === producer.length && producer.some((w) => !GENERIC.has(w));
		// without the producer, the name must match on a word of its own, not just "Chianti Classico"
		const mostOfName =
			name.length >= 2 && nHits / name.length >= 0.67 && name.some((w) => seen.has(w) && !GENERIC.has(w));
		if (!wholeProducer && !mostOfName) continue;
		// a producer alone fits all its wines: then the name decides between them
		const score =
			(wholeProducer ? 1 : 0) +
			(name.length ? nHits / name.length : 0.5) +
			Math.min(producer.length, 3) * 0.05;
		out.push({ ...r, matched: pHits + nHits, total: producer.length + name.length, score });
	}
	// on a tie, the name with fewer words not on the label ("… Rosé" when the label says nothing)
	const ranked = out.sort((a, b) => b.score - a.score || a.name.length - b.name.length);
	// the same wine listed twice (a red and a rosé, say) is one suggestion each, never more
	const unique = ranked.filter(
		(c, i) => ranked.findIndex((d) => d.producer === c.producer && d.name === c.name) === i
	);
	return unique.slice(0, max).map(({ score: _score, ...c }) => c);
}
