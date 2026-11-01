import { fail, redirect } from '@sveltejs/kit';
import { allowance, readerOf } from '#lib/server/claude.ts';
import { parseBackPhoto, parsePhoto, parseWineForm } from '#lib/server/wine-form.ts';
import { createWine, findDuplicate, getWine, ownedWines, suggestions } from '#lib/server/wines.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const from = url.searchParams.get('from');
	const copy = from ? await getWine(locals.user!.id, from) : null;
	const [list, owned, reader] = await Promise.all([
		suggestions(locals.user!.id),
		ownedWines(locals.user!.id),
		readerOf(locals.user!.id)
	]);
	// labels go to Claude while the month's allowance lasts, then are read on the phone again
	const claude = reader === 'claude' ? { scansLeft: (await allowance(locals.user!.id)).scansLeft } : null;
	return { suggestions: list, owned, copy, claude };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const fd = await request.formData();
		const { input, errors } = parseWineForm(fd);
		const photo = await parsePhoto(fd, errors);
		const back = await parseBackPhoto(fd, errors);
		if (Object.keys(errors).length) return fail(400, { errors });
		// the same wine again is usually more bottles of it; a second entry only when asked for
		// (a wish or a wine without bottles adds nothing to an entry, so there is nothing to ask)
		if (!fd.has('allow_duplicate') && !input.wishlist && input.quantity > 0) {
			const duplicate = await findDuplicate(locals.user!.id, input);
			if (duplicate) return fail(409, { errors: {}, duplicate, bottles: input.quantity });
		}
		const id = await createWine(locals.user!.id, input, photo, back);
		redirect(303, `/wine/${id}`);
	}
};
