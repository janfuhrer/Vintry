// Unit tests for label parsing and wine logic. Runs the TypeScript sources through
// Vite's SSR loader, so no extra test framework is needed: npm test
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let server, parse, wine;

before(async () => {
	server = await createServer({ configFile: false, tsconfig: fileURLToPath(new URL('./tsconfig.test.json', import.meta.url)), logLevel: 'error', server: { middlewareMode: true, hmr: false } });
	parse = await server.ssrLoadModule('/src/lib/parse.ts');
	wine = await server.ssrLoadModule('/src/lib/wine.ts');
});
after(() => server?.close());

const lines = (...rows) => rows.map(([text, height]) => ({ text, height }));

describe('parseLabel', () => {
	test('Bordeaux château label', () => {
		const p = parse.parseLabel(
			lines(['CHÂTEAU LA TOUR', 60], ['Saint-Émilion Grand Cru', 22], ['2016', 30], ['Appellation Saint-Émilion Contrôlée', 12], ['13,5% vol', 10], ['75 cl', 10]),
			2026
		);
		assert.equal(p.vintage, 2016);
		assert.equal(p.alcohol, 13.5);
		assert.equal(p.size_ml, 750);
		assert.equal(p.country, 'FR');
		assert.equal(p.producer, 'Château La Tour');
		assert.match(p.region, /mili/i);
	});

	test('Swiss label with grape synonym', () => {
		const p = parse.parseLabel(lines(['Domaine du Mont', 20], ['Fendant', 48], ['Valais AOC', 16], ['2023', 14], ['12% vol', 9]), 2026);
		assert.deepEqual(p.grapes, ['Chasselas']);
		assert.equal(p.region, 'Valais');
		assert.equal(p.country, 'CH');
		assert.equal(p.color, 'white');
		assert.equal(p.alcohol, 12);
	});

	test('Müller-Thurgau is a grape, not the Thurgau region', () => {
		const p = parse.parseLabel(lines(['Müller-Thurgau', 40], ['2024', 12]), 2026);
		assert.deepEqual(p.grapes, ['Müller-Thurgau']);
		assert.notEqual(p.region, 'Thurgau');
	});

	test('ignores future years and implausible alcohol', () => {
		const p = parse.parseLabel(lines(['Rosso', 30], ['2031', 10], ['45% vol', 10]), 2026);
		assert.equal(p.vintage, undefined);
		assert.equal(p.alcohol, undefined);
		assert.equal(p.color, 'red');
	});

	test('sparkling words win over colour words', () => {
		const p = parse.parseLabel(lines(['Crémant d’Alsace', 30], ['Brut Rosé', 20]), 2026);
		assert.equal(p.color, 'sparkling');
	});
});

describe('wine logic', () => {
	test('flag from ISO code', () => {
		assert.equal(wine.flag('ch'), '🇨🇭');
		assert.equal(wine.flag(null), '');
	});

	test('synonyms resolve to the canonical grape', () => {
		assert.equal(wine.canonicalGrape('shiraz'), 'Syrah');
		assert.equal(wine.canonicalGrape('Spätburgunder'), 'Pinot Noir');
		assert.equal(wine.canonicalGrape('Unknown Grape'), 'Unknown Grape');
	});

	test('region aging overrides grapes', () => {
		const barolo = wine.suggestWindow({ vintage: 2018, color: 'red', region: 'Barolo', grapes: ['Nebbiolo'] });
		const nebbiolo = wine.suggestWindow({ vintage: 2018, color: 'red', grapes: ['Nebbiolo'] });
		assert.ok(barolo.from >= 2018 && barolo.to > barolo.from);
		assert.ok(nebbiolo.to > nebbiolo.from);
	});

	test('colour default without grapes', () => {
		assert.deepEqual(wine.suggestWindow({ vintage: 2020, color: 'white' }), { from: 2021, to: 2024 });
		assert.equal(wine.suggestWindow({ color: 'red' }), null);
	});

	test('window status', () => {
		assert.equal(wine.windowStatus(2030, 2040, 2026), 'wait');
		assert.equal(wine.windowStatus(2020, 2030, 2026), 'ready');
		assert.equal(wine.windowStatus(2020, 2027, 2026), 'soon');
		assert.equal(wine.windowStatus(2010, 2020, 2026), 'past');
		assert.equal(wine.windowStatus(null, null, 2026), 'unknown');
	});

	test('taste suggestion for a red blend', () => {
		const t = wine.suggestTaste({ color: 'red', grapes: ['Cabernet Sauvignon', 'Merlot'] });
		assert.ok(t.body >= 3 && t.tannin >= 3);
		assert.equal(t.sweetness, 1);
		assert.ok(t.aroma.de.length > 0);
	});
});
