<script lang="ts">
	import { replaceState } from '$app/navigation';
	import CountryMap from '#lib/components/CountryMap.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import RegionDetails from '#lib/components/RegionDetails.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import { countryName, findRegion, findRegionBySlug, flag, normalize, regionIndex } from '#lib/wine.ts';
	import { tick } from 'svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	// countries you have bottles from first, then the rest by name
	const countries = $derived(
		data.countries
			.map((c) => ({ ...c, label: countryName(c.code, i18n.locale) }))
			.sort(
				(a, b) => Number(b.bottles > 0) - Number(a.bottles > 0) || a.label.localeCompare(b.label, i18n.locale)
			)
	);
	const list = $derived([...data.map.points].sort((a, b) => a.name.localeCompare(b.name, i18n.locale)));
	const name = $derived(countryName(data.country, i18n.locale));

	// the region picked on the map or in the list; it opens below the map, the page stays
	let selected = $derived(data.selected);
	const region = $derived(selected ? findRegionBySlug(selected) : undefined);
	const regionWines = $derived(
		region ? data.wines.filter((w) => regionIndex.get(normalize(w.region)) === region) : []
	);
	let mapCard: HTMLElement | undefined = $state();
	async function pick(slug: string, fromList = false) {
		selected = slug;
		// in the address too, so a reload or a shared link opens the same region
		replaceState(`?country=${data.country}&region=${slug}`, {});
		if (fromList) {
			await tick();
			mapCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	/** The chosen country may be far along the row */
	function reveal(node: HTMLElement, active: boolean) {
		const show = (on: boolean) => on && node.scrollIntoView({ block: 'nearest', inline: 'center' });
		show(active);
		return { update: show };
	}
</script>

<svelte:head><title>Vintry · {t('regions.title')}</title></svelte:head>

<main class="page stack">
	<header class="head">
		<a class="icon-btn" href="/" aria-label={t('common.back')}><Icon name="back" /></a>
		<h1>{t('regions.title')}</h1>
	</header>

	<nav class="countries" aria-label={t('regions.countries')}>
		{#each countries as c (c.code)}
			<a
				class="chip"
				class:active={c.code === data.country}
				aria-current={c.code === data.country ? 'page' : undefined}
				href="?country={c.code}"
				data-sveltekit-noscroll
				data-sveltekit-replacestate
				use:reveal={c.code === data.country}>{flag(c.code)} {c.label}</a
			>
		{/each}
	</nav>

	<section class="card stack map-card" bind:this={mapCard}>
		<h2>{flag(data.country)} {name}</h2>
		<CountryMap
			map={data.map}
			links
			{selected}
			onselect={(slug) => pick(slug)}
			label={t('regions.mapOf', { country: name })}
		/>
		<p class="legend muted small">
			<span><span class="key has"></span>{t('regions.keyBottles')}</span>
			<span><span class="key known"></span>{t('regions.keyDrunk')}</span>
			<span><span class="key"></span>{t('regions.keyOther')}</span>
		</p>
	</section>

	<section class="card stack" aria-live="polite">
		{#if region}
			<h2>{region.name}</h2>
			<RegionDetails {region} wines={regionWines} />
		{:else}
			<p class="muted small">{t('regions.pick')}</p>
		{/if}
	</section>

	<section class="card">
		<ul class="list">
			{#each list as p (p.slug)}
				<li>
					<a
						href="?country={data.country}&region={p.slug}"
						class="row"
						class:active={p.slug === selected}
						aria-current={p.slug === selected ? 'true' : undefined}
						onclick={(e) => {
							e.preventDefault();
							pick(p.slug, true);
						}}
					>
						<span class="grow">
							<span class="name">{p.name}</span>
							<span class="muted small">{findRegion(p.name)?.grapes.slice(0, 3).join(', ')}</span>
						</span>
						{#if p.bottles}<span class="qty">×{p.bottles}</span>
						{:else if p.bottles === 0}<span class="muted small">{t('regions.keyDrunk')}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
</main>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.countries {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		margin: 0 -16px;
		padding: 2px 16px 6px;
		scrollbar-width: none;
	}
	.countries .chip {
		flex: none;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 14px;
		margin: 0;
	}
	.legend > span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.key {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1.5px solid var(--muted);
		background: var(--surface);
	}
	.key.known {
		border-color: var(--accent);
	}
	.key.has {
		border-color: var(--accent);
		background: var(--accent);
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
		min-height: 52px;
		padding: 6px 8px;
		margin: 0 -8px;
		border-radius: var(--radius-s);
	}
	.list a.active {
		background: var(--accent-soft);
	}
	.map-card {
		scroll-margin-top: calc(12px + var(--safe-t));
	}
	.grow {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.name {
		font-weight: 600;
	}
	.qty {
		font-weight: 650;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
</style>
