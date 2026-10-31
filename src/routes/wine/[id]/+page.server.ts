import { error, fail, redirect } from '@sveltejs/kit';
import {
	deleteDrink,
	markBought,
	updateDrink,
	deleteWine,
	drinkOne,
	drinksForWine,
	getWine,
	otherVintages,
	restock,
	setQuantity,
	setRating
} from '#lib/server/wines.ts';
import { parsePhoto, parsePurchase, type FieldErrors } from '#lib/server/wine-form.ts';
import { isISODate } from '#lib/dates.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const wine = await getWine(locals.user!.id, params.id);
	if (!wine) error(404, 'Not found');
	const [drinks, vintages] = await Promise.all([
		drinksForWine(locals.user!.id, wine.id),
		otherVintages(locals.user!.id, wine)
	]);
	return { wine, drinks, vintages };
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
	bought: async ({ locals, params }) => {
		await markBought(locals.user!.id, params.id);
	},
	// "Already in your cellar" after a scan: one more bottle, and the label photo if it had none
	restock: async ({ request, locals, params }) => {
		const fd = await request.formData();
		const errors: FieldErrors = {};
		const photo = (await parsePhoto(fd, errors)) ?? undefined;
		if (Object.keys(errors).length) return fail(400, { errors });
		// how many were bought, from the add form; one for a quick "add a bottle"
		const bottles = Math.min(9999, Math.max(1, Math.trunc(Number(fd.get('bottles'))) || 1));
		// from the add form: where it goes and what this purchase cost
		if (!(await restock(locals.user!.id, params.id, photo, bottles, parsePurchase(fd))))
			error(404, 'Not found');
	},
	quantity: async ({ request, locals, params }) => {
		const delta = Number((await request.formData()).get('delta'));
		if (delta !== 1 && delta !== -1) return fail(400);
		await setQuantity(locals.user!.id, params.id, delta);
	},
	drink: async ({ request, locals, params }) => {
		const fd = await request.formData();
		const date = String(fd.get('drunk_on') ?? '');
		const note =
			String(fd.get('note') ?? '')
				.trim()
				.slice(0, 2000) || null;
		// the date comes from the device: the server can't know the user's time zone
		if (!isISODate(date)) return fail(400, { date: 'invalid' });
		const drunk = await drinkOne(locals.user!.id, params.id, {
			drunk_on: date,
			rating: rating(fd.get('rating')),
			note
		});
		if (!drunk) return fail(400);
		// the id lets the page offer an undo, the rating before lets the undo restore it
		return { drunk: drunk.id, ratingBefore: drunk.ratingBefore };
	},
	editDrink: async ({ request, locals }) => {
		const fd = await request.formData();
		const date = String(fd.get('drunk_on') ?? '');
		if (!isISODate(date)) return fail(400, { date: 'invalid' });
		const note =
			String(fd.get('note') ?? '')
				.trim()
				.slice(0, 2000) || null;
		const ok = await updateDrink(locals.user!.id, String(fd.get('id')), {
			drunk_on: date,
			rating: rating(fd.get('rating')),
			note
		});
		if (!ok) return fail(404);
	},
	deleteDrink: async ({ request, locals }) => {
		await deleteDrink(locals.user!.id, String((await request.formData()).get('id')));
	},
	undoDrink: async ({ request, locals }) => {
		const fd = await request.formData();
		await deleteDrink(locals.user!.id, String(fd.get('id')), rating(fd.get('rating_before')));
	},
	delete: async ({ locals, params }) => {
		await deleteWine(locals.user!.id, params.id);
		redirect(303, '/');
	}
};
