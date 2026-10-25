import { json, error } from '@sveltejs/kit';
import { requireApiSession } from '$lib/server/auth';
import { assertCanSeePost, notBlockedSql } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { postLikes, user, follows } from '$lib/server/db/schema';
import { and, eq, desc, sql } from 'drizzle-orm';
import { isValidUuid } from '$lib/utils/validation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, request }) => {
	const session = await requireApiSession(request);
	const postId = params.id;

	if (!isValidUuid(postId)) {
		throw error(404, 'Post introuvable');
	}

	await assertCanSeePost(session.user.id, postId);

	const likers = await db
		.select({
			id: user.id,
			username: user.username,
			name: user.name,
			image: user.image,
			likedAt: postLikes.createdAt,
			isFollowing: sql<boolean>`EXISTS (
				SELECT 1 FROM ${follows} f 
				WHERE f.follower_id = ${session.user.id} 
				AND f.following_id = ${user.id} 
				AND f.status = 'accepted'
			)`.as('is_following')
		})
		.from(postLikes)
		.innerJoin(user, eq(postLikes.userId, user.id))
		.where(and(eq(postLikes.postId, postId), notBlockedSql(session.user.id, user.id)))
		.orderBy(desc(postLikes.createdAt));

	return json({ likes: likers });
};
