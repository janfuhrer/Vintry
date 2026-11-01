<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import WineForm, { toValues } from '#lib/components/WineForm.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const { t } = useI18n();
	let photo = $state<{ image: Blob; thumb: Blob } | null>(null);
	let back = $state<Blob | null>(null);
	const initial = $derived(toValues(data.wine));
</script>

<svelte:head><title>Vintry · {t('common.edit')}</title></svelte:head>

<main class="page">
	<header class="head">
		<a class="icon-btn" href="/wine/{data.wine.id}" aria-label={t('common.back')}><Icon name="back" /></a>
		<h1>{t('common.edit')}</h1>
	</header>
	<WineForm
		{initial}
		bind:photo
		existingPhoto={data.wine.has_photo
			? `/photo/${data.wine.id}?s=t&v=${data.wine.photo_version ?? 0}`
			: null}
		bind:back
		existingBack={data.wine.back_version
			? `/photo/${data.wine.id}?side=back&v=${data.wine.back_version}`
			: null}
		suggestions={data.suggestions}
		errors={form?.errors ?? {}}
		submitLabel={t('common.save')}
		bottles={data.wine.wishlist ? 0 : data.wine.quantity}
	/>
</main>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 16px;
	}
</style>
