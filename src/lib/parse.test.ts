import { describe, expect, test } from 'vitest';
import { parseLabel, type OcrLine } from './parse';

const lines = (...rows: [string, number][]): OcrLine[] => rows.map(([text, height]) => ({ text, height }));

describe('parseLabel', () => {
	test('Bordeaux château label', () => {
		const p = parseLabel(
			lines(
				['CHÂTEAU LA TOUR', 60],
				['Saint-Émilion Grand Cru', 22],
				['2016', 30],
				['Appellation Saint-Émilion Contrôlée', 12],
				['13,5% vol', 10],
				['75 cl', 10]
			),
			2026
		);
		expect(p.vintage).toBe(2016);
		expect(p.alcohol).toBe(13.5);
		expect(p.size_ml).toBe(750);
		expect(p.country).toBe('FR');
		expect(p.producer).toBe('Château La Tour');
		expect(p.region).toMatch(/mili/i);
	});

	test('Swiss label with grape synonym', () => {
		const p = parseLabel(
			lines(['Domaine du Mont', 20], ['Fendant', 48], ['Valais AOC', 16], ['2023', 14], ['12% vol', 9]),
			2026
		);
		expect(p.grapes).toEqual(['Chasselas']);
		expect(p.region).toBe('Valais');
		expect(p.country).toBe('CH');
		expect(p.color).toBe('white');
		expect(p.alcohol).toBe(12);
	});

	test('Müller-Thurgau is a grape, not the Thurgau region', () => {
		const p = parseLabel(lines(['Müller-Thurgau', 40], ['2024', 12]), 2026);
		expect(p.grapes).toEqual(['Müller-Thurgau']);
		expect(p.region).not.toBe('Thurgau');
	});

	test('ignores future years and implausible alcohol', () => {
		const p = parseLabel(lines(['Rosso', 30], ['2031', 10], ['45% vol', 10]), 2026);
		expect(p.vintage).toBeUndefined();
		expect(p.alcohol).toBeUndefined();
		expect(p.color).toBe('red');
	});

	test('sparkling words win over colour words', () => {
		expect(parseLabel(lines(['Crémant d’Alsace', 30], ['Brut Rosé', 20]), 2026).color).toBe('sparkling');
	});

	test('picks the newest plausible vintage', () => {
		expect(parseLabel(lines(['Gegründet 1952', 10], ['Merlot 2021', 30]), 2026).vintage).toBe(2021);
	});

	test('bottle sizes in litres and millilitres', () => {
		expect(parseLabel(lines(['1,5 L', 10]), 2026).size_ml).toBe(1500);
		expect(parseLabel(lines(['375 ml', 10]), 2026).size_ml).toBe(375);
		expect(parseLabel(lines(['33 cl', 10]), 2026).size_ml).toBeUndefined();
		// a misread digit close to a real size snaps to it; anything further off is dropped
		expect(parseLabel(lines(['756ml', 10]), 2026).size_ml).toBe(750);
		expect(parseLabel(lines(['780 ml', 10]), 2026).size_ml).toBeUndefined();
	});

	test('empty input gives an empty result', () => {
		expect(parseLabel([], 2026)).toEqual({});
	});

	test('noise lines are not used as the name', () => {
		const p = parseLabel(lines(['~~ | ,,', 90], ['Rioja Reserva', 40]), 2026);
		expect(p.name).toBe('Rioja Reserva');
		expect(p.country).toBe('ES');
	});
});

test('half bottles written in litres', () => {
	expect(parseLabel([{ text: '0,375 l', height: 10 }], 2026).size_ml).toBe(375);
});

describe('lessons from real OCR output', () => {
	test('a grape line can be the name of a varietal wine', () => {
		const p = parseLabel(
			lines(['Cave du Rhône', 26], ['Fendant', 93], ['du Valais AOC', 33], ['2023', 40]),
			2026
		);
		expect(p.name).toBe('Fendant');
		expect(p.grapes).toEqual(['Chasselas']);
	});

	test('appellation and origin lines are not names', () => {
		const p = parseLabel(
			lines(['du Valais AOC', 60], ['Vin blanc de Suisse', 50], ['Petite Arvine', 40]),
			2026
		);
		expect(p.name).toBe('Petite Arvine');
	});

	test('"0,75 l" misread as "0,751" is still 75 cl', () => {
		expect(parseLabel(lines(['14,5% vol 0,751', 20]), 2026).size_ml).toBe(750);
		expect(parseLabel(lines(['0,75I', 20]), 2026).size_ml).toBe(750);
		expect(parseLabel(lines(['13,51% vol', 20]), 2026).size_ml).toBeUndefined();
	});

	test('a bottling line is not the producer', () => {
		const p = parseLabel(lines(['Mis en bouteille au château', 19], ['Clos des Fées', 40]), 2026);
		expect(p.producer).toBe('Clos des Fées');
	});
});

describe('joinSplitCaps', () => {
	test('glues a lone capital back onto its word', async () => {
		const { joinSplitCaps } = await import('./parse');
		expect(joinSplitCaps('CHÂTEAU M ONTLAURENT')).toBe('CHÂTEAU MONTLAURENT');
		expect(joinSplitCaps('B AROLO')).toBe('BAROLO');
	});

	test('leaves real one-letter words, mixed case and short lines alone', async () => {
		const { joinSplitCaps } = await import('./parse');
		expect(joinSplitCaps('VIN A BOIRE')).toBe('VIN A BOIRE');
		expect(joinSplitCaps('ROSSO E BIANCO')).toBe('ROSSO E BIANCO');
		expect(joinSplitCaps('Château M Ontlaurent')).toBe('Château M Ontlaurent');
		expect(joinSplitCaps('M AB')).toBe('M AB');
	});
});

describe('regressions found in review', () => {
	test('a region + appellation title is the name, without the tag', () => {
		const p = parseLabel(lines(['BAROLO DOCG', 80], ['Tenuta Rossi', 30], ['Prodotto in Italia', 20]), 2026);
		expect(p.name).toBe('Barolo');
		expect(p.producer).toBe('Tenuta Rossi');
	});

	test('a premier cru title survives', () => {
		const p = parseLabel(lines(['CHABLIS PREMIER CRU', 70], ['Produit de France', 20]), 2026);
		expect(p.name).toBe('Chablis Premier Cru');
	});

	test('names made of articles and colour words are kept', () => {
		expect(parseLabel(lines(['La Rose', 80], ['Château X', 30]), 2026).name).toBe('La Rose');
	});

	test('Italian article and initials are not glued', async () => {
		const { joinSplitCaps } = await import('./parse');
		expect(joinSplitCaps('I SODI DI SAN NICCOLÒ')).toBe('I SODI DI SAN NICCOLÒ');
		expect(joinSplitCaps('J P MOUEIX')).toBe('J P MOUEIX');
		expect(joinSplitCaps('CHÂTEAU M ONTLAURENT')).toBe('CHÂTEAU MONTLAURENT');
	});
});

describe('OCR digit and letter confusions', () => {
	test('"75 el" is 75 cl', () => {
		expect(parseLabel(lines(['12% vol 75 el', 20]), 2026).size_ml).toBe(750);
	});

	test('implausibly strong table wine is dropped, port keeps its 20 %', () => {
		expect(parseLabel(lines(['Schweizer Rotwein', 30], ['18% vol', 20]), 2026).alcohol).toBeUndefined();
		expect(parseLabel(lines(['Porto', 80], ['20% vol', 20]), 2026).alcohol).toBe(20);
	});
});

test('origin adjectives name the country', () => {
	expect(parseLabel(lines(['Schweizer Rotwein', 30]), 2026).country).toBe('CH');
	expect(parseLabel(lines(['Vino rosso italiano', 30]), 2026).country).toBe('IT');
});

describe('font-dependent OCR readings', () => {
	test('a lone | before capitals is the letter I', async () => {
		const { joinSplitCaps } = await import('./parse');
		expect(joinSplitCaps('| SODI')).toBe('I SODI');
		expect(joinSplitCaps('l SODI DI SAN NICCOLO')).toBe('I SODI DI SAN NICCOLO');
	});

	test('a big appellation over a château: the château is the name', () => {
		const p = parseLabel(lines(['CHÂTEAU LES TILLEULS', 40], ['Sauternes', 64], ['2015', 50]), 2026);
		expect(p.name).toBe('Château Les Tilleuls');
		expect(p.region).toBe('Sauternes');
	});

	test('a big region over a small estate line stays the name', () => {
		const p = parseLabel(lines(['TENUTA SANTA LUCIA', 27], ['BAROLO', 80]), 2026);
		expect(p.name).toBe('Barolo');
	});
});

describe('third review', () => {
	test('a surname that is also a country adjective does not beat the region', () => {
		const p = parseLabel(
			lines(['Weingut Schweizer', 30], ['Riesling', 60], ['Qualitätswein Pfalz', 20]),
			2026
		);
		expect(p.country).toBe('DE');
	});

	test('estate-bottled and import lines are not the producer or the name', () => {
		expect(parseLabel(lines(['NAPA VALLEY', 70], ['Estate Bottled', 40]), 2026).name).toBe('Napa Valley');
		const p = parseLabel(lines(['CHIANTI CLASSICO', 70], ['Imported by Acme Vineyards', 45]), 2026);
		expect(p.name).toBe('Chianti Classico');
		expect(p.producer).toBeUndefined();
	});
});

test('an origin line with an adjective is not the name', () => {
	const p = parseLabel(lines(['Schweizer Rotwein', 60], ['Gamaret', 40]), 2026);
	expect(p.name).toBe('Gamaret');
	expect(p.country).toBe('CH');
});
