/**
 * @module routes/admin/backups/+page.server
 * @description Contrôleur serveur pour la gestion des sauvegardes multiples, de la clé maîtresse et de WebDAV.
 */

import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { assertAdmin } from '$lib/server/admin';
import { getServerAppStorageStats } from '$lib/server/media';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import {
	getAllBackupConfigs,
	getBackupConfigById,
	saveBackupConfigItem,
	toggleBackupConfig,
	deleteBackupConfig,
	getMasterEncryptionKey,
	rotateMasterEncryptionKey,
	testWebdavConnection,
	executeBackupToCloud,
	getGlobalRestoreStatus
} from '$lib/server/backup';

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);

	let dbSizeBytes = 0;
	try {
		const [res] = await db.execute<{ size: string }>(
			sql`SELECT pg_database_size(current_database())::text as size`
		);
		dbSizeBytes = parseInt(res?.size || '0', 10);
	} catch (e) {
		console.warn('Impossible de lire la taille BDD pg_database_size:', e);
	}

	const serverStorage = await getServerAppStorageStats();
	const rawConfigs = await getAllBackupConfigs();
	const masterKey = await getMasterEncryptionKey();
	const restoreStatus = await getGlobalRestoreStatus();

	const configs = rawConfigs.map((c) => ({
		...c,
		hasPassword: Boolean(c.webdavPassword),
		webdavPassword: '' // Ne pas renvoyer le mot de passe au client
	}));

	return {
		dbSizeBytes,
		serverStorage,
		masterKey,
		configs,
		restoreStatus
	};
};

export const actions: Actions = {
	/**
	 * Crée ou modifie une configuration de sauvegarde.
	 */
	saveConfig: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const formData = await request.formData();

		const id = String(formData.get('id') || '').trim();
		const name = String(formData.get('name') || 'Sauvegarde Cloud').trim();
		const enabled = formData.get('enabled') === 'true';
		const webdavUrl = String(formData.get('webdavUrl') || '').trim();
		const webdavUsername = String(formData.get('webdavUsername') || '').trim();
		const rawPassword = String(formData.get('webdavPassword') || '').trim();
		const frequency = String(formData.get('frequency') || 'daily') as 'daily' | 'weekly' | 'manual';
		const retentionCount = Math.max(1, parseInt(String(formData.get('retentionCount') || '7'), 10));
		const chunkSizeMb = Math.max(0, parseInt(String(formData.get('chunkSizeMb') || '10'), 10));

		let existingPassword = '';
		if (id) {
			const existing = await getBackupConfigById(id);
			if (existing) {
				existingPassword = existing.webdavPassword;
			}
		}

		const webdavPassword = rawPassword || existingPassword;

		const saved = await saveBackupConfigItem({
			id: id || undefined,
			name,
			enabled,
			webdavUrl,
			webdavUsername,
			webdavPassword,
			frequency,
			retentionCount,
			chunkSizeMb
		});

		return {
			success: true,
			action: 'saveConfig',
			configId: saved.id,
			message: `Configuration "${saved.name}" enregistrée avec succès.`
		};
	},

	/**
	 * Active ou désactive rapidement une configuration.
	 */
	toggleEnabled: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();
		const enabled = formData.get('enabled') === 'true';

		if (!id) return fail(400, { success: false, message: 'ID manquant.' });

		await toggleBackupConfig(id, enabled);

		return {
			success: true,
			action: 'toggleEnabled',
			configId: id,
			message: enabled ? 'Sauvegarde activée.' : 'Sauvegarde mise en pause.'
		};
	},

	/**
	 * Teste la connexion WebDAV d'une configuration.
	 */
	testConnection: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const formData = await request.formData();

		const id = String(formData.get('id') || '').trim();
		let webdavUrl = String(formData.get('webdavUrl') || '').trim();
		let webdavUsername = String(formData.get('webdavUsername') || '').trim();
		let webdavPassword = String(formData.get('webdavPassword') || '').trim();

		if (id) {
			const existing = await getBackupConfigById(id);
			if (existing) {
				webdavUrl = webdavUrl || existing.webdavUrl;
				webdavUsername = webdavUsername || existing.webdavUsername;
				webdavPassword = webdavPassword || existing.webdavPassword;
			}
		}

		if (!webdavUrl || !webdavUsername || !webdavPassword) {
			return fail(400, {
				success: false,
				action: 'testConnection',
				configId: id,
				message: 'Veuillez renseigner l’URL, l’identifiant et le mot de passe WebDAV pour tester.'
			});
		}

		const result = await testWebdavConnection(webdavUrl, webdavUsername, webdavPassword);
		if (!result.success) {
			return fail(400, {
				success: false,
				action: 'testConnection',
				configId: id,
				message: result.message
			});
		}

		return {
			success: true,
			action: 'testConnection',
			configId: id,
			message: result.message
		};
	},

	/**
	 * Déclenche manuellement la sauvegarde immédiate pour une configuration donnée.
	 */
	triggerBackup: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();

		if (!id) return fail(400, { success: false, message: 'ID de configuration manquant.' });

		const config = await getBackupConfigById(id);
		if (!config || !config.webdavUrl || !config.webdavUsername || !config.webdavPassword) {
			return fail(400, {
				success: false,
				action: 'triggerBackup',
				configId: id,
				message: 'Veuillez configurer et enregistrer les paramètres WebDAV avant de lancer une sauvegarde.'
			});
		}

		const result = await executeBackupToCloud(id);
		if (!result.success) {
			return fail(500, {
				success: false,
				action: 'triggerBackup',
				configId: id,
				message: `Erreur lors de la sauvegarde : ${result.error}`
			});
		}

		const partsText = (result.partsCount ?? 1) > 1 ? ` en ${result.partsCount} fragments` : '';
		return {
			success: true,
			action: 'triggerBackup',
			configId: id,
			message: `Sauvegarde chiffrée (${result.filename}${partsText}) téléversée avec succès sur le Cloud (${result.deletedOldCount ?? 0} ancienne(s) archive(s) purgée(s)).`
		};
	},

	/**
	 * Supprime une configuration de sauvegarde.
	 */
	deleteConfig: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const formData = await request.formData();
		const id = String(formData.get('id') || '').trim();

		if (!id) return fail(400, { success: false, message: 'ID manquant.' });

		await deleteBackupConfig(id);

		return {
			success: true,
			action: 'deleteConfig',
			message: 'Configuration supprimée avec succès.'
		};
	},

	/**
	 * Recycle / régénère la clé maîtresse.
	 */
	rotateKey: async ({ locals }) => {
		assertAdmin(locals.user);
		await rotateMasterEncryptionKey();

		return {
			success: true,
			action: 'rotateKey',
			message: 'Nouvelle clé maîtresse de chiffrement générée avec succès.'
		};
	}
};
