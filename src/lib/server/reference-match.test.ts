import { describe, expect, test } from 'vitest';
import {
	labelWords,
	nameKey,
	pickMatch,
	producerKey,
	rankCandidates,
	refFields,
	type Ref
} from './reference-match.ts';

const ref = (producer: string, name: string, over: Partial<Ref> = {}): Ref => ({
	producer,
	name,
	color: 'red',
	country: 'FR',
	region: 'Côtes-du-Rhône',
	grapes: [],
	alcohol: 13.5,
	body: 4,
	...over
});
// a real producer's wines from the list
const dauphins = [
	ref('Cellier des Dauphins', 'Les Dauphins Côtes du Rhône Réserve Rouge', { grapes: ['Grenache'] }),
	ref('Cellier des Dauphins', 'Prestige Côtes-du-Rhône', {
		grapes: ['Mourvedre', 'Garnacha', 'Syrah/Shiraz'],
		alcohol: 14
	}),
	ref('Cellier des Dauphins', 'Blason des Papes Châteauneuf-du-Pape', {
		grapes: ['Garnacha', 'Syrah/Shiraz'],
		region: 'Châteauneuf-du-Pape'
	}),
	ref('Cellier des Dauphins', 'Signature Grenache-Syrah Rosé', { color: 'rose' })
];

describe('keys', () => {
	test('the producer without the words for its kind of business', () => {
		expect(producerKey('Cellier des Dauphins')).toBe('dauphins');
		expect(producerKey('Château Montlaurent')).toBe('montlaurent');
		expect(producerKey('Weingut Zum Sternen')).toBe('zum sternen');
		// nothing left would match everything: keep the words then
		expect(producerKey('Les Caves')).toBe('les caves');
	});

	test('the name without years, filler and the producer', () => {
		expect(nameKey('Les Dauphins Côtes du Rhône Réserve Rouge 2019', 'Cellier des Dauphins')).toBe(
			'cotes reserve rhone'
		);
	});
});

describe('pickMatch', () => {
	test('the name that shares most words wins when it is clearly ahead', () => {
		const m = pickMatch({ producer: 'Cellier des Dauphins', name: 'Prestige Côtes du Rhône' }, dauphins);
		expect(m?.name).toBe('Prestige Côtes-du-Rhône');
	});

	test('a red and a rosé of the same name: the colour decides, or only what they share is taken', () => {
		const pair = [
			ref('Cellier des Dauphins', 'Prestige Côtes-du-Rhône', { grapes: ['Grenache'] }),
			ref('Cellier des Dauphins', 'Prestige Côtes-du-Rhône Rosé', {
				color: 'rose',
				grapes: ['Grenache'],
				alcohol: 13
			})
		];
		const label = { producer: 'Cellier des Dauphins', name: 'Prestige Côtes du Rhône' };
		expect(pickMatch({ ...label, color: 'rose' }, pair)?.color).toBe('rose');
		const shared = pickMatch(label, pair)!;
		expect(shared.grapes).toEqual(['Grenache']);
		expect(shared.color).toBeNull();
		expect(shared.alcohol).toBeNull();
	});

	test('two names as close as each other: no guess', () => {
		const close = [
			ref('X', 'Grande Réserve Rouge', { grapes: ['Syrah'] }),
			ref('X', 'Grande Réserve Blanc', { color: 'white', grapes: ['Viognier'] })
		];
		expect(pickMatch({ producer: 'X', name: 'Grande Réserve' }, close)).toBeNull();
	});

	test('a producer known by its name only matches when it makes one wine', () => {
		expect(pickMatch({ producer: 'Cellier des Dauphins' }, dauphins)).toBeNull();
		expect(pickMatch({ producer: 'Solo' }, [ref('Solo', 'Only Wine')])?.name).toBe('Only Wine');
	});

	test('without a producer, only an unmistakable name', () => {
		const one = [ref('Domaine Y', 'Clos des Mouches Premier Cru')];
		expect(pickMatch({ name: 'Clos des Mouches Premier Cru' }, one)).not.toBeNull();
		expect(pickMatch({ name: 'Merlot' }, [ref('Z', 'Merlot')])).toBeNull();
	});

	test('a label from another country is never matched', () => {
		expect(pickMatch({ producer: 'Solo', country: 'IT' }, [ref('Solo', 'Only Wine')])).toBeNull();
	});
});

test('refFields: canonical grapes and regions, plausible values', () => {
	expect(refFields(dauphins[1])).toEqual({
		grapes: ['Mourvèdre', 'Grenache', 'Syrah'],
		alcohol: '14',
		color: 'red',
		country: 'FR',
		// the built-in region it is a spelling of
		region: 'Rhône'
	});
	expect(refFields(ref('A', 'B', { alcohol: 0, region: 'Châteauneuf-du-Pape' }))).toMatchObject({
		region: 'Châteauneuf-du-Pape'
	});
	expect(refFields(ref('A', 'B', { alcohol: 0 })).alcohol).toBeUndefined();
});

describe('candidates from the text read on a label', () => {
	const list = [
		...dauphins,
		ref('Les Fils de Charles Favre', 'Dame de Sion Fendant du Valais', {
			country: 'CH',
			grapes: ['Chasselas']
		}),
		ref('Maison Gilliard', 'Sion Fendant Les Murettes', { country: 'CH', grapes: ['Chasselas'] }),
		ref('Antinori', 'Tignanello', { country: 'IT' })
	];
	const ocr = (text: string) => rankCandidates(labelWords(text), list);

	test('a garbled read still finds the wine by the words that came through', () => {
		const [first] = ocr('CELLIER DES DAUPHINS\nPRESTIGE\nC0TES DU RH0NE\n2019 13,5% vol');
		expect(first.name).toBe('Prestige Côtes-du-Rhône');
		expect(first.matched).toBeGreaterThanOrEqual(2);
	});

	test('a name alone counts when most of it is there', () => {
		const [first] = ocr('Dame de Sion\nFendant du Valais AOC\n2023');
		expect(first.producer).toBe('Les Fils de Charles Favre');
	});

	test('a tie goes to the name with fewer extra words; a producer named after a region is no match', () => {
		const pair = [
			ref('Cellier des Dauphins', 'Prestige Côtes-du-Rhône Rosé', { color: 'rose' }),
			ref('Cellier des Dauphins', 'Prestige Côtes-du-Rhône'),
			ref('Cellier du Rhône', 'Côtes du Rhône')
		];
		const found = rankCandidates(labelWords('CELLIER DES DAUPHINS\nPrestige\nCôtes du Rhône\n2021'), pair);
		expect(found.map((c) => c.name)).toEqual(['Prestige Côtes-du-Rhône', 'Prestige Côtes-du-Rhône Rosé']);
	});

	test('appellation and quality words alone suggest nothing', () => {
		const chianti = [ref('Il Molino di Grace', 'Chianti Classico Riserva', { country: 'IT' })];
		const words = labelWords(
			'TA Pox 06610 AI MANDORL\nCOLLEZIONE DI FAMIGLIA\nCHIANTI CLASSICO\nRISERVA 2017'
		);
		expect(rankCandidates(words, chianti)).toEqual([]);
	});

	test('at most three, the same wine once, nothing for unrelated text', () => {
		expect(ocr('Cellier des Dauphins').length).toBeLessThanOrEqual(3);
		expect(ocr('Grüner Veltliner Federspiel Wachau')).toEqual([]);
	});

	test('label words leave out numbers, filler and short words', () => {
		expect(labelWords('Château Montlaurent 2016 Grand Vin de Bordeaux 13,5% vol')).toEqual([
			'montlaurent',
			'grand',
			'bordeaux'
		]);
	});
});
