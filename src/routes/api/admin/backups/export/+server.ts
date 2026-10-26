/**
 * @module routes/api/admin/backups/export/+server
 * @description Endpoint de téléchargement direct de l'archive de sauvegarde complète de l'instance (.tar.gz).
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertAdmin } from '$lib/server/admin';
import { createBackupArchive } from '$lib/server/backup';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';

export const GET: RequestHandler = async ({ locals }) => {
	// 1. Contrôle d'accès administrateur strict
	try {
		assertAdmin(locals.user);
	} catch {
		throw error(403, 'Accès réservé aux administrateurs de l’instance.');
	}

	try {
		// 2. Génération de l'archive
		const { archivePath, filename, manifest, cleanup } = await createBackupArchive();

		// 3. Streaming vers le client
		const nodeStream = createReadStream(archivePath);
		let cleanedUp = false;
		const doCleanup = () => {
			if (!cleanedUp) {
				cleanedUp = true;
				cleanup().catch((err) => console.warn('Erreur nettoyage backup temporaire:', err));
			}
		};

		nodeStream.on('close', doCleanup);
		nodeStream.on('error', doCleanup);

		const webStream = Readable.toWeb(nodeStream);

		return new Response(webStream as ReadableStream, {
			headers: {
				'Content-Type': 'application/gzip',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Content-Length': manifest.stats.archiveSizeBytes?.toString() ?? '',
				'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
			}
		});
	} catch (err) {
		console.error('Erreur lors de la génération de l’archive de sauvegarde:', err);
		throw error(
			500,
			`Impossible de générer l’archive : ${err instanceof Error ? err.message : String(err)}`
		);
	}
};
