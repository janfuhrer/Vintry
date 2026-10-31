import { error, fail, redirect } from '@sveltejs/kit';
import { getWine, parsePhoto, parseWineForm, updateWine } from '#lib/server/wines.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const wine = await getWine(locals.user!.id, params.id);
	if (!wine) error(404, 'Not found');
	return { wine };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const fd = await request.formData();
		const { input, errors } = parseWineForm(fd);
		const photo = await parsePhoto(fd, errors);
		if (Object.keys(errors).length) return fail(400, { errors });
		if (!(await updateWine(locals.user!.id, params.id, input, photo))) error(404, 'Not found');
		redirect(303, `/wine/${params.id}`);
	}
};
