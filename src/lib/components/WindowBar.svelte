<script lang="ts">
	let { from, to, year = new Date().getFullYear() }: { from: number; to: number; year?: number } = $props();

	// show a little context around the window
	const start = $derived(Math.min(from, year) - 1);
	const end = $derived(Math.max(to, year) + 1);
	const pct = (y: number) => ((y - start) / (end - start)) * 100;
</script>

<div class="bar" aria-hidden="true">
	<div class="track"></div>
	<div class="window" style="left: {pct(from)}%; width: {pct(to) - pct(from)}%"></div>
	<div class="now" style="left: {pct(year)}%"><span>{year}</span></div>
</div>
<div class="labels small muted">
	<span>{from}</span><span>{to}</span>
</div>

<style>
	.bar {
		position: relative;
		height: 28px;
		margin-top: 22px;
	}
	.track,
	.window {
		position: absolute;
		top: 10px;
		height: 8px;
		border-radius: 999px;
	}
	.track {
		inset-inline: 0;
		background: var(--surface-2);
	}
	.window {
		background: linear-gradient(90deg, var(--ready), var(--soon));
	}
	.now {
		position: absolute;
		top: 2px;
		width: 2px;
		height: 24px;
		margin-left: -1px;
		background: var(--text);
		border-radius: 2px;
	}
	.now span {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.75rem;
		font-weight: 650;
		padding-bottom: 2px;
	}
	.labels {
		display: flex;
		justify-content: space-between;
	}
</style>
