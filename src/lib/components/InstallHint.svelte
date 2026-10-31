<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';
	import { useI18n } from '#lib/i18n.ts';

	const { t } = useI18n();

	// Chrome/Android hands out an install prompt; iOS only installs via Share → Add to Home Screen
	type InstallPrompt = Event & { prompt: () => Promise<void> };
	let mode = $state<'ios' | 'prompt' | null>(null);
	let deferred: InstallPrompt | null = null;

	const KEY = 'vintry.installHint';
	const dismissed = () => {
		try {
			return localStorage.getItem(KEY) === 'dismissed';
		} catch {
			return true; // no storage: don't nag on every visit
		}
	};

	onMount(() => {
		const standalone =
			matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true;
		if (standalone || dismissed()) return;
		if (/iPhone|iPad|iPod/.test(navigator.userAgent)) mode = 'ios';
		const onPrompt = (e: Event) => {
			e.preventDefault();
			deferred = e as InstallPrompt;
			mode = 'prompt';
		};
		addEventListener('beforeinstallprompt', onPrompt);
		return () => removeEventListener('beforeinstallprompt', onPrompt);
	});

	function dismiss() {
		mode = null;
		try {
			localStorage.setItem(KEY, 'dismissed');
		} catch {
			// private mode
		}
	}

	async function install() {
		await deferred?.prompt();
		deferred = null;
		mode = null;
	}
</script>

{#if mode}
	<aside class="hint card" aria-label={t('install.title')}>
		<img src="/logo.svg" alt="" width="40" height="40" />
		<div class="text">
			<strong>{t('install.title')}</strong>
			<span class="small muted">{mode === 'ios' ? t('install.ios') : t('install.android')}</span>
		</div>
		{#if mode === 'prompt'}
			<button class="btn small primary" onclick={install}>{t('install.button')}</button>
		{/if}
		<button class="icon-btn" aria-label={t('common.close')} onclick={dismiss}
			><Icon name="x" size={18} /></button
		>
	</aside>
{/if}

<style>
	.hint {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px;
		margin-bottom: 12px;
	}
	.hint img {
		border-radius: 10px;
		flex: none;
	}
	.text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
</style>
