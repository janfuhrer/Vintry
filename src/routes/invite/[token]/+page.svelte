<script lang="ts">
	import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { t } = useI18n();

	let name = $state('');
	let busy = $state(false);
	let error = $state('');

	async function register(e: SubmitEvent) {
		e.preventDefault();
		if (!browserSupportsWebAuthn()) {
			error = t('login.unsupported');
			return;
		}
		busy = true;
		error = '';
		try {
			const res = await fetch('/api/auth/register/options', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token: page.params.token, name })
			});
			if (!res.ok) throw new Error((await res.json()).error);
			const response = await startRegistration({ optionsJSON: await res.json() });
			const verify = await fetch('/api/auth/register/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(response)
			});
			if (!verify.ok) throw new Error((await verify.json()).error);
			location.href = '/';
		} catch (e) {
			const msg = (e as Error)?.message;
			if (msg === 'invite') error = t('invite.invalid');
			else if ((e as Error)?.name !== 'NotAllowedError') error = t('invite.failed');
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Vintry</title>
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<main class="auth">
	<Logo size={72} />
	{#if !data.valid}
		<h1>{t('invite.title')}</h1>
		<p class="error">{t('invite.invalid')}</p>
		<a class="btn" href="/login">{t('login.title')}</a>
	{:else}
		<h1>{data.forUserName ? t('invite.device', { name: data.forUserName }) : t('invite.title')}</h1>
		<p class="muted explain">{t('invite.explain')}</p>
		<form class="actions" onsubmit={register}>
			{#if !data.forUserName}
				<label class="field">
					{t('invite.name')}
					<input class="input" bind:value={name} required maxlength="60" autocomplete="name" />
				</label>
			{/if}
			<button class="btn primary block" disabled={busy}>
				{data.forUserName ? t('invite.deviceButton') : t('invite.button')}
			</button>
			{#if error}<p class="error" role="alert">{error}</p>{/if}
		</form>
	{/if}
</main>

<style>
	.auth {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 24px;
		text-align: center;
	}
	.explain {
		max-width: 340px;
	}
	.actions {
		width: 100%;
		max-width: 340px;
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		text-align: left;
	}
</style>
