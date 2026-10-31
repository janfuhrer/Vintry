<script lang="ts">
	import Stars from '#lib/components/Stars.svelte';
	import Thumb from '#lib/components/Thumb.svelte';
	import { groupBy } from '#lib/group.ts';
	import { useI18n } from '#lib/i18n.ts';
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
	const day = (d: string) =>
		new Date(`${d}T12:00:00`).toLocaleDateString(i18n.locale, { day: 'numeric', weekday: 'short' });
</script>

<svelte:head><title>Vintry · {t('history.title')}</title></svelte:head>

<main class="page">
	<h1 class="title">{t('history.title')}</h1>
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
</main>

<style>
	.title {
		margin-bottom: 12px;
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
