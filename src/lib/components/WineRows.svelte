<script lang="ts">
	interface Row {
		id: string;
		name: string;
		producer: string | null;
		vintage: number | null;
		quantity: number;
	}
	let { wines }: { wines: Row[] } = $props();
</script>

<!-- name on its own line: long names and producers wrap instead of running into each other -->
<ul class="rows">
	{#each wines as w (w.id)}
		<li>
			<a href="/wine/{w.id}" class:empty={w.quantity === 0}>
				<span class="text">
					<span class="name">{w.name}</span>
					{#if w.producer || w.vintage}
						<span class="muted small">{[w.producer, w.vintage].filter(Boolean).join(' · ')}</span>
					{/if}
				</span>
				<span class="qty">×{w.quantity}</span>
			</a>
		</li>
	{/each}
</ul>

<style>
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rows li + li {
		border-top: 1px solid var(--line);
	}
	a {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 52px;
		padding: 6px 0;
		color: inherit;
		text-decoration: none;
	}
	.text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
		overflow-wrap: anywhere;
	}
	.name {
		font-weight: 600;
	}
	.qty {
		flex: none;
		font-weight: 650;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.empty .name {
		color: var(--muted);
		font-weight: 500;
	}
</style>
