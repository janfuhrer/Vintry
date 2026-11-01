<script lang="ts">
	import BackButton from '#lib/components/BackButton.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import { grapes, grapeSlug, normalize } from '#lib/wine.ts';

	let { data } = $props();
	const i18n = useI18n();
	const { t } = i18n;
	let query = $state('');

	const matches = $derived.by(() => {
		const q = normalize(query);
		return grapes
			.filter((g) => !q || [g.name, ...g.synonyms].some((n) => normalize(n).includes(q)))
			.sort((a, b) => a.name.localeCompare(b.name, i18n.locale));
	});
	const sections = $derived([
		{ key: 'red', title: t('grapes.red'), list: matches.filter((g) => g.color === 'red') },
		{ key: 'white', title: t('grapes.white'), list: matches.filter((g) => g.color === 'white') }
	]);
</script>

<svelte:head><title>Vintry · {t('grapes.title')}</title></svelte:head>

<main class="page stack">
	<header class="head">
		<BackButton fallback="/" />
		<h1>{t('grapes.title')}</h1>
	</header>
	<label class="search">
		<Icon name="search" size={18} />
		<span class="visually-hidden">{t('grapes.search')}</span>
		<input type="search" placeholder={t('grapes.search')} bind:value={query} />
	</label>
	{#each sections as s (s.key)}
		{#if s.list.length}
			<section>
				<h2 class="section-title">{s.title} <span class="muted">{s.list.length}</span></h2>
				<ul class="card list">
					{#each s.list as g (g.name)}
						<li>
							<a href="/grapes/{grapeSlug(g.name)}" class="item">
								<span class="dot swatch-{g.color}" style="background: var(--swatch)"></span>
								<span class="grow">
									<span class="name">{g.name}</span>
									{#if g.synonyms.length}<span class="muted small syn">{g.synonyms.join(', ')}</span>{/if}
								</span>
								<span class="muted small">{g.aroma[i18n.locale].slice(0, 2).join(', ')}</span>
								{#if data.bottles[g.name]}
									<span class="mine"
										><span aria-hidden="true">×{data.bottles[g.name]}</span><span class="visually-hidden"
											>{t('history.count', { n: data.bottles[g.name] })}</span
										></span
									>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</main>

<style>
	.mine {
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		color: var(--accent);
	}
	.head {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.search {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 44px;
		padding: 0 14px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--muted);
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: none;
		outline: none;
		color: var(--text);
		font-size: 1rem;
	}
	.section-title {
		margin: 8px 4px;
		font-size: 0.95rem;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 4px 14px;
	}
	.list li + li {
		border-top: 1px solid var(--line);
	}
	.item {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: 52px;
		padding: 8px 0;
	}
	.grow {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.name {
		font-weight: 600;
	}
	.syn {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
