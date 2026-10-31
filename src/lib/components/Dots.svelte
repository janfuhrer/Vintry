<script lang="ts">
	/** A 1–5 scale as dots; editable when `onchange` is set */
	let {
		label,
		value,
		onchange
	}: { label: string; value: number | null; onchange?: (v: number | null) => void } = $props();
</script>

<div class="dots-row">
	<span class="label">{label}</span>
	<div class="dots" role={onchange ? 'radiogroup' : 'img'} aria-label={onchange ? label : `${label}: ${value ?? '–'}/5`}>
		{#each [1, 2, 3, 4, 5] as n (n)}
			{#if onchange}
				<button
					type="button"
					class="d"
					class:on={value !== null && n <= value}
					role="radio"
					aria-checked={value === n}
					aria-label="{n}/5"
					onclick={() => onchange(value === n ? null : n)}
				></button>
			{:else}
				<span class="d" class:on={value !== null && n <= value}></span>
			{/if}
		{/each}
	</div>
</div>

<style>
	.dots-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		min-height: 36px;
	}
	.label {
		font-size: 0.9rem;
	}
	.dots {
		display: flex;
		gap: 6px;
	}
	.d {
		width: 14px;
		height: 14px;
		padding: 0;
		border-radius: 50%;
		border: 0;
		background: var(--line);
	}
	button.d {
		width: 22px;
		height: 22px;
		margin: -4px;
		border: 4px solid transparent;
		background-clip: padding-box;
		box-sizing: content-box;
	}
	.d.on {
		background-color: var(--accent);
	}
</style>
