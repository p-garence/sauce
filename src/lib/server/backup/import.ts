/**
 * @module server/backup/import
 * @description Réassemblage de fragments de sauvegarde, déchiffrement et restauration de la base et des médias.
 */

import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { env } from '$env/dynamic/private';
import { UPLOAD_DIR } from '$lib/server/media/config';
import type { BackupManifest } from './export';

const execAsync = promisify(exec);

export interface UploadedPartFile {
	filepath: string;
	originalFilename: string;
}

/**
 * Trie et réassemble des fragments de sauvegarde (.part00, .part01...) en un fichier unique.
 */
export async function assembleBackupParts(
	parts: UploadedPartFile[],
	outputPath: string
): Promise<void> {
	// Tri naturel selon le nom de fichier pour garantir l'ordre séquentiel des fragments
	const sortedParts = [...parts].sort((a, b) =>
		a.originalFilename.localeCompare(b.originalFilename, undefined, { numeric: true })
	);

	const destStream = createWriteStream(outputPath);

	for (const part of sortedParts) {
		const srcStream = createReadStream(part.filepath);
		await pipeline(srcStream, destStream, { end: false });
	}

	await new Promise<void>((resolve, reject) => {
		destStream.end((err) => {
			if (err) reject(err);
			else resolve();
		});
	});
}

/**
 * Inspecte et extrait le manifeste d'une archive (.tar.gz) pour prévisualisation avant restauration.
 */
export async function inspectBackupArchive(archiveTarGzPath: string): Promise<BackupManifest> {
	const tempInspectDir = path.resolve('/tmp', `inspect-manifest-${Date.now()}`);
	await fs.mkdir(tempInspectDir, { recursive: true });

	try {
		// IMPORTANT : Le flag -C doit impérativement précéder le nom du fichier à extraire en syntaxe tar
		await execAsync(`tar -xzf "${archiveTarGzPath}" -C "${tempInspectDir}" manifest.json`);
		const manifestRaw = await fs.readFile(path.join(tempInspectDir, 'manifest.json'), 'utf-8');
		return JSON.parse(manifestRaw) as BackupManifest;
	} catch (err) {
		// Fallback de robustesse : au cas où le manifest se trouve sous un chemin relatif (ex: ./manifest.json)
		try {
			const { stdout: listOut } = await execAsync(`tar -tzf "${archiveTarGzPath}"`);
			const lines = listOut.split('\n').map((l) => l.trim()).filter(Boolean);
			const manifestEntry = lines.find((l) => l.endsWith('manifest.json'));
			if (manifestEntry) {
				await execAsync(`tar -xzf "${archiveTarGzPath}" -C "${tempInspectDir}" "${manifestEntry}"`);
				const manifestRaw = await fs.readFile(path.join(tempInspectDir, manifestEntry), 'utf-8');
				return JSON.parse(manifestRaw) as BackupManifest;
			}
		} catch {}
		throw new Error(
			`Le fichier manifest.json est introuvable dans l'archive : ${
				err instanceof Error ? err.message : String(err)
			}`
		);
	} finally {
		await fs.rm(tempInspectDir, { recursive: true, force: true }).catch(() => {});
	}
}



/**
 * Exécute la restauration intégrale depuis l'image de sauvegarde (base de données et médias).
 * Réinitialise complètement le serveur pour correspondre fidèlement à l'archive.
 */
export async function executeRestore(
	archiveTarGzPath: string,
	options: { restoreDb?: boolean; restoreMedia?: boolean } = { restoreDb: true, restoreMedia: true }
): Promise<{ success: boolean; message: string; details?: { dbRestored: boolean; mediaRestoredCount: number } }> {
	const stagingDir = path.resolve('/tmp', `restore-staging-${Date.now()}`);
	await fs.mkdir(stagingDir, { recursive: true });

	const shouldRestoreDb = options.restoreDb !== false;
	const shouldRestoreMedia = options.restoreMedia !== false;

	try {
		// 1. Décompression de l'archive tar.gz dans stagingDir
		await execAsync(`tar -xzf "${archiveTarGzPath}" -C "${stagingDir}"`);

		let mediaRestoredCount = 0;

		// 2. Wipe et Restauration des médias (uploads/)
		if (shouldRestoreMedia) {
			const stagingUploads = path.join(stagingDir, 'uploads');
			try {
				await fs.mkdir(UPLOAD_DIR, { recursive: true });

				// Wipe complet des médias actuels pour effacer tout média créé après la sauvegarde
				const currentMediaEntries = await fs.readdir(UPLOAD_DIR);
				for (const entry of currentMediaEntries) {
					await fs.rm(path.join(UPLOAD_DIR, entry), { recursive: true, force: true });
				}

				// Restauration des médias de l'archive
				const archiveMediaFiles = await fs.readdir(stagingUploads);
				for (const file of archiveMediaFiles) {
					const src = path.join(stagingUploads, file);
					const dest = path.join(UPLOAD_DIR, file);
					await fs.copyFile(src, dest);
					mediaRestoredCount++;
				}
			} catch (mediaErr) {
				console.warn('Restauration des médias :', mediaErr);
			}
		}

		let dbRestored = false;

		// 3. Wipe et Restauration de la base de données PostgreSQL
		if (shouldRestoreDb) {
			const sqlPath = path.join(stagingDir, 'database.sql');
			const dbUrl = env.DATABASE_URL || 'postgres://root:mysecretpassword@localhost:5432/social';
			let dbSuccess = false;
			let dbError: unknown = null;

			// Requête de wipe complet du schéma public
			const wipeSql =
				'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO root; GRANT ALL ON SCHEMA public TO public;';

			// Tentative 1 : psql direct
			try {
				await execAsync(`psql "${dbUrl}" -c "${wipeSql}"`);
				await execAsync(`psql "${dbUrl}" -f "${sqlPath}"`);
				dbSuccess = true;
			} catch (err) {
				dbError = err;
			}

			// Tentative 2 : conteneur Docker social_db
			if (!dbSuccess) {
				try {
					await execAsync(`docker exec social_db psql -U root -d social -c "${wipeSql}"`);
					await execAsync(`docker exec -i social_db psql -U root -d social < "${sqlPath}"`);
					dbSuccess = true;
				} catch (err) {
					dbError = err;
				}
			}

			if (!dbSuccess) {
				throw new Error(
					`Échec de la réinjection du dump SQL : ${
						dbError instanceof Error ? dbError.message : String(dbError)
					}`
				);
			}

			// Réinitialise immédiatement les statuts de sauvegarde et restauration pour éviter tout statut 'running' fantôme dans le dump restauré
			const resetConfigSql =
				"UPDATE backup_config SET last_run_status = 'idle', restore_status = 'success';";
			try {
				await execAsync(`psql "${dbUrl}" -c "${resetConfigSql}"`);
			} catch {
				try {
					await execAsync(`docker exec social_db psql -U root -d social -c "${resetConfigSql}"`);
				} catch (resetErr) {
					console.warn('Impossible de réinitialiser backup_config après restauration:', resetErr);
				}
			}

			dbRestored = true;
		}

		return {
			success: true,
			message: `Restauration intégrale effectuée avec succès ! ${
				dbRestored ? 'Base de données réinitialisée et restaurée. ' : ''
			}${mediaRestoredCount > 0 ? `${mediaRestoredCount} fichiers médias réintégrés.` : ''}`,
			details: {
				dbRestored,
				mediaRestoredCount
			}
		};
	} finally {
		await fs.rm(stagingDir, { recursive: true, force: true }).catch(() => {});
	}
}
