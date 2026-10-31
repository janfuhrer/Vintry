<script lang="ts">
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import { useI18n } from '#lib/i18n.ts';
	const { t } = useI18n();
</script>

<main class="page stack" style="text-align:center; padding-top: 25vh">
	{#if page.error?.message === 'offline'}
		<h1><Icon name="cloud-off" size={40} label={t('common.offlineTitle')} /></h1>
		<p class="muted">{t('common.offlineAction')}</p>
	{:else}
		<h1>{page.status}</h1>
		<p class="muted">{page.status === 404 ? t('common.notFound') : t('common.error')}</p>
	{/if}
	<a class="btn" href="/">{t('nav.cellar')}</a>
</main>
