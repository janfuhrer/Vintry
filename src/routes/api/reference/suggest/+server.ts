import { json } from '@sveltejs/kit';
import { allow } from '#lib/server/ratelimit.ts';
import { suggestProducers, suggestWines } from '#lib/server/reference.ts';
import { refFields } from '#lib/server/reference-match.ts';
import type { RequestHandler } from './$types';

const text = (v: unknown) => (typeof v === 'string' ? v.normalize('NFC').trim().slice(0, 200) : '');

/** Suggestions while typing a producer or a wine's name in the form */
export const POST: RequestHandler = async ({ request, locals }) => {
	// the form waits for a pause in typing, so this stays well under the limit
	if (!allow(`suggest:${locals.user!.id}`)) return json({ error: 'busy' }, { status: 429 });
	const body = await request.json().catch(() => null);
	if (body?.field === 'producer') return json({ producers: await suggestProducers(text(body.q)) });
	const wines = await suggestWines(text(body?.q), text(body?.producer) || null);
	return json({
		wines: wines.map((w) => ({ producer: w.producer, name: w.name, fields: refFields(w) }))
	});
};
