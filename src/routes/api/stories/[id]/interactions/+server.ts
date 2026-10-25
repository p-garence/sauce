import { json, error } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { stories, storyLikes, storyViews, user, follows } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { isValidUuid } from '$lib/utils/validation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const storyId = params.id;

	if (!isValidUuid(storyId)) {
		throw error(404, 'Story introuvable');
	}

	const targetStory = await db.query.stories.findFirst({
		where: eq(stories.id, storyId),
		columns: { authorId: true }
	});

	if (!targetStory) {
		throw error(404, 'Story introuvable');
	}

	// Seul l'auteur de la story (ou un admin) peut voir les statistiques détaillées
	if (targetStory.authorId !== session.user.id && session.user.role !== 'admin') {
		throw error(403, 'Seul l’auteur peut consulter les interactions de sa story');
	}

	// 1. Liste des likes
	const likers = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			likedAt: storyLikes.createdAt,
			isFollowing: sql<boolean>`EXISTS (
				SELECT 1 FROM ${follows} f 
				WHERE f.follower_id = ${session.user.id} 
				AND f.following_id = ${user.id} 
				AND f.status = 'accepted'
			)`.as('is_following')
		})
		.from(storyLikes)
		.innerJoin(user, eq(storyLikes.userId, user.id))
		.where(eq(storyLikes.storyId, storyId))
		.orderBy(desc(storyLikes.createdAt));

	// 2. Liste des vues
	const viewers = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			viewedAt: storyViews.viewedAt,
			isFollowing: sql<boolean>`EXISTS (
				SELECT 1 FROM ${follows} f 
				WHERE f.follower_id = ${session.user.id} 
				AND f.following_id = ${user.id} 
				AND f.status = 'accepted'
			)`.as('is_following')
		})
		.from(storyViews)
		.innerJoin(user, eq(storyViews.viewerId, user.id))
		.where(eq(storyViews.storyId, storyId))
		.orderBy(desc(storyViews.viewedAt));

	return json({ likes: likers, views: viewers });
};
