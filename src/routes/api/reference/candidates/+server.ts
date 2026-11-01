import { json } from '@sveltejs/kit';
import { allow } from '#lib/server/ratelimit.ts';
import { candidatesFor } from '#lib/server/reference.ts';
import { refFields } from '#lib/server/reference-match.ts';
import type { RequestHandler } from './$types';

/** "Is it one of these?": the wines the text read from a label may be */
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!allow(`reference:${locals.user!.id}`)) return json({ error: 'busy' }, { status: 429 });
	const body = await request.json().catch(() => null);
	const text = typeof body?.text === 'string' ? body.text.normalize('NFC').slice(0, 5000) : '';
	const country = typeof body?.country === 'string' && /^[A-Z]{2}$/.test(body.country) ? body.country : null;
	const found = await candidatesFor(text, country);
	return json({
		candidates: found.map((c) => ({
			producer: c.producer,
			name: c.name,
			matched: c.matched,
			total: c.total,
			fields: refFields(c)
		}))
	});
};
