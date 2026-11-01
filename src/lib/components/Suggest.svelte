<script lang="ts" module>
	export interface SuggestOption {
		value: string;
		/** Shown after the value, e.g. a flag or "also: Wallis" */
		hint?: string;
		/** Other names that find it */
		also?: string[];
		/** whatever the caller wants back when it is picked */
		data?: unknown;
	}
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { normalize } from '#lib/wine.ts';

	// A text field with a list of suggestions under it. Free text stays allowed; the list only
	// helps. It replaces <datalist>, which iOS Safari shows as a bar above the keyboard at best.
	let {
		value = $bindable(''),
		options,
		empty = [],
		onpick,
		onkeydown,
		ontype,
		remote = false,
		max = 8,
		...rest
	}: {
		value?: string;
		options: SuggestOption[];
		/** What to offer while the field is still empty */
		empty?: SuggestOption[];
		onpick?: (value: string, option: SuggestOption) => void;
		onkeydown?: (e: KeyboardEvent) => void;
		/** called as the user types, e.g. to fetch options */
		ontype?: (value: string) => void;
		/** the options are already what fits the typed text (from the server): no filtering here */
		remote?: boolean;
		max?: number;
	} & Omit<HTMLInputAttributes, 'value' | 'onkeydown'> = $props();

	const id = $props.id();
	let open = $state(false);
	let active = $state(-1);

	// names starting with what was typed first, then those containing it
	const shown = $derived.by(() => {
		const q = normalize(value);
		if (!q) return empty.slice(0, max);
		if (remote) return options.filter((o) => normalize(o.value) !== q || o.hint).slice(0, max);
		const starts: SuggestOption[] = [];
		const contains: SuggestOption[] = [];
		for (const o of options) {
			// what is already typed out in full needs no suggestion
			if (normalize(o.value) === q) continue;
			const names = [o.value, ...(o.also ?? [])].map(normalize);
			if (names.some((n) => n.startsWith(q))) starts.push(o);
			else if (names.some((n) => n.includes(q))) contains.push(o);
		}
		return [...starts, ...contains].slice(0, max);
	});
	const expanded = $derived(open && shown.length > 0);

	function pick(o: SuggestOption) {
		value = o.value;
		open = false;
		active = -1;
		onpick?.(o.value, o);
	}

	function key(e: KeyboardEvent) {
		if (expanded && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
			e.preventDefault();
			const n = shown.length;
			active = e.key === 'ArrowDown' ? (active + 1) % n : (active - 1 + n) % n;
			return;
		}
		if (expanded && e.key === 'Enter' && active >= 0) {
			e.preventDefault();
			pick(shown[active]);
			return;
		}
		if (e.key === 'Escape' && expanded) {
			e.preventDefault();
			open = false;
			return;
		}
		onkeydown?.(e);
	}
</script>

<span class="suggest">
	<input
		{...rest}
		bind:value
		role="combobox"
		autocomplete="off"
		aria-autocomplete="list"
		aria-expanded={expanded}
		aria-controls="{id}-list"
		aria-activedescendant={expanded && active >= 0 ? `${id}-${active}` : undefined}
		onfocus={() => (open = true)}
		onblur={() => setTimeout(() => ((open = false), (active = -1)), 150)}
		oninput={() => {
			open = true;
			active = -1;
			ontype?.(value);
		}}
		onkeydown={key}
	/>
	{#if expanded}
		<ul class="list" id="{id}-list" role="listbox">
			{#each shown as o, i (o.value)}
				<!-- pointerdown keeps the focus in the field, so the tap reaches the option; should a
				     browser blur it anyway, the list closes a moment later, after the tap -->
				<li
					id="{id}-{i}"
					role="option"
					aria-selected={i === active}
					class:active={i === active}
					onpointerdown={(e) => e.preventDefault()}
					onclick={() => pick(o)}
					onkeydown={() => {}}
				>
					<span>{o.value}</span>
					{#if o.hint}<span class="hint">{o.hint}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
</span>

<style>
	.suggest {
		position: relative;
		display: block;
		flex: 1;
		min-width: 120px;
	}
	.suggest input {
		width: 100%;
	}
	.list {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 4px);
		z-index: 20;
		min-width: 220px;
		max-height: 280px;
		overflow-y: auto;
		margin: 0;
		padding: 4px;
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius-s);
		box-shadow: var(--shadow);
	}
	li {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 12px;
		border-radius: 8px;
		cursor: pointer;
		color: var(--text);
		font-weight: 500;
	}
	li.active,
	li:hover {
		background: var(--surface-2);
	}
	.hint {
		color: var(--muted);
		font-size: 0.85rem;
		text-align: right;
	}
</style>
