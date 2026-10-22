export interface TextItem {
	id: string;
	text: string;
	relX: number; // Décalage X depuis le centre, normalisé par cropW (-0.5 à 0.5)
	relY: number; // Décalage Y depuis le centre, normalisé par cropW (-0.5 à 0.5)
	relFontSize: number; // Taille de police normalisée par cropW (ex: 0.015 à 0.18)
	relWidth: number; // Largeur du cadre de texte normalisée par cropW (ex: 0.15 à 0.75)
	fontFamily: string;
	fontWeight: string;
	color: string;
	rotation: number; // Degrés (-180 à 180)
	hasBackground: boolean;
	bgColor: string;
	align?: 'left' | 'center' | 'right';
}

export interface DrawingPoint {
	relX: number;
	relY: number;
}

export interface DrawingStroke {
	id: string;
	points: DrawingPoint[];
	color: string;
	relSize: number; // Épaisseur du trait normalisée par cropW
}

export type ImageOverlayShape = 'rounded' | 'circle' | 'square';

export interface ImageOverlayItem {
	id: string;
	file: File;
	objectUrl: string;
	aspectRatio: number; // Largeur / Hauteur naturelle de l'image
	relX: number; // Décalage X depuis le centre, normalisé par cropW (-0.5 à 0.5)
	relY: number; // Décalage Y depuis le centre, normalisé par cropW (-0.5 à 0.5)
	relScale: number; // Largeur normalisée par rapport à cropW (0.15 à 0.85)
	rotation: number; // Degrés (-180 à 180)
	shape: ImageOverlayShape;
}

export interface HistorySnapshot {
	texts: TextItem[];
	strokes: DrawingStroke[];
	images: ImageOverlayItem[];
	panX?: number;
	panY?: number;
	zoom?: number;
}

export type EditorMode = 'crop' | 'text' | 'draw' | 'image';

export function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		try {
			return crypto.randomUUID();
		} catch {
			/* ignore and fallback */
		}
	}
	return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}
