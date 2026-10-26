/**
 * @module server/backup/config
 * @description Gestion persistante des configurations multiples de sauvegardes WebDAV, de la clé maîtresse AES-256
 * et des statuts d'exécution temps-réel (sauvegardes et restaurations).
 * Stocké directement dans PostgreSQL via la table backup_config.
 */

import { db } from '$lib/server/db';
import { backupConfig } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { generateBackupKey } from './crypto';

export interface BackupConfigItem {
	id: string;
	name: string;
	enabled: boolean;
	webdavUrl: string;
	webdavUsername: string;
	webdavPassword: string;
	frequency: 'daily' | 'weekly' | 'manual';
	retentionCount: number;
	chunkSizeMb: number;
	encryptionKey: string;
	lastRunAt: string | null;
	lastRunStatus: 'idle' | 'running' | 'success' | 'error' | null;
	lastRunError: string | null;
	updatedAt: Date;
}

export interface RestoreStatusData {
	status: 'idle' | 'running' | 'success' | 'error';
	message: string | null;
	error: string | null;
	startedAt: string | null;
}

/**
 * Récupère ou initialise la clé de chiffrement maîtresse de l'instance.
 */
export async function getMasterEncryptionKey(): Promise<string> {
	try {
		const [firstWithKey] = await db
			.select({ key: backupConfig.encryptionKey })
			.from(backupConfig)
			.where(eq(backupConfig.id, 'default'))
			.limit(1);

		if (firstWithKey?.key) {
			return firstWithKey.key;
		}

		// Recherche dans les autres configurations existantes
		const [anyConfig] = await db
			.select({ key: backupConfig.encryptionKey })
			.from(backupConfig)
			.limit(1);

		if (anyConfig?.key) {
			return anyConfig.key;
		}

		// Aucune clé existante : génération d'une clé
		const newKey = generateBackupKey();
		await db
			.insert(backupConfig)
			.values({
				id: 'default',
				name: 'Sauvegarde Cloud par défaut',
				enabled: false,
				encryptionKey: newKey
			})
			.onConflictDoNothing();

		return newKey;
	} catch (err) {
		console.warn('Erreur lecture clé maîtresse:', err);
		return generateBackupKey();
	}
}

/**
 * Récupère le statut global de restauration actuel depuis PostgreSQL.
 */
export async function getGlobalRestoreStatus(): Promise<RestoreStatusData> {
	try {
		const [row] = await db
			.select({
				status: backupConfig.restoreStatus,
				message: backupConfig.restoreMessage,
				error: backupConfig.restoreError,
				startedAt: backupConfig.restoreStartedAt
			})
			.from(backupConfig)
			.where(eq(backupConfig.id, 'default'))
			.limit(1);

		if (row) {
			return {
				status: (row.status as 'idle' | 'running' | 'success' | 'error') || 'idle',
				message: row.message,
				error: row.error,
				startedAt: row.startedAt ? row.startedAt.toISOString() : null
			};
		}
	} catch (e) {
		console.warn('Erreur lecture restoreStatus:', e);
	}

	return {
		status: 'idle',
		message: null,
		error: null,
		startedAt: null
	};
}

/**
 * Met à jour le statut global de restauration dans PostgreSQL.
 */
export async function setGlobalRestoreStatus(
	status: 'idle' | 'running' | 'success' | 'error',
	message?: string | null,
	error?: string | null
): Promise<void> {
	const payload = {
		restoreStatus: status,
		restoreMessage: message ?? null,
		restoreError: error ?? null,
		restoreStartedAt: status === 'running' ? new Date() : undefined
	};

	await db
		.insert(backupConfig)
		.values({
			id: 'default',
			name: 'Sauvegarde Cloud par défaut',
			...payload
		})
		.onConflictDoUpdate({
			target: backupConfig.id,
			set: payload
		});
}

/**
 * Récupère la liste de toutes les configurations de sauvegarde enregistrées.
 */
export async function getAllBackupConfigs(): Promise<BackupConfigItem[]> {
	try {
		const masterKey = await getMasterEncryptionKey();

		const rows = await db
			.select()
			.from(backupConfig)
			.orderBy(desc(backupConfig.updatedAt));

		if (rows.length === 0) {
			const defaultItem = {
				id: 'default',
				name: 'Sauvegarde Cloud principale',
				enabled: false,
				webdavUrl: '',
				webdavUsername: '',
				webdavPassword: '',
				frequency: 'daily' as const,
				retentionCount: 7,
				chunkSizeMb: 10,
				encryptionKey: masterKey,
				lastRunAt: null,
				lastRunStatus: 'idle' as const,
				lastRunError: null,
				updatedAt: new Date()
			};

			await db.insert(backupConfig).values(defaultItem).onConflictDoNothing();
			return [defaultItem];
		}

		return rows.map((r) => ({
			id: r.id,
			name: r.name || 'Sauvegarde Cloud',
			enabled: r.enabled,
			webdavUrl: r.webdavUrl,
			webdavUsername: r.webdavUsername,
			webdavPassword: r.webdavPassword,
			frequency: (r.frequency as 'daily' | 'weekly' | 'manual') || 'daily',
			retentionCount: r.retentionCount || 7,
			chunkSizeMb: r.chunkSizeMb ?? 10,
			encryptionKey: r.encryptionKey || masterKey,
			lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
			lastRunStatus: (r.lastRunStatus as 'idle' | 'running' | 'success' | 'error' | null) || 'idle',
			lastRunError: r.lastRunError,
			updatedAt: r.updatedAt
		}));
	} catch (err) {
		console.warn('Erreur getAllBackupConfigs:', err);
		return [];
	}
}

/**
 * Récupère une configuration de sauvegarde par son ID.
 */
export async function getBackupConfigById(id: string): Promise<BackupConfigItem | null> {
	const [item] = await db
		.select()
		.from(backupConfig)
		.where(eq(backupConfig.id, id))
		.limit(1);

	if (!item) return null;

	const masterKey = await getMasterEncryptionKey();

	return {
		id: item.id,
		name: item.name || 'Sauvegarde Cloud',
		enabled: item.enabled,
		webdavUrl: item.webdavUrl,
		webdavUsername: item.webdavUsername,
		webdavPassword: item.webdavPassword,
		frequency: (item.frequency as 'daily' | 'weekly' | 'manual') || 'daily',
		retentionCount: item.retentionCount || 7,
		chunkSizeMb: item.chunkSizeMb ?? 10,
		encryptionKey: item.encryptionKey || masterKey,
		lastRunAt: item.lastRunAt ? item.lastRunAt.toISOString() : null,
		lastRunStatus: (item.lastRunStatus as 'idle' | 'running' | 'success' | 'error' | null) || 'idle',
		lastRunError: item.lastRunError,
		updatedAt: item.updatedAt
	};
}

/**
 * Crée ou met à jour une configuration de sauvegarde.
 */
export async function saveBackupConfigItem(
	input: Partial<BackupConfigItem> & { id?: string }
): Promise<BackupConfigItem> {
	const masterKey = await getMasterEncryptionKey();
	const configId = input.id || `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

	const [existing] = await db
		.select()
		.from(backupConfig)
		.where(eq(backupConfig.id, configId))
		.limit(1);

	const payload: typeof backupConfig.$inferInsert = {
		id: configId,
		name: input.name !== undefined ? input.name.trim() : (existing?.name || 'Sauvegarde Cloud'),
		enabled: input.enabled !== undefined ? input.enabled : (existing?.enabled ?? false),
		webdavUrl: input.webdavUrl !== undefined ? input.webdavUrl.trim() : (existing?.webdavUrl ?? ''),
		webdavUsername: input.webdavUsername !== undefined ? input.webdavUsername.trim() : (existing?.webdavUsername ?? ''),
		webdavPassword: input.webdavPassword !== undefined ? input.webdavPassword : (existing?.webdavPassword ?? ''),
		frequency: input.frequency || existing?.frequency || 'daily',
		retentionCount: input.retentionCount !== undefined ? input.retentionCount : (existing?.retentionCount ?? 7),
		chunkSizeMb: input.chunkSizeMb !== undefined ? input.chunkSizeMb : (existing?.chunkSizeMb ?? 10),
		encryptionKey: existing?.encryptionKey || masterKey,
		lastRunAt: input.lastRunAt !== undefined ? (input.lastRunAt ? new Date(input.lastRunAt) : null) : existing?.lastRunAt,
		lastRunStatus: input.lastRunStatus !== undefined ? input.lastRunStatus : existing?.lastRunStatus,
		lastRunError: input.lastRunError !== undefined ? input.lastRunError : existing?.lastRunError
	};

	await db
		.insert(backupConfig)
		.values(payload)
		.onConflictDoUpdate({
			target: backupConfig.id,
			set: payload
		});

	return (await getBackupConfigById(configId))!;
}

/**
 * Active ou désactive rapidement une configuration.
 */
export async function toggleBackupConfig(id: string, enabled: boolean): Promise<void> {
	await db
		.update(backupConfig)
		.set({ enabled })
		.where(eq(backupConfig.id, id));
}

/**
 * Supprime une configuration de sauvegarde.
 */
export async function deleteBackupConfig(id: string): Promise<void> {
	await db.delete(backupConfig).where(eq(backupConfig.id, id));
}

/**
 * Recycle / régénère la clé maîtresse pour toutes les configurations.
 */
export async function rotateMasterEncryptionKey(): Promise<string> {
	const newKey = generateBackupKey();
	await db.update(backupConfig).set({ encryptionKey: newKey });
	return newKey;
}
