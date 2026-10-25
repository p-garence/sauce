<!--
  @component MediaOverlaysLayer
  @domain media-editor
  @description Calque de rendu et manipulation tactile/souris des overlays (textes enrichis et images incrustées).
  @responsibilities
    - Positionner les éléments texte et image avec rotation, échelle et forme
    - Gérer le glisser-déposer tactile et souris avec clampage dans les bornes
    - Gérer la sélection active d'un élément pour ouvrir sa barre d'outils
    - Notifier l'historique lors de la fin d'un déplacement
-->
<script lang="ts">
	import RichContent from '$lib/components/ui/RichContent.svelte';
	import type { TextItem, ImageOverlayItem } from './types';
	import { clampTextPosition } from './editor-math';

	/**
	 * Propriétés du composant MediaOverlaysLayer
	 */
	interface Props {
		/** Largeur en pixels de la zone de recadrage de référence */
		cropW: number;
		/** Ratio d'aspect de la zone de recadrage */
		ratio?: '1:1' | '4:5';
		/** Calques de texte */
		texts: TextItem[];
		/** Calques d'images incrustées */
		images: ImageOverlayItem[];
		/** Identifiant du texte actif */
		activeTextId: string | null;
		/** Identifiant de l'image active */
		activeImageId: string | null;
		/** Callback lorsqu'un calque texte est sélectionné */
		onSelectText: (item: TextItem) => void;
		/** Callback lorsqu'un calque image est sélectionné */
		onSelectImage: (item: ImageOverlayItem) => void;
		/** Callback pour enregistrer un état dans l'historique */
		onHistoryPush: () => void;
	}

	let {
		cropW,
		ratio = '4:5',
		texts = $bindable(),
		images = $bindable(),
		activeTextId,
		activeImageId,
		onSelectText,
		onSelectImage,
		onHistoryPush
	}: Props = $props();

	// Déplacement interactif du texte
	let isDraggingText = $state(false);
	let isPointerDownOnText = false;
	let activeDragPointerId: number | null = null;
	let textPointerStartX = 0;
	let textPointerStartY = 0;
	let textInitialRelX = 0;
	let textInitialRelY = 0;
	let hasMovedText = false;

	// Déplacement interactif de l'image incrustée
	let isDraggingImage = $state(false);
	let isPointerDownOnImage = false;
	let activeImageDragPointerId: number | null = null;
	let imagePointerStartX = 0;
	let imagePointerStartY = 0;
	let imageInitialRelX = 0;
	let imageInitialRelY = 0;
	let hasMovedImage = false;

	function onCanvasTextPointerDown(e: PointerEvent, item: TextItem) {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		e.stopPropagation();

		isPointerDownOnText = true;
		hasMovedText = false;
		isDraggingText = false;
		activeDragPointerId = e.pointerId;
		textPointerStartX = e.clientX;
		textPointerStartY = e.clientY;
		textInitialRelX = item.relX;
		textInitialRelY = item.relY;

		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function onCanvasTextPointerMove(e: PointerEvent, item: TextItem) {
		if (!isPointerDownOnText || e.pointerId !== activeDragPointerId) return;
		const deltaScreenX = e.clientX - textPointerStartX;
		const deltaScreenY = e.clientY - textPointerStartY;

		if (!hasMovedText && Math.hypot(deltaScreenX, deltaScreenY) > 4) {
			hasMovedText = true;
			isDraggingText = true;
		}

		if (hasMovedText) {
			e.stopPropagation();
			const deltaRelX = deltaScreenX / cropW;
			const deltaRelY = deltaScreenY / cropW;
			const clamped = clampTextPosition(
				textInitialRelX + deltaRelX,
				textInitialRelY + deltaRelY,
				ratio
			);
			item.relX = clamped.relX;
			item.relY = clamped.relY;
		}
	}

	function onCanvasTextPointerUp(e: PointerEvent, item: TextItem) {
		if (!isPointerDownOnText || e.pointerId !== activeDragPointerId) return;
		isPointerDownOnText = false;
		activeDragPointerId = null;

		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}

		if (hasMovedText) {
			isDraggingText = false;
			hasMovedText = false;
			e.stopPropagation();
			onHistoryPush();
		} else {
			isDraggingText = false;
			hasMovedText = false;
			e.stopPropagation();
			onSelectText(item);
		}
	}

	function onCanvasImagePointerDown(e: PointerEvent, item: ImageOverlayItem) {
		if (e.button !== 0 && e.pointerType === 'mouse') return;
		e.stopPropagation();

		isPointerDownOnImage = true;
		hasMovedImage = false;
		isDraggingImage = false;
		activeImageDragPointerId = e.pointerId;
		imagePointerStartX = e.clientX;
		imagePointerStartY = e.clientY;
		imageInitialRelX = item.relX;
		imageInitialRelY = item.relY;

		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function onCanvasImagePointerMove(e: PointerEvent, item: ImageOverlayItem) {
		if (!isPointerDownOnImage || e.pointerId !== activeImageDragPointerId) return;
		const deltaScreenX = e.clientX - imagePointerStartX;
		const deltaScreenY = e.clientY - imagePointerStartY;

		if (!hasMovedImage && Math.hypot(deltaScreenX, deltaScreenY) > 4) {
			hasMovedImage = true;
			isDraggingImage = true;
		}

		if (hasMovedImage) {
			e.stopPropagation();
			const deltaRelX = deltaScreenX / cropW;
			const deltaRelY = deltaScreenY / cropW;
			const clamped = clampTextPosition(
				imageInitialRelX + deltaRelX,
				imageInitialRelY + deltaRelY,
				ratio
			);
			item.relX = clamped.relX;
			item.relY = clamped.relY;
		}
	}

	function onCanvasImagePointerUp(e: PointerEvent, item: ImageOverlayItem) {
		if (!isPointerDownOnImage || e.pointerId !== activeImageDragPointerId) return;
		isPointerDownOnImage = false;
		activeImageDragPointerId = null;

		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}

		if (hasMovedImage) {
			isDraggingImage = false;
			hasMovedImage = false;
			e.stopPropagation();
			onHistoryPush();
		} else {
			isDraggingImage = false;
			hasMovedImage = false;
			e.stopPropagation();
			onSelectImage(item);
		}
	}
</script>

<!-- Calques d'images incrustées -->
{#each images as item (item.id)}
	{@const isSelected = activeImageId === item.id}
	{@const pxX = item.relX * cropW}
	{@const pxY = item.relY * cropW}
	{@const targetW = Math.round(item.relScale * cropW)}
	{@const targetH = Math.round(targetW / (item.aspectRatio || 1))}
	<div
		class="image-overlay-element"
		class:selected={isSelected}
		class:dragging={isDraggingImage && activeImageId === item.id}
		class:shape-circle={item.shape === 'circle'}
		class:shape-rounded={item.shape === 'rounded'}
		class:shape-square={item.shape === 'square'}
		style="
			left: calc(50% + {pxX}px);
			top: calc(50% + {pxY}px);
			width: {targetW}px;
			height: {item.shape === 'circle' ? targetW : targetH}px;
			transform: translate(-50%, -50%) rotate({item.rotation}deg);
		"
		onpointerdown={(e) => onCanvasImagePointerDown(e, item)}
		onpointermove={(e) => onCanvasImagePointerMove(e, item)}
		onpointerup={(e) => onCanvasImagePointerUp(e, item)}
		onpointercancel={(e) => onCanvasImagePointerUp(e, item)}
		onlostpointercapture={() => {
			isPointerDownOnImage = false;
			activeImageDragPointerId = null;
			isDraggingImage = false;
			hasMovedImage = false;
		}}
		role="button"
		tabindex="0"
		title={isSelected ? "Glisser pour déplacer l'image" : "Cliquer pour modifier l'image"}
	>
		<img src={item.objectUrl} alt="Incrustation" draggable="false" class="overlay-img" />
	</div>
{/each}

<!-- Calques de texte superposés -->
{#each texts as item (item.id)}
	{@const isSelected = activeTextId === item.id}
	{@const pxX = item.relX * cropW}
	{@const pxY = item.relY * cropW}
	{@const pxSize = Math.max(6, Math.round(item.relFontSize * cropW))}
	{@const pxWidth = Math.min(Math.round(cropW * 0.75), Math.round(item.relWidth * cropW))}
	<div
		class="text-element"
		class:selected={isSelected}
		class:dragging={isDraggingText && activeTextId === item.id}
		class:has-bg={item.hasBackground}
		style="
			left: calc(50% + {pxX}px);
			top: calc(50% + {pxY}px);
			width: {pxWidth}px;
			max-width: {Math.round(cropW * 0.75)}px;
			font-size: {pxSize}px;
			font-family: {item.fontFamily};
			font-weight: {item.fontWeight};
			color: {item.color};
			text-align: {item.align || 'center'};
			transform: translate(-50%, -50%) rotate({item.rotation}deg);
			background: {item.hasBackground ? item.bgColor : 'transparent'};
		"
		onpointerdown={(e) => onCanvasTextPointerDown(e, item)}
		onpointermove={(e) => onCanvasTextPointerMove(e, item)}
		onpointerup={(e) => onCanvasTextPointerUp(e, item)}
		onpointercancel={(e) => onCanvasTextPointerUp(e, item)}
		onlostpointercapture={() => {
			isPointerDownOnText = false;
			activeDragPointerId = null;
			isDraggingText = false;
			hasMovedText = false;
		}}
		role="button"
		tabindex="0"
		title={isSelected
			? 'Glisser pour déplacer le texte (cliquer pour modifier)'
			: 'Cliquer pour modifier'}
	>
		<span class="text-display">
			<RichContent content={item.text || 'Texte'} clickable={false} />
		</span>
	</div>
{/each}

<style>
	.image-overlay-element {
		position: absolute;
		user-select: none;
		cursor: grab;
		z-index: 3;
		touch-action: none;
		box-sizing: border-box;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.image-overlay-element.selected {
		outline: 2px dashed #0095f6;
		outline-offset: 2px;
	}

	.image-overlay-element.dragging {
		cursor: grabbing;
	}

	.image-overlay-element.shape-circle {
		border-radius: 50%;
	}
	.image-overlay-element.shape-rounded {
		border-radius: 14%;
	}
	.image-overlay-element.shape-square {
		border-radius: 0;
	}

	.overlay-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	.text-element {
		position: absolute;
		user-select: none;
		cursor: grab;
		z-index: 4;
		line-height: 1.25;
		word-break: break-word;
		padding: 4px 8px;
		border-radius: 6px;
		transition: outline 0.15s ease;
		touch-action: none;
		box-sizing: border-box;
	}

	.text-element.selected {
		outline: 2px dashed #0095f6;
		outline-offset: 2px;
	}

	.text-element.dragging {
		cursor: grabbing;
	}

	.text-element.has-bg {
		border-radius: 8px;
	}

	.text-display {
		pointer-events: none;
		display: inline-block;
		width: 100%;
	}
</style>
