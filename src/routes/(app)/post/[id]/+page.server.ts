import { error } from '@sveltejs/kit';
import { getPostById } from '$lib/server/posts';
import { isValidUuid } from '$lib/utils/validation';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent }) => {
	if (!isValidUuid(params.id)) {
		throw error(404, "Post introuvable ou vous n'avez pas les droits pour le voir.");
	}

	const { sessionUser } = await parent();
	const post = await getPostById(params.id, sessionUser?.id ?? null);

	if (!post) {
		throw error(404, "Post introuvable ou vous n'avez pas les droits pour le voir.");
	}

	if (sessionUser) {
		db.update(notifications)
			.set({ isRead: true })
			.where(
				and(
					eq(notifications.recipientId, sessionUser.id),
					eq(notifications.entityId, params.id),
					eq(notifications.isRead, false)
				)
			)
			.catch((e) => console.error('[PostRead] Erreur notifications lues:', e));
	}

	return {
		post
	};
};
