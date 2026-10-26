/**
 * @module server/backup/scheduler
 * @description Ordonnanceur et déclencheur des sauvegardes chiffrées (AES-256-GCM) vers les destinations WebDAV.
 */

import fs from 'node:fs/promises';
import {
	getAllBackupConfigs,
	getBackupConfigById,
	saveBackupConfigItem,
	type BackupConfigItem
} from './config';
import { createBackupArchive } from './export';
import { uploadBackupToWebdav, pruneWebdavBackups } from './webdav';
import { encryptBackupArchive } from './crypto';

let isBackupRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Détermine si une sauvegarde automatique doit être déclenchée selon la fréquence configurée.
 */
export function isBackupDue(config: BackupConfigItem): boolean {
	if (!config.enabled || !config.webdavUrl || config.frequency === 'manual') {
		return false;
	}

	if (!config.lastRunAt) {
		return true;
	}

	const lastRunTime = new Date(config.lastRunAt).getTime();
	if (isNaN(lastRunTime)) return true;

	const now = Date.now();
	const diffHours = (now - lastRunTime) / (1000 * 60 * 60);

	if (config.frequency === 'daily') {
		return diffHours >= 24;
	}

	if (config.frequency === 'weekly') {
		return diffHours >= 24 * 7;
	}

	return false;
}

/**
 * Exécute le processus complet de sauvegarde chiffrée pour une configuration donnée.
 */
export async function executeBackupToCloud(targetConfigId?: string): Promise<{
	success: boolean;
	filename?: string;
	error?: string;
	deletedOldCount?: number;
	partsCount?: number;
}> {
	if (isBackupRunning) {
		throw new Error('Une opération de sauvegarde est déjà en cours d’exécution.');
	}

	isBackupRunning = true;

	let config: BackupConfigItem | null = null;
	if (targetConfigId) {
		config = await getBackupConfigById(targetConfigId);
	} else {
		const all = await getAllBackupConfigs();
		config = all.find((c) => c.enabled) || all[0] || null;
	}

	if (!config) {
		isBackupRunning = false;
		throw new Error('Aucune configuration de sauvegarde trouvée.');
	}

	let archiveResult: Awaited<ReturnType<typeof createBackupArchive>> | null = null;
	let encryptedPath: string | null = null;

	try {
		// 1. Création de l'archive tar.gz brute (le dump SQL contient un état sain non-running)
		archiveResult = await createBackupArchive();

		// 2. Marque la sauvegarde comme "running" dans PostgreSQL pour le suivi en temps réel pendant le transfert WebDAV
		await saveBackupConfigItem({
			id: config.id,
			lastRunAt: new Date().toISOString(),
			lastRunStatus: 'running',
			lastRunError: null
		});

		let finalUploadPath = archiveResult.archivePath;
		let finalUploadFilename = archiveResult.filename;

		// 3. Chiffrement fort AES-256-GCM si une clé de sauvegarde existe
		if (config.encryptionKey) {
			encryptedPath = `${archiveResult.archivePath}.enc`;
			await encryptBackupArchive(archiveResult.archivePath, encryptedPath, config.encryptionKey);
			finalUploadPath = encryptedPath;
			finalUploadFilename = `${archiveResult.filename}.enc`;
		}

		// 4. Upload WebDAV avec gestion automatique des fragments (anti-413)
		const { partsCount } = await uploadBackupToWebdav(
			finalUploadPath,
			finalUploadFilename,
			config
		);

		// 5. Purge des anciens backups selon la politique de rétention
		const { deletedCount } = await pruneWebdavBackups(config);

		// 6. Mise à jour du statut dans PostgreSQL
		await saveBackupConfigItem({
			id: config.id,
			lastRunAt: new Date().toISOString(),
			lastRunStatus: 'success',
			lastRunError: null
		});

		return {
			success: true,
			filename: finalUploadFilename,
			deletedOldCount: deletedCount,
			partsCount
		};
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		await saveBackupConfigItem({
			id: config.id,
			lastRunAt: new Date().toISOString(),
			lastRunStatus: 'error',
			lastRunError: errorMessage
		});

		return {
			success: false,
			error: errorMessage
		};
	} finally {
		if (encryptedPath) {
			await fs.unlink(encryptedPath).catch(() => {});
		}
		if (archiveResult) {
			await archiveResult.cleanup().catch(() => {});
		}
		isBackupRunning = false;
	}
}

/**
 * Vérification périodique du planificateur pour toutes les configurations actives.
 */
async function checkAndRunScheduledBackup(): Promise<void> {
	if (isBackupRunning) return;

	try {
		const allConfigs = await getAllBackupConfigs();
		for (const config of allConfigs) {
			if (isBackupDue(config)) {
				console.log(`[Backup Scheduler] Déclenchement automatique de la sauvegarde pour "${config.name}"...`);
				await executeBackupToCloud(config.id);
			}
		}
	} catch (err) {
		console.error('[Backup Scheduler] Erreur lors de la vérification planifiée:', err);
	}
}

/**
 * Initialise l'ordonnanceur d'arrière-plan (vérification toutes les heures).
 */
export function initBackupScheduler(): void {
	if (schedulerInterval) return;

	// Réinitialise tout statut fantôme 'running' resté d'un crash ou arrêt précédent
	getAllBackupConfigs()
		.then(async (configs) => {
			for (const cfg of configs) {
				if (cfg.lastRunStatus === 'running') {
					await saveBackupConfigItem({ id: cfg.id, lastRunStatus: 'idle' });
				}
			}
		})
		.catch(() => {});

	// Vérification 1 minute après le démarrage, puis toutes les heures
	setTimeout(() => {
		checkAndRunScheduledBackup().catch(() => {});
	}, 60 * 1000);

	schedulerInterval = setInterval(() => {
		checkAndRunScheduledBackup().catch(() => {});
	}, 60 * 60 * 1000);
}
