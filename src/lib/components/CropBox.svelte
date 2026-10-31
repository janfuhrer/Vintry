<script lang="ts">
	import type { Crop } from '#lib/image.ts';

	let {
		src,
		label,
		hint,
		crop = $bindable({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
	}: {
		src: string;
		/** Accessible name of the box */
		label: string;
		/** How to move and resize it, read out with the box */
		hint: string;
		/** Where the label is, as fractions of the photo */
		crop?: Crop;
	} = $props();

	const hintId = $props.id();
	const MIN = 0.1;
	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

	type Mode = 'move' | 'nw' | 'ne' | 'sw' | 'se';
	const CORNERS = ['nw', 'ne', 'sw', 'se'] as const;
	let frame: HTMLDivElement | undefined = $state();
	let drag: { mode: Mode; px: number; py: number; start: Crop } | null = null;

	function down(e: PointerEvent, mode: Mode) {
		e.preventDefault();
		e.stopPropagation();
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		drag = { mode, px: e.clientX, py: e.clientY, start: { ...crop } };
	}

	function resize(s: Crop, mode: Mode, dx: number, dy: number): Crop {
		if (mode === 'move') return { ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) };
		let { x, y, w, h } = s;
		if (mode.includes('w')) {
			x = clamp(s.x + dx, 0, s.x + s.w - MIN);
			w = s.x + s.w - x;
		}
		if (mode.includes('e')) w = clamp(s.w + dx, MIN, 1 - s.x);
		if (mode.includes('n')) {
			y = clamp(s.y + dy, 0, s.y + s.h - MIN);
			h = s.y + s.h - y;
		}
		if (mode.includes('s')) h = clamp(s.h + dy, MIN, 1 - s.y);
		return { x, y, w, h };
	}

	function move(e: PointerEvent) {
		if (!drag || !frame) return;
		const r = frame.getBoundingClientRect();
		crop = resize(drag.start, drag.mode, (e.clientX - drag.px) / r.width, (e.clientY - drag.py) / r.height);
	}

	// arrows move the box, with Shift they grow or shrink it from the bottom right
	function key(e: KeyboardEvent) {
		const step = 0.02;
		const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[
			e.key
		];
		if (!d) return;
		e.preventDefault();
		crop = resize(crop, e.shiftKey ? 'se' : 'move', d[0], d[1]);
	}
</script>

<div class="frame" bind:this={frame}>
	<img {src} alt="" draggable="false" />
	<!-- pointer capture sends a drag's moves to the box or handle that started it; both end up here.
	     role="application" is a focusable widget with its own keys (ARIA), which Svelte's check doesn't know -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="box"
		role="application"
		tabindex="0"
		aria-label={label}
		aria-describedby={hintId}
		style="left: {crop.x * 100}%; top: {crop.y * 100}%; width: {crop.w * 100}%; height: {crop.h * 100}%"
		onpointerdown={(e) => down(e, 'move')}
		onpointermove={move}
		onpointerup={() => (drag = null)}
		onpointercancel={() => (drag = null)}
		onkeydown={key}
	>
		{#each CORNERS as c (c)}
			<span class="handle {c}" aria-hidden="true" onpointerdown={(e) => down(e, c)}></span>
		{/each}
	</div>
	<span id={hintId} class="visually-hidden">{hint}</span>
</div>

<style>
	.frame {
		position: relative;
		display: inline-block;
		max-width: 100%;
		overflow: hidden;
		border-radius: var(--radius-s);
		/* dragging must not scroll the page */
		touch-action: none;
		user-select: none;
	}
	img {
		display: block;
		max-width: 100%;
		max-height: 60vh;
	}
	.box {
		position: absolute;
		box-sizing: border-box;
		border: 2px solid #fff;
		box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.55);
		cursor: move;
	}
	.box:focus-visible {
		outline: 3px solid var(--gold);
		outline-offset: 2px;
	}
	.handle {
		position: absolute;
		width: 28px;
		height: 28px;
		margin: -14px;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
	}
	.nw {
		left: 0;
		top: 0;
		cursor: nwse-resize;
	}
	.ne {
		right: 0;
		top: 0;
		cursor: nesw-resize;
	}
	.sw {
		left: 0;
		bottom: 0;
		cursor: nesw-resize;
	}
	.se {
		right: 0;
		bottom: 0;
		cursor: nwse-resize;
	}
</style>
