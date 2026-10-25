import type { DrawingPoint } from './types';

/**
 * Calcule les dimensions réelles (largeur et hauteur) de la zone de recadrage
 * pour s'adapter à l'espace de travail disponible tout en respectant le ratio cible.
 */
export function computeCropDimensions(
	workW: number,
	workH: number,
	ratio: '1:1' | '4:5'
): { cropW: number; cropH: number } {
	if (!workW || !workH) return { cropW: 0, cropH: 0 };
	const targetRatio = ratio === '1:1' ? 1 : 4 / 5;
	const workRatio = workW / workH;
	if (workRatio > targetRatio) {
		return {
			cropW: workH * targetRatio,
			cropH: workH
		};
	}
	return {
		cropW: workW,
		cropH: workW / targetRatio
	};
}

/**
 * Contraint les coordonnées relatives du texte pour éviter qu'il ne disparaisse
 * complètement en dehors des limites visibles de l'image.
 */
export function clampTextPosition(
	relX: number,
	relY: number,
	ratio: '1:1' | '4:5'
): { relX: number; relY: number } {
	const clampedX = Math.max(-0.5, Math.min(0.5, relX));
	const maxVerticalRel = ratio === '1:1' ? 0.5 : 0.625;
	const clampedY = Math.max(-maxVerticalRel, Math.min(maxVerticalRel, relY));
	return { relX: clampedX, relY: clampedY };
}

/**
 * Normalise un point de clic/pointer de l'écran en coordonnées relatives [-0.5, 0.5]
 * par rapport au centre de la zone de recadrage, en tenant compte du zoom et du pan.
 */
export function computeNormalizedPoint(
	clientX: number,
	clientY: number,
	cropRect: DOMRect,
	panX: number,
	panY: number,
	zoom: number,
	cropW: number
): DrawingPoint {
	const centerX = cropRect.left + cropRect.width / 2;
	const centerY = cropRect.top + cropRect.height / 2;
	const effectiveCropW = cropW || 1;
	const effectiveZoom = zoom || 1;
	const relX = (clientX - (centerX + panX)) / effectiveZoom / effectiveCropW;
	const relY = (clientY - (centerY + panY)) / effectiveZoom / effectiveCropW;
	return { relX, relY };
}

/**
 * Convertit une série de points de tracé normalisés en chaîne de chemin SVG (d)
 */
export function strokeToSvgPath(points: DrawingPoint[], w: number): string {
	if (points.length === 0) return '';
	if (points.length === 1) {
		const x = points[0].relX * w;
		const y = points[0].relY * w;
		return `M ${x} ${y} L ${x + 0.1} ${y + 0.1}`;
	}
	let d = `M ${points[0].relX * w} ${points[0].relY * w}`;
	for (let i = 1; i < points.length; i++) {
		d += ` L ${points[i].relX * w} ${points[i].relY * w}`;
	}
	return d;
}
