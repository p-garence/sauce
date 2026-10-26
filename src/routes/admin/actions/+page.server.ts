/**
 * @module routes/admin/actions/+page.server
 * @description Contrôleur serveur pour les actions globales et outils de développement / démonstration.
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	assertAdmin,
	getAdminStats,
	seedTestPosts,
	seedTestUsers,
	seedInviteKeys
} from '$lib/server/admin';

function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Une erreur est survenue';
}

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);
	const stats = await getAdminStats();
	return {
		stats
	};
};

export const actions: Actions = {
	generatePosts: async ({ locals }) => {
		assertAdmin(locals.user);
		try {
			const count = await seedTestPosts(locals.user!.id, 30);
			return { success: true, message: `${count} posts générés avec succès !` };
		} catch (error) {
			console.error('Erreur génération posts:', error);
			return fail(500, { success: false, message: 'Erreur lors de la génération' });
		}
	},

	generateKeys: async ({ locals }) => {
		assertAdmin(locals.user);
		try {
			const keys = await seedInviteKeys(locals.user!.id, 10);
			return { success: true, message: `${keys.length} clés d'invitation générées !` };
		} catch (err: unknown) {
			return fail(500, { message: getErrorMessage(err) });
		}
	},

	generateUsers: async ({ locals }) => {
		assertAdmin(locals.user);
		try {
			const count = await seedTestUsers(30);
			return { success: true, message: `${count} utilisateurs de test créés avec succès !` };
		} catch (err: unknown) {
			console.error('Erreur génération utilisateurs:', err);
			return fail(500, { message: getErrorMessage(err) });
		}
	}
};
