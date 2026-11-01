import { describe, expect, test } from 'vitest';
import { readTerms, windowForTier } from './terms.ts';
import { suggestTaste, suggestWindow } from './wine.ts';

const terms = (
	text: string,
	color: Parameters<typeof readTerms>[0]['color'] = 'red',
	country?: string,
	price?: number
) => readTerms({ text, color, country, price });

describe('quality terms', () => {
	test('a term sets the tier, the most specific one wins', () => {
		expect(terms('Chianti Classico Riserva').tier).toBe('premium');
		expect(terms('Chianti Classico Gran Selezione', 'red', 'IT').tier).toBe('top');
		expect(terms('Rioja Gran Reserva', 'red', 'ES').tier).toBe('top');
		expect(terms('Rioja Reserva', 'red', 'ES').tier).toBe('premium');
		expect(terms('Rioja Crianza', 'red', 'ES').tier).toBe('standard');
		expect(terms('Château X, Grand Cru Classé', 'red', 'FR').matched).toContain('grand cru classe');
		expect(terms('Meursault 1er Cru', 'white', 'FR').tier).toBe('premium');
		expect(terms('Riesling Großes Gewächs', 'white', 'DE').tier).toBe('top');
		expect(terms('Grüner Veltliner Smaragd', 'white', 'AT').tier).toBe('premium');
		expect(terms('Grüner Veltliner Steinfeder', 'white', 'AT').tier).toBe('entry');
		expect(terms('Vin de France Rouge').tier).toBe('entry');
	});

	test('words that mean little elsewhere only count in their own country', () => {
		// a Chilean "Gran Reserva" is a marketing word
		expect(terms('Cabernet Gran Reserva', 'red', 'CL').tier).toBe('standard');
		expect(terms('Rosado Reserva', 'rose', 'ES').tier).toBe('standard');
		// the country isn't known: the word is taken at face value
		expect(terms('Chianti Riserva').tier).toBe('premium');
	});

	test('without a term, the price tells an everyday bottle from a costly one', () => {
		expect(terms('Merlot', 'red', 'IT', 8.9).tier).toBe('entry');
		expect(terms('Merlot', 'red', 'IT', 25).tier).toBe('standard');
		expect(terms('Merlot', 'red', 'IT', 90).tier).toBe('premium');
		// the label's word beats the price
		expect(terms('Barolo Riserva', 'red', 'IT', 9).tier).toBe('premium');
	});

	test('tiers move the window', () => {
		expect(windowForTier([3, 15], 'entry', 'red')).toEqual([1, 5]);
		expect(windowForTier([1, 6], 'entry', 'white')).toEqual([1, 3]);
		expect(windowForTier([0, 3], 'entry', 'white')).toEqual([0, 2]);
		expect(windowForTier([3, 15], 'premium', 'red')).toEqual([5, 20]);
		expect(windowForTier([3, 15], 'top', 'red')).toEqual([6, 23]);
	});
});

describe('sweetness terms', () => {
	test('still wine', () => {
		expect(terms('Riesling Kabinett', 'white', 'DE').sweetness).toBe(2);
		expect(terms('Riesling Spätlese', 'white', 'DE').sweetness).toBe(3);
		expect(terms('Riesling feinherb', 'white', 'DE').sweetness).toBe(2);
		expect(terms('Vouvray Moelleux', 'white', 'FR').sweetness).toBe(4);
		expect(terms('Recioto della Valpolicella', 'sweet', 'IT').sweetness).toBe(5);
		expect(terms('Riesling', 'white', 'DE').sweetness).toBeUndefined();
	});

	test('an explicit dryness word beats a ripeness level', () => {
		expect(terms('Riesling Spätlese trocken', 'white', 'DE').sweetness).toBe(1);
		expect(terms('Riesling Kabinett trocken', 'white', 'DE').sweetness).toBe(1);
	});

	test('sparkling wine reads the dosage scale', () => {
		expect(terms('Champagne Extra Brut', 'sparkling').sweetness).toBe(1);
		expect(terms('Champagne Brut', 'sparkling').sweetness).toBe(1);
		expect(terms('Prosecco Extra Dry', 'sparkling').sweetness).toBe(2);
		expect(terms('Crémant Demi-Sec', 'sparkling').sweetness).toBe(4);
		expect(terms('Asti Dolce', 'sparkling').sweetness).toBe(5);
	});

	test('words inside other words do not count', () => {
		expect(terms('Dolcetto d’Alba').sweetness).toBeUndefined();
		expect(terms('Secondo Vino').sweetness).toBeUndefined();
	});
});

describe('suggestions use the terms', () => {
	test('the label text counts, not only the name', () => {
		const plain = suggestWindow({
			vintage: 2017,
			color: 'red',
			name: 'Tenuta X',
			region: 'Chianti Classico',
			grapes: ['Sangiovese']
		})!;
		const riserva = suggestWindow({
			vintage: 2017,
			color: 'red',
			name: 'Tenuta X',
			text: 'CHIANTI CLASSICO\nRISERVA\n2017',
			region: 'Chianti Classico',
			grapes: ['Sangiovese']
		})!;
		expect(riserva.to - plain.to).toBe(5);
	});

	test('an everyday Cabernet is not told to wait for years', () => {
		const w = suggestWindow({
			vintage: 2023,
			color: 'red',
			name: 'Cabernet Sauvignon',
			grapes: ['Cabernet Sauvignon'],
			price: 9.5
		})!;
		expect(w).toEqual({ from: 2024, to: 2028 });
	});

	test('the label sets the sweetness of the taste', () => {
		expect(
			suggestTaste({ color: 'white', name: 'Riesling Spätlese', country: 'DE', grapes: ['Riesling'] })
				.sweetness
		).toBe(3);
		expect(suggestTaste({ color: 'white', name: 'Riesling', grapes: ['Riesling'] }).sweetness).toBe(1);
		// no grape known, but the label says it
		expect(suggestTaste({ color: 'white', name: 'Vouvray Moelleux' }).sweetness).toBe(4);
	});
});
