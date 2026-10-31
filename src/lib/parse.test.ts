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
