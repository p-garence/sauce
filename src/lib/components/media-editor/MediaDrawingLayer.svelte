<!--
  @component MediaDrawingLayer
  @domain media-editor
  @description Calque de dessin vectoriel SVG interactif à main levée sur l'image en cours d'édition.
  @responsibilities
    - Rendre les traits existants et le trait en cours de tracé via SVG
    - Capturer les événements tactiles et pointeur en mode dessin
    - Convertir les coordonnées écran en coordonnées relatives normalisées
    - Émettre le trait finalisé vers l'historique du parent
-->
<script lang="ts">
	import type { DrawingStroke, DrawingPoint, EditorMode } from './types';
	import { generateId } from './types';
	import { computeNormalizedPoint, strokeToSvgPath } from './editor-math';

	/**
	 * Propriétés du composant MediaDrawingLayer
	 */
	interface Props {
		/** Largeur en pixels de la zone de recadrage */
		cropW: number;
		/** Hauteur en pixels de la zone de recadrage */
		cropH: number;
		/** Liste des traits finalisés */
		strokes: DrawingStroke[];
		/** Couleur du pinceau */
		brushColor: string;
		/** Épaisseur relative du pinceau (fraction de cropW) */
		brushRelSize: number;
		/** Mode actif de l'éditeur */
		activeMode: EditorMode;
		/** Décalage horizontal du pan */
		panX: number;
		/** Décalage vertical du pan */
		panY: number;
		/** Niveau de zoom actuel */
		zoom: number;
		/** Élément DOM de référence de la zone de recadrage */
		cropAreaElement?: HTMLElement;
		/** Callback déclenché à la fin d'un tracé */
		onStrokeComplete: (stroke: DrawingStroke) => void;
	}

	let {
		cropW,
		cropH,
		strokes,
		brushColor,
		brushRelSize,
		activeMode,
		panX,
		panY,
		zoom,
		cropAreaElement,
		onStrokeComplete
	}: Props = $props();

	let currentStroke = $state<DrawingStroke | null>(null);
	let activeDrawPointerId = $state<number | null>(null);

	function getNormalizedPoint(e: PointerEvent): DrawingPoint | null {
		if (!cropAreaElement) return null;
		const rect = cropAreaElement.getBoundingClientRect();
		return computeNormalizedPoint(e.clientX, e.clientY, rect, panX, panY, zoom, cropW);
	}

	function drawPointerDown(e: PointerEvent) {
		if (activeMode !== 'draw') return;
		if (activeDrawPointerId !== null) return;
		e.stopPropagation();
		const point = getNormalizedPoint(e);
		if (!point) return;
		activeDrawPointerId = e.pointerId;
		currentStroke = {
			id: generateId(),
			points: [point],
			color: brushColor,
			relSize: brushRelSize
		};
		try {
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
	}

	function drawPointerMove(e: PointerEvent) {
		if (activeMode !== 'draw' || !currentStroke || e.pointerId !== activeDrawPointerId) return;
		e.stopPropagation();
		const point = getNormalizedPoint(e);
		if (!point) return;
		currentStroke = {
			...currentStroke,
			points: [...currentStroke.points, point]
		};
	}

	function drawPointerUp(e: PointerEvent) {
		if (activeMode !== 'draw' || e.pointerId !== activeDrawPointerId) return;
		e.stopPropagation();
		activeDrawPointerId = null;
		try {
			(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
		} catch {
			/* ignore */
		}
		if (currentStroke && currentStroke.points.length > 0) {
			onStrokeComplete(currentStroke);
			currentStroke = null;
		}
	}
</script>

<!-- Calque de dessin SVG vectoriel -->
<svg class="drawing-layer" viewBox="{-cropW / 2} {-cropH / 2} {cropW} {cropH}">
	{#each strokes as stroke (stroke.id)}
		<path
			d={strokeToSvgPath(stroke.points, cropW)}
			stroke={stroke.color}
			stroke-width={stroke.relSize * cropW}
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/each}
	{#if currentStroke}
		<path
			d={strokeToSvgPath(currentStroke.points, cropW)}
			stroke={currentStroke.color}
			stroke-width={currentStroke.relSize * cropW}
			fill="none"
			stroke-linecap="round"
			stroke-linejoin="round"
		/>
	{/if}
</svg>

<!-- Overlay transparent de capture du tracé en mode Dessin -->
{#if activeMode === 'draw'}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="draw-surface"
		onpointerdown={drawPointerDown}
		onpointermove={drawPointerMove}
		onpointerup={drawPointerUp}
		onpointercancel={drawPointerUp}
	></div>
{/if}

<style>
	.drawing-layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 2;
	}

	.draw-surface {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 10;
		cursor: crosshair;
		touch-action: none;
	}
</style>
