<script lang="ts">
	import BackButton from '#lib/components/BackButton.svelte';
	import Dots from '#lib/components/Dots.svelte';
	import WineRows from '#lib/components/WineRows.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import { countryName, findGrape, flag, regionSlug, regionsForGrape } from '#lib/wine.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	const grape = $derived(findGrape(data.name)!);
	const regions = $derived(regionsForGrape(grape.name));
</script>

<svelte:head><title>Vintry · {grape.name}</title></svelte:head>

<main class="page stack">
	<header class="head">
		<BackButton fallback="/grapes" />
		<div>
			<h1>{grape.name}</h1>
			{#if grape.synonyms.length}
				<p class="muted small">{t('grapes.alsoKnown')}: {grape.synonyms.join(', ')}</p>
			{/if}
		</div>
	</header>

	<section class="card">
		<h2>{t('grapes.profile')}</h2>
		<Dots label={t('taste.body')} value={grape.body} />
		<Dots label={t('taste.acidity')} value={grape.acidity} />
		{#if grape.color === 'red'}<Dots label={t('taste.tannin')} value={grape.tannin} />{/if}
		<Dots label={t('taste.sweetness')} value={grape.sweetness} />
		<p class="aromas">
			<span class="muted small">{t('taste.aroma')}</span><br />{grape.aroma[i18n.locale].join(' · ')}
		</p>
		<p class="muted small">{t('grapes.aging', { from: grape.age[0], to: grape.age[1] })}</p>
		<p class="small">{t('wine.goesWith')}: {grape.pairing[i18n.locale].join(', ')}</p>
	</section>

	{#if regions.length}
		<section class="card stack">
			<h2>{t('grapes.regions')}</h2>
			<div class="chips">
				{#each regions as r (r.name)}
					<a class="chip" href="/regions/{regionSlug(r.name)}" title={countryName(r.country, i18n.locale)}
						>{flag(r.country)} {r.name}</a
					>
				{/each}
			</div>
		</section>
	{/if}

	<section class="card stack">
		<h2>{t('grapes.yourWines')}</h2>
		{#if data.wines.length === 0}
			<p class="muted small">{t('grapes.noWines')}</p>
		{:else}
			<WineRows wines={data.wines} />
		{/if}
	</section>
</main>

<style>
	.head {
		display: flex;
		align-items: flex-start;
		gap: 4px;
	}
	.aromas {
		margin: 12px 0 4px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
</style>
