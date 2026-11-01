import { json } from '@sveltejs/kit';
import { normalizeGtin } from '#lib/gtin.ts';
import { lookupBarcode, LookupError, lookupEnabled } from '#lib/server/barcode.ts';
import { allow } from '#lib/server/ratelimit.ts';
import type { RequestHandler } from './$types';

/** POST, not GET: the barcode stays out of URLs and access logs */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user!;
	if (!(await lookupEnabled(user.id))) return json({ error: 'off' }, { status: 403 });
	if (!allow(`barcode:${user.id}`)) return json({ error: 'busy' }, { status: 429 });
	const body = await request.json().catch(() => null);
	const code = normalizeGtin(typeof body?.code === 'string' ? body.code : null);
	if (!code) return json({ error: 'code' }, { status: 400 });
	try {
		const fields = await lookupBarcode(code);
		return json({ code, found: !!fields, fields: fields ?? {}, source: 'Open Food Facts' });
	} catch (e) {
		if (e instanceof LookupError) return json({ error: 'unavailable' }, { status: 502 });
		throw e;
	}
};
