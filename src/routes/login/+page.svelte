<script lang="ts">
	import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
	import { onMount } from 'svelte';
	import Logo from '#lib/components/Logo.svelte';
	import { useI18n } from '#lib/i18n.ts';

	const { t } = useI18n();
	let busy = $state(false);
	let error = $state('');
	let supported = $state(true);

	onMount(() => {
		supported = browserSupportsWebAuthn();
	});

	async function signIn() {
		busy = true;
		error = '';
		try {
			const optionsJSON = await fetch('/api/auth/login/options', { method: 'POST' }).then((r) => r.json());
			const response = await startAuthentication({ optionsJSON });
			const res = await fetch('/api/auth/login/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(response)
			});
			if (!res.ok) throw new Error('verify');
			// full load: the layout and service worker pick up the new session
			location.href = '/';
		} catch (e) {
			if ((e as Error)?.name !== 'NotAllowedError') error = t('login.failed');
			busy = false;
		}
	}
</script>

<svelte:head><title>Vintry · {t('login.title')}</title></svelte:head>

<main class="auth">
	<Logo size={88} />
	<h1>Vintry</h1>
	<p class="muted">{t('app.tagline')}</p>
	<div class="actions">
		{#if supported}
			<button class="btn primary block" onclick={signIn} disabled={busy}>{t('login.button')}</button>
		{:else}
			<p class="error">{t('login.unsupported')}</p>
		{/if}
		{#if error}<p class="error" role="alert">{error}</p>{/if}
		<p class="muted small">{t('login.hint')}</p>
	</div>
</main>

<style>
	.auth {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 24px;
		text-align: center;
	}
	.actions {
		width: 100%;
		max-width: 340px;
		margin-top: 32px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
</style>
