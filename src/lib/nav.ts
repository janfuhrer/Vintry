// "Back" as the user means it: to the page they came from, not to a fixed parent page.
import { goto } from '$app/navigation';

// SvelteKit numbers each history entry it creates; replacing an entry keeps the number. Should a
// later version stop doing that, back buttons fall back to their fixed target.
const index = (): number | undefined =>
	(history.state?.['sveltekit:metadata'] as { historyIndex?: number } | undefined)?.historyIndex;

let start: number | undefined;

/** The entry this visit began on; called once the app has started */
export function rememberStart() {
	start ??= index();
}

/** Whether going back stays in the app (it doesn't on the first page, or after a reload) */
export function canGoBack(): boolean {
	const i = index();
	return start !== undefined && i !== undefined && i > start;
}

/** Back to the previous page, or to `fallback` when there is none in this visit */
export function back(fallback: string) {
	if (canGoBack()) history.back();
	else goto(fallback, { replaceState: true });
}
