<script lang="ts">
	import CountryMap from '#lib/components/CountryMap.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import { countryName, findGrape, findRegion, flag, grapeSlug } from '#lib/wine.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	const region = $derived(findRegion(data.name)!);
	// only regions with their own ageing data; a guess from one grape misleads in mixed regions
	const age = $derived(region.age ?? null);
</script>

<svelte:head><title>Vintry · {region.name}</title></svelte:head>

<main class="page stack">
	<header class="head">
		<button type="button" class="icon-btn" aria-label={t('common.back')} onclick={() => history.back()}
			><Icon name="back" /></button
		>
		<div>
			<h1>{region.name}</h1>
			<p class="muted">{flag(region.country)} {countryName(region.country, i18n.locale)}</p>
			{#if region.synonyms.length}
				<p class="muted small">{t('regions.alsoKnown')}: {region.synonyms.join(', ')}</p>
			{/if}
		</div>
	</header>

	{#if data.map}
		<section class="card stack">
			<CountryMap
				map={data.map}
				links
				label={t('map.label', { region: region.name, country: countryName(region.country, i18n.locale) })}
			/>
			<a class="small" href="/regions?country={region.country}"
				>{t('map.explore', { country: countryName(region.country, i18n.locale) })}</a
			>
		</section>
	{/if}

	{#if region.grapes.length}
		<section class="card stack">
			<h2>{t('regions.grapes')}</h2>
			<div class="chips">
				{#each region.grapes as g (g)}
					<a class="chip" href="/grapes/{grapeSlug(g)}">
						<span class="dot swatch-{findGrape(g)?.color ?? 'red'}" style="background: var(--swatch)"
						></span>{g}
					</a>
				{/each}
			</div>
			{#if region.color}<p class="small">{t('regions.style')}: {t(`color.${region.color}`)}</p>{/if}
			{#if age}<p class="muted small">{t('regions.aging', { from: age[0], to: age[1] })}</p>{/if}
		</section>
	{/if}

	<section class="card stack">
		<h2>{t('grapes.yourWines')}</h2>
		{#if data.wines.length === 0}
			<p class="muted small">{t('grapes.noWines')}</p>
		{:else}
			<ul class="list">
				{#each data.wines as w (w.id)}
					<li>
						<a href="/wine/{w.id}" class="row" class:empty={w.quantity === 0}>
							<span class="grow">{w.name}</span>
							<span class="muted small">{[w.producer, w.vintage].filter(Boolean).join(' · ')}</span>
							<span class="qty">×{w.quantity}</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</main>

<style>
	.head {
		display: flex;
		align-items: flex-start;
		gap: 4px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.list li + li {
		border-top: 1px solid var(--line);
	}
	.list a {
		min-height: 44px;
	}
	.grow {
		flex: 1;
		min-width: 0;
		font-weight: 600;
	}
	.qty {
		font-weight: 650;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.empty,
	.empty .grow {
		color: var(--muted);
		font-weight: 500;
	}
</style>
