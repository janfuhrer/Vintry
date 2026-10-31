<script lang="ts">
	import '#lib/styles/app.css';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import { createI18n, setI18n } from '#lib/i18n.ts';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	const i18n = $derived(createI18n(data.locale));
	setI18n(() => i18n);
	const t = $derived(i18n.t);

	const path = $derived(page.url.pathname);
	const showNav = $derived(
		!!data.user && !path.startsWith('/login') && !path.startsWith('/invite') && !path.endsWith('/edit')
	);
</script>

{@render children()}

{#if showNav}
	<nav class="bottom-nav" aria-label="Main">
		<a
			href="/"
			class:active={path === '/' || path.startsWith('/wine')}
			aria-current={path === '/' ? 'page' : undefined}
		>
			<Icon name="cellar" />
			<span>{t('nav.cellar')}</span>
		</a>
		<a href="/add" class="add" aria-label={t('nav.add')} aria-current={path === '/add' ? 'page' : undefined}>
			<span class="add-circle"><Icon name="plus" size={26} /></span>
		</a>
		<a
			href="/history"
			class:active={path === '/history'}
			aria-current={path === '/history' ? 'page' : undefined}
		>
			<Icon name="history" />
			<span>{t('nav.history')}</span>
		</a>
	</nav>
{/if}

<style>
	.bottom-nav {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 20;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		height: calc(var(--nav-h) + var(--safe-b));
		padding: 0 24px var(--safe-b);
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-top: 1px solid var(--line);
	}

	.bottom-nav a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--muted);
	}

	.bottom-nav a.active {
		color: var(--accent);
	}

	.add-circle {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		margin-top: -20px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-ink);
		box-shadow: 0 6px 20px color-mix(in srgb, var(--accent) 40%, transparent);
	}
</style>
