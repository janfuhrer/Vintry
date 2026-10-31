<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import WineForm, { emptyValues, toValues, type WineFormValues } from '#lib/components/WineForm.svelte';
	import { useI18n } from '#lib/i18n.ts';
	import { preparePhotoForScan } from '#lib/image.ts';
	import { parseLabel } from '#lib/parse.ts';
	import type { PageProps } from './$types';

	let { form, data }: PageProps = $props();
	const { t } = useI18n();

	type Step = 'choose' | 'scanning' | 'form';
	type Copy = NonNullable<typeof data.copy>;

	// "Buy again" starts from a copy of an existing wine, without the purchase details
	const fromCopy = (copy: Copy): WineFormValues => ({
		...toValues(copy),
		quantity: 1,
		wishlist: false,
		purchased_on: '',
		purchased_at: '',
		price: '',
		gifted_by: '',
		notes: '',
		ocr_text: ''
	});

	// initialised from data so the server already renders the copied form
	const initial = untrack(() => data.copy);
	let step = $state<Step>(initial ? 'form' : 'choose');
	let stage = $state<'loading' | 'reading'>('loading');
	let progress = $state(0);
	let values = $state<WineFormValues>(initial ? fromCopy(initial) : emptyValues());
	let scanned = $state<string[]>([]);
	let photo = $state<{ image: Blob; thumb: Blob } | null>(null);
	let notice = $state(initial ? t('add.copied', { name: initial.name }) : '');
	let formKey = $state(0);
	let imageError = $state(false);
	// bumped on cancel: a scan that finishes after the user went back is ignored
	let scanRun = 0;

	// show the photo while it's being read
	let previewUrl = $state<string | null>(null);
	$effect(() => {
		if (!photo) return;
		const url = URL.createObjectURL(photo.thumb);
		previewUrl = url;
		return () => {
			URL.revokeObjectURL(url);
			previewUrl = null;
		};
	});

	// a later client-side navigation to /add?from=… reuses this component
	let copiedId = initial?.id;
	$effect.pre(() => {
		const copy = data.copy;
		if (!copy) {
			// back to plain /add (e.g. the nav button): leave the copied form
			if (copiedId) {
				copiedId = undefined;
				untrack(() => {
					values = emptyValues();
					notice = '';
					step = 'choose';
				});
			}
			return;
		}
		if (copy.id === copiedId) return;
		copiedId = copy.id;
		untrack(() => {
			values = fromCopy(copy);
			scanned = [];
			photo = null;
			notice = t('add.copied', { name: copy.name });
			formKey++;
			step = 'form';
		});
	});

	async function scan(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		const run = ++scanRun;
		step = 'scanning';
		progress = 0;
		stage = 'loading';
		imageError = false;
		let prepared;
		try {
			prepared = await preparePhotoForScan(file);
		} catch (err) {
			// the browser can't decode it (e.g. HEIC outside Safari): say so, don't pretend to scan
			console.error(err);
			if (run !== scanRun) return;
			imageError = true;
			step = 'choose';
			return;
		}
		if (run !== scanRun) return;
		photo = prepared.photo;
		try {
			const { readLabel } = await import('#lib/ocr.ts');
			const { lines, text } = await readLabel(prepared.ocr, (s, p) => {
				stage = s;
				progress = p;
			});
			if (run !== scanRun) return; // cancelled while reading
			const parsed = parseLabel(lines);
			const v = emptyValues();
			const found: string[] = [];
			const target = v as unknown as Record<string, unknown>;
			for (const [k, x] of Object.entries(parsed)) {
				if (x === undefined) continue;
				found.push(k);
				if (k === 'grapes') v.grapes = x as string[];
				else target[k] = String(x);
			}
			v.ocr_text = text.slice(0, 5000);
			values = v;
			scanned = found;
			notice = found.length ? t('add.scanned') : t('add.scanFailed');
		} catch (err) {
			// keep the photo: the wine can still be entered by hand
			console.error(err);
			if (run !== scanRun) return;
			values = emptyValues();
			scanned = [];
			notice = t('add.scanFailed');
		}
		formKey++;
		step = 'form';
	}

	function manual() {
		values = emptyValues();
		scanned = [];
		photo = null;
		notice = '';
		formKey++;
		step = 'form';
	}
</script>

<svelte:head><title>Vintry · {t('add.title')}</title></svelte:head>

<main class="page" style="--form-bottom: calc(var(--nav-h) + var(--safe-b))">
	<header class="head">
		{#if step === 'form' || step === 'scanning'}
			<button class="icon-btn" aria-label={t('common.back')} onclick={() => (scanRun++, (step = 'choose'))}
				><Icon name="back" /></button
			>
		{/if}
		<h1>{t('add.title')}</h1>
	</header>

	{#if step === 'choose'}
		<div class="choose">
			{#if imageError}<p class="error notice-error" role="alert">{t('add.badImage')}</p>{/if}
			<label class="scan-btn">
				<span class="scan-icon"><Icon name="camera" size={40} /></span>
				<span class="scan-title">{t('add.scan')}</span>
				<span class="muted small">{t('add.scanHint')}</span>
				<input class="visually-hidden" type="file" accept="image/*" capture="environment" onchange={scan} />
			</label>
			<!-- no capture attribute: the phone offers its photo library -->
			<label class="btn block">
				<Icon name="image" size={18} />{t('add.pickPhoto')}
				<input class="visually-hidden" type="file" accept="image/*" onchange={scan} />
			</label>
			<button class="btn block" onclick={manual}><Icon name="pen" size={18} />{t('add.manual')}</button>
		</div>
	{:else if step === 'scanning'}
		<div class="scanning" role="status" aria-live="polite">
			{#if previewUrl}
				<div class="preview">
					<img src={previewUrl} alt="" /><span class="sweep" aria-hidden="true"></span>
				</div>
			{:else}
				<div class="spinner" aria-hidden="true"></div>
			{/if}
			<p>{stage === 'loading' ? t('add.loading') : t('add.reading')}</p>
			<progress max="1" value={progress}></progress>
		</div>
	{:else}
		{#if notice}<p class="notice small">{notice}</p>{/if}
		{#key formKey}
			<WineForm
				initial={values}
				{scanned}
				bind:photo
				suggestions={data.suggestions}
				errors={form?.errors ?? {}}
				submitLabel={t('common.save')}
			/>
		{/key}
	{/if}
</main>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-bottom: 16px;
	}
	.choose {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding-top: 8vh;
	}
	.scan-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 48px 24px;
		border-radius: 24px;
		background: var(--accent);
		color: var(--accent-ink);
		text-align: center;
		cursor: pointer;
		box-shadow: 0 10px 30px color-mix(in srgb, var(--accent) 35%, transparent);
	}
	.scan-btn .muted {
		color: inherit;
	}
	.scan-icon {
		display: grid;
		place-items: center;
		width: 84px;
		height: 84px;
		border-radius: 50%;
		background: rgb(255 255 255 / 0.16);
		margin-bottom: 4px;
	}
	.scan-title {
		font-size: 1.25rem;
		font-weight: 700;
	}
	.scanning {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding-top: 20vh;
	}
	progress {
		width: 70%;
		height: 6px;
		appearance: none;
		border: 0;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}
	progress::-webkit-progress-bar {
		background: var(--surface-2);
	}
	progress::-webkit-progress-value {
		background: var(--accent);
	}
	progress::-moz-progress-bar {
		background: var(--accent);
	}
	.spinner {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 3px solid var(--surface-2);
		border-top-color: var(--accent);
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.notice-error {
		margin: 0;
		text-align: center;
	}
	.preview {
		position: relative;
		width: 180px;
		height: 180px;
		border-radius: 20px;
		overflow: hidden;
		box-shadow: var(--shadow);
	}
	.preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.sweep {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			transparent 40%,
			color-mix(in srgb, var(--gold) 45%, transparent) 50%,
			transparent 60%
		);
		animation: sweep 1.6s ease-in-out infinite;
	}
	@keyframes sweep {
		from {
			transform: translateY(-60%);
		}
		to {
			transform: translateY(60%);
		}
	}
	.notice {
		margin: 0 0 12px;
		padding: 10px 14px;
		border-radius: var(--radius-s);
		background: color-mix(in srgb, var(--gold) 14%, var(--surface));
	}
</style>
