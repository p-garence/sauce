<!--
  @component Icon
  @domain ui
  @description Rendu polymorphe d'icônes SVG (packs natifs ou personnalisés).
-->
<script lang="ts">
	import type { IconId } from '$lib/icons/types';
	import { ORIGINAL_ICONS, LUCIDE_ICONS } from '$lib/icons/registry';
	import { iconTheme } from '$lib/client/iconTheme.svelte';

	let {
		name,
		size = 20,
		class: className = '',
		color = 'currentColor',
		strokeWidth = 2
	}: {
		name: IconId;
		size?: number | string;
		class?: string;
		color?: string;
		strokeWidth?: number;
	} = $props();

	let pack = $derived(iconTheme.pack);
	let fallback = $derived(iconTheme.fallback);

	let sizeNum = $derived(typeof size === 'number' ? size : parseInt(String(size), 10) || 20);
	let sizeStyle = $derived(typeof size === 'number' ? `${size}px` : size);

	let customSizeStyle = $derived.by(() => {
		if (typeof size === 'number') {
			return `${Math.round(size * 1.25)}px`;
		}
		const num = parseFloat(String(size));
		const unit =
			String(size)
				.replace(/^[\d.-]+/, '')
				.trim() || 'px';
		if (!isNaN(num)) {
			return `${Math.round(num * 1.25 * 100) / 100}${unit}`;
		}
		return `calc(${size} * 1.25)`;
	});

	let LucideComponent = $derived(LUCIDE_ICONS[name]);
	let originalEmoji = $derived(ORIGINAL_ICONS[name] || '•');

	// Image personnalisée enregistrée localement dans le navigateur (Data URL)
	let localCustomDataUrl = $derived(iconTheme.getCustomIcon(name));

	// Gestion spéciale du cœur rempli en Lucide
	let isFilledLike = $derived(name === 'action.like');
</script>

{#if pack === 'sauce' && localCustomDataUrl}
	<img
		src={localCustomDataUrl}
		alt=""
		class="app-icon-img {className}"
		style="width: {customSizeStyle}; height: {customSizeStyle}; object-fit: contain; vertical-align: middle;"
	/>
{:else if (pack === 'lucide' || (pack === 'sauce' && fallback === 'lucide')) && LucideComponent}
	<span
		class="app-icon-wrapper lucide-wrapper {className}"
		style="display: inline-flex; align-items: center; justify-content: center; width: {sizeStyle}; height: {sizeStyle}; color: {color};"
	>
		<LucideComponent size={sizeNum} {color} {strokeWidth} fill={isFilledLike ? color : 'none'} />
	</span>
{:else}
	<span
		class="app-icon-emoji {className}"
		style="font-size: {sizeStyle}; line-height: 1; display: inline-flex; align-items: center; justify-content: center;"
		aria-hidden="true"
	>
		{originalEmoji}
	</span>
{/if}

<style>
	.app-icon-wrapper {
		vertical-align: middle;
		flex-shrink: 0;
	}

	.app-icon-img {
		flex-shrink: 0;
		display: inline-block;
	}

	.app-icon-emoji {
		user-select: none;
	}
</style>
