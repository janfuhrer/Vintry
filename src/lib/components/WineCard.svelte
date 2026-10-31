<script lang="ts">
	import Thumb from './Thumb.svelte';
	import StatusPill from './StatusPill.svelte';
	import { windowStatus } from '#lib/wine.ts';
	import type { WineListItem } from '#lib/server/wines.ts';

	let { wine }: { wine: WineListItem } = $props();
	const status = $derived(windowStatus(wine.drink_from, wine.drink_to));
	const sub = $derived([wine.producer, wine.vintage].filter(Boolean).join(' · '));
</script>

<a class="wine card" href="/wine/{wine.id}" class:empty={wine.quantity === 0}>
	<Thumb id={wine.id} color={wine.color} hasPhoto={wine.has_photo} version={wine.photo_version} />
	<div class="body">
		<div class="top">
			<span class="name">{wine.name}</span>
			<span class="qty">×{wine.quantity}</span>
		</div>
		{#if sub}<div class="muted small sub">{sub}</div>{/if}
		<StatusPill {status} />
	</div>
</a>

<style>
	.wine {
		display: flex;
		gap: 14px;
		align-items: center;
		padding: 12px;
	}
	.wine:active {
		transform: scale(0.99);
	}
	.empty {
		opacity: 0.55;
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
	.sub {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
