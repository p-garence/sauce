import type { TextItem, DrawingStroke, ImageOverlayItem } from './types';
import { emojiStore } from '$lib/client/emojiStore.svelte';

/**
 * Mesure la largeur d'une ligne contenant du texte et des tokens d'émojis personnalisés
 */
function measureTokenizedLine(
	ctx: CanvasRenderingContext2D,
	text: string,
	emojiCache?: Record<string, HTMLImageElement>,
	fontSizePx?: number
): number {
	if (!emojiCache || !fontSizePx) {
		return ctx.measureText(text).width;
	}
	const regex = /(:[a-zA-Z0-9_-]{2,50}:)/g;
	const parts = text.split(regex);
	let total = 0;
	for (const part of parts) {
		if (!part) continue;
		const match = part.match(/^:([a-zA-Z0-9_-]{2,50}):$/);
		if (match && emojiCache[match[1].toLowerCase()]) {
			const emojiImg = emojiCache[match[1].toLowerCase()];
			const emojiSize = fontSizePx * 1.35;
			const naturalW = emojiImg.naturalWidth || 1;
			const naturalH = emojiImg.naturalHeight || 1;
			const aspect = naturalW / naturalH;
			const drawW = aspect < 1 ? emojiSize * aspect : emojiSize;
			total += drawW + fontSizePx * 0.2;
		} else {
			total += ctx.measureText(part).width;
		}
	}
	return total;
}

/**
 * Découpe un texte en lignes adaptées à la largeur maximale autorisée
 */
export function wrapTextLines(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
	emojiCache?: Record<string, HTMLImageElement>,
	fontSizePx?: number
): string[] {
	const trimmedText = text.replace(/^\n+/, '').replace(/\n+$/, '');
	if (!trimmedText) return [];
	const rawParagraphs = trimmedText.split('\n');
	const resultLines: string[] = [];

	for (const paragraph of rawParagraphs) {
		if (!paragraph) {
			resultLines.push('');
			continue;
		}

		const words = paragraph.split(' ');
		let currentLine = words[0];

		for (let i = 1; i < words.length; i++) {
			const word = words[i];
			const testLine = currentLine + ' ' + word;
			const width = measureTokenizedLine(ctx, testLine, emojiCache, fontSizePx);
			if (width <= maxWidth) {
				currentLine = testLine;
			} else {
				resultLines.push(currentLine);
				currentLine = word;
			}
		}
		resultLines.push(currentLine);
	}

	return resultLines;
}

export interface CanvasRenderOptions {
	file: File;
	imageElement: HTMLImageElement;
	cropW: number;
	cropH: number;
	panX: number;
	panY: number;
	zoom: number;
	ratio: '1:1' | '4:5';
	strokes: DrawingStroke[];
	texts: TextItem[];
	images?: ImageOverlayItem[];
}

/**
 * Dessine une image source dans un rectangle destination en simulant object-fit: cover
 */
function drawCoverImage(
	ctx: CanvasRenderingContext2D,
	img: HTMLImageElement,
	dx: number,
	dy: number,
	dw: number,
	dh: number
) {
	const naturalW = img.naturalWidth || 1;
	const naturalH = img.naturalHeight || 1;
	const imgRatio = naturalW / naturalH;
	const destRatio = dw / dh;
	let sx = 0;
	let sy = 0;
	let sw = naturalW;
	let sh = naturalH;

	if (imgRatio > destRatio) {
		sw = naturalH * destRatio;
		sx = (naturalW - sw) / 2;
	} else {
		sh = naturalW / destRatio;
		sy = (naturalH - sh) / 2;
	}

	ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/**
 * Génère le rendu HD 1080p final sur un élément canvas et renvoie le File JPEG
 */
export async function renderAndExportCanvas(options: CanvasRenderOptions): Promise<File | null> {
	const { file, imageElement, cropW, cropH, panX, panY, zoom, ratio, strokes, texts, images } =
		options;

	const canvas = document.createElement('canvas');
	canvas.width = 1080;
	canvas.height = ratio === '1:1' ? 1080 : 1350;

	const ctx = canvas.getContext('2d');
	if (!ctx || !imageElement) return null;

	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const imgW = imageElement.naturalWidth;
	const imgH = imageElement.naturalHeight;

	const scaleX = cropW / imgW;
	const scaleY = cropH / imgH;
	const baseScale = Math.min(scaleX, scaleY);

	const displayedW = imgW * baseScale;
	const displayedH = imgH * baseScale;

	const canvasRatio = canvas.width / cropW;

	ctx.save();
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.translate(panX * canvasRatio, panY * canvasRatio);
	ctx.scale(zoom, zoom);

	const drawW = displayedW * canvasRatio;
	const drawH = displayedH * canvasRatio;

	// 1. Dessin de l'image de base
	ctx.drawImage(imageElement, -drawW / 2, -drawH / 2, drawW, drawH);

	// 2. Rendu haute résolution des traits de dessin
	for (const stroke of strokes) {
		if (stroke.points.length === 0) continue;
		ctx.save();
		ctx.strokeStyle = stroke.color;
		ctx.lineWidth = Math.max(1, stroke.relSize * canvas.width);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		const p0 = stroke.points[0];
		const x0 = p0.relX * canvas.width;
		const y0 = p0.relY * canvas.width;

		if (stroke.points.length === 1) {
			ctx.beginPath();
			ctx.arc(x0, y0, (stroke.relSize * canvas.width) / 2, 0, Math.PI * 2);
			ctx.fillStyle = stroke.color;
			ctx.fill();
		} else {
			ctx.beginPath();
			ctx.moveTo(x0, y0);
			for (let i = 1; i < stroke.points.length; i++) {
				const p = stroke.points[i];
				ctx.lineTo(p.relX * canvas.width, p.relY * canvas.width);
			}
			ctx.stroke();
		}
		ctx.restore();
	}

	// 2.5 Rendu haute résolution des calques d'images incrustées
	if (images && images.length > 0) {
		for (const item of images) {
			ctx.save();
			const tx = item.relX * canvas.width;
			const ty = item.relY * canvas.width;
			ctx.translate(tx, ty);
			ctx.rotate((item.rotation * Math.PI) / 180);

			const overlayImg = await new Promise<HTMLImageElement | null>((res) => {
				const img = new Image();
				img.onload = () => res(img);
				img.onerror = () => res(null);
				img.src = item.objectUrl;
			});

			if (overlayImg) {
				const targetW = item.relScale * canvas.width;
				const targetH = targetW / (item.aspectRatio || 1);

				ctx.save();
				ctx.beginPath();
				if (item.shape === 'circle') {
					const r = targetW / 2;
					ctx.arc(0, 0, r, 0, Math.PI * 2);
					ctx.clip();
					drawCoverImage(ctx, overlayImg, -r, -r, targetW, targetW);
				} else if (item.shape === 'rounded') {
					const radius = Math.min(targetW, targetH) * 0.08;
					if (typeof ctx.roundRect === 'function') {
						ctx.roundRect(-targetW / 2, -targetH / 2, targetW, targetH, radius);
					} else {
						ctx.rect(-targetW / 2, -targetH / 2, targetW, targetH);
					}
					ctx.clip();
					drawCoverImage(ctx, overlayImg, -targetW / 2, -targetH / 2, targetW, targetH);
				} else {
					ctx.rect(-targetW / 2, -targetH / 2, targetW, targetH);
					ctx.clip();
					drawCoverImage(ctx, overlayImg, -targetW / 2, -targetH / 2, targetW, targetH);
				}
				ctx.restore();
			}

			ctx.restore();
		}
	}

	// 3. Rendu haute résolution des calques de texte
	// Préchargement des émojis personnalisés utilisés dans les textes
	const emojiCache: Record<string, HTMLImageElement> = {};
	const emojiTokens = texts
		.flatMap((t) => t.text.match(/:[a-zA-Z0-9_-]{2,50}:/g) || [])
		.map((t) => t.slice(1, -1));

	for (const name of Array.from(new Set(emojiTokens))) {
		const url = emojiStore.getEmojiUrl(name);
		if (url) {
			const img = await new Promise<HTMLImageElement | null>((res) => {
				const el = new Image();
				el.crossOrigin = 'anonymous';
				el.onload = () => res(el);
				el.onerror = () => res(null);
				el.src = url;
			});
			if (img) {
				emojiCache[name.toLowerCase()] = img;
			}
		}
	}

	for (const item of texts) {
		if (!item.text.trim()) continue;

		ctx.save();
		const tx = item.relX * canvas.width;
		const ty = item.relY * canvas.width;
		ctx.translate(tx, ty);
		ctx.rotate((item.rotation * Math.PI) / 180);

		const fontSizePx = Math.max(6, Math.round(item.relFontSize * canvas.width));
		const emojiFallbackFonts =
			', "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", sans-serif';
		ctx.font = `${item.fontWeight || '700'} ${fontSizePx}px ${item.fontFamily}${emojiFallbackFonts}`;
		const align = item.align || 'center';
		ctx.textAlign = align;
		ctx.textBaseline = 'middle';

		const canvasBoxW = Math.min(canvas.width * 0.75, item.relWidth * canvas.width);
		const padPx = (16 / (cropW || 1)) * canvas.width;
		const textMaxW = Math.max(20, canvasBoxW - padPx);
		const lines = wrapTextLines(ctx, item.text, textMaxW, emojiCache, fontSizePx);

		const hasAnyEmoji =
			item.text.includes(':') ||
			/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(item.text);
		const lineHeight = fontSizePx * (hasAnyEmoji ? 1.4 : 1.25);
		const totalHeight = lines.length * lineHeight;
		const startY = -((lines.length - 1) * lineHeight) / 2;

		let lineX = 0;
		if (item.hasBackground) {
			const padX = fontSizePx * 0.45;
			const padY = fontSizePx * (hasAnyEmoji ? 0.35 : 0.25);
			const boxW = canvasBoxW;
			const boxH = totalHeight + padY * 2;
			ctx.fillStyle =
				item.bgColor ||
				(item.color === '#000000' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.75)');
			ctx.beginPath();
			if (typeof ctx.roundRect === 'function') {
				ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, fontSizePx * 0.25);
			} else {
				ctx.rect(-boxW / 2, -boxH / 2, boxW, boxH);
			}
			ctx.fill();

			if (align === 'left') {
				lineX = -boxW / 2 + padX;
			} else if (align === 'right') {
				lineX = boxW / 2 - padX;
			} else {
				lineX = 0;
			}
		} else {
			ctx.shadowColor =
				item.color.toLowerCase() === '#ffffff'
					? 'rgba(0, 0, 0, 0.85)'
					: 'rgba(255, 255, 255, 0.75)';
			ctx.shadowBlur = Math.max(3, fontSizePx * 0.12);
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = Math.max(1, fontSizePx * 0.05);

			if (align === 'left') {
				lineX = -canvasBoxW / 2;
			} else if (align === 'right') {
				lineX = canvasBoxW / 2;
			} else {
				lineX = 0;
			}
		}

		ctx.fillStyle = item.color;
		lines.forEach((line, idx) => {
			const y = startY + idx * lineHeight;
			const regex = /(:[a-zA-Z0-9_-]{2,50}:)/g;
			const parts = line.split(regex);
			const hasCustomEmoji = parts.some((p) => {
				const m = p.match(/^:([a-zA-Z0-9_-]{2,50}):$/);
				return m && Boolean(emojiCache[m[1].toLowerCase()]);
			});

			if (!hasCustomEmoji) {
				ctx.textAlign = align;
				ctx.fillText(line, lineX, y);
				return;
			}

			const totalLineWidth = measureTokenizedLine(ctx, line, emojiCache, fontSizePx);
			let curX = lineX;
			if (align === 'center') {
				curX = lineX - totalLineWidth / 2;
			} else if (align === 'right') {
				curX = lineX - totalLineWidth;
			}

			ctx.textAlign = 'left';
			for (const part of parts) {
				if (!part) continue;
				const match = part.match(/^:([a-zA-Z0-9_-]{2,50}):$/);
				const emojiImg = match ? emojiCache[match[1].toLowerCase()] : null;
				if (emojiImg) {
					const emojiSize = fontSizePx * 1.35;
					const naturalW = emojiImg.naturalWidth || 1;
					const naturalH = emojiImg.naturalHeight || 1;
					const aspect = naturalW / naturalH;
					let drawW = emojiSize;
					let drawH = emojiSize;
					if (aspect > 1) {
						drawH = emojiSize / aspect;
					} else if (aspect < 1) {
						drawW = emojiSize * aspect;
					}

					const emojiMargin = fontSizePx * 0.1;
					curX += emojiMargin;
					const emojiCenterY = y + fontSizePx * 0.05;
					ctx.drawImage(
						emojiImg,
						curX + (emojiSize - drawW) / 2,
						emojiCenterY - drawH / 2,
						drawW,
						drawH
					);
					curX += emojiSize + emojiMargin;
				} else {
					ctx.fillText(part, curX, y);
					curX += ctx.measureText(part).width;
				}
			}
		});

		ctx.restore();
	}

	ctx.restore();

	return new Promise((resolve) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					resolve(null);
					return;
				}
				const croppedFile = new File([blob], `cropped-${file.name}`, { type: 'image/jpeg' });
				resolve(croppedFile);
			},
			'image/jpeg',
			0.95
		);
	});
}
