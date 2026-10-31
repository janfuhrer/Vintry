import { fail, redirect } from '@sveltejs/kit';
import { parsePhoto, parseWineForm } from '#lib/server/wine-form.ts';
import { createWine, getWine, ownedWines, suggestions } from '#lib/server/wines.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const from = url.searchParams.get('from');
	const copy = from ? await getWine(locals.user!.id, from) : null;
	const [list, owned] = await Promise.all([suggestions(locals.user!.id), ownedWines(locals.user!.id)]);
	return { suggestions: list, owned, copy };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const fd = await request.formData();
		const { input, errors } = parseWineForm(fd);
		const photo = await parsePhoto(fd, errors);
		if (Object.keys(errors).length) return fail(400, { errors });
		const id = await createWine(locals.user!.id, input, photo);
		redirect(303, `/wine/${id}`);
	}
};
