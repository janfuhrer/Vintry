<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';
	import { LOCALES, useI18n } from '#lib/i18n.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	const names: Record<string, string> = { en: 'English', de: 'Deutsch' };
	const fmt = (d: Date) => new Date(d).toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' });

	let copied = $state('');
	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = text;
			setTimeout(() => (copied = ''), 2000);
		} catch {
			// clipboard blocked: the link is selectable
		}
	}
</script>

<svelte:head><title>Vintry · {t('settings.title')}</title></svelte:head>

{#snippet linkBox(link: string, hint: string)}
	<div class="link-box">
		<input class="input" readonly value={link} onfocus={(e) => e.currentTarget.select()} aria-label="Link" />
		<button type="button" class="btn small primary" onclick={() => copy(link)}>
			<Icon name={copied === link ? 'check' : 'link'} size={16} />{copied === link ? t('common.copied') : t('common.copy')}
		</button>
	</div>
	<p class="muted small">{hint}</p>
{/snippet}

<main class="page stack">
	<header class="head">
		<a class="icon-btn" href="/" aria-label={t('common.back')}><Icon name="back" /></a>
		<h1>{t('settings.title')}</h1>
	</header>

	<section class="card stack">
		<h2>{t('settings.language')}</h2>
		<form method="POST" action="?/locale" use:enhance class="row">
			{#each LOCALES as l (l)}
				<button class="chip" class:active={i18n.locale === l} name="locale" value={l}>{names[l]}</button>
			{/each}
		</form>
	</section>

	<section class="card stack">
		<h2>{t('settings.passkeys')}</h2>
		<ul class="list">
			{#each data.passkeys as p (p.id)}
				<li class="row">
					<Icon name="key" size={20} />
					<div class="grow">
						<div>{p.label ?? t('settings.passkeyUnnamed')}</div>
						<div class="muted small">
							{p.last_used_at ? t('settings.lastUsed', { date: fmt(p.last_used_at) }) : t('settings.never')}
						</div>
					</div>
					{#if data.passkeys.length > 1}
						<form method="POST" action="?/deletePasskey" use:enhance>
							<input type="hidden" name="id" value={p.id} />
							<button class="icon-btn" aria-label={t('common.delete')}><Icon name="trash" size={18} /></button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		{#if form?.keepOne}<p class="error">{t('settings.keepOne')}</p>{/if}
		{#if form?.deviceLink}
			{@render linkBox(form.deviceLink, t('settings.addDeviceHint'))}
		{:else}
			<form method="POST" action="?/addDevice" use:enhance>
				<button class="btn block"><Icon name="plus" size={18} />{t('settings.addDevice')}</button>
			</form>
		{/if}
	</section>

	{#if data.admin}
		<section class="card stack">
			<h2>{t('settings.invite')}</h2>
			{#if form?.inviteLink}
				{@render linkBox(form.inviteLink, t('settings.inviteHint'))}
			{/if}
			<form method="POST" action="?/invite" use:enhance={() => async ({ update }) => update({ reset: true })} class="stack">
				<label class="field">
					{t('settings.inviteNote')}
					<input class="input" name="note" maxlength="100" />
				</label>
				<label class="row small"><input type="checkbox" name="is_admin" />{t('settings.inviteAdmin')}</label>
				<button class="btn primary block">{t('settings.createLink')}</button>
			</form>

			{#if data.admin.invites.length}
				<h2>{t('settings.pending')}</h2>
				<ul class="list">
					{#each data.admin.invites as inv (inv.id)}
						<li class="row">
							<div class="grow">
								<div>{inv.note ?? '–'}{#if inv.is_admin}{' · '}{t('settings.admin')}{/if}</div>
								<div class="muted small">{t('settings.expires', { date: fmt(inv.expires_at) })}</div>
							</div>
							<form method="POST" action="?/revoke" use:enhance>
								<input type="hidden" name="id" value={inv.id} />
								<button class="btn small danger">{t('settings.revoke')}</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}

			<h2>{t('settings.users')}</h2>
			<ul class="list">
				{#each data.admin.users as u (u.id)}
					<li class="row">
						<div class="grow">
							<div>{u.name}{#if u.is_admin}{' · '}<span class="muted">{t('settings.admin')}</span>{/if}</div>
							<div class="muted small">{fmt(u.created_at)} · {u.wines} 🍷</div>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<form method="POST" action="?/signOut">
		<button class="btn block">{t('settings.signOut')}</button>
	</form>
	<p class="muted small center">{t('settings.about')}</p>
</main>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.list li {
		min-height: 48px;
	}
	.list li + li {
		border-top: 1px solid var(--line);
		padding-top: 4px;
	}
	.grow {
		flex: 1;
		min-width: 0;
	}
	.link-box {
		display: flex;
		gap: 8px;
		align-items: center;
	}
	.link-box .input {
		font-size: 0.85rem;
		min-height: 40px;
		padding: 8px 10px;
	}
	.center {
		text-align: center;
	}
</style>
