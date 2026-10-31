<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		value,
		onchange,
		size = 28,
		label = 'Rating'
	}: {
		value: number | null;
		onchange?: (v: number | null) => void;
		size?: number;
		label?: string;
	} = $props();
</script>

{#if onchange}
	<div class="stars" role="radiogroup" aria-label={label}>
		{#each [1, 2, 3, 4, 5] as n (n)}
			<button
				type="button"
				role="radio"
				aria-checked={value === n}
				aria-label="{n}/5"
				class:on={value !== null && n <= value}
				onclick={() => onchange(value === n ? null : n)}
			>
				<Icon name="star" {size} fill={value !== null && n <= value} />
			</button>
		{/each}
	</div>
{:else if value}
	<span class="stars static" aria-label="{value}/5">
		{#each [1, 2, 3, 4, 5] as n (n)}
			<span class:on={n <= value}><Icon name="star" {size} fill={n <= value} /></span>
		{/each}
	</span>
{/if}

<style>
	.stars {
		display: inline-flex;
		gap: 2px;
	}
	button {
		padding: 4px;
		border: 0;
		background: none;
		color: var(--line);
	}
	.static span {
		color: var(--line);
		display: inline-flex;
	}
	.on {
		color: var(--gold) !important;
	}
</style>
