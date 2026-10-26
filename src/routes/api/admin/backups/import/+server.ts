/**
 * @module routes/api/admin/backups/import/+server
 * @description Point d'accès API pour l'importation, l'analyse et la restauration des archives de sauvegarde.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertAdmin } from '$lib/server/admin';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
	assembleBackupParts,
	inspectBackupArchive,
	executeRestore,
	decryptBackupArchive,
	getMasterEncryptionKey,
	setGlobalRestoreStatus,
	type UploadedPartFile
} from '$lib/server/backup';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		assertAdmin(locals.user);
	} catch {
		throw error(403, 'Accès réservé aux administrateurs de l’instance.');
	}

	const formData = await request.formData();
	const action = formData.get('action'); // 'inspect' ou 'restore'

	// ACTION 1 : INSPECTION ET ANALYSE DES FICHIERS UPLOADÉS
	if (action === 'inspect') {
		const files = formData.getAll('files') as File[];
		let decryptionKey = String(formData.get('decryptionKey') || '').trim();

		if (files.length === 0) {
			return json({ success: false, message: 'Aucun fichier sélectionné.' }, { status: 400 });
		}

		if (!decryptionKey) {
			// Tentative avec la clé maîtresse actuelle de l'instance
			decryptionKey = await getMasterEncryptionKey();
		}

		const inspectToken = `restore_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
		const stagingDir = path.resolve('/tmp', inspectToken);
		await fs.mkdir(stagingDir, { recursive: true });

		try {
			// Enregistrement des fichiers uploadés sur disque
			const uploadedFiles: UploadedPartFile[] = [];
			for (const file of files) {
				// Ignorer les fichiers cachés du système
				if (file.name.startsWith('.') || file.name === 'Thumbs.db') continue;

				const destPath = path.join(stagingDir, file.name);
				const buffer = Buffer.from(await file.arrayBuffer());
				await fs.writeFile(destPath, buffer);
				uploadedFiles.push({ filepath: destPath, originalFilename: file.name });
			}

			if (uploadedFiles.length === 0) {
				return json({ success: false, message: 'Aucun fichier de sauvegarde valide trouvé.' }, { status: 400 });
			}

			// Filtrer uniquement les fichiers d'archive (ignorer un manifest.json externe non binaire lors du réassemblage)
			const archiveFiles = uploadedFiles.filter((p) => {
				const fn = p.originalFilename.toLowerCase();
				return fn.includes('.part') || fn.endsWith('.enc') || fn.endsWith('.tar.gz');
			});

			const partsToAssemble = archiveFiles.length > 0 ? archiveFiles : uploadedFiles;

			// Réassemblage des fragments si plusieurs parts
			let combinedPath = path.join(stagingDir, 'combined_archive');
			if (partsToAssemble.length === 1 && !partsToAssemble[0].originalFilename.includes('.part')) {
				combinedPath = partsToAssemble[0].filepath;
			} else {
				await assembleBackupParts(partsToAssemble, combinedPath);
			}

			// Détection du chiffrement
			const isEncrypted =
				partsToAssemble.some((p) => p.originalFilename.includes('.enc')) ||
				combinedPath.includes('.enc');

			let readyArchiveTarGz = combinedPath;

			if (isEncrypted) {
				const decryptedPath = path.join(stagingDir, 'decrypted_archive.tar.gz');
				try {
					await decryptBackupArchive(combinedPath, decryptedPath, decryptionKey);
					readyArchiveTarGz = decryptedPath;
				} catch (decErr) {
					return json(
						{
							success: false,
							message: `Échec du déchiffrement : la clé fournie est incorrecte ou l'archive est corrompue (${
								decErr instanceof Error ? decErr.message : String(decErr)
							}).`
						},
						{ status: 400 }
					);
				}
			}

			// Extraction et inspection du manifest.json
			const manifest = await inspectBackupArchive(readyArchiveTarGz);

			return json({
				success: true,
				inspectToken,
				isEncrypted,
				manifest,
				readyArchivePath: readyArchiveTarGz
			});
		} catch (err) {
			await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
			return json(
				{
					success: false,
					message: `Impossible d'analyser l'archive de sauvegarde : ${
						err instanceof Error ? err.message : String(err)
					}`
				},
				{ status: 500 }
			);
		}
	}

	// ACTION 2 : RESTAURATION DÉFINITIVE
	if (action === 'restore') {
		const inspectToken = String(formData.get('inspectToken') || '').trim();
		const restoreDb = formData.get('restoreDb') === 'true';
		const restoreMedia = formData.get('restoreMedia') === 'true';

		if (!inspectToken || !inspectToken.startsWith('restore_')) {
			return json({ success: false, message: 'Jeton de restauration invalide ou expiré.' }, { status: 400 });
		}

		await setGlobalRestoreStatus('running', 'Restauration en cours de la base de données et des médias...');

		const stagingDir = path.resolve('/tmp', inspectToken);
		try {
			await fs.access(stagingDir);
		} catch {
			await setGlobalRestoreStatus('error', null, 'La session de restauration a expiré.');
			return json(
				{
					success: false,
					message: 'La session de restauration a expiré. Veuillez sélectionner à nouveau vos fichiers.'
				},
				{ status: 400 }
			);
		}

		try {
			const files = await fs.readdir(stagingDir);
			const archiveName =
				files.find((f) => f === 'decrypted_archive.tar.gz') ||
				files.find((f) => f === 'combined_archive') ||
				files.find((f) => f.endsWith('.tar.gz'));

			if (!archiveName) {
				throw new Error('Fichier d’archive décompressé introuvable sur le serveur.');
			}

			const archivePath = path.join(stagingDir, archiveName);
			const result = await executeRestore(archivePath, { restoreDb: true, restoreMedia: true });

			// Nettoyage après restauration réussie
			await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});

			await setGlobalRestoreStatus('success', result.message, null);
			return json(result);
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err);
			await setGlobalRestoreStatus('error', null, errMsg);
			return json(
				{
					success: false,
					message: `Erreur lors de la restauration : ${errMsg}`
				},
				{ status: 500 }
			);
		}
	}

	return json({ success: false, message: 'Action inconnue' }, { status: 400 });
};
