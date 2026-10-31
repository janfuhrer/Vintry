<script lang="ts">
	import type { Region } from '#lib/data/types.ts';
	import { useI18n } from '#lib/i18n.ts';
	import { findGrape, grapeSlug } from '#lib/wine.ts';
	import WineRows from './WineRows.svelte';

	interface Row {
		id: string;
		name: string;
		producer: string | null;
		vintage: number | null;
		quantity: number;
	}
	let { region, wines }: { region: Region; wines: Row[] } = $props();
	const { t } = useI18n();
	// only regions with their own ageing data; a guess from one grape misleads in mixed regions
	const age = $derived(region.age ?? null);
</script>

<div class="details">
	{#if region.grapes.length}
		<div class="part">
			<h3>{t('regions.grapes')}</h3>
			<div class="chips">
				{#each region.grapes as g (g)}
					<a class="chip" href="/grapes/{grapeSlug(g)}">
						<span class="dot swatch-{findGrape(g)?.color ?? 'red'}" style="background: var(--swatch)"
						></span>{g}
					</a>
				{/each}
			</div>
		</div>
	{/if}
	{#if region.color || age || region.synonyms.length}
		<dl class="facts small">
			{#if region.color}<dt>{t('regions.style')}</dt>
				<dd>{t(`color.${region.color}`)}</dd>{/if}
			{#if age}<dt>{t('regions.ready')}</dt>
				<dd>{t('regions.readyYears', { from: age[0], to: age[1] })}</dd>{/if}
			{#if region.synonyms.length}<dt>{t('regions.alsoKnown')}</dt>
				<dd>{region.synonyms.join(', ')}</dd>{/if}
		</dl>
	{/if}
	<div class="part">
		<h3>{t('grapes.yourWines')}</h3>
		{#if wines.length}
			<WineRows {wines} />
		{:else}
			<p class="muted small">{t('grapes.noWines')}</p>
		{/if}
	</div>
</div>

<style>
	.details {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.part {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h3 {
		margin: 0;
		font-size: 0.95rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.facts {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 16px;
		margin: 0;
	}
	.facts dt {
		color: var(--muted);
	}
	.facts dd {
		margin: 0;
	}
	p {
		margin: 0;
	}
</style>
