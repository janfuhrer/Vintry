import { describe, expect, test } from 'vitest';
import { nameKey, pickMatch, producerKey, refFields, type Ref } from './reference-match.ts';

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
