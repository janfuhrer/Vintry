<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import InstallHint from '#lib/components/InstallHint.svelte';
	import { groupBy } from '#lib/group.ts';
	import WineCard from '#lib/components/WineCard.svelte';
	import { useI18n, type Key } from '#lib/i18n.ts';
	import {
		COLORS,
		countryName,
		findGrape,
		flag,
		grapeSlug,
		normalize,
		windowStatus,
		type Color,
		type WindowStatus
	} from '#lib/wine.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	type Group = 'none' | 'country' | 'grape' | 'window' | 'location';
	const GROUPS: Group[] = ['none', 'country', 'grape', 'window', 'location'];
	type Sort = 'recent' | 'name' | 'vintage' | 'window' | 'rating';
	const SORTS: Sort[] = ['recent', 'name', 'vintage', 'window', 'rating'];
	const STATUS_ORDER: WindowStatus[] = ['soon', 'ready', 'wait', 'past', 'unknown'];

	let query = $state('');
	let color = $state<Color | null>(null);
	// the wishlist is a separate view: wanted wines aren't part of the cellar
	let wishOnly = $state(false);
	// SSR renders the defaults; stored choices apply after hydration
	let group = $state<Group>('none');
	let sort = $state<Sort>('recent');
	let showEmpty = $state(false);

	function readPref<T extends string>(key: string, allowed: T[], fallback: T): T {
		try {
			const v = localStorage.getItem(`vintry.${key}`) as T;
			return allowed.includes(v) ? v : fallback;
		} catch {
			return fallback;
		}
	}
	function savePref(key: string, value: string) {
		try {
			localStorage.setItem(`vintry.${key}`, value);
		} catch {
			// private mode
		}
	}
	onMount(() => {
		group = readPref('group', GROUPS, 'none');
		sort = readPref('sort', SORTS, 'recent');
	});

	const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, i18n.locale);
	const nullsLast = (a: number | null, b: number | null) => (a ?? Infinity) - (b ?? Infinity);

	const bottles = $derived(data.wines.reduce((n, w) => n + w.quantity, 0));
	const owned = $derived(data.wines.filter((w) => !w.wishlist));
	const wishCount = $derived(data.wines.length - owned.length);
	const colorsPresent = $derived(
		COLORS.filter((c) => owned.some((w) => w.color === c && (showEmpty || w.quantity > 0)))
	);
	const hasEmpty = $derived(owned.some((w) => w.quantity === 0));

	// bottles at the end of their window, or past it
	const drinkNow = $derived(
		data.wines
			.filter((w) => w.quantity > 0 && ['soon', 'past'].includes(windowStatus(w.drink_from, w.drink_to)))
			.sort((a, b) => nullsLast(a.drink_to, b.drink_to))
	);

	const filtered = $derived.by(() => {
		const q = normalize(query);
		const list = data.wines.filter((w) => {
			if (w.wishlist !== wishOnly) return false;
			if (!wishOnly && !showEmpty && w.quantity === 0) return false;
			if (color && w.color !== color) return false;
			if (!q) return true;
			const hay = normalize(
				[
					w.name,
					w.producer,
					w.vintage,
					w.region,
					w.location,
					w.purchased_at,
					w.notes,
					countryName(w.country, i18n.locale),
					...w.grapes
				]
					.filter(Boolean)
					.join(' ')
			);
			return q.split(' ').every((part) => hay.includes(part));
		});
		if (sort === 'name') list.sort(byName);
		else if (sort === 'vintage') list.sort((a, b) => nullsLast(a.vintage, b.vintage) || byName(a, b));
		else if (sort === 'window') list.sort((a, b) => nullsLast(a.drink_to, b.drink_to) || byName(a, b));
		else if (sort === 'rating') list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || byName(a, b));
		return list;
	});

	const groups = $derived.by(() => {
		if (group === 'none') return [{ key: '', label: '', wines: filtered }];
		const grouped = groupBy(filtered, (w) => {
			if (group === 'country') return w.country ?? '';
			if (group === 'window') return windowStatus(w.drink_from, w.drink_to);
			if (group === 'location') return w.location?.trim() ?? '';
			return w.grapes.length ? w.grapes : '';
		});
		const label = (k: string) => {
			if (group === 'country') return k ? `${flag(k)} ${countryName(k, i18n.locale)}` : t('cellar.unknown');
			if (group === 'window') return t(`status.${k}` as Key);
			if (group === 'location') return k || t('cellar.noLocation');
			return k || t('cellar.unknown');
		};
		const entries = grouped.map(([key, wines]) => ({ key, label: label(key), wines }));
		if (group === 'window')
			entries.sort(
				(a, b) => STATUS_ORDER.indexOf(a.key as WindowStatus) - STATUS_ORDER.indexOf(b.key as WindowStatus)
			);
		else
			entries.sort((a, b) =>
				!a.key ? 1 : !b.key ? -1 : a.label.localeCompare(b.label, i18n.locale, { numeric: true })
			);
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
		<div class="row">
			<a class="icon-btn" href="/grapes" aria-label={t('grapes.title')}><Icon name="book" /></a>
			<a class="icon-btn" href="/settings" aria-label={t('nav.settings')}><Icon name="settings" /></a>
		</div>
	</header>

	<InstallHint />

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
				<button
					class="chip"
					class:active={!color && !wishOnly}
					onclick={() => ((color = null), (wishOnly = false))}>{t('cellar.all')}</button
				>
				{#if wishCount}
					<button
						class="chip"
						class:active={wishOnly}
						onclick={() => ((wishOnly = !wishOnly), (color = null))}
						><Icon name="bookmark" size={14} />{t('cellar.wishlist')} {wishCount}</button
					>
				{/if}
				{#each colorsPresent as c (c)}
					<button
						class="chip"
						class:active={color === c}
						onclick={() => ((color = color === c ? null : c), (wishOnly = false))}
					>
						<span class="dot swatch-{c}" style="background: var(--swatch)"></span>{t(`color.${c}`)}
					</button>
				{/each}
			</div>
			<div class="row group-row">
				<label class="row small muted">
					{t('cellar.group')}
					<select class="group-select" bind:value={group} onchange={() => savePref('group', group)}>
						{#each GROUPS as g (g)}<option value={g}>{t(`cellar.group.${g}`)}</option>{/each}
					</select>
				</label>
				<label class="row small muted">
					{t('cellar.sort')}
					<select class="group-select" bind:value={sort} onchange={() => savePref('sort', sort)}>
						{#each SORTS as s (s)}<option value={s}>{t(`cellar.sort.${s}`)}</option>{/each}
					</select>
				</label>
				<span class="spacer"></span>
				{#if hasEmpty}
					<label class="row small muted"
						><input type="checkbox" bind:checked={showEmpty} />{t('cellar.showEmpty')}</label
					>
				{/if}
			</div>
		</div>

		{#if drinkNow.length && !query && !color && !wishOnly}
			<section class="drink-now" aria-labelledby="drink-now-title">
				<h2 id="drink-now-title" class="group-title">
					{t('cellar.drinkNow')} <span class="muted">{drinkNow.length}</span>
				</h2>
				<div class="strip">
					{#each drinkNow as w (w.id)}
						{@const status = windowStatus(w.drink_from, w.drink_to)}
						<a class="now-card status-{status}" href="/wine/{w.id}">
							<span class="now-name">{w.name}</span>
							<span class="small muted"
								>{[w.vintage, w.drink_to && `→ ${w.drink_to}`].filter(Boolean).join(' ')}</span
							>
							<span class="now-status small"><span class="dot"></span>{t(`status.${status}`)}</span>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		{#if filtered.length === 0}
			<p class="muted center">{t('cellar.noMatch')}</p>
		{/if}

		{#each groups as g (g.key)}
			<section class="group">
				{#if g.label}
					<h2 class="group-title">
						{#if group === 'grape' && findGrape(g.key)}
							<a class="group-link" href="/grapes/{grapeSlug(g.key)}">{g.label}</a>
						{:else}
							{g.label}
						{/if}
						<span class="muted">{g.wines.reduce((n, w) => n + w.quantity, 0)}</span>
					</h2>
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
	.group-link {
		text-decoration: underline;
		text-decoration-color: var(--line);
		text-underline-offset: 3px;
	}
	.drink-now {
		margin: 4px 0 8px;
	}
	.strip {
		display: flex;
		gap: 10px;
		overflow-x: auto;
		scrollbar-width: none;
		margin: 0 -16px;
		padding: 2px 16px 6px;
		scroll-snap-type: x mandatory;
	}
	.strip::-webkit-scrollbar {
		display: none;
	}
	.now-card {
		flex: none;
		width: 150px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 12px;
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow);
		border-top: 3px solid var(--status);
		scroll-snap-align: start;
	}
	.now-name {
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.now-status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--status);
		font-weight: 600;
	}
	.now-status .dot {
		background: var(--status);
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
