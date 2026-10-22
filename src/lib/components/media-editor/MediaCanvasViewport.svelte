<!--
  @component MediaCanvasViewport
  @domain media-editor
  @description Zone d'affichage du viewport et de manipulation (pan, zoom, grille et calques de dessin/texte/image).
  @responsibilities
    - Rendre le conteneur aux dimensions de recadrage calculées (cropW x cropH)
    - Afficher la vidéo ou l'image avec transform pan/zoom
    - Gérer le déplacement panoramique (panning) de l'image de base au pointeur
    - Afficher la grille de tiers lors du glissement
    - Héberger les calques MediaDrawingLayer et MediaOverlaysLayer
-->
<script lang="ts">
	import type { TextItem, ImageOverlayItem, DrawingStroke, EditorMode } from './types';
	import MediaDrawingLayer from './MediaDrawingLayer.svelte';
	import MediaOverlaysLayer from './MediaOverlaysLayer.svelte';

	/**
	 * Propriétés du composant MediaCanvasViewport
	 */
	interface Props {
		/** Largeur en pixels de la zone de recadrage */
		cropW: number;
		/** Hauteur en pixels de la zone de recadrage */
		cropH: number;
		/** Ratio d'aspect de la zone de recadrage */
		ratio?: '1:1' | '4:5';
		/** URL objet du fichier média en cours d'édition */
		objectUrl: string;
		/** Indique si le média est une vidéo */
		isVideo: boolean;
		/** Décalage horizontal du pan de l'image */
		panX: number;
		/** Décalage vertical du pan de l'image */
		panY: number;
		/** Niveau de zoom actuel */
		zoom: number;
		/** Mode actif de l'éditeur */
		activeMode: EditorMode;
		/** Référence vers l'élément HTML Image de l'image de base */
		imageElement?: HTMLImageElement;
		/** Référence vers l'élément HTML de la zone de recadrage */
		cropAreaElement?: HTMLDivElement;
		/** Traits de dessin vectoriel */
		strokes: DrawingStroke[];
		/** Couleur du pinceau de dessin */
		brushColor: string;
		/** Épaisseur relative du pinceau */
		brushRelSize: number;
		/** Calques de texte */
		texts: TextItem[];
		/** Calques d'images incrustées */
		images: ImageOverlayItem[];
		/** Identifiant du texte actif */
		activeTextId: string | null;
		/** Identifiant de l'image active */
		activeImageId: string | null;
		/** Callback lorsqu'un trait de dessin est achevé */
		onStrokeComplete: (stroke: DrawingStroke) => void;
		/** Callback lorsqu'un texte est sélectionné */
		onSelectText: (item: TextItem) => void;
		/** Callback lorsqu'une image est sélectionnée */
		onSelectImage: (item: ImageOverlayItem) => void;
		/** Callback pour sauvegarder un état dans l'historique */
		onHistoryPush: () => void;
	}

	let {
		cropW,
		cropH,
		ratio = '4:5',
		objectUrl,
		isVideo,
		panX = $bindable(0),
		panY = $bindable(0),
		zoom,
		activeMode,
		imageElement = $bindable(),
		cropAreaElement = $bindable(),
		strokes,
		brushColor,
		brushRelSize,
		texts = $bindable(),
		images = $bindable(),
		activeTextId,
		activeImageId,
		onStrokeComplete,
		onSelectText,
		onSelectImage,
		onHistoryPush
	}: Props = $props();

	let isDragging = $state(false);
	let activePhotoPointerId = $state<number | null>(null);
	let startX = 0;
	let startY = 0;
	let initialPanX = 0;
	let initialPanY = 0;

	function photoPointerDown(e: PointerEvent) {
		if (activeMode !== 'crop') return;
		if (activePhotoPointerId !== null) return;
		activePhotoPointerId = e.pointerId;
		isDragging = true;
		startX = e.clientX - panX;
		startY = e.clientY - panY;
		initialPanX = panX;
		initialPanY = panY;
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function photoPointerMove(e: PointerEvent) {
		if (!isDragging || e.pointerId !== activePhotoPointerId) return;
		if (e.pointerType === 'mouse' && (e.buttons & 1) !== 1) {
			isDragging = false;
			activePhotoPointerId = null;
			if (panX !== initialPanX || panY !== initialPanY) {
				onHistoryPush?.();
			}
			return;
		}
		panX = e.clientX - startX;
		panY = e.clientY - startY;
	}

	function photoPointerUp(e: PointerEvent) {
		if (e.pointerId === activePhotoPointerId) {
			isDragging = false;
			activePhotoPointerId = null;
			try {
				(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
			} catch {
				/* ignore */
			}
			if (panX !== initialPanX || panY !== initialPanY) {
				onHistoryPush?.();
			}
		}
	}
</script>

<div
	bind:this={cropAreaElement}
	class="crop-area"
	style="width: {cropW}px; height: {cropH}px;"
>
	{#if objectUrl}
		{#if isVideo}
			<video src={objectUrl} autoplay muted loop playsinline></video>
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="photo-stage"
				style="transform: translate({panX}px, {panY}px) scale({zoom});"
				onpointerdown={photoPointerDown}
				onpointermove={photoPointerMove}
				onpointerup={photoPointerUp}
				onpointercancel={photoPointerUp}
			>
				<img bind:this={imageElement} src={objectUrl} alt="Preview" draggable="false" />

				<MediaDrawingLayer
					{cropW}
					{cropH}
					{strokes}
					{brushColor}
					{brushRelSize}
					{activeMode}
					{panX}
					{panY}
					{zoom}
					{cropAreaElement}
					{onStrokeComplete}
				/>

				<MediaOverlaysLayer
					{cropW}
					{ratio}
					bind:texts
					bind:images
					{activeTextId}
					{activeImageId}
					{onSelectText}
					{onSelectImage}
					{onHistoryPush}
				/>
			</div>
		{/if}
	{/if}

	<div class="grid" class:visible={isDragging}>
		<div class="vline" style="left: 33.33%"></div>
		<div class="vline" style="left: 66.66%"></div>
		<div class="hline" style="top: 33.33%"></div>
		<div class="hline" style="top: 66.66%"></div>
	</div>
</div>

<style>
	.crop-area {
		position: relative;
		overflow: hidden;
		background: #000;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
		user-select: none;
		touch-action: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.photo-stage {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transform-origin: center center;
		cursor: grab;
		width: 100%;
		height: 100%;
		touch-action: none;
	}

	.photo-stage:active {
		cursor: grabbing;
	}

	.photo-stage img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
		transform-origin: center;
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.crop-area video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	/* Grille de recadrage façon Instagram (règle des tiers) */
	.grid {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.grid.visible {
		opacity: 1;
	}

	.vline,
	.hline {
		position: absolute;
		background: rgba(255, 255, 255, 0.4);
		box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
	}

	.vline {
		top: 0;
		bottom: 0;
		width: 1px;
	}

	.hline {
		left: 0;
		right: 0;
		height: 1px;
	}
</style>
