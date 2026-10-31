import { json } from '@sveltejs/kit';
import { allowance, claudeEnabled, LabelError, readerOf, readLabelPhotos } from '#lib/server/claude.ts';
import { toLabelFields } from '#lib/server/claude-label.ts';
import type { RequestHandler } from './$types';

// photos are at most 1280 px, a few hundred kB; two must fit in the 2 MB request limit
const MAX_PHOTO = 900_000;
// one reading per user at a time: a double tap must not spend twice
const busy = new Set<string>();

async function jpeg(v: FormDataEntryValue | null): Promise<Uint8Array | null> {
	if (!(v instanceof File) || v.size === 0 || v.size > MAX_PHOTO) return null;
	const bytes = new Uint8Array(await v.arrayBuffer());
	return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? bytes : null;
}

/** Reads one or two label photos with Claude, for users who chose that in settings */
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user!;
	// taken before the first await: two requests arriving together must not both get through
	// the allowance check, which only sees readings already booked
	if (busy.has(user.id)) return json({ error: 'busy' }, { status: 429 });
	busy.add(user.id);
	try {
		if (!claudeEnabled || (await readerOf(user.id)) !== 'claude')
			return json({ error: 'off' }, { status: 403 });
		if ((await allowance(user.id)).scansLeft === 0) return json({ error: 'budget' }, { status: 429 });

		const form = await request.formData().catch(() => null);
		const front = await jpeg(form?.get('front') ?? null);
		const back = form?.has('back') ? await jpeg(form.get('back')) : null;
		if (!front || (form?.has('back') && !back)) return json({ error: 'photo' }, { status: 400 });

		// a user who goes back while Claude reads closes the request: the call ends with it
		const reading = await readLabelPhotos(user.id, back ? [front, back] : [front], request.signal);
		return json({ fields: toLabelFields(reading), label: reading.is_wine_label });
	} catch (e) {
		if (!(e instanceof LabelError) && !request.signal.aborted)
			console.error('claude label reading failed', e);
		return json({ error: e instanceof LabelError ? e.code : 'failed' }, { status: 502 });
	} finally {
		busy.delete(user.id);
	}
};
