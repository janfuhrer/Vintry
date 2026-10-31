<script lang="ts">
	import type { Color } from '#lib/wine.ts';

	let {
		id,
		color,
		hasPhoto,
		version,
		size = 56
	}: { id: string; color: Color; hasPhoto: boolean; version: number | null; size?: number } = $props();
</script>

{#if hasPhoto}
	<img
		class="thumb"
		src="/photo/{id}?s=t&v={version ?? 0}"
		alt=""
		width={size}
		height={size}
		loading="lazy"
		style="--size: {size}px"
	/>
{:else}
	<span class="thumb swatch swatch-{color}" style="--size: {size}px" aria-hidden="true">
		<svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5}>
			<path d="M10 2h4v5c0 1 2 2 2 5v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9c0-3 2-4 2-5z" fill="currentColor" />
		</svg>
	</span>
{/if}

<style>
	.thumb {
		width: var(--size);
		height: var(--size);
		flex: none;
		border-radius: 12px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.swatch {
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--swatch) 22%, var(--surface-2));
		color: var(--swatch);
	}
</style>
