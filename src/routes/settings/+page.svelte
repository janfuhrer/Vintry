<script lang="ts">
	import BackButton from '#lib/components/BackButton.svelte';
	import { enhance } from '$app/forms';
	import { version } from '$app/env';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import { decodeText, parseCsvRecords } from '#lib/csv.ts';
	import { LOCALES, useI18n } from '#lib/i18n.ts';
	import { mapTable, type ColumnMapping, type ImportRow } from '#lib/import.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	const names: Record<string, string> = { en: 'English', de: 'Deutsch' };
	const fmt = (d: Date) =>
		new Date(d).toLocaleDateString(i18n.locale, { day: 'numeric', month: 'short', year: 'numeric' });

	let renaming = $state<string | null>(null);
	// the choice before saving; consent is asked only when switching to Claude
	let reader = $derived(data.claude?.reader ?? 'local');
	// in UTC, so the server's rendering and the browser's agree
	const build = /^\d+$/.test(version)
		? `${new Date(Number(version)).toISOString().slice(0, 16).replace('T', ' ')} UTC`
		: version;

	// CSV import: parsed in the browser for the preview, validated again on the server
	let preview = $state<{ columns: ColumnMapping[]; rows: ImportRow[] } | null>(null);
	let readError = $state(false);
	async function pickCsv(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		readError = false;
		preview = null;
		if (!file) return;
		try {
			preview = mapTable(parseCsvRecords(decodeText(await file.arrayBuffer())));
		} catch {
			readError = true;
		}
	}
	const hasName = $derived(preview?.columns.some((c) => c.field === 'name') ?? false);
	// the server takes up to ~2 MB per request; say so here instead of failing there
	const payload = $derived(preview ? JSON.stringify(preview.rows) : '');
	const tooBig = $derived(payload.length > 1_800_000);
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
			<Icon name={copied === link ? 'check' : 'link'} size={16} />{copied === link
				? t('common.copied')
				: t('common.copy')}
		</button>
	</div>
	<p class="muted small">{hint}</p>
{/snippet}

<main class="page stack">
	<header class="head">
		<BackButton fallback="/" />
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
		<h2>{t('settings.shortcut')}</h2>
		<p class="muted small">{t('settings.shortcutHint')}</p>
		{@render linkBox(`${page.url.origin}/api/scan`, t('settings.shortcutUrl'))}
		<ol class="steps small">
			<li>{t('settings.shortcut1')}</li>
			<li>{t('settings.shortcut2')}</li>
			<li>{t('settings.shortcut3')}</li>
			<li>
				{t('settings.shortcut4')}
				<ul>
					<li>{t('settings.shortcut4a')}</li>
					<li>{t('settings.shortcut4b')}</li>
					<li>{t('settings.shortcut4c')}</li>
					<li>{t('settings.shortcut4d')}</li>
				</ul>
			</li>
			<li>{t('settings.shortcut5')}</li>
			<li>{t('settings.shortcut6')}</li>
		</ol>
	</section>

	<section class="card stack">
		<h2>{t('settings.barcodes')}</h2>
		<p class="muted small">{t('settings.barcodesHint')}</p>
		<form method="POST" action="?/barcodeLookup" use:enhance class="row">
			<span class="grow small">
				{data.barcodeLookup ? t('settings.barcodesOn') : t('settings.barcodesOff')}
			</span>
			<input type="hidden" name="on" value={data.barcodeLookup ? '0' : '1'} />
			<button class="btn small {data.barcodeLookup ? 'ghost' : 'primary'}">
				{data.barcodeLookup ? t('settings.turnOff') : t('settings.turnOn')}
			</button>
		</form>
	</section>

	<section class="card stack">
		<h2>{t('settings.mcp')}</h2>
		<p class="muted small">{t('settings.mcpHint')}</p>
		{#if form?.token}
			{@const endpoint = `${page.url.origin}/api/mcp`}
			<p class="small"><strong>{t('settings.mcpOnce')}</strong></p>
			<h3 class="small">Claude Code</h3>
			{@render linkBox(
				`claude mcp add --transport http vintry ${endpoint} --header "Authorization: Bearer ${form.token}"`,
				t('settings.mcpCode')
			)}
			<h3 class="small">Claude Desktop</h3>
			<p class="small">
				{t('settings.mcpDesktop')} <a href="/vintry-mcp.mjs" download>vintry-mcp.mjs</a>
			</p>
			{@render linkBox(
				JSON.stringify({
					vintry: {
						command: 'node',
						args: ['/path/to/vintry-mcp.mjs'],
						env: { VINTRY_URL: page.url.origin, VINTRY_TOKEN: form.token }
					}
				}),
				t('settings.mcpDesktopHint')
			)}
		{/if}
		{#if form?.tokenError}<p class="error" role="alert">{t('settings.mcpTooMany')}</p>{/if}
		<form method="POST" action="?/createToken" use:enhance class="row">
			<input
				class="input grow"
				name="label"
				maxlength="60"
				placeholder={t('settings.mcpLabel')}
				aria-label={t('settings.mcpLabel')}
			/>
			<button class="btn small primary">{t('settings.mcpCreate')}</button>
		</form>
		{#if data.tokens.length}
			<ul class="list">
				{#each data.tokens as tk (tk.id)}
					<li class="row">
						<div class="grow">
							<div>{tk.label}</div>
							<div class="muted small">
								{fmt(tk.created_at)} · {tk.last_used_at
									? t('settings.mcpUsed', { date: fmt(tk.last_used_at) })
									: t('settings.mcpNever')}
							</div>
						</div>
						<form method="POST" action="?/revokeToken" use:enhance>
							<input type="hidden" name="id" value={tk.id} />
							<button class="btn small ghost">{t('settings.mcpRevoke')}</button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	{#if data.claude}
		{@const claude = data.claude}
		<section class="card stack">
			<h2>{t('settings.reader')}</h2>
			<form method="POST" action="?/reader" use:enhance class="stack">
				<label class="option">
					<input type="radio" name="reader" value="local" bind:group={reader} />
					<span
						><strong>{t('settings.readerLocal')}</strong><br /><span class="muted small"
							>{t('settings.readerLocalHint')}</span
						></span
					>
				</label>
				<label class="option">
					<input type="radio" name="reader" value="claude" bind:group={reader} />
					<span
						><strong>{t('settings.readerClaude')}</strong><br /><span class="muted small"
							>{t('settings.readerClaudeHint')}</span
						></span
					>
				</label>
				{#if reader === 'claude' && claude.reader !== 'claude'}
					<label class="option consent small">
						<input type="checkbox" name="consent" required />
						<span>{t('settings.readerConsent')}</span>
					</label>
				{/if}
				{#if form?.readerError}<p class="error" role="alert">{t('settings.readerConsentMissing')}</p>{/if}
				{#if reader !== claude.reader}<button class="btn primary">{t('common.save')}</button>{/if}
			</form>
			{#if claude.reader === 'claude'}
				<p class="muted small">
					{t('settings.readerUsage', {
						pct: Math.min(
							100,
							Math.round((100 * claude.allowance.used) / Math.max(1, claude.allowance.limit))
						),
						n: claude.allowance.scansLeft
					})}
				</p>
			{/if}
		</section>
	{/if}

	<section class="card stack">
		<h2>{t('settings.passkeys')}</h2>
		<ul class="list">
			{#each data.passkeys as p (p.id)}
				<li class="row">
					<Icon name="key" size={20} />
					<div class="grow">
						{#if renaming === p.id}
							<form
								method="POST"
								action="?/renamePasskey"
								class="row"
								use:enhance={() =>
									async ({ update }) => {
										await update();
										renaming = null;
									}}
							>
								<input type="hidden" name="id" value={p.id} />
								<!-- svelte-ignore a11y_autofocus -->
								<input
									class="input rename"
									name="label"
									value={p.label ?? ''}
									maxlength="40"
									aria-label={t('settings.rename')}
									autofocus
								/>
								<button class="icon-btn" aria-label={t('common.save')}><Icon name="check" size={18} /></button
								>
							</form>
						{:else}
							<button type="button" class="link-like" onclick={() => (renaming = p.id)}>
								{p.label ?? t('settings.passkeyUnnamed')}
								<Icon name="pen" size={14} label={t('settings.rename')} />
							</button>
						{/if}
						<div class="muted small">
							{p.last_used_at ? t('settings.lastUsed', { date: fmt(p.last_used_at) }) : t('settings.never')}
						</div>
					</div>
					{#if data.passkeys.length > 1}
						<form method="POST" action="?/deletePasskey" use:enhance>
							<input type="hidden" name="id" value={p.id} />
							<button class="icon-btn" aria-label={t('common.delete')}><Icon name="trash" size={18} /></button
							>
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

	<section class="card stack">
		<h2>{t('settings.sessions')}</h2>
		<ul class="list">
			{#each data.sessions as s (s.id)}
				<li class="row">
					<Icon name="device" size={20} />
					<div class="grow">
						<div>
							{s.device ?? t('settings.unknownDevice')}{#if s.current}<span class="sep">·</span><span
									class="muted">{t('settings.thisDevice')}</span
								>{/if}
						</div>
						<div class="muted small">{t('settings.lastSeen', { date: fmt(s.last_seen_at) })}</div>
					</div>
					{#if !s.current}
						<form method="POST" action="?/revokeSession" use:enhance>
							<input type="hidden" name="id" value={s.id} />
							<button class="btn small danger">{t('settings.signOutDevice')}</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
		{#if data.sessions.length > 1}
			<form method="POST" action="?/revokeOtherSessions" use:enhance>
				<button class="btn block">{t('settings.signOutOthers')}</button>
			</form>
		{/if}
	</section>

	{#if data.admin}
		<section class="card stack">
			<h2>{t('settings.invite')}</h2>
			{#if form?.inviteLink}
				{@render linkBox(form.inviteLink, t('settings.inviteHint'))}
			{/if}
			<form
				method="POST"
				action="?/invite"
				use:enhance={() =>
					async ({ update }) =>
						update({ reset: true })}
				class="stack"
			>
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
								<div>
									{inv.note ?? '–'}{#if inv.is_admin}<span class="sep">·</span>{t('settings.admin')}{/if}
								</div>
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
			{#if form?.recoveryLink}
				{@render linkBox(form.recoveryLink, t('settings.deviceLinkForHint', { name: form.recoveryFor }))}
			{/if}
			<ul class="list">
				{#each data.admin.users as u (u.id)}
					<li class="row">
						<div class="grow">
							<div>
								{u.name}{#if u.is_admin}<span class="sep">·</span><span class="muted"
										>{t('settings.admin')}</span
									>{/if}
							</div>
							<div class="muted small">{fmt(u.created_at)} · {u.wines} 🍷</div>
						</div>
						{#if u.id !== data.admin.me}
							<!-- someone lost their phone: a one-time link to add a passkey for them -->
							<form method="POST" action="?/deviceLinkFor" use:enhance>
								<input type="hidden" name="id" value={u.id} />
								<button class="btn small">{t('settings.deviceLinkFor')}</button>
							</form>
						{/if}
						{#if !u.is_admin}
							<form method="POST" action="?/makeAdmin" use:enhance>
								<input type="hidden" name="id" value={u.id} />
								<button class="btn small">{t('settings.makeAdmin')}</button>
							</form>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.locations.length}
		<section class="card stack">
			<h2>{t('settings.locations')}</h2>
			<p class="muted small">{t('settings.locationsHint')}</p>
			<ul class="list">
				{#each data.locations as l (l.name)}
					<li class="row">
						<div class="grow">
							{#if renaming === `loc:${l.name}`}
								<form
									method="POST"
									action="?/renameLocation"
									class="row"
									use:enhance={({ formData, cancel }) => {
										// an empty name takes the place off every wine there
										const to = String(formData.get('to') ?? '').trim();
										if (!to && !confirm(t('settings.locationClear', { name: l.name }))) return cancel();
										return async ({ update }) => {
											await update();
											renaming = null;
										};
									}}
								>
									<input type="hidden" name="from" value={l.name} />
									<!-- svelte-ignore a11y_autofocus -->
									<input
										class="input rename"
										name="to"
										value={l.name}
										maxlength="100"
										aria-label={t('settings.rename')}
										autofocus
									/>
									<button class="icon-btn" aria-label={t('common.save')}
										><Icon name="check" size={18} /></button
									>
								</form>
							{:else}
								<button type="button" class="link-like" onclick={() => (renaming = `loc:${l.name}`)}>
									{l.name}
									<Icon name="pen" size={14} label={t('settings.rename')} />
								</button>
							{/if}
							<div class="muted small">
								{l.bottles === 1 ? t('cellar.bottle') : t('history.count', { n: l.bottles })}
							</div>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="card stack">
		<h2>{t('settings.data')}</h2>
		<div class="downloads">
			<a class="btn small" href="/export/wines.csv" download data-sveltekit-reload
				>{t('settings.exportWines')}</a
			>
			<a class="btn small" href="/export/drinks.csv" download data-sveltekit-reload
				>{t('settings.exportDrinks')}</a
			>
			<a class="btn small" href="/export/vintry.json" download data-sveltekit-reload
				>{t('settings.exportJson')}</a
			>
			<a class="btn small" href="/export/photos.zip" download data-sveltekit-reload
				>{t('settings.exportPhotos')}</a
			>
		</div>
		<p class="muted small">{t('settings.exportHint')}</p>
	</section>

	<section class="card stack">
		<h2>{t('import.title')}</h2>
		<p class="muted small">{t('import.hint')}</p>
		{#if form?.imported !== undefined}
			<p class="success" role="status">
				{form.imported === 1 ? t('import.doneOne') : t('import.done', { n: form.imported })}
				{#if form.restocked}{t('import.restocked', { n: form.restocked })}{/if}
				{#if form.skipped}{t('import.skipped', { n: form.skipped })}{/if}
			</p>
			{#if form.rejectedCount}
				<p class="error">
					{t('import.rejected', {
						rows: form.rejected.join(', ') + (form.rejectedCount > form.rejected.length ? ' …' : '')
					})}
				</p>
			{/if}
		{/if}
		{#if form?.importError}
			<p class="error" role="alert">
				{form.importError === 'tooMany'
					? t('import.tooMany')
					: form.importError === 'empty'
						? t('import.empty')
						: t('import.error')}
			</p>
		{/if}
		{#if readError}<p class="error" role="alert">{t('import.error')}</p>{/if}
		<label class="btn small">
			{t('import.choose')}
			<input class="visually-hidden" type="file" accept=".csv,text/csv,text/plain" onchange={pickCsv} />
		</label>
		{#if preview}
			{#if !hasName}
				<p class="error">{t('import.noName')}</p>
			{:else}
				<p>
					<strong
						>{preview.rows.length === 1
							? t('import.foundOne')
							: t('import.found', { n: preview.rows.length })}</strong
					>
				</p>
				<div class="small">
					<span class="muted">{t('import.columns')}:</span>
					{#each preview.columns as c, i (i)}
						<span class="chip import-col" class:ignored={!c.field}>
							{c.header}{#if !c.field}<span class="sep">·</span>{t('import.ignored')}{/if}
						</span>
					{/each}
				</div>
				<ul class="list small">
					{#each preview.rows.slice(0, 5) as r, i (i)}
						<li>
							{r.name}{#if r.vintage}<span class="sep">·</span>{r.vintage}{/if}{#if r.producer}<span
									class="sep">·</span
								><span class="muted">{r.producer}</span>{/if}
						</li>
					{/each}
					{#if preview.rows.length > 5}<li class="muted">…</li>{/if}
				</ul>
				<form
					method="POST"
					action="?/import"
					use:enhance={() =>
						async ({ update }) => {
							await update();
							preview = null;
						}}
				>
					<input type="hidden" name="rows" value={payload} />
					<label class="row small">
						<input type="checkbox" name="include_owned" />
						{t('import.includeOwned')}
					</label>
					{#if tooBig}<p class="error">{t('import.tooBig')}</p>{/if}
					<button class="btn primary block" disabled={!preview.rows.length || tooBig}>
						{preview.rows.length === 1
							? t('import.buttonOne')
							: t('import.button', { n: preview.rows.length })}
					</button>
				</form>
			{/if}
		{/if}
	</section>

	<form method="POST" action="?/signOut">
		<button class="btn block">{t('settings.signOut')}</button>
	</form>
	<details class="card danger-zone">
		<summary>{t('settings.deleteAccount')}</summary>
		<form method="POST" action="?/deleteAccount" class="stack" use:enhance>
			<p class="muted small">{t('settings.deleteAccountHint')}</p>
			<input class="input" name="confirm" autocomplete="off" aria-label={t('invite.name')} />
			{#if form?.deleteAccount === 'confirm'}<p class="error">{t('settings.deleteAccountWrongName')}</p>{/if}
			{#if form?.deleteAccount === 'lastAdmin'}<p class="error">
					{t('settings.deleteAccountLastAdmin')}
				</p>{/if}
			<button class="btn danger block">{t('settings.deleteAccountConfirm')}</button>
		</form>
	</details>

	<p class="muted small center">
		{t('settings.about')}<br />
		<!-- which build this device runs: the service worker can keep an older one until reload -->
		{t('settings.build', { date: build })}
	</p>
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
	.link-like {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		text-align: left;
	}
	.link-like :global(svg) {
		color: var(--muted);
	}
	.rename {
		min-height: 40px;
		padding: 8px 10px;
	}
	.import-col {
		margin: 2px;
	}
	.import-col.ignored {
		color: var(--muted);
		text-decoration: line-through;
	}
	.success {
		color: var(--ready);
		margin: 0;
	}
	.downloads {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.danger-zone summary {
		cursor: pointer;
		color: var(--past);
		font-weight: 600;
	}
	.danger-zone form {
		margin-top: 12px;
	}
	.option {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		cursor: pointer;
	}
	.option input {
		margin-top: 3px;
		accent-color: var(--accent);
	}
	.consent {
		padding: 10px 12px;
		border-radius: var(--radius-s);
		background: var(--surface-2);
	}
	.steps {
		margin: 0;
		padding-left: 1.3em;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.steps ul {
		margin: 4px 0 0;
		padding-left: 1.1em;
	}
</style>
