<script lang="ts">
	import BackButton from '#lib/components/BackButton.svelte';
	import CountryMap from '#lib/components/CountryMap.svelte';
	import RegionDetails from '#lib/components/RegionDetails.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import { countryName, findRegion, flag, regionSlug } from '#lib/wine.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	const region = $derived(findRegion(data.name)!);
	const country = $derived(countryName(region.country, i18n.locale));
	// the map opens the regions page with this region picked, to look around from there
	const explore = $derived(`/regions?country=${region.country}&region=${regionSlug(region.name)}`);
</script>

<svelte:head><title>Vintry · {region.name}</title></svelte:head>

<main class="page stack">
	<header class="head">
		<BackButton fallback={explore} />
		<div>
			<h1>{region.name}</h1>
			<p class="muted">{flag(region.country)} {country}</p>
		</div>
	</header>

	{#if data.map}
		<a class="card stack map-card" href={explore}>
			<CountryMap map={data.map} label={t('map.label', { region: region.name, country })} />
			<span class="small explore">{t('map.explore', { country })} →</span>
		</a>
	{/if}

	<section class="card">
		<RegionDetails {region} wines={data.wines} />
	</section>
</main>

<style>
	.head {
		display: flex;
		align-items: flex-start;
		gap: 4px;
	}
	.head p {
		margin: 2px 0 0;
	}
	.map-card {
		color: inherit;
		text-decoration: none;
	}
	.explore {
		color: var(--accent);
		font-weight: 600;
	}
</style>
