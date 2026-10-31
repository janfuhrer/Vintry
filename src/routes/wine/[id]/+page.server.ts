import { error, fail, redirect } from '@sveltejs/kit';
import {
	deleteDrink, deleteWine, drinkOne, drinksForWine, getWine, setQuantity, setRating
} from '#lib/server/wines.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const wine = await getWine(locals.user!.id, params.id);
	if (!wine) error(404, 'Not found');
	return { wine, drinks: await drinksForWine(locals.user!.id, wine.id) };
};

const rating = (v: FormDataEntryValue | null) => {
	const n = Number(v);
	return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

export const actions: Actions = {
	rate: async ({ request, locals, params }) => {
		const fd = await request.formData();
		await setRating(locals.user!.id, params.id, rating(fd.get('rating')));
	},
	quantity: async ({ request, locals, params }) => {
		const delta = Number((await request.formData()).get('delta'));
		if (delta !== 1 && delta !== -1) return fail(400);
		await setQuantity(locals.user!.id, params.id, delta);
	},
	drink: async ({ request, locals, params }) => {
		const fd = await request.formData();
		const date = String(fd.get('drunk_on') ?? '');
		const note = String(fd.get('note') ?? '').trim().slice(0, 2000) || null;
		const ok = await drinkOne(locals.user!.id, params.id, {
			drunk_on: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10),
			rating: rating(fd.get('rating')),
			note
		});
		if (!ok) return fail(400);
	},
	deleteDrink: async ({ request, locals }) => {
		await deleteDrink(locals.user!.id, String((await request.formData()).get('id')));
	},
	delete: async ({ locals, params }) => {
		await deleteWine(locals.user!.id, params.id);
		redirect(303, '/');
	}
};
