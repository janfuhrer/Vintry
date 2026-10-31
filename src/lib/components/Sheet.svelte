<script lang="ts">
	import type { Snippet } from 'svelte';

	let { open = $bindable(false), title, children }: { open: boolean; title: string; children: Snippet } = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	class="sheet"
	aria-label={title}
	onclose={() => (open = false)}
	onclick={(e) => e.target === dialog && (open = false)}
>
	<div class="inner">
		<div class="grip" aria-hidden="true"></div>
		<h2>{title}</h2>
		{@render children()}
	</div>
</dialog>

<style>
	.sheet {
		width: 100%;
		max-width: 560px;
		margin: auto auto 0;
		padding: 0;
		border: 0;
		border-radius: 20px 20px 0 0;
		background: var(--surface);
		color: var(--text);
		max-height: 90dvh;
	}
	.sheet[open] {
		animation: up 0.22s ease-out;
	}
	.sheet::backdrop {
		background: rgb(0 0 0 / 0.4);
	}
	.inner {
		padding: 10px 16px calc(20px + var(--safe-b));
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.grip {
		width: 40px;
		height: 4px;
		margin: 0 auto 4px;
		border-radius: 4px;
		background: var(--line);
	}
	@keyframes up {
		from {
			transform: translateY(40px);
			opacity: 0.4;
		}
	}
</style>
