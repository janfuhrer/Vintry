<script lang="ts">
	import Thumb from './Thumb.svelte';
	import StatusPill from './StatusPill.svelte';
	import Icon from './Icon.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import { windowStatus } from '#lib/wine.ts';
	import type { WineListItem } from '#lib/server/wines.ts';

	let { wine }: { wine: WineListItem } = $props();
	const status = $derived(windowStatus(wine.drink_from, wine.drink_to));
	const sub = $derived([wine.producer, wine.vintage].filter(Boolean).join(' · '));
	const { t } = useI18n();
</script>

<a class="wine card" href="/wine/{wine.id}" class:empty={wine.quantity === 0 && !wine.wishlist}>
	<Thumb id={wine.id} color={wine.color} hasPhoto={wine.has_photo} version={wine.photo_version} />
	<div class="body">
		<div class="top">
			<span class="name">{wine.name}</span>
			{#if !wine.wishlist}<span class="qty">×{wine.quantity}</span>{/if}
		</div>
		{#if sub}<div class="muted small sub">{sub}</div>{/if}
		{#if wine.wishlist}
			<span class="wish small"><Icon name="bookmark" size={14} />{t('cellar.wishlist')}</span>
		{:else}
			<StatusPill {status} />
		{/if}
	</div>
</a>

<style>
	.wine {
		display: flex;
		gap: 14px;
		align-items: center;
		padding: 12px;
		/* a big cellar is a long list: off-screen cards skip layout and paint */
		content-visibility: auto;
		contain-intrinsic-size: auto 80px;
	}
	.wine:active {
		transform: scale(0.99);
	}
	/* finished wines: muted colour instead of opacity, which would break text contrast */
	.empty .name,
	.empty .qty {
		color: var(--muted);
	}
	.empty :global(.thumb) {
		opacity: 0.5;
	}
	.body {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.top {
		display: flex;
		gap: 8px;
		align-items: baseline;
	}
	.name {
		flex: 1;
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.qty {
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}
	/* gold is fine for the icon; small gold text would miss AA contrast in light mode */
	.wish {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
	}
	.wish :global(svg) {
		color: var(--gold);
	}
	.sub {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
