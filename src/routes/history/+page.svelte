<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import Thumb from '#lib/components/Thumb.svelte';
	import { groupBy } from '#lib/group.ts';
	import { useI18n } from '#lib/i18n.ts';
	import { countryName, flag } from '#lib/wine.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	const months = $derived.by(() => {
		return groupBy(data.drinks, (d) => d.drunk_on.slice(0, 7)).map(([key, drinks]) => ({
			key,
			label: new Date(`${key}-15T12:00:00`).toLocaleDateString(i18n.locale, {
				month: 'long',
				year: 'numeric'
			}),
			drinks
		}));
	});
	const thisYear = new Date().getFullYear();
	// years with drinks, newest first; the stats card steps through them
	const years = $derived([...new Set([thisYear, ...data.years.map((y) => y.year)])].sort((a, b) => b - a));
	let year = $state(thisYear);
	const empty = (y: number) => ({ year: y, bottles: 0, avgRating: null, topGrape: null, topCountry: null });
	const stats = $derived(data.years.find((y) => y.year === year) ?? empty(year));
	const step = (dir: 1 | -1) => {
		const i = years.indexOf(year) - dir;
		if (i >= 0 && i < years.length) year = years[i];
	};

	const day = (d: string) =>
		new Date(`${d}T12:00:00`).toLocaleDateString(i18n.locale, { day: 'numeric', weekday: 'short' });
</script>

<svelte:head><title>Vintry · {t('history.title')}</title></svelte:head>

<main class="page">
	<h1 class="title">{t('history.title')}</h1>
	{#if data.years.length > 0 || data.value.value > 0}
		{@const heading = year === thisYear ? t('history.thisYear', { year }) : String(year)}
		<section class="card stats" aria-label={heading}>
			<div class="stats-head">
				<h2 class="small muted" aria-live="polite">{heading}</h2>
				{#if years.length > 1}
					<button
						class="icon-btn"
						aria-label={t('history.prevYear')}
						disabled={year === years.at(-1)}
						onclick={() => step(-1)}><Icon name="back" size={18} /></button
					>
					<button
						class="icon-btn next"
						aria-label={t('history.nextYear')}
						disabled={year === years[0]}
						onclick={() => step(1)}><Icon name="back" size={18} /></button
					>
				{/if}
			</div>
			<dl>
				{#if stats.bottles > 0}
					<div>
						<dt>{t('history.bottles')}</dt>
						<dd>{stats.bottles}</dd>
					</div>
				{/if}
				{#if stats.avgRating !== null}
					<div>
						<dt>{t('history.avgRating')}</dt>
						<dd>{stats.avgRating.toLocaleString(i18n.locale)} ★</dd>
					</div>
				{/if}
				{#if stats.topGrape}
					<div>
						<dt>{t('history.topGrape')}</dt>
						<dd class="text">{stats.topGrape}</dd>
					</div>
				{/if}
				{#if stats.topCountry}
					<div>
						<dt>{t('history.topCountry')}</dt>
						<dd class="text">{flag(stats.topCountry)} {countryName(stats.topCountry, i18n.locale)}</dd>
					</div>
				{/if}
				{#if stats.bottles === 0}
					<div>
						<dt>{t('history.bottles')}</dt>
						<dd>0</dd>
					</div>
				{/if}
				<!-- what the cellar is worth now, so only next to this year's numbers -->
				{#if data.value.value > 0 && year === thisYear}
					<div title={t('history.cellarValueHint', { n: data.value.bottles })}>
						<dt>{t('history.cellarValue')}</dt>
						<dd>{Math.round(data.value.value).toLocaleString(i18n.locale)}</dd>
					</div>
				{/if}
			</dl>
		</section>
	{/if}
	{#if months.length === 0}
		<p class="muted empty">{t('history.empty')}</p>
	{/if}
	{#each months as m (m.key)}
		<section>
			<h2 class="month">
				{m.label}
				<span class="muted small"
					>{m.drinks.length === 1 ? t('cellar.bottle') : t('history.count', { n: m.drinks.length })}</span
				>
			</h2>
			<div class="card list">
				{#each m.drinks as d (d.id)}
					<a class="item" href="/wine/{d.wine_id}">
						<Thumb
							id={d.wine_id}
							color={d.color}
							hasPhoto={d.has_photo}
							version={d.photo_version}
							size={44}
						/>
						<div class="body">
							<div class="name">{d.name}</div>
							<div class="muted small">{[d.producer, d.vintage].filter(Boolean).join(' · ')}</div>
							{#if d.note}<div class="small note">{d.note}</div>{/if}
						</div>
						<div class="meta">
							<span class="small muted">{day(d.drunk_on)}</span>
							<Stars value={d.rating} size={12} />
						</div>
					</a>
				{/each}
			</div>
		</section>
	{/each}
	{#if data.more}
		<a class="btn block older" href="/history?all" data-sveltekit-noscroll>{t('history.older')}</a>
	{/if}
</main>

<style>
	.title {
		margin-bottom: 12px;
	}
	.stats-head {
		display: flex;
		align-items: center;
		gap: 2px;
		margin: -6px -6px 10px 0;
	}
	.stats-head h2 {
		flex: 1;
		margin: 0;
	}
	.stats-head .icon-btn:disabled {
		opacity: 0.35;
	}
	.next :global(svg) {
		transform: scaleX(-1);
	}
	.stats dl {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 14px;
		margin: 0;
	}
	.stats dt {
		font-size: 0.8rem;
		color: var(--muted);
	}
	.stats dd {
		margin: 2px 0 0;
		font-size: 1.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.stats dd.text {
		font-size: 1rem;
		font-weight: 650;
	}
	.older {
		margin-top: 20px;
	}
	.empty {
		text-align: center;
		padding-top: 25vh;
	}
	.month {
		margin: 20px 4px 8px;
		font-size: 0.95rem;
	}
	.list {
		padding: 4px 12px;
	}
	.item {
		display: flex;
		gap: 12px;
		align-items: center;
		padding: 10px 0;
		/* the full history can be thousands of rows: off-screen ones skip layout and paint */
		content-visibility: auto;
		contain-intrinsic-size: auto 64px;
	}
	.item + .item {
		border-top: 1px solid var(--line);
	}
	.body {
		flex: 1;
		min-width: 0;
	}
	.name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.note {
		margin-top: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}
</style>
