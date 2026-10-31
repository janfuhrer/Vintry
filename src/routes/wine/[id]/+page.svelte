<script lang="ts">
	import { enhance } from '$app/forms';
	import Dots from '#lib/components/Dots.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Sheet from '#lib/components/Sheet.svelte';
	import Stars from '#lib/components/Stars.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Thumb from '#lib/components/Thumb.svelte';
	import WindowBar from '#lib/components/WindowBar.svelte';
	import { localISODate } from '#lib/dates.ts';
	import { useI18n } from '#lib/i18n.ts';
	import { aromas, countryName, findGrape, flag, grapeSlug, windowStatus } from '#lib/wine.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const i18n = useI18n();
	const { t } = i18n;

	const wine = $derived(data.wine);
	const year = new Date().getFullYear();
	const age = $derived(wine.vintage ? year - wine.vintage : null);
	const status = $derived(windowStatus(wine.drink_from, wine.drink_to));
	const aromaWords = $derived(aromas(wine.grapes, i18n.locale));
	const hasTaste = $derived([wine.body, wine.acidity, wine.tannin, wine.sweetness].some((x) => x !== null));

	let drinkOpen = $state(false);
	// the drink entry being edited; its sheet is open while set
	let editing = $state<(typeof data.drinks)[number] | null>(null);
	let editRating = $state<number | null>(null);
	let editOpen = $state(false);
	function openEdit(d: (typeof data.drinks)[number]) {
		editing = d;
		editRating = d.rating;
		editOpen = true;
	}
	let drinkRating = $state<number | null>(null);
	let rateForm: HTMLFormElement | undefined = $state();
	// optimistic: set on tap, re-synced from the server after the action
	let ratingValue = $derived<number | null>(wine.rating);

	const today = () => localISODate();
	const fmtDate = (d: string) =>
		new Date(`${d}T12:00:00`).toLocaleDateString(i18n.locale, {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	const money = (n: number) =>
		n.toLocaleString(i18n.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

	function rate(v: number | null) {
		ratingValue = v;
		queueMicrotask(() => rateForm?.requestSubmit());
	}
</script>

<svelte:head><title>Vintry · {wine.name}</title></svelte:head>

<main class="page wine-page">
	<header class="hero" class:has-photo={wine.has_photo}>
		{#if wine.has_photo}
			<img class="hero-img" src="/photo/{wine.id}?v={wine.photo_version ?? 0}" alt="" />
		{/if}
		<div class="hero-bar">
			<a class="icon-btn glass" href="/" aria-label={t('common.back')}><Icon name="back" /></a>
			<a class="icon-btn glass" href="/wine/{wine.id}/edit" aria-label={t('common.edit')}
				><Icon name="pen" size={20} /></a
			>
		</div>
	</header>

	<section class="title">
		{#if !wine.has_photo}<Thumb
				id={wine.id}
				color={wine.color}
				hasPhoto={false}
				version={null}
				size={64}
			/>{/if}
		<div>
			<h1>{wine.name}</h1>
			{#if wine.producer}<p class="muted">{wine.producer}</p>{/if}
		</div>
	</section>

	<div class="chips">
		<span class="chip"
			><span class="dot swatch-{wine.color}" style="background: var(--swatch)"></span>{t(
				`color.${wine.color}`
			)}</span
		>
		{#if wine.vintage}
			<span class="chip"
				>{wine.vintage}{#if age !== null && age > 0}<span class="sep">·</span>{age === 1
						? t('wine.year')
						: t('wine.years', { n: age })}{/if}</span
			>
		{/if}
		{#if wine.country || wine.region}
			<span class="chip">{flag(wine.country)} {wine.region || countryName(wine.country, i18n.locale)}</span>
		{/if}
		{#each wine.grapes as g (g)}
			{#if findGrape(g)}
				<a class="chip link-chip" href="/grapes/{grapeSlug(g)}">{g}</a>
			{:else}
				<span class="chip">{g}</span>
			{/if}
		{/each}
		{#if wine.alcohol}<span class="chip">{wine.alcohol}%</span>{/if}
		{#if wine.size_ml && wine.size_ml !== 750}<span class="chip"
				>{wine.size_ml >= 1000 ? `${wine.size_ml / 1000} l` : `${wine.size_ml / 10} cl`}</span
			>{/if}
	</div>

	<section class="card stack">
		<div class="row">
			<div>
				<h2>{t('wine.inCellar')}</h2>
				{#if wine.location}<p class="muted small">{wine.location}</p>{/if}
			</div>
			<span class="spacer"></span>
			<form method="POST" action="?/quantity" use:enhance class="stepper">
				<button class="icon-btn" name="delta" value="-1" aria-label="−1" disabled={wine.quantity === 0}
					><Icon name="minus" /></button
				>
				<span class="qty" aria-live="polite">{wine.quantity}</span>
				<button class="icon-btn" name="delta" value="1" aria-label="+1"><Icon name="plus" /></button>
			</form>
		</div>
		<button
			class="btn primary block"
			disabled={wine.quantity === 0}
			onclick={() => ((drinkRating = null), (drinkOpen = true))}
		>
			<Icon name="glass" size={20} />{t('wine.drinkOne')}
		</button>
	</section>

	{#if wine.drink_from || wine.drink_to}
		<section class="card stack">
			<div class="row">
				<h2>{t('wine.window')}</h2>
				<span class="spacer"></span>
				<StatusPill {status} pill />
			</div>
			<WindowBar from={wine.drink_from ?? wine.drink_to!} to={wine.drink_to ?? wine.drink_from!} />
		</section>
	{/if}

	{#if hasTaste || aromaWords.length}
		<section class="card">
			{#if hasTaste}
				<Dots label={t('taste.body')} value={wine.body} />
				<Dots label={t('taste.acidity')} value={wine.acidity} />
				{#if wine.color === 'red'}<Dots label={t('taste.tannin')} value={wine.tannin} />{/if}
				<Dots label={t('taste.sweetness')} value={wine.sweetness} />
			{/if}
			{#if aromaWords.length}
				<p class="aromas">
					<span class="muted small">{t('taste.aroma')}</span><br />{aromaWords.join(' · ')}
				</p>
			{/if}
		</section>
	{/if}

	<section class="card row">
		<h2>{t('wine.rating')}</h2>
		<span class="spacer"></span>
		<form method="POST" action="?/rate" use:enhance bind:this={rateForm}>
			<input type="hidden" name="rating" value={ratingValue ?? ''} />
			<Stars value={ratingValue} onchange={rate} label={t('wine.rating')} />
		</form>
	</section>

	{#if wine.notes || wine.purchased_on || wine.purchased_at || wine.price || wine.gifted_by}
		<section class="card stack">
			<h2>{t('form.private')}</h2>
			<dl class="facts small">
				{#if wine.purchased_on}<dt>{t('form.purchasedOn')}</dt>
					<dd>{fmtDate(wine.purchased_on)}</dd>{/if}
				{#if wine.purchased_at}<dt>{t('form.purchasedAt')}</dt>
					<dd>{wine.purchased_at}</dd>{/if}
				{#if wine.price}<dt>{t('form.price')}</dt>
					<dd>{money(wine.price)}</dd>{/if}
				{#if wine.gifted_by}<dt>{t('form.giftedBy')}</dt>
					<dd>{wine.gifted_by}</dd>{/if}
			</dl>
			{#if wine.notes}<p class="notes">{wine.notes}</p>{/if}
		</section>
	{/if}

	<section class="card stack">
		<h2>{t('wine.history')}</h2>
		{#if data.drinks.length === 0}
			<p class="muted small">{t('wine.noHistory')}</p>
		{:else}
			<ul class="drinks">
				{#each data.drinks as d (d.id)}
					<li>
						<button type="button" class="drink-entry" data-drink={d.id} onclick={() => openEdit(d)}>
							<span class="row">
								<span>{fmtDate(d.drunk_on)}</span>
								<Stars value={d.rating} size={14} />
								<span class="spacer"></span>
								<Icon name="pen" size={14} label={t('common.edit')} />
							</span>
							{#if d.note}<span class="muted small note">{d.note}</span>{/if}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<a class="btn block" href="/add?from={wine.id}"><Icon name="plus" size={18} />{t('wine.buyAgain')}</a>

	<form
		method="POST"
		action="?/delete"
		use:enhance={({ cancel }) => {
			if (!confirm(t('wine.deleteConfirm'))) cancel();
		}}
	>
		<button class="btn danger block"><Icon name="trash" size={18} />{t('common.delete')}</button>
	</form>
</main>

<Sheet bind:open={drinkOpen} title={t('drink.title')}>
	<form
		method="POST"
		action="?/drink"
		class="stack"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				drinkOpen = false;
			}}
	>
		<label class="field">
			{t('drink.date')}
			<input class="input" type="date" name="drunk_on" value={today()} max={today()} />
		</label>
		<div class="field">
			<span>{t('drink.rating')}</span>
			<Stars value={drinkRating} onchange={(v) => (drinkRating = v)} size={32} label={t('drink.rating')} />
			<input type="hidden" name="rating" value={drinkRating ?? ''} />
		</div>
		<label class="field">
			{t('drink.note')}
			<textarea class="input" name="note" maxlength="2000" placeholder={t('drink.notePlaceholder')}
			></textarea>
		</label>
		<button class="btn primary block">{t('drink.button')}</button>
	</form>
</Sheet>

<Sheet bind:open={editOpen} title={t('drink.edit')}>
	{#if editing}
		<form
			method="POST"
			action="?/editDrink"
			class="stack"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					editOpen = false;
				}}
		>
			<input type="hidden" name="id" value={editing.id} />
			<label class="field">
				{t('drink.date')}
				<input class="input" type="date" name="drunk_on" value={editing.drunk_on} max={today()} required />
			</label>
			<div class="field">
				<span>{t('drink.rating')}</span>
				<Stars value={editRating} onchange={(v) => (editRating = v)} size={32} label={t('drink.rating')} />
				<input type="hidden" name="rating" value={editRating ?? ''} />
			</div>
			<label class="field">
				{t('drink.note')}
				<textarea class="input" name="note" maxlength="2000">{editing.note ?? ''}</textarea>
			</label>
			<button class="btn primary block">{t('common.save')}</button>
		</form>
		<form
			method="POST"
			action="?/deleteDrink"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					editOpen = false;
				}}
		>
			<input type="hidden" name="id" value={editing.id} />
			<button class="btn danger block"><Icon name="trash" size={18} />{t('drink.delete')}</button>
		</form>
	{/if}
</Sheet>

<style>
	.wine-page {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.hero {
		position: relative;
		margin: calc(-16px - var(--safe-t)) -16px 0;
		min-height: calc(56px + var(--safe-t));
	}
	.hero.has-photo {
		aspect-ratio: 4 / 3;
		max-height: 60vh;
		background: var(--surface-2);
	}
	.hero-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.hero-bar {
		position: absolute;
		inset: calc(8px + var(--safe-t)) 8px auto;
		display: flex;
		justify-content: space-between;
	}
	.glass {
		background: color-mix(in srgb, var(--bg) 70%, transparent);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
	.title {
		display: flex;
		gap: 14px;
		align-items: center;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.link-chip {
		text-decoration: underline;
		text-decoration-color: var(--line);
		text-underline-offset: 3px;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.stepper .icon-btn {
		background: var(--surface-2);
	}
	.stepper .icon-btn:disabled {
		opacity: 0.4;
	}
	.qty {
		min-width: 40px;
		text-align: center;
		font-size: 1.4rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.aromas {
		margin: 12px 0 0;
	}
	.facts {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 6px 16px;
		margin: 0;
	}
	.facts dt {
		color: var(--muted);
	}
	.facts dd {
		margin: 0;
	}
	.notes {
		margin: 0;
		white-space: pre-wrap;
	}
	.drinks {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.drinks li + li {
		border-top: 1px solid var(--line);
		padding-top: 8px;
	}
	.note {
		margin: 2px 0 0;
		white-space: pre-wrap;
	}
	.drink-entry {
		display: flex;
		flex-direction: column;
		gap: 2px;
		width: 100%;
		padding: 4px 0;
		border: 0;
		background: none;
		color: inherit;
		text-align: left;
	}
	.drink-entry :global(svg) {
		color: var(--muted);
	}
	.small-icon {
		width: 32px;
		height: 32px;
		color: var(--muted);
	}
</style>
