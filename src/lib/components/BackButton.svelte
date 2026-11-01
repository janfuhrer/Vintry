<script lang="ts">
	import { useI18n } from '#lib/i18n.ts';
	import { back } from '#lib/nav.ts';
	import Icon from './Icon.svelte';

	/** Where to go when there is no previous page in this visit */
	let { fallback, class: cls = '' }: { fallback: string; class?: string } = $props();
	const { t } = useI18n();

	function click(e: MouseEvent) {
		// a new tab or window opens the fallback, as a link does
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
		e.preventDefault();
		back(fallback);
	}
</script>

<a class="icon-btn {cls}" href={fallback} aria-label={t('common.back')} onclick={click}
	><Icon name="back" /></a
>
