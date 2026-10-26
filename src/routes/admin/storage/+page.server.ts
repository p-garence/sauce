/**
 * @module routes/admin/storage/+page.server
 * @description Contrôleur serveur pour la gestion du stockage serveur, médias et fichiers orphelins.
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { assertAdmin } from '$lib/server/admin';
import {
	getServerAppStorageStats,
	getOrphanMedia,
	deleteOrphanMedia
} from '$lib/server/media';

function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Une erreur est survenue';
}

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);

	const [serverStorage, orphanStats] = await Promise.all([
		getServerAppStorageStats(),
		getOrphanMedia()
	]);

	return {
		serverStorage,
		orphans: orphanStats
	};
};

export const actions: Actions = {
	deleteOrphans: async ({ locals }) => {
		assertAdmin(locals.user);
		try {
			const res = await deleteOrphanMedia();
			return { success: true, count: res.deletedCount };
		} catch (err) {
			return fail(500, { message: getErrorMessage(err) });
		}
	}
};
