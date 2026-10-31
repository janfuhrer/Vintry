import { fail, redirect } from '@sveltejs/kit';
import { createWine, parsePhoto, parseWineForm } from '#lib/server/wines.ts';
import type { Actions } from './$types';

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
