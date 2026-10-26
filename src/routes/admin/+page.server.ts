/**
 * @module routes/admin/+page.server
 * @description Contrôleur serveur du tableau de bord d'administration (statistiques et état général de l'instance).
 */

import type { PageServerLoad } from './$types';
import { assertAdmin, getAdminStats } from '$lib/server/admin';
import { getOrphanMedia, getServerAppStorageStats } from '$lib/server/media';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);

	const [stats, orphanStats, serverStorage, [userCountResult]] = await Promise.all([
		getAdminStats(),
		getOrphanMedia(),
		getServerAppStorageStats(),
		db.select({ count: count() }).from(user)
	]);

	return {
		stats,
		orphans: orphanStats,
		serverStorage,
		totalUsers: userCountResult?.count ?? 0
	};
};
