import { expect, test } from 'vitest';
import { dictionaries } from './i18n';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('every translation keeps the placeholders of the English text', () => {
	for (const [key, en] of Object.entries(dictionaries.en)) {
		const de = dictionaries.de[key as keyof typeof dictionaries.en];
		expect(placeholders(de), key).toEqual(placeholders(en));
	}
});

test('no translation is left empty', () => {
	for (const [locale, dict] of Object.entries(dictionaries))
		for (const [key, text] of Object.entries(dict)) expect(text.trim(), `${locale}.${key}`).not.toBe('');
});
