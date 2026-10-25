import { and, sql, eq, lt, gt, or, desc, asc, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { posts, postLikes, hiddenPosts, user } from '$lib/server/db/schema';
import type { PostData, PostSortMode } from '$lib/types';
import type { CursorData } from '../cursor';
import { getTagsForPosts } from '$lib/server/tags';
import { canSeePost, notHidden, formatPosts } from './helpers';
import { queryPosts } from './feed';
import type { DbPostRow } from './types';

/**
 * Récupère les publications d'un utilisateur cible pour son profil public ou privé,
 * en respectant les permissions de visibilité du viewer et le mode de tri choisi
 * (chronologique descendant, ascendant ou popularité).
 *
 * @param currentUserId - ID de l'utilisateur qui consulte le profil
 * @param targetUserId - ID de l'utilisateur dont on affiche les publications
 * @param limitCount - Nombre de posts par page
 * @param cursor - Curseur de pagination
 * @param sortMode - Mode de tri ('chrono' | 'popular' | 'oldest')
 */
export async function getProfilePosts(
	currentUserId: string,
	targetUserId: string,
	limitCount: number,
	cursor?: CursorData | null,
	sortMode: PostSortMode = 'chrono'
): Promise<{ posts: PostData[]; nextCursor: CursorData | null }> {
	const conditions: (SQL | undefined)[] = [
		eq(posts.authorId, targetUserId),
		eq(posts.isSystem, false),
		canSeePost(currentUserId)
	];

	if (cursor && cursor.lastValue !== undefined) {
		if (sortMode === 'popular') {
			const lastLikes = Number(cursor.lastValue);
			if (!Number.isNaN(lastLikes)) {
				conditions.push(
					or(
						lt(posts.likesCount, lastLikes),
						and(eq(posts.likesCount, lastLikes), lt(posts.id, cursor.lastId))
					)
				);
			}
		} else if (sortMode === 'oldest') {
			const cursorDate = new Date(cursor.lastValue as string);
			if (!Number.isNaN(cursorDate.getTime())) {
				conditions.push(gt(posts.createdAt, cursorDate));
			}
		} else {
			const cursorDate = new Date(cursor.lastValue as string);
			if (!Number.isNaN(cursorDate.getTime())) {
				conditions.push(lt(posts.createdAt, cursorDate));
			}
		}
	}

	let orderByClause = [desc(posts.createdAt), desc(posts.id)];
	if (sortMode === 'oldest') {
		orderByClause = [asc(posts.createdAt), asc(posts.id)];
	} else if (sortMode === 'popular') {
		orderByClause = [desc(posts.likesCount), desc(posts.id)];
	}

	const fetchedPosts = await queryPosts({
		where: and(...conditions),
		limit: limitCount,
		viewerId: currentUserId,
		orderBy: orderByClause
	});

	let nextCursor: CursorData | null = null;
	if (fetchedPosts.length === limitCount) {
		const lastPost = fetchedPosts[fetchedPosts.length - 1];

		let lastValue: string | number = lastPost.createdAt.toISOString();
		if (sortMode === 'popular') {
			lastValue = lastPost.likesCount;
		}

		nextCursor = {
			type: `profile_${sortMode}` as CursorData['type'],
			lastValue,
			lastId: lastPost.id
		};
	}
	return { posts: fetchedPosts, nextCursor };
}

/**
 * Récupère les publications aimées (likées) par un utilisateur cible,
 * ordonnées par date décroissante du like, en filtrant les posts que le viewer a le droit de voir.
 *
 * @param viewerId - ID de l'utilisateur effectuant la consultation
 * @param targetUserId - ID de l'utilisateur dont on consulte les likes
 * @param limitCount - Nombre de posts par page
 * @param cursor - Curseur basé sur le timestamp du like
 */
export async function getLikedPosts(
	viewerId: string,
	targetUserId: string,
	limitCount: number,
	cursor?: CursorData | null
): Promise<{ posts: PostData[]; nextCursor: CursorData | null }> {
	const conditions: (SQL | undefined)[] = [
		eq(postLikes.userId, targetUserId),
		canSeePost(viewerId),
		notHidden(viewerId)
	];

	if (cursor && cursor.type === 'likes') {
		const cursorDate = new Date(cursor.lastValue as string);
		if (!Number.isNaN(cursorDate.getTime())) {
			conditions.push(lt(postLikes.createdAt, cursorDate));
		}
	}

	// INNER JOIN pour trier par date de Like
	const rows = await db
		.select({
			post: posts,
			author: { id: user.id, username: user.username, name: user.name, image: user.image },
			likedAt: postLikes.createdAt,
			isLiked:
				sql<boolean>`EXISTS (SELECT 1 FROM ${postLikes} pl WHERE pl.post_id = ${posts.id} AND pl.user_id = ${viewerId})`.as(
					'is_liked'
				),
			isHidden:
				sql<boolean>`EXISTS (SELECT 1 FROM ${hiddenPosts} hp WHERE hp.post_id = ${posts.id} AND hp.user_id = ${viewerId})`.as(
					'is_hidden'
				)
		})
		.from(postLikes)
		.innerJoin(posts, eq(postLikes.postId, posts.id))
		.innerJoin(user, eq(posts.authorId, user.id))
		.where(and(...conditions))
		.orderBy(desc(postLikes.createdAt))
		.limit(limitCount);

	const flatRows = rows.map((row) => ({
		...row.post,
		author: row.author,
		likedAt: row.likedAt,
		isLiked: row.isLiked,
		isHidden: row.isHidden
	}));

	const postIds = flatRows.map((r) => r.id);
	const tagsMap = await getTagsForPosts(postIds);
	const formattedPosts = formatPosts(flatRows as DbPostRow[], tagsMap);

	let nextCursor: CursorData | null = null;
	if (formattedPosts.length === limitCount) {
		const lastPost = formattedPosts[formattedPosts.length - 1];
		if (lastPost.likedAt) {
			nextCursor = {
				type: 'likes',
				lastValue: lastPost.likedAt.toISOString(),
				lastId: lastPost.id
			};
		}
	}

	return { posts: formattedPosts, nextCursor };
}
