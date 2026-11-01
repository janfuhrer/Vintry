<script lang="ts" module>
	import type { Color } from '#lib/wine.ts';

	export interface WineFormValues {
		name: string;
		producer: string;
		vintage: string;
		color: Color;
		country: string;
		region: string;
		grapes: string[];
		alcohol: string;
		quantity: number;
		size_ml: string;
		location: string;
		drink_from: string;
		drink_to: string;
		body: number | null;
		acidity: number | null;
		tannin: number | null;
		sweetness: number | null;
		purchased_on: string;
		purchased_at: string;
		price: string;
		gifted_by: string;
		notes: string;
		ocr_text: string;
		wishlist: boolean;
		barcode: string;
	}

	export function emptyValues(): WineFormValues {
		return {
			name: '',
			producer: '',
			vintage: '',
			color: 'red',
			country: '',
			region: '',
			grapes: [],
			alcohol: '',
			quantity: 1,
			size_ml: '750',
			location: '',
			drink_from: '',
			drink_to: '',
			body: null,
			acidity: null,
			tannin: null,
			sweetness: null,
			purchased_on: '',
			purchased_at: '',
			price: '',
			gifted_by: '',
			notes: '',
			ocr_text: '',
			barcode: '',
			wishlist: false
		};
	}

	/** Server row (or anything wine-shaped) → form strings */
	export function toValues(wine: object): WineFormValues {
		const v = emptyValues();
		const w = wine as Record<string, unknown>;
		for (const key of Object.keys(v) as (keyof WineFormValues)[]) {
			const x = w[key];
			if (x === null || x === undefined) continue;
			const target = v as unknown as Record<string, unknown>;
			if (key === 'grapes') v.grapes = [...(x as string[])];
			else if (key === 'wishlist') v.wishlist = x === true;
			else if (['body', 'acidity', 'tannin', 'sweetness', 'quantity'].includes(key)) target[key] = Number(x);
			else target[key] = String(x);
		}
		return v;
	}
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Dots from './Dots.svelte';
	import Icon from './Icon.svelte';
	import { countries } from '#lib/data/countries.ts';
	import { goto } from '$app/navigation';
	import { canGoBack } from '#lib/nav.ts';
	import { preparePhoto, resizeImage } from '#lib/image.ts';
	import { useI18n } from '#lib/i18n.ts';
	import {
		COLORS,
		canonicalGrape,
		countryName,
		findRegion,
		flag,
		grapes as grapeTable,
		regions,
		suggestTaste,
		type Basis,
		suggestWindow
	} from '#lib/wine.ts';
	import Suggest, { type SuggestOption } from './Suggest.svelte';

	type Photo = { image: Blob; thumb: Blob };

	let {
		initial,
		scanned = [],
		photo = $bindable(null),
		existingPhoto = null,
		back = $bindable(null),
		existingBack = null,
		suggestions = { locations: [], shops: [], givers: [] },
		errors = {},
		submitLabel,
		action = '',
		bottles = 0,
		afterSave = 'replace',
		onphotochange
	}: {
		initial: WineFormValues;
		/** Fields filled in from the label, marked for review */
		scanned?: string[];
		photo?: Photo | null;
		existingPhoto?: string | null;
		/** The back label, 1280 px; no thumbnail of its own */
		back?: Blob | null;
		existingBack?: string | null;
		/** Earlier values for the free-text fields */
		suggestions?: { locations: string[]; shops: string[]; givers: string[] };
		errors?: Record<string, string>;
		submitLabel: string;
		action?: string;
		/** Bottles the wine has now, when editing: moving it to the wishlist takes them out */
		bottles?: number;
		/**
		 * replace: the saved wine takes this form's place in the history (adding);
		 * back: return to the page the form was opened from, the wine (editing)
		 */
		afterSave?: 'replace' | 'back';
		/** The front photo was replaced (the file as picked) or removed (null) */
		onphotochange?: (file: Blob | null, image: Blob | null) => void;
	} = $props();

	const i18n = useI18n();
	const { t } = i18n;

	let v = $state(untrack(() => structuredClone($state.snapshot(initial)) as WineFormValues));

	/**
	 * Fills in what a second scan (the back label) found, but only fields still at their
	 * default and not already scanned: nothing read from the front or typed here is replaced.
	 * Returns the fields it filled, for marking them.
	 */
	/** The form as it is now, typed changes included */
	export function snapshot(): WineFormValues {
		return $state.snapshot(v) as WineFormValues;
	}

	/** Puts values back, e.g. empties the fields a source filled when the user undoes it */
	export function setFields(values: Partial<WineFormValues>) {
		const target = v as unknown as Record<string, unknown>;
		for (const [key, x] of Object.entries(values)) target[key] = Array.isArray(x) ? [...x] : x;
	}

	export function fillEmpty(found: Partial<WineFormValues>): string[] {
		const blank = emptyValues() as unknown as Record<string, unknown>;
		const target = v as unknown as Record<string, unknown>;
		const filled: string[] = [];
		for (const [key, x] of Object.entries(found)) {
			if (key === 'ocr_text') {
				v.ocr_text = `${v.ocr_text}\n${x}`.trim().slice(0, 5000);
				continue;
			}
			if (scanned.includes(key) || JSON.stringify(target[key]) !== JSON.stringify(blank[key])) continue;
			target[key] = Array.isArray(x) ? [...x] : x;
			filled.push(key);
		}
		return filled;
	}
	// changed by hand in this form: from then on the suggestions leave them alone
	let windowByHand = $state(false);
	let tasteByHand = $state(false);
	let removePhoto = $state(false);
	let removeBack = $state(false);
	let saving = $state(false);
	let grapeDraft = $state('');
	let tasteOpen = $state(false);
	let privateOpen = $state(
		untrack(() => !!(initial.notes || initial.purchased_on || initial.price || initial.gifted_by))
	);

	const year = new Date().getFullYear();
	const STANDARD_SIZES = ['375', '500', '750', '1000', '1500', '3000'];
	// a scanned or stored odd size stays selectable instead of being dropped on save
	const sizes = $derived(
		v.size_ml && !STANDARD_SIZES.includes(v.size_ml)
			? [...STANDARD_SIZES, v.size_ml].sort((a, b) => Number(a) - Number(b))
			: STANDARD_SIZES
	);

	const countryOptions = $derived(
		countries
			.map((c) => ({ code: c.code, label: countryName(c.code, i18n.locale) }))
			.sort((a, b) => a.label.localeCompare(b.label, i18n.locale))
	);
	// the regions of the chosen country, or all of them with their flag
	const regionOptions = $derived<SuggestOption[]>(
		regions
			.filter((r) => !v.country || r.country === v.country)
			.map((r) => ({ value: r.name, also: r.synonyms, hint: v.country ? undefined : flag(r.country) }))
			.sort((a, b) => a.value.localeCompare(b.value, i18n.locale))
	);
	const grapeOptions = $derived<SuggestOption[]>(
		grapeTable
			.filter((g) => !v.grapes.includes(g.name))
			.map((g) => ({ value: g.name, also: g.synonyms }))
			.sort((a, b) => a.value.localeCompare(b.value, i18n.locale))
	);
	// before anything is typed: what the region usually grows
	const typicalGrapes = $derived<SuggestOption[]>(
		(findRegion(v.region)?.grapes ?? []).filter((g) => !v.grapes.includes(g)).map((g) => ({ value: g }))
	);

	// Window and taste follow the wine's details. Whatever is still the suggestion for the
	// details as they were is replaced by the one for the details as they are now, also when
	// editing a saved wine (adding the vintage later). A window from elsewhere, e.g. Claude or
	// typed in an earlier edit, moves with a corrected vintage. Changes by hand stay.
	const basis = (): Basis => ({
		vintage: Number(v.vintage) || null,
		color: v.color,
		name: v.name,
		// the label's own words count: "Riserva" is often printed there but not in the name
		text: v.ocr_text,
		country: v.country,
		region: v.region,
		grapes: [...v.grapes],
		price: Number(String(v.price).replace(',', '.')) || null
	});
	const windowText = (w: { from: number; to: number } | null) =>
		w ? [String(w.from), String(w.to)] : ['', ''];
	type Levels = Record<'body' | 'acidity' | 'tannin' | 'sweetness', number | null>;
	const sameTaste = (a: Levels, b: Levels) =>
		a.body === b.body && a.acidity === b.acidity && a.tannin === b.tannin && a.sweetness === b.sweetness;
	let before: Basis | null = null;
	$effect(() => {
		const now = basis();
		untrack(() => {
			const was = before ?? now;
			before = now;
			if (!windowByHand) {
				const [from, to] = [v.drink_from, v.drink_to];
				const [oldFrom, oldTo] = windowText(suggestWindow(was));
				const empty = !from && !to;
				if (empty || (from === oldFrom && to === oldTo)) {
					[v.drink_from, v.drink_to] = windowText(suggestWindow(now));
				} else if (was.vintage && now.vintage && was.vintage !== now.vintage && from && to) {
					const shift = now.vintage - was.vintage;
					[v.drink_from, v.drink_to] = [String(Number(from) + shift), String(Number(to) + shift)];
				}
			}
			if (!tasteByHand) {
				const current = { body: v.body, acidity: v.acidity, tannin: v.tannin, sweetness: v.sweetness };
				const blank = Object.values(current).every((x) => x === null);
				if (blank || sameTaste(current, suggestTaste(was))) {
					const next = suggestTaste(now);
					[v.body, v.acidity, v.tannin, v.sweetness] = [next.body, next.acidity, next.tannin, next.sweetness];
				}
			}
		});
	});
	// "suggested" next to the values while they are what the details give
	const suggested = $derived.by(() => {
		const b = basis();
		const [from, to] = windowText(suggestWindow(b));
		const t2 = suggestTaste(b);
		return (
			(v.drink_from !== '' || v.body !== null) &&
			v.drink_from === from &&
			v.drink_to === to &&
			sameTaste({ body: v.body, acidity: v.acidity, tannin: v.tannin, sweetness: v.sweetness }, t2)
		);
	});

	// a known region implies its country
	function onRegion() {
		const r = findRegion(v.region);
		if (r) v.country = r.country;
	}

	function addGrape() {
		const g = canonicalGrape(grapeDraft);
		if (g && !v.grapes.includes(g)) v.grapes.push(g);
		grapeDraft = '';
	}

	function grapeKey(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			addGrape();
		} else if (e.key === 'Backspace' && !grapeDraft && v.grapes.length) {
			v.grapes.pop();
		}
	}

	let previewUrl = $state<string | null>(null);
	$effect(() => {
		if (!photo) return ((previewUrl = null), undefined);
		const url = URL.createObjectURL(photo.thumb);
		previewUrl = url;
		return () => URL.revokeObjectURL(url);
	});
	const shownPhoto = $derived(previewUrl ?? (removePhoto ? null : existingPhoto));
	let backUrl = $state<string | null>(null);
	$effect(() => {
		if (!back) return ((backUrl = null), undefined);
		const url = URL.createObjectURL(back);
		backUrl = url;
		return () => URL.revokeObjectURL(url);
	});
	const shownBack = $derived(backUrl ?? (removeBack ? null : existingBack));

	async function pickPhoto(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		photo = await preparePhoto(file);
		removePhoto = false;
		onphotochange?.(file, photo.image);
	}
	async function pickBack(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		back = await resizeImage(file, 1280);
		removeBack = false;
	}

	const cls = (field: string) => `input${scanned.includes(field) ? ' scanned' : ''}`;
</script>

{#snippet slot(label: string, src: string | null, pick: (e: Event) => void, remove: () => void)}
	<div class="slot">
		<label class="tile" class:empty={!src}>
			{#if src}<img {src} alt="" />{:else}<Icon name="camera" size={22} />{/if}
			<span class="tile-label">{label}</span>
			<span class="visually-hidden">{src ? t('form.changePhoto') : t('form.addPhoto')}</span>
			<input class="visually-hidden" type="file" accept="image/*" onchange={pick} />
		</label>
		{#if src}
			<button type="button" class="remove small" onclick={remove}>{t('form.removePhoto')}</button>
		{/if}
	</div>
{/snippet}

<form
	id="wine-form"
	method="POST"
	{action}
	enctype="multipart/form-data"
	class="wine-form"
	use:enhance={({ formData }) => {
		saving = true;
		if (photo) {
			formData.set('photo', photo.image, 'photo.jpg');
			formData.set('thumb', photo.thumb, 'thumb.jpg');
		}
		if (removePhoto && !photo) formData.set('remove_photo', '1');
		if (back) formData.set('back_photo', back, 'back.jpg');
		if (removeBack && !back) formData.set('remove_back', '1');
		return async ({ result, update }) => {
			if (result.type === 'redirect') {
				// Back from the saved wine leads where the user was before the form, not to the form
				if (afterSave === 'back' && canGoBack()) history.back();
				else await goto(result.location, { replaceState: true, invalidateAll: true });
				return;
			}
			await update({ reset: false });
			saving = false;
		};
	}}
>
	<section class="card stack">
		<!-- one picker each: on a phone it offers the camera and the photo library -->
		<div class="photos">
			{@render slot(t('form.front'), shownPhoto, pickPhoto, () => {
				photo = null;
				removePhoto = true;
				onphotochange?.(null, null);
			})}
			{@render slot(t('form.back'), shownBack, pickBack, () => ((back = null), (removeBack = true)))}
		</div>
		{#if errors.photo}<p class="error">{t('form.invalid')}</p>{/if}

		<h2>{t('form.wine')}</h2>
		<label class="field">
			{t('form.name')}
			<input
				class={cls('name')}
				name="name"
				bind:value={v.name}
				required
				maxlength="200"
				autocomplete="off"
			/>
			{#if errors.name}<span class="error">{t('form.required')}</span>{/if}
		</label>
		<label class="field">
			{t('form.producer')}
			<input
				class={cls('producer')}
				name="producer"
				bind:value={v.producer}
				maxlength="200"
				autocomplete="off"
			/>
		</label>
		<div class="grid2">
			<label class="field">
				{t('form.vintage')}
				<input
					class={cls('vintage')}
					name="vintage"
					bind:value={v.vintage}
					inputmode="numeric"
					pattern="\d{'{4}'}"
					placeholder={String(year - 3)}
				/>
			</label>
			<label class="field">
				{t('form.alcohol')}
				<input
					class={cls('alcohol')}
					name="alcohol"
					bind:value={v.alcohol}
					inputmode="decimal"
					placeholder="13.5"
				/>
			</label>
		</div>

		<fieldset class="field">
			<legend>{t('form.color')}</legend>
			<div class="segmented" class:scanned={scanned.includes('color')}>
				{#each COLORS as c (c)}
					<label class="seg swatch-{c}">
						<input type="radio" name="color" value={c} bind:group={v.color} />
						<span><span class="dot" style="background: var(--swatch)"></span>{t(`color.${c}`)}</span>
					</label>
				{/each}
			</div>
		</fieldset>

		<label class="field">
			{t('form.country')}
			<select class={cls('country')} name="country" bind:value={v.country}>
				<option value="">–</option>
				{#each countryOptions as c (c.code)}
					<option value={c.code}>{flag(c.code)} {c.label}</option>
				{/each}
			</select>
		</label>
		<label class="field">
			{t('form.region')}
			<Suggest
				class={cls('region')}
				name="region"
				bind:value={v.region}
				options={regionOptions}
				empty={regionOptions}
				maxlength={100}
				onpick={onRegion}
				onchange={onRegion}
			/>
		</label>

		<div class="field">
			<span id="grapes-label">{t('form.grapes')}</span>
			<div class="grapes {cls('grapes')}">
				{#each v.grapes as g, i (g)}
					<span class="chip">
						{g}
						<button type="button" aria-label="{t('common.delete')} {g}" onclick={() => v.grapes.splice(i, 1)}>
							<Icon name="x" size={14} />
						</button>
						<input type="hidden" name="grapes" value={g} />
					</span>
				{/each}
				<Suggest
					class="grape-input"
					bind:value={grapeDraft}
					options={grapeOptions}
					empty={typicalGrapes}
					onpick={addGrape}
					onkeydown={grapeKey}
					onchange={addGrape}
					placeholder={v.grapes.length ? '' : t('form.grapesAdd')}
					aria-labelledby="grapes-label"
				/>
			</div>
		</div>
	</section>

	<section class="card stack">
		<h2>{t('form.cellar')}</h2>
		<label class="row small wish-toggle">
			<input type="checkbox" name="wishlist" bind:checked={v.wishlist} />
			{t('form.wishlist')}
		</label>
		{#if v.wishlist && bottles > 0}
			<p class="small warn" role="status">{t('form.wishlistDrops', { n: bottles })}</p>
		{/if}
		{#if !v.wishlist}
			<div class="field">
				<span>{t('form.quantity')}</span>
				<div class="stepper">
					<button
						type="button"
						class="icon-btn"
						aria-label="−1"
						onclick={() => (v.quantity = Math.max(0, v.quantity - 1))}><Icon name="minus" /></button
					>
					<input
						class="input qty"
						name="quantity"
						type="number"
						min="0"
						max="9999"
						bind:value={v.quantity}
						aria-label={t('form.quantity')}
					/>
					<button type="button" class="icon-btn" aria-label="+1" onclick={() => (v.quantity = v.quantity + 1)}
						><Icon name="plus" /></button
					>
				</div>
			</div>
		{/if}
		<fieldset class="field">
			<legend>{t('form.size')}</legend>
			<div class="segmented" class:scanned={scanned.includes('size_ml')}>
				{#each sizes as s (s)}
					<label class="seg">
						<input type="radio" name="size_ml" value={s} bind:group={v.size_ml} />
						<span>{Number(s) >= 1000 ? `${Number(s) / 1000} l` : `${Number(s) / 10} cl`}</span>
					</label>
				{/each}
			</div>
		</fieldset>
		<label class="field">
			{t('form.location')}
			<input
				class="input"
				name="location"
				list="location-list"
				bind:value={v.location}
				maxlength="100"
				placeholder={t('form.locationHint')}
			/>
		</label>
	</section>

	<details class="card" bind:open={tasteOpen}>
		<summary
			><h2>{t('form.taste')}</h2>
			<Icon name="chevron" /></summary
		>
		<div class="stack details-body">
			{#if suggested}<p class="muted small">{t('form.suggested')}</p>{/if}
			<div class="grid2">
				<label class="field">
					{t('form.drinkFrom')}
					<input
						class="input"
						bind:value={v.drink_from}
						inputmode="numeric"
						oninput={() => (windowByHand = true)}
					/>
				</label>
				<label class="field">
					{t('form.drinkTo')}
					<input
						class="input"
						bind:value={v.drink_to}
						inputmode="numeric"
						oninput={() => (windowByHand = true)}
					/>
					{#if errors.drink_to}<span class="error">{t('form.invalid')}</span>{/if}
				</label>
			</div>
			<Dots label={t('taste.body')} value={v.body} onchange={(x) => ((v.body = x), (tasteByHand = true))} />
			<Dots
				label={t('taste.acidity')}
				value={v.acidity}
				onchange={(x) => ((v.acidity = x), (tasteByHand = true))}
			/>
			<Dots
				label={t('taste.tannin')}
				value={v.tannin}
				onchange={(x) => ((v.tannin = x), (tasteByHand = true))}
			/>
			<Dots
				label={t('taste.sweetness')}
				value={v.sweetness}
				onchange={(x) => ((v.sweetness = x), (tasteByHand = true))}
			/>
		</div>
	</details>
	<!-- auto-suggested values are state, not typed input, so submit them explicitly -->
	{#each ['drink_from', 'drink_to', 'body', 'acidity', 'tannin', 'sweetness'] as const as k (k)}
		<input type="hidden" name={k} value={v[k] ?? ''} />
	{/each}

	<details class="card" bind:open={privateOpen}>
		<summary
			><h2>{t('form.private')}</h2>
			<Icon name="chevron" /></summary
		>
		<div class="stack details-body">
			<div class="grid2">
				<label class="field">
					{t('form.purchasedOn')}
					<input class="input" type="date" name="purchased_on" bind:value={v.purchased_on} />
				</label>
				<label class="field">
					{t('form.price')}
					<input class="input" name="price" bind:value={v.price} inputmode="decimal" />
				</label>
			</div>
			<label class="field">
				{t('form.purchasedAt')}
				<input
					class="input"
					name="purchased_at"
					list="shop-list"
					bind:value={v.purchased_at}
					maxlength="200"
				/>
			</label>
			<label class="field">
				{t('form.giftedBy')}
				<input class="input" name="gifted_by" list="giver-list" bind:value={v.gifted_by} maxlength="200" />
			</label>
			<label class="field">
				{t('form.notes')}
				<textarea class="input" name="notes" bind:value={v.notes} maxlength="5000"></textarea>
			</label>
			<label class="field">
				{t('form.barcode')}
				<input
					class={cls('barcode')}
					name="barcode"
					bind:value={v.barcode}
					inputmode="numeric"
					autocomplete="off"
					maxlength="20"
				/>
			</label>
		</div>
	</details>

	<input type="hidden" name="ocr_text" value={v.ocr_text} />
	<datalist id="location-list">
		{#each suggestions.locations as s (s)}<option value={s}></option>{/each}
	</datalist>
	<datalist id="shop-list">
		{#each suggestions.shops as s (s)}<option value={s}></option>{/each}
	</datalist>
	<datalist id="giver-list">
		{#each suggestions.givers as s (s)}<option value={s}></option>{/each}
	</datalist>

	{#if Object.keys(errors).length}<p class="error" role="alert">{t('form.invalid')}</p>{/if}
	<div class="submit">
		<button class="btn primary block" disabled={saving}>{submitLabel}</button>
	</div>
</form>

<style>
	.wine-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 6px;
	}
	.grid2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.segmented {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		border-radius: var(--radius-s);
	}
	.segmented.scanned {
		outline: 1px solid var(--gold);
		outline-offset: 3px;
	}
	.seg input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.seg > span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		padding: 0 14px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
	}
	.seg input:checked + span {
		background: var(--text);
		color: var(--bg);
	}
	.seg input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.grapes {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		min-height: 48px;
		padding: 6px 8px;
	}
	.grapes .chip {
		color: var(--text);
		padding-right: 4px;
	}
	.grapes .chip button {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--muted);
	}
	/* the input lives inside Suggest, out of reach of this component's scoped styles */
	.grapes :global(.grape-input) {
		flex: 1;
		min-width: 120px;
		border: 0;
		background: none;
		outline: none;
		font-size: 1rem;
		padding: 6px;
		color: var(--text);
	}
	.warn {
		margin: 0;
		color: var(--soon);
	}
	.wish-toggle {
		color: var(--text);
		gap: 10px;
		min-height: 36px;
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.stepper .icon-btn {
		background: var(--surface-2);
	}
	.qty {
		width: 80px !important;
		text-align: center;
		font-weight: 650;
		font-variant-numeric: tabular-nums;
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.qty::-webkit-inner-spin-button {
		appearance: none;
	}
	details summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		cursor: pointer;
		list-style: none;
		color: var(--muted);
	}
	details summary h2 {
		color: var(--text);
	}
	details summary::-webkit-details-marker {
		display: none;
	}
	details[open] summary :global(svg) {
		transform: rotate(180deg);
	}
	.details-body {
		margin-top: 14px;
	}
	.photos {
		display: flex;
		gap: 12px;
	}
	.slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.tile {
		position: relative;
		display: grid;
		place-items: center;
		width: 104px;
		height: 104px;
		border-radius: 12px;
		overflow: hidden;
		background: var(--surface-2);
		color: var(--muted);
		cursor: pointer;
	}
	.tile.empty {
		border: 1.5px dashed var(--line);
	}
	.tile img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.tile-label {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		padding: 3px 6px;
		font-size: 0.75rem;
		font-weight: 600;
		text-align: center;
		color: var(--text);
		background: color-mix(in srgb, var(--surface) 75%, transparent);
	}
	.remove {
		border: 0;
		background: none;
		color: var(--muted);
		padding: 4px;
	}
	.submit {
		position: sticky;
		bottom: var(--form-bottom, 0px);
		padding: 12px 0 calc(12px + var(--safe-b));
		background: linear-gradient(transparent, var(--bg) 30%);
	}
</style>
