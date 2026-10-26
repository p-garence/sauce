/**
 * @module routes/api/admin/backups/status/+server
 * @description Endpoint de polling temps-réel de l'état des sauvegardes et restaurations.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertAdmin } from '$lib/server/admin';
import { getAllBackupConfigs, getGlobalRestoreStatus } from '$lib/server/backup';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		assertAdmin(locals.user);
	} catch {
		throw error(403, 'Accès réservé aux administrateurs.');
	}

	const configs = await getAllBackupConfigs();
	const restore = await getGlobalRestoreStatus();

	return json({
		configs: configs.map((c) => ({
			id: c.id,
			lastRunStatus: c.lastRunStatus,
			lastRunAt: c.lastRunAt,
			lastRunError: c.lastRunError
		})),
		restore
	});
};
