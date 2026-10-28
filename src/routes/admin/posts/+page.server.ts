/**
 * @module routes/admin/posts/+page.server
 * @description Contrôleur serveur pour la modération des publications.
 */

import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { assertAdmin, getAdminPosts, getAdminStats, deletePostByAdmin } from '$lib/server/admin';
import { getInstanceSettings } from '$lib/server/instanceSettings';
import { encodeCursor } from '$lib/server/cursor';

function getErrorMessage(err: unknown): string {
	return err instanceof Error ? err.message : 'Une erreur est survenue';
}

export const load: PageServerLoad = async ({ locals }) => {
	assertAdmin(locals.user);
	const settings = await getInstanceSettings();

	const [postsData, stats] = await Promise.all([
		getAdminPosts({
			limit: settings.performanceSettings.adminItemsPerPage,
			adminUserId: locals.user?.id
		}),
		getAdminStats()
	]);

	return {
		posts: postsData.posts,
		postsCursor: encodeCursor(postsData.nextCursor),
		totalPosts: stats.totalPosts
	};
};

export const actions: Actions = {
	deletePost: async ({ request, locals }) => {
		assertAdmin(locals.user);
		const form = await request.formData();
		const postId = form.get('postId') as string;
		try {
			await deletePostByAdmin(postId, locals.user!.id);
			return { success: true };
		} catch (err) {
			return fail(400, { message: getErrorMessage(err) });
		}
	}
};
