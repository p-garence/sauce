/**
 * @module routes/admin/stories/+page.server
 * @description Contrôleur serveur pour la modération des stories.
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { assertAdmin, getAdminStories, getAdminStats, deleteStoryByAdmin } from '$lib/server/admin';
import { ADMIN_ITEMS_PER_PAGE } from '$lib/constants';
import { encodeCursor } from '$lib/server/cursor';

function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Une erreur est survenue';
}

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);

	const [storiesData, stats] = await Promise.all([
		getAdminStories({ limit: ADMIN_ITEMS_PER_PAGE, adminUserId: locals.user?.id }),
		getAdminStats()
	]);

	return {
		stories: storiesData.stories,
		storiesCursor: encodeCursor(storiesData.nextCursor),
		totalStories: stats.totalStories
	};
};

export const actions: Actions = {
	deleteStory: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const storyId = form.get('storyId') as string;
		try {
			await deleteStoryByAdmin(storyId, locals.user!.id);
			return { success: true };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	}
};
