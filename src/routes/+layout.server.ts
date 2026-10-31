import { pickLocale } from '#lib/i18n.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, request }) => ({
	user: locals.user,
	locale: locals.user?.locale ?? pickLocale(request.headers.get('accept-language'))
});
