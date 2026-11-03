<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';
	import WineForm, { emptyValues, toValues, type WineFormValues } from '#lib/components/WineForm.svelte';
	import { useI18n, type Key } from '#lib/i18n.ts';
	import CropBox from '#lib/components/CropBox.svelte';
	import { prepareCropForScan, preparePhotoForScan, resizeImage, type Crop } from '#lib/image.ts';
	import { findSameWine, type Owned } from '#lib/match.ts';
	import { labelLines, parseLabel, titleCase } from '#lib/parse.ts';
	import type { PageProps } from './$types';

	let { form, data }: PageProps = $props();
	const { t } = useI18n();

	type Step = 'choose' | 'scanning' | 'crop' | 'form';
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
	let stage = $state<'loading' | 'reading' | 'claude'>('loading');
	let progress = $state(0);
	let values = $state<WineFormValues>(initial ? fromCopy(initial) : emptyValues());
	let scanned = $state<string[]>([]);
	// the scanned label is a wine the user already has
	let same = $state<Owned | null>(null);
	let photo = $state<{ image: Blob; thumb: Blob } | null>(null);
	// the back label's photo, kept with the wine once it was scanned
	let back = $state<Blob | null>(null);
	let notice = $state(initial ? t('add.copied', { name: initial.name }) : '');
	let formKey = $state(0);
	let imageError = $state(false);
	// bumped on cancel: a scan that finishes after the user went back is ignored
	let scanRun = 0;
	// the photo as taken, kept to crop it to the label and read again
	let source = $state<{ file: Blob; preview: Blob } | null>(null);
	let crop = $state<Crop>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
	let cropUrl = $state<string | null>(null);
	$effect(() => {
		if (step !== 'crop' || !source) return;
		const url = URL.createObjectURL(source.preview);
		cropUrl = url;
		return () => {
			URL.revokeObjectURL(url);
			cropUrl = null;
		};
	});

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
			same = null;
			scanned = [];
			photo = null;
			back = null;
			resetSources();
			notice = t('add.copied', { name: copy.name });
			formKey++;
			step = 'form';
		});
	});

	function scan(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		source = null;
		back = null;
		crop = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
		read(async () => {
			const prepared = await preparePhotoForScan(file);
			source = { file, preview: prepared.photo.image };
			return prepared;
		});
	}

	// "crop to the label and read again": the same reading on the framed part, cut from the original
	function readCrop() {
		if (!source) return;
		// a new reading replaces the label's fields; where it is kept and what it cost stay
		const typed = wineForm?.snapshot();
		const keep = typed && Object.fromEntries(KEPT.map((k) => [k, typed[k]]));
		read(() => prepareCropForScan(source!.file, crop), keep);
	}
	const KEPT = [
		'quantity',
		'location',
		'purchased_on',
		'purchased_at',
		'price',
		'gifted_by',
		'notes'
	] as const;

	/** Parsed label → form fields (strings, as the form keeps them) */
	function toFields(parsed: ReturnType<typeof parseLabel>): Partial<WineFormValues> {
		const out: Record<string, unknown> = {};
		for (const [k, x] of Object.entries(parsed)) {
			if (x === undefined) continue;
			out[k] = k === 'grapes' ? [...(x as string[])] : String(x);
		}
		return out as Partial<WineFormValues>;
	}

	// users who chose Claude in settings; off for the rest of the visit once the allowance is gone
	let claudeSpent = $state(false);
	const useClaude = $derived(!!data.claude && data.claude.scansLeft > 0 && !claudeSpent);
	type Found = Partial<WineFormValues>;

	// the reading under way, ended when the user leaves the scan: an abandoned one still costs
	// and keeps the server from starting the next
	let claudeCall: AbortController | undefined;
	function stopClaude() {
		claudeCall?.abort();
		claudeCall = undefined;
	}

	/** The label photos to Claude, front first. Null when it can't answer: the phone reads instead. */
	async function askClaude(photos: Blob[]): Promise<{ fields: Found; label: boolean } | null> {
		stopClaude();
		const call = (claudeCall = new AbortController());
		const body = new FormData();
		photos.forEach((p, i) =>
			body.set(i ? 'back' : 'front', new File([p], 'label.jpg', { type: 'image/jpeg' }))
		);
		try {
			const res = await fetch('/api/label', { method: 'POST', body, signal: call.signal });
			const answer = await res.json();
			if (res.ok) return answer;
			if (answer.error === 'budget' || answer.error === 'off') claudeSpent = true;
		} catch (err) {
			if (!call.signal.aborted) console.error(err);
		} finally {
			if (claudeCall === call) claudeCall = undefined;
		}
		return null;
	}

	/**
	 * Text Live Text already read on the iPhone (the Shortcut): only the parser. Plain text
	 * has no sizes, so the order on the label decides.
	 */
	const readGiven = (text: string) => ({
		fields: toFields(parseLabel(text.split('\n').map((t) => ({ text: t, height: 1 })))) as Found,
		text
	});

	/** Local reading: tesseract on the phone, then the label parser */
	async function readHere(ocr: Blob, onProgress: (s: 'loading' | 'reading', p: number) => void) {
		const { readLabel } = await import('#lib/ocr.ts');
		const { lines, text } = await readLabel(ocr, onProgress);
		return { fields: toFields(parseLabel(lines)) as Found, text };
	}

	// Where each filled field came from, shown under the notice; each source can be undone.
	type Source = 'label' | 'claude' | 'back' | 'list' | 'off';
	const SOURCES: Source[] = ['label', 'claude', 'back', 'list', 'off'];
	let sources = $state<Record<string, Source>>({});
	// what a source put in, so undoing it leaves a field the user changed since alone
	let filledWith: Record<string, string> = {};
	let listWine = $state('');
	// the barcode: on which photo it was found, and what Open Food Facts said about it
	type Lookup = 'off' | 'pending' | 'found' | 'known' | 'missing' | 'failed';
	let code = $state<{ value: string; where: 'front' | 'back'; lookup: Lookup } | null>(null);
	let codeTried = $state<('front' | 'back')[]>([]);

	function mark(keys: string[], source: Source, values: Partial<WineFormValues>) {
		const add: Record<string, Source> = {};
		for (const k of keys) {
			add[k] = source;
			filledWith[k] = JSON.stringify(values[k as keyof WineFormValues]);
		}
		sources = { ...sources, ...add };
	}
	// the text read from the labels, front then back, offered as lines to tap into a field
	let labelText = $state('');
	let target = $state<'name' | 'producer'>('name');
	const lines = $derived(labelLines(labelText));
	function useLine(line: string) {
		if (!wineForm) return;
		const value = titleCase(line);
		wineForm.setFields({ [target]: value });
		scanned = [...new Set([...scanned, target])];
		mark([target], 'label', { [target]: value });
		// the name is usually set first, then the producer
		if (target === 'name') target = 'producer';
	}

	function resetSources() {
		labelText = '';
		target = 'name';
		candidates = [];
		sources = {};
		filledWith = {};
		listWine = '';
		code = null;
		codeTried = [];
	}
	function undo(source: Source) {
		if (!wineForm) return;
		const now = wineForm.snapshot() as unknown as Record<string, unknown>;
		const blank = emptyValues() as unknown as Record<string, unknown>;
		const keys = Object.keys(sources).filter((k) => sources[k] === source);
		const untouched = keys.filter((k) => JSON.stringify(now[k]) === filledWith[k]);
		wineForm.setFields(Object.fromEntries(untouched.map((k) => [k, blank[k]])));
		scanned = scanned.filter((k) => !keys.includes(k));
		sources = Object.fromEntries(Object.entries(sources).filter(([, s]) => s !== source));
	}
	const FIELD_LABEL: Record<string, Key> = {
		name: 'form.name',
		producer: 'form.producer',
		vintage: 'form.vintage',
		color: 'form.color',
		country: 'form.country',
		region: 'form.region',
		grapes: 'form.grapes',
		alcohol: 'form.alcohol',
		size_ml: 'form.size',
		barcode: 'form.barcode',
		drink_from: 'form.drinkFrom',
		drink_to: 'form.drinkTo',
		body: 'taste.body',
		acidity: 'taste.acidity',
		tannin: 'taste.tannin',
		sweetness: 'taste.sweetness'
	};
	const groups = $derived(
		SOURCES.map((source) => ({
			source,
			fields: Object.keys(FIELD_LABEL)
				.filter((k) => sources[k] === source)
				.map((k) => t(FIELD_LABEL[k]))
		})).filter((g) => g.fields.length)
	);

	/** The barcode on a label photo, read on the phone; null when there is none or it fails */
	const findBarcode = (image: Blob) =>
		import('#lib/barcode.ts').then((m) => m.readBarcode(image)).catch(() => null);

	/**
	 * Open Food Facts, for users who turned it on: fills what is still empty in the form that
	 * scanned the code, never a field already read or typed
	 */
	async function lookUp(found: string, run: number, key: number) {
		if (!data.barcodeLookup) return;
		const settle = (lookup: Lookup) => {
			if (run === scanRun && key === formKey && code?.value === value) code = { ...code, lookup };
		};
		const value = found;
		settle('pending');
		try {
			const res = await fetch('/api/barcode', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ code: value })
			});
			if (!res.ok) return settle('failed');
			const answer = (await res.json()) as { found: boolean; fields: Partial<WineFormValues> };
			if (run !== scanRun || key !== formKey || !wineForm) return;
			if (!answer.found) return settle('missing');
			const filled = wineForm.fillEmpty(answer.fields);
			scanned = [...scanned, ...filled];
			mark(filled, 'off', answer.fields);
			// it may know only what the label already said
			settle(filled.length ? 'found' : 'known');
		} catch (err) {
			console.error(err);
			settle('failed');
		}
	}

	/**
	 * Vintry's reference list of wines (on the server, nothing leaves it): once producer or
	 * name are known, fills grapes, alcohol, type, country and region still empty
	 */
	async function fromReference(run: number, key: number) {
		const typed = wineForm?.snapshot();
		if (!typed || (!typed.producer && !typed.name)) return;
		try {
			const res = await fetch('/api/reference', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					producer: typed.producer,
					name: typed.name,
					country: typed.country,
					// only a colour the label showed: the form's default says nothing
					color: scanned.includes('color') ? typed.color : null
				})
			});
			if (!res.ok) return;
			const answer = (await res.json()) as {
				found: boolean;
				fields: Partial<WineFormValues>;
				wine?: { producer: string; name: string };
			};
			if (!answer.found || run !== scanRun || key !== formKey || !wineForm) return;
			const filled = wineForm.fillEmpty(answer.fields);
			if (!filled.length) return;
			scanned = [...scanned, ...filled];
			listWine = `${answer.wine!.name} (${answer.wine!.producer})`;
			mark(filled, 'list', answer.fields);
		} catch (err) {
			console.error(err);
		}
	}

	// "Is it one of these?": wines from the list the label's text may be, when none matched clearly
	type Candidate = {
		producer: string;
		name: string;
		matched: number;
		total: number;
		fields: Partial<WineFormValues>;
	};
	let candidates = $state<Candidate[]>([]);
	async function findCandidates(run: number, key: number) {
		const typed = wineForm?.snapshot();
		if (!typed || listWine) return;
		try {
			const res = await fetch('/api/reference/candidates', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					text: [typed.producer, typed.name, typed.ocr_text].filter(Boolean).join('\n'),
					country: scanned.includes('country') ? typed.country : null
				})
			});
			if (!res.ok) return;
			const answer = (await res.json()) as { candidates: Candidate[] };
			if (run !== scanRun || key !== formKey || listWine) return;
			// already what the form says: nothing to ask
			candidates = answer.candidates.filter((c) => !(c.name === typed.name && c.producer === typed.producer));
		} catch (err) {
			console.error(err);
		}
	}
	/** The user's pick: its name and producer, and what the scan only guessed or left empty */
	function choose(c: Candidate) {
		if (!wineForm) return;
		const now = wineForm.snapshot() as unknown as Record<string, unknown>;
		const blank = emptyValues() as unknown as Record<string, unknown>;
		const values: Record<string, unknown> = { name: c.name, producer: c.producer };
		for (const [k, x] of Object.entries(c.fields)) {
			const guessed = sources[k] === 'label' || sources[k] === 'back';
			if (guessed || JSON.stringify(now[k]) === JSON.stringify(blank[k])) values[k] = x;
		}
		wineForm.setFields(values as Partial<WineFormValues>);
		const keys = Object.keys(values);
		scanned = [...new Set([...scanned, ...keys])];
		listWine = `${c.name} (${c.producer})`;
		mark(keys, 'list', values as Partial<WineFormValues>);
		candidates = [];
	}

	/** Brings a notice into view: Save is at the bottom of a long form */
	function reveal(node: HTMLElement) {
		node.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	// the back label: alcohol, size, grapes and producer are often only there
	let wineForm: ReturnType<typeof WineForm> | undefined = $state();
	let backBusy = $state(false);
	async function scanBack(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) await readBack(file);
	}

	/** The back label: a photo, and the text the Shortcut read from it if it came from there */
	async function readBack(file: Blob, given?: string) {
		if (!wineForm) return;
		// a result for a form that was left or replaced meanwhile belongs to another wine
		const run = scanRun;
		const key = formKey;
		backBusy = true;
		try {
			const image = await resizeImage(file, 1280);
			if (run !== scanRun || key !== formKey) return;
			back = image;
			// barcodes are usually on the back; small in the photo, so read from a larger copy
			// (2200 px finds about a third more than 1280 px on real photos)
			const barcode = resizeImage(file, 2200).then(findBarcode);
			// Claude reads both sides together, so each can explain the other
			const answer = given === undefined && useClaude && photo ? await askClaude([photo.image, image]) : null;
			if (run !== scanRun || key !== formKey) return;
			const { fields, text } =
				given !== undefined
					? readGiven(given)
					: answer
						? { fields: answer.fields, text: '' }
						: await readHere((await preparePhotoForScan(file)).ocr, () => {});
			if (run !== scanRun || key !== formKey || !wineForm) return;
			const found = await barcode;
			if (run !== scanRun || key !== formKey || !wineForm) return;
			const backFields = { ...fields, ...(found ? { barcode: found } : {}) };
			const filled = wineForm.fillEmpty({ ...backFields, ocr_text: text });
			scanned = [...scanned, ...filled];
			mark(filled, 'back', backFields);
			if (text) labelText = `${labelText}\n${text}`;
			codeTried = [...new Set([...codeTried, 'back' as const])];
			if (found && !code) code = { value: found, where: 'back', lookup: 'off' };
			notice = filled.length ? t('add.backFilled', { n: filled.length }) : t('add.backNothing');
			// the back often names the producer the front didn't
			if (filled.includes('producer') || filled.includes('name')) await fromReference(run, key);
			// more text to go on: ask again if nothing matched clearly yet
			await findCandidates(run, key);
			if (found) {
				// a bottle the cellar has already, known by its code
				const typed = wineForm.snapshot();
				same ??= findSameWine(
					{
						name: typed.name,
						producer: typed.producer,
						vintage: Number(typed.vintage) || null,
						barcode: found
					},
					data.owned
				);
				if (code?.value === found && code.lookup === 'off') await lookUp(found, run, key);
			}
		} catch (err) {
			console.error(err);
			if (run === scanRun && key === formKey) notice = t('add.backNothing');
		} finally {
			backBusy = false;
		}
	}

	async function read(
		prepare: () => Promise<{ photo: { image: Blob; thumb: Blob }; ocr: Blob }>,
		keep: Partial<WineFormValues> = {},
		given?: string
	) {
		const run = ++scanRun;
		stopClaude();
		same = null;
		step = 'scanning';
		progress = 0;
		stage = 'loading';
		imageError = false;
		let prepared;
		try {
			prepared = await prepare();
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
		// the barcode is read alongside the label's text
		const barcode = findBarcode(prepared.ocr);
		let onFront: string | null = null;
		resetSources();
		try {
			let answer = null;
			const tried = useClaude && given === undefined;
			if (tried) {
				stage = 'claude';
				answer = await askClaude([prepared.photo.image]);
				if (run !== scanRun) return;
			}
			const { fields, text } =
				given !== undefined
					? readGiven(given)
					: answer
						? { fields: answer.fields, text: '' }
						: await readHere(prepared.ocr, (s, p) => {
								stage = s;
								progress = p;
							});
			if (run !== scanRun) return; // cancelled while reading
			const v = { ...emptyValues(), ...keep, ...fields };
			const found = Object.keys(fields);
			v.ocr_text = text.slice(0, 5000);
			labelText = text;
			onFront = await barcode;
			if (run !== scanRun) return;
			if (onFront) v.barcode = onFront;
			same = findSameWine(
				{
					name: fields.name,
					producer: fields.producer,
					vintage: Number(fields.vintage) || null,
					barcode: onFront
				},
				data.owned
			);
			values = v;
			scanned = onFront ? [...found, 'barcode'] : found;
			mark(found, answer ? 'claude' : 'label', fields);
			if (onFront) mark(['barcode'], 'label', { barcode: onFront });
			codeTried = ['front'];
			code = onFront ? { value: onFront, where: 'front', lookup: 'off' } : null;
			notice =
				answer && !answer.label
					? t('add.noLabel')
					: !found.length
						? t('add.scanFailed')
						: tried && !answer
							? t('add.claudeFallback')
							: t('add.scanned');
		} catch (err) {
			// keep the photo: the wine can still be entered by hand
			console.error(err);
			if (run !== scanRun) return;
			values = { ...emptyValues(), ...keep };
			scanned = [];
			notice = t('add.scanFailed');
		}
		formKey++;
		step = 'form';
		// once the form is there: the reference list, then what Open Food Facts knows, fill the rest
		const key = formKey;
		await tick();
		await fromReference(run, key);
		await findCandidates(run, key);
		if (onFront) await lookUp(onFront, run, key);
	}

	// photos the iPhone Shortcut sent, read there by Live Text; used once, then gone
	let scans = $derived(data.scans);
	async function photoOf(id: string, side: 'front' | 'back') {
		const res = await fetch(`/api/scan/${id}/${side}`);
		return res.ok ? res.blob() : null;
	}
	async function dropScan(id: string) {
		scans = scans.filter((s) => s.id !== id);
		await fetch(`/api/scan/${id}`, { method: 'DELETE' }).catch(() => {});
	}
	async function useScan(scan: (typeof data.scans)[number]) {
		const front = await photoOf(scan.id, 'front');
		if (!front) return dropScan(scan.id);
		const backPhoto = scan.has_back ? await photoOf(scan.id, 'back') : null;
		source = null;
		back = null;
		await read(
			async () => {
				const prepared = await preparePhotoForScan(front);
				source = { file: front, preview: prepared.photo.image };
				return prepared;
			},
			{},
			scan.front_text
		);
		if (backPhoto) await readBack(backPhoto, scan.back_text ?? '');
		await dropScan(scan.id);
	}

	function manual() {
		scanRun++;
		stopClaude();
		resetSources();
		back = null;
		source = null;
		same = null;
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
		{#if step === 'crop'}
			<button class="icon-btn" aria-label={t('common.back')} onclick={() => (step = 'form')}
				><Icon name="back" /></button
			>
		{:else if step === 'form' || step === 'scanning'}
			<button
				class="icon-btn"
				aria-label={t('common.back')}
				onclick={() => (scanRun++, stopClaude(), (step = 'choose'))}><Icon name="back" /></button
			>
		{/if}
		<h1>{t('add.title')}</h1>
	</header>

	{#if step === 'choose'}
		<div class="choose">
			{#if scans.length}
				<section class="scans card stack">
					<h2 class="small-title">{t('add.fromIphone')}</h2>
					{#each scans as s (s.id)}
						<div class="scan-row">
							<img src="/api/scan/{s.id}/front" alt="" width="56" height="56" />
							<span class="scan-text small"
								>{s.front_text.split('\n').filter(Boolean).slice(0, 2).join(' · ') ||
									t('add.noText')}{#if s.has_back}
									<span class="muted"> · {t('form.back')}</span>{/if}</span
							>
							<button type="button" class="btn small primary" onclick={() => useScan(s)}
								>{t('add.useScan')}</button
							>
							<button
								type="button"
								class="icon-btn"
								aria-label={t('common.delete')}
								onclick={() => dropScan(s.id)}><Icon name="x" size={18} /></button
							>
						</div>
					{/each}
				</section>
			{/if}
			{#if imageError}<p class="error notice-error" role="alert">{t('add.badImage')}</p>{/if}
			<label class="scan-btn">
				<span class="scan-icon"><Icon name="camera" size={40} /></span>
				<span class="scan-title">{t('add.scan')}</span>
				<span class="muted small">{t('add.scanHint')}</span>
				{#if useClaude}<span class="small claude-hint"
						>{t('add.withClaude', { n: data.claude!.scansLeft })}</span
					>{/if}
				<!-- no capture attribute: the phone offers both, the camera and the photo library -->
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
			<p>
				{stage === 'claude'
					? t('add.claudeReading')
					: stage === 'loading'
						? t('add.loading')
						: t('add.reading')}
			</p>
			{#if stage === 'claude'}
				<!-- Claude reports no progress: the bar runs without a value -->
				<progress max="1"></progress>
			{:else}
				<progress max="1" value={progress}></progress>
			{/if}
		</div>
	{:else}
		{#if step === 'crop'}
			<div class="crop stack">
				<p class="muted small">{t('add.cropHint')}</p>
				{#if cropUrl}
					<div class="crop-frame">
						<CropBox src={cropUrl} bind:crop label={t('add.cropTitle')} hint={t('add.cropKeys')} />
					</div>
				{/if}
				<button class="btn primary block" onclick={readCrop}>{t('add.readAgain')}</button>
			</div>
		{/if}
		<!-- hidden, not unmounted, while cropping: what was typed or read from the back stays -->
		<div hidden={step === 'crop'}>
			{#if form?.duplicate}
				{@const dup = form.duplicate}
				{@const label = [dup.name, dup.vintage].filter(Boolean).join(' ')}
				<div class="notice same small" role="alert" use:reveal>
					<p>
						{dup.wishlist
							? t('add.sameWish', { name: label })
							: dup.quantity > 0
								? t('add.same', { name: label, count: dup.quantity })
								: t('add.sameFinished', { name: label })}
					</p>
					<div class="notice-actions">
						<form
							method="POST"
							action="/wine/{dup.id}?/restock"
							enctype="multipart/form-data"
							use:enhance={({ formData }) => {
								if (photo) {
									formData.set('photo', new File([photo.image], 'photo.jpg', { type: 'image/jpeg' }));
									formData.set('thumb', new File([photo.thumb], 'thumb.jpg', { type: 'image/jpeg' }));
								}
								// what was typed for this purchase goes along: place, shop, date, price, notes
								const typed = wineForm?.snapshot();
								if (typed) {
									formData.set('bottles', String(typed.quantity || 1));
									for (const k of KEPT) if (k !== 'quantity') formData.set(k, String(typed[k] ?? ''));
								}
								return async ({ result }) => {
									if (result.type === 'success') await goto(`/wine/${dup.id}`, { replaceState: true });
									else await applyAction(result);
								};
							}}
						>
							<input type="hidden" name="bottles" value={form.bottles || 1} />
							<button class="btn primary small">{t('add.addBottles', { n: form.bottles || 1 })}</button>
						</form>
						<!-- submits the wine form itself, once more, with the go-ahead -->
						<button class="btn small" type="submit" form="wine-form" name="allow_duplicate" value="1"
							>{t('add.saveSeparately')}</button
						>
					</div>
				</div>
			{/if}
			{#if same}
				{@const label = [[same.name, same.vintage].filter(Boolean).join(' '), same.producer]
					.filter(Boolean)
					.join(', ')}
				{@const id = same.id}
				<div class="notice same small" role="status">
					<p>
						{same.wishlist
							? t('add.sameWish', { name: label })
							: same.quantity > 0
								? t('add.same', { name: label, count: same.quantity })
								: t('add.sameFinished', { name: label })}
					</p>
					<form
						method="POST"
						action="/wine/{id}?/restock"
						enctype="multipart/form-data"
						use:enhance={({ formData }) => {
							// the label photo goes along when the wine has none yet
							if (photo && !same?.has_photo) {
								formData.set('photo', new File([photo.image], 'photo.jpg', { type: 'image/jpeg' }));
								formData.set('thumb', new File([photo.thumb], 'thumb.jpg', { type: 'image/jpeg' }));
							}
							return async ({ result }) => {
								if (result.type === 'success') await goto(`/wine/${id}`, { replaceState: true });
								else await applyAction(result);
							};
						}}
					>
						<button class="btn primary small">{same.wishlist ? t('wine.bought') : t('add.addBottle')}</button>
						<a class="btn small" href="/wine/{id}">{t('add.openWine')}</a>
					</form>
				</div>
			{/if}
			{#if candidates.length}
				<div class="notice candidates small" role="status">
					<p class="ask">{t('add.candidates')}</p>
					<ul>
						{#each candidates as c (c.producer + c.name)}
							<li>
								<span class="cand">
									<strong>{c.name}</strong>
									<span class="muted">{c.producer} · {t('add.matched', { n: c.matched, of: c.total })}</span>
								</span>
								<button type="button" class="btn small primary" onclick={() => choose(c)}
									>{t('add.thisOne')}</button
								>
							</li>
						{/each}
					</ul>
					<button type="button" class="undo" onclick={() => (candidates = [])}>{t('add.noneOfThese')}</button>
				</div>
			{/if}
			{#if notice}
				<div class="notice small">
					<p>{notice}</p>
					{#if groups.length || codeTried.length}
						<!-- where each value came from; anything but the front label can be undone -->
						<ul class="sources">
							{#each groups as g (g.source)}
								<li>
									<span class="src"
										>{g.source === 'list'
											? t('add.from.list', { wine: listWine })
											: t(`add.from.${g.source}`)}:</span
									>
									{g.fields.join(', ')}
									{#if g.source !== 'label'}
										<button type="button" class="undo" onclick={() => undo(g.source)}
											>{t('common.undo')}</button
										>
									{/if}
								</li>
							{/each}
							<li>
								<span class="src">{t('form.barcode')}:</span>
								{#if code}
									{t(code.where === 'front' ? 'add.code.onFront' : 'add.code.onBack', { code: code.value })}
									{t(`add.lookup.${code.lookup}`)}
								{:else}
									{codeTried.includes('back') ? t('add.code.none') : t('add.code.noneFront')}
								{/if}
							</li>
						</ul>
					{/if}
					{#if source}
						<div class="notice-actions">
							<button class="btn small" disabled={backBusy} onclick={() => (step = 'crop')}
								>{t('add.recrop')}</button
							>
							<label class="btn small" aria-disabled={backBusy}>
								<Icon name="camera" size={16} />{backBusy ? t('add.reading') : t('add.scanBack')}
								<input
									class="visually-hidden"
									type="file"
									accept="image/*"
									disabled={backBusy}
									onchange={scanBack}
								/>
							</label>
						</div>
					{/if}
				</div>
			{/if}
			{#if lines.length}
				<!-- the parser may pick the wrong line: the right one is a tap away -->
				<details class="lines small" open={!listWine}>
					<summary>{t('add.lines', { n: lines.length })}</summary>
					<div class="target" role="group" aria-label={t('add.linesInto')}>
						<span class="muted">{t('add.linesInto')}</span>
						<button
							type="button"
							class="chip"
							class:active={target === 'name'}
							aria-pressed={target === 'name'}
							onclick={() => (target = 'name')}>{t('form.name')}</button
						>
						<button
							type="button"
							class="chip"
							class:active={target === 'producer'}
							aria-pressed={target === 'producer'}
							onclick={() => (target = 'producer')}>{t('form.producer')}</button
						>
					</div>
					<div class="line-chips">
						{#each lines as line (line)}
							<button type="button" class="chip line" onclick={() => useLine(line)}>{line}</button>
						{/each}
					</div>
				</details>
			{/if}
			{#key formKey}
				<WineForm
					bind:this={wineForm}
					initial={values}
					{scanned}
					bind:photo
					bind:back
					onphotochange={(file, image) => {
						// cropping and reading again work on the photo the form has now, not the first one
						source = file && image ? { file, preview: image } : null;
						crop = { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
					}}
					suggestions={data.suggestions}
					errors={form?.errors ?? {}}
					submitLabel={t('common.save')}
				/>
			{/key}
		</div>
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
	.scan-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.scan-row img {
		flex: none;
		border-radius: 8px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.scan-text {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.small-title {
		font-size: 1rem;
	}
	.claude-hint {
		margin-top: 4px;
		padding: 2px 10px;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.16);
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
	progress:not([value]) {
		background: linear-gradient(90deg, var(--surface-2) 30%, var(--accent) 50%, var(--surface-2) 70%) 0 0 /
			300% 100%;
		animation: indeterminate 1.4s linear infinite;
	}
	progress:not([value])::-webkit-progress-bar {
		background: transparent;
	}
	progress:not([value])::-moz-progress-bar {
		background: transparent;
	}
	@keyframes indeterminate {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: 0 0;
		}
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
	.notice p {
		margin: 0;
	}
	.candidates ul {
		list-style: none;
		margin: 6px 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.candidates li {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.cand {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow-wrap: anywhere;
	}
	.ask {
		font-weight: 600;
	}
	.lines {
		margin: 0 0 12px;
		padding: 10px 14px;
		border-radius: var(--radius-s);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.lines summary {
		cursor: pointer;
		font-weight: 600;
	}
	.target {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 10px 0 8px;
	}
	.line-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.chip.line {
		max-width: 100%;
		overflow-wrap: anywhere;
		text-align: left;
	}
	.sources {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.src {
		font-weight: 600;
	}
	.undo {
		border: 0;
		background: none;
		padding: 0 4px;
		color: var(--accent);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
	.notice-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 8px;
	}
	.crop-frame {
		text-align: center;
	}
	.same p {
		margin: 0 0 10px;
		font-weight: 600;
	}
	.same form {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.notice {
		margin: 0 0 12px;
		padding: 10px 14px;
		border-radius: var(--radius-s);
		background: color-mix(in srgb, var(--gold) 14%, var(--surface));
	}
</style>
