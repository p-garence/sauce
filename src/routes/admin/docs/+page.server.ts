/**
 * @module routes/admin/docs/+page.server
 * @description Contrôleur serveur pour la page de documentation d'administration.
 */

import type { PageServerLoad } from './$types';
import { assertAdmin } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);
	return {};
};
