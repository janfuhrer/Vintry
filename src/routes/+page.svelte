<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import WineCard from '#lib/components/WineCard.svelte';
	import { useI18n, type Key } from '#lib/i18n.ts';
	import { COLORS, countryName, flag, normalize, windowStatus, type Color, type WindowStatus } from '#lib/wine.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	type Group = 'none' | 'country' | 'grape' | 'window';
	const GROUPS: Group[] = ['none', 'country', 'grape', 'window'];
	const STATUS_ORDER: WindowStatus[] = ['soon', 'ready', 'wait', 'past', 'unknown'];

	let query = $state('');
	let color = $state<Color | null>(null);
	// SSR renders ungrouped; the stored choice applies after hydration
	let group = $state<Group>('none');
	let showEmpty = $state(false);

	function readGroup(): Group {
		try {
			const g = localStorage.getItem('vintry.group') as Group;
			return GROUPS.includes(g) ? g : 'none';
		} catch {
			return 'none';
		}
	}
	onMount(() => (group = readGroup()));
	function saveGroup() {
		try {
			localStorage.setItem('vintry.group', group);
		} catch {
			// private mode
		}
	}

	const bottles = $derived(data.wines.reduce((n, w) => n + w.quantity, 0));
	const colorsPresent = $derived(COLORS.filter((c) => data.wines.some((w) => w.color === c)));
	const hasEmpty = $derived(data.wines.some((w) => w.quantity === 0));

	const filtered = $derived.by(() => {
		const q = normalize(query);
		return data.wines.filter((w) => {
			if (!showEmpty && w.quantity === 0) return false;
			if (color && w.color !== color) return false;
			if (!q) return true;
			const hay = normalize(
				[w.name, w.producer, w.vintage, w.region, w.location, countryName(w.country, i18n.locale), ...w.grapes]
					.filter(Boolean)
					.join(' ')
			);
			return q.split(' ').every((part) => hay.includes(part));
		});
	});

	const groups = $derived.by(() => {
		if (group === 'none') return [{ key: '', label: '', wines: filtered }];
		const map = new Map<string, typeof filtered>();
		const add = (k: string, w: (typeof filtered)[number]) => map.set(k, [...(map.get(k) ?? []), w]);
		for (const w of filtered) {
			if (group === 'country') add(w.country ?? '', w);
			else if (group === 'window') add(windowStatus(w.drink_from, w.drink_to), w);
			else if (w.grapes.length) for (const g of w.grapes) add(g, w);
			else add('', w);
		}
		const label = (k: string) => {
			if (group === 'country') return k ? `${flag(k)} ${countryName(k, i18n.locale)}` : t('cellar.unknown');
			if (group === 'window') return t(`status.${k}` as Key);
			return k || t('cellar.unknown');
		};
		const entries = [...map.entries()].map(([key, wines]) => ({ key, label: label(key), wines }));
		if (group === 'window') entries.sort((a, b) => STATUS_ORDER.indexOf(a.key as WindowStatus) - STATUS_ORDER.indexOf(b.key as WindowStatus));
		else entries.sort((a, b) => (!a.key ? 1 : !b.key ? -1 : a.label.localeCompare(b.label)));
		return entries;
	});
</script>

<svelte:head><title>Vintry</title></svelte:head>

<main class="page">
	<header class="head">
		<div>
			<h1>{t('cellar.title')}</h1>
			<p class="muted small">{bottles === 1 ? t('cellar.bottle') : t('cellar.bottles', { n: bottles })}</p>
		</div>
		<a class="icon-btn" href="/settings" aria-label={t('nav.settings')}><Icon name="settings" /></a>
	</header>

	{#if data.wines.length === 0}
		<div class="empty-state">
			<div class="glass"><Icon name="glass" size={40} /></div>
			<h2>{t('cellar.empty')}</h2>
			<p class="muted">{t('cellar.emptyHint')}</p>
			<a class="btn primary" href="/add"><Icon name="camera" />{t('add.scan')}</a>
		</div>
	{:else}
		<div class="tools">
			<label class="search">
				<Icon name="search" size={18} />
				<span class="visually-hidden">{t('cellar.search')}</span>
				<input type="search" placeholder={t('cellar.search')} bind:value={query} enterkeyhint="search" />
			</label>
			<div class="chips" role="group" aria-label={t('form.color')}>
				<button class="chip" class:active={!color} onclick={() => (color = null)}>{t('cellar.all')}</button>
				{#each colorsPresent as c (c)}
					<button class="chip" class:active={color === c} onclick={() => (color = color === c ? null : c)}>
						<span class="dot swatch-{c}" style="background: var(--swatch)"></span>{t(`color.${c}`)}
					</button>
				{/each}
			</div>
			<div class="row group-row">
				<label class="row small muted">
					{t('cellar.group')}
					<select class="group-select" bind:value={group} onchange={saveGroup}>
						{#each GROUPS as g (g)}<option value={g}>{t(`cellar.group.${g}`)}</option>{/each}
					</select>
				</label>
				<span class="spacer"></span>
				{#if hasEmpty}
					<label class="row small muted"><input type="checkbox" bind:checked={showEmpty} />{t('cellar.showEmpty')}</label>
				{/if}
			</div>
		</div>

		{#if filtered.length === 0}
			<p class="muted center">{t('cellar.noMatch')}</p>
		{/if}

		{#each groups as g (g.key)}
			<section class="group">
				{#if g.label}
					<h2 class="group-title">{g.label} <span class="muted">{g.wines.reduce((n, w) => n + w.quantity, 0)}</span></h2>
				{/if}
				<div class="list">
					{#each g.wines as wine (wine.id)}<WineCard {wine} />{/each}
				</div>
			</section>
		{/each}
	{/if}
</main>

<style>
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 12px;
	}
	.tools {
		position: sticky;
		top: 0;
		z-index: 10;
		margin: 0 -16px 8px;
		padding: calc(8px + var(--safe-t)) 16px 8px;
		background: var(--bg);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 44px;
		padding: 0 14px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: none;
		outline: none;
		color: var(--text);
		font-size: 1rem;
	}
	.chips {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -16px;
		padding: 0 16px;
	}
	.chips::-webkit-scrollbar {
		display: none;
	}
	.group-select {
		border: 0;
		background: none;
		color: var(--text);
		font-weight: 600;
		font-size: 0.875rem;
	}
	.group {
		margin-top: 12px;
	}
	.group-title {
		margin: 8px 4px;
		font-size: 0.95rem;
	}
	.list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		text-align: center;
		padding: 18vh 0 0;
	}
	.glass {
		display: grid;
		place-items: center;
		width: 88px;
		height: 88px;
		border-radius: 50%;
		background: var(--accent-soft);
		color: var(--accent);
		margin-bottom: 8px;
	}
	.empty-state .btn {
		margin-top: 12px;
	}
	.center {
		text-align: center;
		padding: 32px 0;
	}
</style>
