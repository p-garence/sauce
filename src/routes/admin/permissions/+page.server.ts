/**
 * @module routes/admin/permissions/+page.server
 * @description Contrôleur serveur de gestion des permissions et des privilèges d'accès.
 */

import type { PageServerLoad } from './$types';
import { assertAdmin } from '$lib/server/admin';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);

	// Seuls 'admin' et 'user' existent dans l'enum PostgreSQL actuel (roleEnum)
	const [adminCountRes, userCountRes] = await Promise.all([
		db.select({ count: count() }).from(user).where(eq(user.role, 'admin')),
		db.select({ count: count() }).from(user).where(eq(user.role, 'user'))
	]);

	return {
		roleDistribution: {
			admin: adminCountRes[0]?.count ?? 0,
			moderator: 0,
			user: userCountRes[0]?.count ?? 0
		}
	};
};
