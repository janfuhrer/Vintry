// What Open Food Facts knows about a barcode, as wine form fields. Kept free of the network and
// the database so it can be unit-tested.
import { countryIndex, findRegion, normalize, regionIndex, type Color } from '#lib/wine.ts';

export interface OffProduct {
	product_name?: string;
	brands?: string;
	categories_tags?: string[];
	quantity?: string;
	origins?: string;
	nutriments?: Record<string, unknown>;
}

export interface BarcodeFields {
	name?: string;
	producer?: string;
	color?: Color;
	country?: string;
	region?: string;
	alcohol?: string;
	size_ml?: string;
}

// most specific first: a sparkling rosé is sparkling
const COLOR_TAGS: [Color, string[]][] = [
	['sparkling', ['en:sparkling-wines', 'en:champagnes', 'en:proseccos', 'en:cavas', 'en:cremants']],
	['fortified', ['en:fortified-wines', 'en:ports', 'en:port-wines', 'en:sherries', 'en:madeira-wines']],
	['sweet', ['en:sweet-wines', 'en:dessert-wines', 'en:sauternes']],
	['rose', ['en:rose-wines']],
	['white', ['en:white-wines']],
	['red', ['en:red-wines']]
];

const isWine = (tags: string[]) =>
	tags.some(
		(t) => t === 'en:wines' || /^en:wines-from-/.test(t) || COLOR_TAGS.some(([, c]) => c.includes(t))
	);

const tagWords = (tag: string) => tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');

/** "750 ml", "75 cl", "0,75 l" → millilitres, if it is a bottle size */
function bottleSize(quantity: string | undefined): number | undefined {
	const m = quantity?.match(/(\d+(?:[.,]\d+)?)\s*(ml|cl|l)\b/i);
	if (!m) return undefined;
	const n =
		Number(m[1].replace(',', '.')) *
		({ ml: 1, cl: 10, l: 1000 } as const)[m[2].toLowerCase() as 'ml' | 'cl' | 'l'];
	const ml = Math.round(n);
	return ml >= 100 && ml <= 30_000 ? ml : undefined;
}

/**
 * The product as form fields, or null when it isn't a wine. No vintage: one barcode often
 * serves several years, and the year in a product name is whichever someone photographed.
 */
export function offToFields(p: OffProduct): BarcodeFields | null {
	const tags = p.categories_tags ?? [];
	if (!isWine(tags)) return null;
	const out: BarcodeFields = {};

	const producer = p.brands?.split(',')[0]?.trim();
	if (producer) out.producer = producer.slice(0, 200);
	// the name without the brand and the year a contributor's bottle happened to have
	let name = (p.product_name ?? '').replace(/\b(19|20)\d{2}\b/g, ' ');
	if (producer) name = name.replace(new RegExp(producer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' ');
	name = name.replace(/\s+/g, ' ').replace(/^[\s,–-]+|[\s,–-]+$/g, '');
	if (name) out.name = name.slice(0, 200);

	for (const [color, list] of COLOR_TAGS)
		if (tags.some((t) => list.includes(t))) {
			out.color = color;
			break;
		}

	// "en:wines-from-france", or the origins text
	const from = tags
		.find((t) => t.startsWith('en:wines-from-'))
		?.slice('en:wines-from-'.length)
		.replace(/-/g, ' ');
	const country =
		(from && countryIndex.get(normalize(from))) ||
		(p.origins && countryIndex.get(normalize(p.origins.split(',')[0])));
	if (country) out.country = country.code;

	// an appellation among the categories, e.g. "fr:cotes-du-rhone"
	for (const t of tags) {
		const region = regionIndex.get(normalize(tagWords(t).replace(/ wines?$/, '')));
		if (region && (!out.country || region.country === out.country)) {
			out.region = region.name;
			out.country ??= region.country;
			break;
		}
	}
	if (!out.region && p.origins) {
		const region = findRegion(p.origins.split(',')[0]);
		if (region) out.region = region.name;
	}

	const alcohol = Number(p.nutriments?.['alcohol_value'] ?? p.nutriments?.['alcohol']);
	if (alcohol >= 3 && alcohol <= 25) out.alcohol = String(Math.round(alcohol * 10) / 10);
	const size = bottleSize(p.quantity);
	if (size) out.size_ml = String(size);
	return out;
}
