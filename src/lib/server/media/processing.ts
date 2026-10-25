import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import type { CarouselItem } from '$lib/types';
import { MAX_MEDIA_SIZE_BYTES } from '$lib/constants';
import { UPLOAD_DIR } from './config';

/**
 * Compresse une vidéo en utilisant FFmpeg natif (H.264 / AAC)
 * @param inputPath Chemin absolu du fichier source
 * @param outputPath Chemin absolu du fichier de destination
 */
export function compressVideo(inputPath: string, outputPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		// Arguments standards pour le web (compatibilité universelle et compression)
		const args = [
			'-i',
			inputPath,
			'-vcodec',
			'libx264',
			'-crf',
			'28', // Compression: 0-51 (28 est un bon compromis poids/qualité)
			'-preset',
			'fast',
			'-acodec',
			'aac',
			'-pix_fmt',
			'yuv420p', // Crucial pour la compatibilité Safari / iOS
			'-movflags',
			'+faststart', // Permet la lecture avant la fin du téléchargement
			'-y', // Force l'écrasement
			outputPath
		];

		const ffmpeg = spawn('ffmpeg', args);

		ffmpeg.on('close', (code) => {
			if (code === 0) resolve();
			else reject(new Error(`FFmpeg a échoué avec le code: ${code}`));
		});

		ffmpeg.on('error', (err) => {
			reject(new Error(`Impossible de lancer FFmpeg: ${err.message}`));
		});
	});
}

/**
 * Extrait une image poster (WebP léger) depuis une vidéo à 1s (ou 0s en repli)
 */
export function extractVideoPoster(inputPath: string, outputPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const args = [
			'-ss',
			'00:00:01',
			'-i',
			inputPath,
			'-vframes',
			'1',
			'-vf',
			'scale=720:-1',
			'-q:v',
			'75',
			'-y',
			outputPath
		];

		const ffmpeg = spawn('ffmpeg', args);

		ffmpeg.on('close', (code) => {
			if (code === 0) resolve();
			else {
				// Repli si la vidéo dure moins d'une seconde
				const fallbackArgs = [
					'-ss',
					'00:00:00',
					'-i',
					inputPath,
					'-vframes',
					'1',
					'-vf',
					'scale=720:-1',
					'-q:v',
					'75',
					'-y',
					outputPath
				];
				const fallbackFfmpeg = spawn('ffmpeg', fallbackArgs);
				fallbackFfmpeg.on('close', (c) => {
					if (c === 0) resolve();
					else reject(new Error(`Extraction poster échouée avec code: ${c}`));
				});
				fallbackFfmpeg.on('error', reject);
			}
		});

		ffmpeg.on('error', (err) => {
			reject(new Error(`Impossible de lancer FFmpeg pour le poster: ${err.message}`));
		});
	});
}

/**
 * Écrit un fichier uploadé sur le disque, convertit les images en WebP
 * et compresse les vidéos en MP4 optimisé.
 */
export async function saveUploadedFile(file: File): Promise<CarouselItem> {
	if (file.size > MAX_MEDIA_SIZE_BYTES) {
		throw new Error('Fichier trop volumineux');
	}
	await fs.mkdir(UPLOAD_DIR, { recursive: true });

	const buffer = Buffer.from(await file.arrayBuffer());
	const isVideo = file.type.startsWith('video');
	const id = crypto.randomUUID();

	if (isVideo) {
		// TRAITEMENT VIDÉO (FFmpeg)
		const tempFilename = `temp_${id}${path.extname(file.name) || '.mp4'}`;
		const finalFilename = `${id}.mp4`;
		const posterFilename = `${id}_poster.webp`;

		const tempFilePath = path.join(UPLOAD_DIR, tempFilename);
		const finalFilePath = path.join(UPLOAD_DIR, finalFilename);
		const posterFilePath = path.join(UPLOAD_DIR, posterFilename);

		// 1. Sauvegarder le fichier brut temporairement
		await fs.writeFile(tempFilePath, buffer);

		try {
			// 2. Compresser avec FFmpeg
			await compressVideo(tempFilePath, finalFilePath);
			// 3. Extraire une vignette poster WebP
			await extractVideoPoster(finalFilePath, posterFilePath).catch((err) => {
				console.warn('Génération poster vidéo ignorée:', err);
			});
		} finally {
			// 4. Quoi qu'il arrive (succès ou échec), on nettoie le fichier temporaire
			await fs.unlink(tempFilePath).catch(() => {});
		}

		return {
			type: 'video',
			content: `/media/${finalFilename}`,
			poster: `/media/${posterFilename}`
		};
	} else {
		const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
		if (isSvg) {
			const filename = `${id}.svg`;
			const filePath = path.join(UPLOAD_DIR, filename);
			await fs.writeFile(filePath, buffer);
			return { type: 'image', content: `/media/${filename}` };
		}

		// TRAITEMENT IMAGE (Sharp)
		const filename = `${id}.webp`;
		const filePath = path.join(UPLOAD_DIR, filename);

		// Convertit en WebP, redimensionne intelligemment et compresse
		await sharp(buffer)
			.resize(1080, 1350, {
				fit: 'inside', // Ne dépasse jamais le format max
				withoutEnlargement: true // Ne grossit pas les petites images
			})
			.webp({ quality: 80 }) // Qualité à 80% (très léger, invisible à l'oeil nu)
			.toFile(filePath);

		return { type: 'image', content: `/media/${filename}` };
	}
}

export interface SavedMediaFile {
	type: 'image' | 'video' | 'audio' | 'file';
	content: string; // /media/...
	name: string; // nom d'origine
	size: number; // taille en octets
}

/**
 * Enregistre un fichier envoyé dans un chat (photo, vidéo ou fichier générique).
 * Les photos sont optimisées en WebP, les vidéos en MP4 (FFmpeg),
 * et les autres fichiers conservent leur extension sûre.
 */
export async function saveChatFile(file: File): Promise<SavedMediaFile> {
	if (file.size > MAX_MEDIA_SIZE_BYTES) {
		throw new Error('Fichier trop volumineux');
	}
	await fs.mkdir(UPLOAD_DIR, { recursive: true });

	const buffer = Buffer.from(await file.arrayBuffer());
	const isVideo = file.type.startsWith('video');
	const isImage = file.type.startsWith('image');
	const isAudio =
		file.type.startsWith('audio') ||
		/\.(webm|ogg|wav|mp3|m4a|aac)$/i.test(file.name);
	const id = crypto.randomUUID();

	if (isVideo) {
		const tempFilename = `temp_${id}${path.extname(file.name) || '.mp4'}`;
		const finalFilename = `${id}.mp4`;
		const tempFilePath = path.join(UPLOAD_DIR, tempFilename);
		const finalFilePath = path.join(UPLOAD_DIR, finalFilename);

		await fs.writeFile(tempFilePath, buffer);
		try {
			await compressVideo(tempFilePath, finalFilePath);
		} finally {
			await fs.unlink(tempFilePath).catch(() => {});
		}

		const s = await fs.stat(finalFilePath);
		return {
			type: 'video',
			content: `/media/${finalFilename}`,
			name: file.name,
			size: s.size
		};
	} else if (isImage) {
		const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
		if (isSvg) {
			const finalFilename = `${id}.svg`;
			const filePath = path.join(UPLOAD_DIR, finalFilename);
			await fs.writeFile(filePath, buffer);
			const s = await fs.stat(filePath);
			return {
				type: 'image',
				content: `/media/${finalFilename}`,
				name: file.name,
				size: s.size
			};
		}

		const finalFilename = `${id}.webp`;
		const filePath = path.join(UPLOAD_DIR, finalFilename);

		await sharp(buffer)
			.resize(1920, 1920, {
				fit: 'inside',
				withoutEnlargement: true
			})
			.webp({ quality: 80 })
			.toFile(filePath);

		const s = await fs.stat(filePath);
		return {
			type: 'image',
			content: `/media/${finalFilename}`,
			name: file.name,
			size: s.size
		};
	} else if (isAudio) {
		// Enregistrement / message vocal ou fichier audio
		const rawExt = path.extname(file.name) || '.webm';
		const safeExt = rawExt.toLowerCase().slice(0, 10);
		const finalFilename = `${id}${safeExt}`;
		const filePath = path.join(UPLOAD_DIR, finalFilename);

		await fs.writeFile(filePath, buffer);
		const s = await fs.stat(filePath);
		return {
			type: 'audio',
			content: `/media/${finalFilename}`,
			name: file.name || 'Message vocal',
			size: s.size
		};
	} else {
		// Fichier brut (PDF, zip, doc, txt, etc.)
		const rawExt = path.extname(file.name) || '';
		const safeExt = rawExt.toLowerCase().slice(0, 10);
		const finalFilename = `${id}${safeExt}`;
		const filePath = path.join(UPLOAD_DIR, finalFilename);

		await fs.writeFile(filePath, buffer);
		return {
			type: 'file',
			content: `/media/${finalFilename}`,
			name: file.name,
			size: buffer.length
		};
	}
}

/**
 * Supprime physiquement du disque les fichiers correspondant aux items
 */
export async function deleteMediaFiles(
	mediaUrls: Array<CarouselItem | { type: string; content: string }> | null | undefined
) {
	if (!mediaUrls || mediaUrls.length === 0) return;

	await Promise.all(
		mediaUrls
			.filter(
				(item) =>
					item.type === 'image' ||
					item.type === 'video' ||
					item.type === 'file' ||
					item.type === 'audio'
			)
			.map(async (item) => {
				try {
					const filename = path.basename(item.content);
					if (!filename) return;
					const filePath = path.join(UPLOAD_DIR, filename);
					await fs.unlink(filePath);

					// Si c'est une vidéo, supprimer également le poster associé
					if (item.type === 'video') {
						const posterFilename = filename.replace(/\.(mp4|webm|mov|m4v)$/i, '_poster.webp');
						const posterPath = path.join(UPLOAD_DIR, posterFilename);
						await fs.unlink(posterPath).catch(() => {});
					}
				} catch (err) {
					if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
						console.error('Erreur suppression média:', item.content, err);
					}
				}
			})
	);
}

/**
 * Calcule les médias présents dans `oldMediaUrls` mais absents de `newMediaUrls`
 */
export function diffRemovedMedia(
	oldMediaUrls: CarouselItem[] | null | undefined,
	newMediaUrls: CarouselItem[] | null | undefined
): CarouselItem[] {
	if (!oldMediaUrls || oldMediaUrls.length === 0) return [];

	const newContents = new Set(
		(newMediaUrls || [])
			.filter((item) => item.type === 'image' || item.type === 'video')
			.map((item) => item.content)
	);

	return oldMediaUrls.filter(
		(item) => (item.type === 'image' || item.type === 'video') && !newContents.has(item.content)
	);
}

/**
 * Retourne la taille en octets d'un fichier média sur le disque
 */
export async function getMediaFileSize(contentOrFilename: string): Promise<number> {
	try {
		const filename = path.basename(contentOrFilename);
		if (!filename) return 0;
		const filePath = path.join(UPLOAD_DIR, filename);
		const stats = await fs.stat(filePath);
		return stats.size;
	} catch {
		return 0;
	}
}

export { formatBytes } from '$lib/utils/format';
