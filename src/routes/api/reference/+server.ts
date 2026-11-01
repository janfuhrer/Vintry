import { json } from '@sveltejs/kit';
import { allow } from '#lib/server/ratelimit.ts';
import { findReference } from '#lib/server/reference.ts';
import { refFields } from '#lib/server/reference-match.ts';
import { COLORS, type Color } from '#lib/wine.ts';
import type { RequestHandler } from './$types';

const text = (v: unknown, max: number) =>
	typeof v === 'string' ? v.normalize('NFC').trim().slice(0, max) : '';

/** The reference wine a label is, and what it adds; the lookup stays on this server */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!allow(`reference:${locals.user!.id}`)) return json({ error: 'busy' }, { status: 429 });
	const body = await request.json().catch(() => null);
	const label = {
		producer: text(body?.producer, 200),
		name: text(body?.name, 200),
		country: /^[A-Z]{2}$/.test(text(body?.country, 2)) ? text(body?.country, 2) : null,
		color: (COLORS as readonly string[]).includes(body?.color) ? (body.color as Color) : null
	};
	if (!label.producer && !label.name) return json({ found: false, fields: {} });
	const ref = await findReference(label);
	if (!ref) return json({ found: false, fields: {} });
	return json({ found: true, fields: refFields(ref), wine: { producer: ref.producer, name: ref.name } });
};
