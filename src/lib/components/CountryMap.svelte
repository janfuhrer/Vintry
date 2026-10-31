<script lang="ts">
	import { useI18n } from '#lib/i18n.ts';
	import type { CountryMap } from '#lib/server/map.ts';

	let { map, label, links = false }: { map: CountryMap; label: string; links?: boolean } = $props();

	// room around the outline for the dots at its edge
	const PAD = 14;
	const box = $derived(`${-PAD} ${-PAD} ${map.w + 2 * PAD} ${map.h + 2 * PAD}`);
	const { t } = useI18n();
	type Point = CountryMap['points'][number];
	const kind = (p: Point) => (p.here ? 'here' : p.bottles ? 'has' : p.bottles === 0 ? 'known' : '');
	// what the dot's colour says, in words
	const describe = (p: Point) =>
		p.bottles
			? t('map.withBottles', { name: p.name, n: p.bottles })
			: p.bottles === 0
				? t('map.drunkBefore', { name: p.name })
				: p.name;
</script>

{#snippet dot(p: CountryMap['points'][number])}
	{#if p.here}<circle class="halo" cx={p.x} cy={p.y} r="16" />{/if}
	<circle class="pt {kind(p)}" cx={p.x} cy={p.y} r={p.here ? 7 : p.bottles ? 5.5 : 4} />
{/snippet}

{#if links}
	<svg class="map" viewBox={box} role="group" aria-label={label}>
		<path class="land" d={map.d} />
		{#each map.points as p (p.slug)}
			<a href="/regions/{p.slug}" aria-label={describe(p)}>
				<title>{describe(p)}</title>
				<!-- a finger is bigger than the dot -->
				<circle class="hit" cx={p.x} cy={p.y} r="11" />
				{@render dot(p)}
			</a>
		{/each}
	</svg>
{:else}
	<svg class="map" viewBox={box} role="img" aria-label={label}>
		<path class="land" d={map.d} />
		{#each map.points as p (p.slug)}
			{@render dot(p)}
		{/each}
	</svg>
{/if}

<style>
	.map {
		display: block;
		width: 100%;
		height: auto;
		max-height: 300px;
	}
	.land {
		fill: var(--surface-2);
		stroke: var(--muted);
		stroke-width: 1;
		stroke-linejoin: round;
		vector-effect: non-scaling-stroke;
	}
	.pt {
		fill: var(--surface);
		stroke: var(--muted);
		stroke-width: 1.5;
	}
	.pt.known {
		stroke: var(--accent);
	}
	.pt.has,
	.pt.here {
		fill: var(--accent);
		stroke: var(--surface);
	}
	.pt.here {
		stroke-width: 2.5;
	}
	.halo {
		fill: var(--accent);
		opacity: 0.2;
	}
	.hit {
		fill: transparent;
	}
	a:focus-visible .pt {
		stroke: var(--text);
		stroke-width: 3;
	}
</style>
