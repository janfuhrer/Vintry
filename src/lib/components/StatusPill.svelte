<script lang="ts">
	import { useI18n } from '#lib/i18n.ts';
	import type { WineStatus } from '#lib/wine.ts';

	let { status, pill = false }: { status: WineStatus; pill?: boolean } = $props();
	const { t } = useI18n();
</script>

<span class="status status-{status}" class:pill>
	<span class="dot"></span>{t(`status.${status}`)}
</span>

<style>
	.status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--status);
	}
	.status-unknown,
	.status-finished {
		color: var(--muted);
	}
	.dot {
		background: var(--status);
	}
	.pill {
		padding: 4px 10px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--status) 14%, transparent);
	}
</style>
