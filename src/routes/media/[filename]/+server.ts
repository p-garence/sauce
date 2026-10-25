import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { UPLOAD_DIR, canAccessMediaFile } from '$lib/server/media';

// Fonction utilitaire pour le type MIME
function getContentType(ext: string): string {
	switch (ext.toLowerCase()) {
		case '.webp':
			return 'image/webp';
		case '.mp4':
			return 'video/mp4';
		case '.jpg':
		case '.jpeg':
			return 'image/jpeg';
		case '.png':
			return 'image/png';
		case '.gif':
			return 'image/gif';
		case '.svg':
			return 'image/svg+xml';
		case '.pdf':
			return 'application/pdf';
		case '.zip':
			return 'application/zip';
		case '.tar':
			return 'application/x-tar';
		case '.gz':
			return 'application/gzip';
		case '.txt':
			return 'text/plain; charset=utf-8';
		case '.json':
			return 'application/json';
		case '.mp3':
			return 'audio/mpeg';
		case '.wav':
			return 'audio/wav';
		case '.ogg':
			return 'audio/ogg';
		case '.webm':
			return 'audio/webm';
		case '.m4a':
			return 'audio/mp4';
		case '.aac':
			return 'audio/aac';
		default:
			return 'application/octet-stream';
	}
}

function isInlineSafeExtension(ext: string): boolean {
	const lower = ext.toLowerCase();
	return [
		'.webp',
		'.svg',
		'.jpg',
		'.jpeg',
		'.png',
		'.gif',
		'.mp4',
		'.mp3',
		'.wav',
		'.ogg',
		'.webm',
		'.m4a',
		'.aac'
	].includes(lower);
}

export const GET: RequestHandler = async ({ params, request, locals }) => {
	const { filename } = params;
	if (!filename) throw error(400, 'Nom de fichier manquant');

	// SÉCURITÉ : path.basename empêche le "Directory Traversal"
	const safeFilename = path.basename(filename);
	const filePath = path.resolve(UPLOAD_DIR, safeFilename);

	if (!fs.existsSync(filePath)) {
		throw error(404, 'Fichier introuvable');
	}

	const stat = fs.statSync(filePath);
	const userId = locals.user?.id ?? null;

	// 2. VÉRIFICATION DE LA VISIBILITÉ ET DROITS D'ACCÈS
	const { isPublicImmutable } = await canAccessMediaFile(safeFilename, userId, stat.mtimeMs);

	// ==========================================
	// 3. PRÉPARATION DU FICHIER ET TYPES MIME
	// ==========================================
	const fileSize = stat.size;
	const ext = path.extname(safeFilename);
	const contentType = getContentType(ext);

	// ETag HTTP et en-têtes de cache conditionnel
	const etag = `"${fileSize.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
	const clientEtag = request.headers.get('if-none-match');
	const ifModifiedSince = request.headers.get('if-modified-since');

	// Les fichiers publics immuables (avatars ou posts publics UUID) reçoivent un cache permanent
	const cacheControl = isPublicImmutable
		? 'public, max-age=31536000, immutable'
		: 'private, no-cache';

	const securityHeaders: Record<string, string> = {
		'X-Content-Type-Options': 'nosniff',
		'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
		'Cache-Control': cacheControl,
		ETag: etag,
		'Last-Modified': stat.mtime.toUTCString()
	};

	// Réponse immédiate 304 Not Modified si le client dispose déjà de la ressource exacte
	if (
		clientEtag === etag ||
		(ifModifiedSince && new Date(ifModifiedSince).getTime() >= Math.floor(stat.mtimeMs))
	) {
		return new Response(null, {
			status: 304,
			headers: securityHeaders
		});
	}

	if (!isInlineSafeExtension(ext)) {
		securityHeaders['Content-Disposition'] =
			`attachment; filename="${safeFilename.replace(/"/g, '')}"`;
	}

	// Récupère l'en-tête "Range"
	const range = request.headers.get('range');

	// ==========================================
	// 4. STREAMING PARTIEL (Pour les <video>)
	// ==========================================
	if (range) {
		if (fileSize === 0) {
			return new Response(null, {
				status: 416,
				headers: {
					...securityHeaders,
					'Content-Range': 'bytes */0'
				}
			});
		}

		const parts = range.replace(/bytes=/, '').split('-');
		const start = parseInt(parts[0], 10);
		const rawEnd = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
		const end = Math.min(rawEnd, fileSize - 1);

		if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end < start || start >= fileSize) {
			return new Response(null, {
				status: 416,
				headers: {
					...securityHeaders,
					'Content-Range': `bytes */${fileSize}`
				}
			});
		}

		const chunksize = end - start + 1;
		const fileStream = fs.createReadStream(filePath, { start, end });
		const webStream = Readable.toWeb(fileStream) as ReadableStream;

		return new Response(webStream, {
			status: 206, // 206 = Partial Content
			headers: {
				...securityHeaders,
				'Content-Range': `bytes ${start}-${end}/${fileSize}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': chunksize.toString(),
				'Content-Type': contentType
			}
		});
	}
	// ==========================================
	// 5. FICHIER ENTIER (Images ou Vidéos sans Range)
	// ==========================================
	else {
		const fileStream = fs.createReadStream(filePath);
		const webStream = Readable.toWeb(fileStream) as ReadableStream;

		return new Response(webStream, {
			status: 200,
			headers: {
				...securityHeaders,
				'Content-Length': fileSize.toString(),
				'Content-Type': contentType
			}
		});
	}
};
