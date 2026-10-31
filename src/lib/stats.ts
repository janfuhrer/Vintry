export interface DrinkFacts {
	drunk_on: string;
	rating: number | null;
	grapes: string[];
	country: string | null;
}

export interface YearStats {
	year: number;
	bottles: number;
	avgRating: number | null;
	topGrape: string | null;
	topCountry: string | null;
}

/** Most frequent value; ties go to the one seen first (the most recent drink) */
function mostCommon(values: string[]): string | null {
	const counts = new Map<string, number>();
	let best: string | null = null;
	for (const v of values) {
		const n = (counts.get(v) ?? 0) + 1;
		counts.set(v, n);
		if (best === null || n > counts.get(best)!) best = v;
	}
	return best;
}

export function yearStats(drinks: DrinkFacts[], year: number): YearStats {
	const inYear = drinks.filter((d) => d.drunk_on.startsWith(`${year}-`));
	const rated = inYear.map((d) => d.rating).filter((r): r is number => r !== null);
	return {
		year,
		bottles: inYear.length,
		avgRating: rated.length ? Math.round((rated.reduce((a, b) => a + b, 0) / rated.length) * 10) / 10 : null,
		topGrape: mostCommon(inYear.flatMap((d) => d.grapes)),
		topCountry: mostCommon(inYear.map((d) => d.country).filter((c): c is string => !!c))
	};
}
