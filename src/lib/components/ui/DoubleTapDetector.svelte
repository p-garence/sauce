<!--
  @component DoubleTapDetector
  @domain ui
  @description Conteneur détectant le double-tap tactile ou double-clic souris avec animation de coeur.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { onDestroy } from 'svelte';
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		enabled?: boolean;
		onDoubleTap: (e?: MouseEvent | TouchEvent | PointerEvent) => void | Promise<void>;
		onSingleTap?: (e?: MouseEvent | TouchEvent | PointerEvent) => void | Promise<void>;
		delayMs?: number;
		showHeartFeedback?: boolean;
		class?: string;
		style?: string;
		children?: Snippet;
	}

	let {
		enabled: propEnabled,
		onDoubleTap,
		onSingleTap,
		delayMs = 250,
		showHeartFeedback = true,
		class: className = '',
		style = '',
		children
	}: Props = $props();

	let enabled = $derived(
		propEnabled !== undefined ? propEnabled : Boolean(page.data?.sessionUser?.doubleTap)
	);

	let lastTapTime = 0;
	let lastTapX = 0;
	let lastTapY = 0;

	let startPointerX = 0;
	let startPointerY = 0;
	let hasMovedSignificantly = false;
	let activePointerId: number | null = null;

	let singleTapTimeout: ReturnType<typeof setTimeout> | null = null;
	let heartTimeout: ReturnType<typeof setTimeout> | null = null;

	let showHeart = $state(false);
	let heartKey = $state(0);

	function isInteractive(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		return Boolean(
			target.closest('button, a, input, select, textarea, video[controls], [role="button"]')
		);
	}

	function handlePointerDown(e: PointerEvent) {
		if (!enabled) return;
		if (isInteractive(e.target)) return;

		// On ne suit qu'un seul pointeur actif
		if (activePointerId !== null && activePointerId !== e.pointerId) return;

		activePointerId = e.pointerId;
		startPointerX = e.clientX;
		startPointerY = e.clientY;
		hasMovedSignificantly = false;
	}

	function handlePointerMove(e: PointerEvent) {
		if (!enabled || activePointerId !== e.pointerId) return;

		const dx = Math.abs(e.clientX - startPointerX);
		const dy = Math.abs(e.clientY - startPointerY);

		// Si l'utilisateur effectue un scroll ou un swipe (> 12px), ce n'est pas un tap
		if (dx > 12 || dy > 12) {
			hasMovedSignificantly = true;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!enabled || activePointerId !== e.pointerId) return;
		activePointerId = null;

		if (isInteractive(e.target) || hasMovedSignificantly) {
			return;
		}

		const now = Date.now();
		const timeDiff = now - lastTapTime;
		const dist = Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY);

		// Double tap détecté : 2 touches rapprochées (< 300ms) et proches spatialement (< 35px)
		if (timeDiff > 0 && timeDiff < 300 && dist < 35) {
			if (singleTapTimeout) {
				clearTimeout(singleTapTimeout);
				singleTapTimeout = null;
			}
			lastTapTime = 0;

			if (showHeartFeedback) {
				showHeart = true;
				heartKey++;
				if (heartTimeout) clearTimeout(heartTimeout);
				heartTimeout = setTimeout(() => {
					showHeart = false;
				}, 850);
			}

			onDoubleTap(e);
		} else {
			lastTapTime = now;
			lastTapX = e.clientX;
			lastTapY = e.clientY;

			if (onSingleTap) {
				if (singleTapTimeout) clearTimeout(singleTapTimeout);
				singleTapTimeout = setTimeout(() => {
					onSingleTap(e);
					singleTapTimeout = null;
				}, delayMs);
			}
		}
	}

	function handlePointerCancel(e: PointerEvent) {
		if (activePointerId === e.pointerId) {
			activePointerId = null;
			hasMovedSignificantly = true;
		}
	}

	onDestroy(() => {
		if (singleTapTimeout) clearTimeout(singleTapTimeout);
		if (heartTimeout) clearTimeout(heartTimeout);
	});
</script>

{#if !enabled}
	{@render children?.()}
{:else}
<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="double-tap-detector {className}"
		{style}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerCancel}
	>
		{@render children?.()}

		{#if showHeart}
			{#key heartKey}
				<div class="heart-burst-overlay" aria-hidden="true">
					<div class="heart-burst-icon">
						<Icon name="action.like" size={84} color="#ef4444" />
					</div>
				</div>
			{/key}
		{/if}
	</div>
{/if}

<style>
	.double-tap-detector {
		position: relative;
		width: 100%;
		user-select: none;
		-webkit-user-select: none;
	}

	.heart-burst-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		z-index: 50;
	}

	.heart-burst-icon {
		animation: heartPop 0.85s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
		filter: drop-shadow(0 4px 16px rgba(0, 0, 0, 0.45));
		transform-origin: center center;
	}

	@keyframes heartPop {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		20% {
			transform: scale(1.3);
			opacity: 1;
		}
		35% {
			transform: scale(0.95);
			opacity: 1;
		}
		50% {
			transform: scale(1.05);
			opacity: 1;
		}
		70% {
			transform: scale(1);
			opacity: 1;
		}
		100% {
			transform: scale(1.4);
			opacity: 0;
		}
	}
</style>
