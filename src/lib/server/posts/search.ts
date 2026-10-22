import { and, sql, eq, or, desc, ilike, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { posts, postLikes, hiddenPosts, user, follows } from '$lib/server/db/schema';
import type { PostData } from '$lib/types';
import { POSTS_PER_GRID } from '$lib/constants';
import type { CursorData } from '../cursor';
import { getTagsForPosts } from '$lib/server/tags';
import { canSeePost, notHidden, formatPosts } from './helpers';
import type { DbPostRow } from './types';

/**
 * Recherche des posts dans leur contenu textuel ou leurs slides,
 * en appliquant la visibilité relative au spectateur.
 *
 * En présence de mots-clés de recherche, applique un score de proximité réseau
 * (abonnements = 3, auteur = 2, abonnés = 1, autre = 0) puis le tri sélectionné.
 * En l'absence de recherche textuelle (navigation Explorer), trie directement
 * selon le mode sélectionné (date décroissante ou popularité).
 *
 * @param viewerId - ID de l'utilisateur effectuant la recherche
 * @param query - Chaîne de recherche (mots-clés)
 * @param sortMode - Mode d'ordonnancement ('chrono' | 'popular' | 'popular_week')
 * @param limitCount - Nombre de résultats par page
 * @param cursor - Curseur composite
 */
export async function searchPosts(
	viewerId: string,
	query: string,
	sortMode: 'chrono' | 'popular' | 'popular_week',
	limitCount = POSTS_PER_GRID,
	cursor?: CursorData | null
): Promise<{ posts: PostData[]; nextCursor: CursorData | null }> {
	const hasQuery = Boolean(query && query.trim());
	const isFollowingAuthor = sql`EXISTS(SELECT 1 FROM ${follows} f WHERE f.follower_id = ${viewerId} AND f.following_id = ${posts.authorId} AND f.status = 'accepted')`;
	const isFollowerAuthor = sql`EXISTS(SELECT 1 FROM ${follows} f WHERE f.follower_id = ${posts.authorId} AND f.following_id = ${viewerId} AND f.status = 'accepted')`;

	// Priorité en recherche : abonnements d'abord (3), ses propres posts (2), abonnés (1), autres (0)
	const networkScore = sql<number>`
        CASE 
            WHEN ${isFollowingAuthor} THEN 3 
            WHEN ${posts.authorId} = ${viewerId} THEN 2 
            WHEN ${isFollowerAuthor} THEN 1 
            ELSE 0 
        END
    `;

	const conditions: (SQL | undefined)[] = [canSeePost(viewerId), notHidden(viewerId)];

	// Filtrage semaine si demandé
	if (sortMode === 'popular_week') {
		conditions.push(sql`${posts.createdAt} >= NOW() - INTERVAL '7 days'`);
	}

	// Recherche textuelle
	if (hasQuery) {
		const searchPattern = `%${query.trim()}%`;
		conditions.push(
			or(ilike(posts.content, searchPattern), sql`${posts.mediaUrls}::text ILIKE ${searchPattern}`)
		);
	}

	const isPopularSort = sortMode === 'popular' || sortMode === 'popular_week';

	if (cursor && cursor.lastValue) {
		if (hasQuery) {
			const parts = String(cursor.lastValue).split(':');
			const lastScore = parseInt(parts[0], 10);
			const lastSecondary = parts.slice(1).join(':');

			if (!Number.isNaN(lastScore)) {
				if (isPopularSort) {
					const lastLikes = parseInt(lastSecondary, 10);
					if (!Number.isNaN(lastLikes)) {
						conditions.push(
							or(
								sql`${networkScore} < ${lastScore}`,
								and(sql`${networkScore} = ${lastScore}`, sql`${posts.likesCount} < ${lastLikes}`),
								and(
									sql`${networkScore} = ${lastScore}`,
									sql`${posts.likesCount} = ${lastLikes}`,
									sql`${posts.id} < ${cursor.lastId}`
								)
							)
						);
					}
				} else {
					const parsedDate = new Date(lastSecondary);
					if (!Number.isNaN(parsedDate.getTime())) {
						const lastIso = parsedDate.toISOString();
						conditions.push(
							or(
								sql`${networkScore} < ${lastScore}`,
								and(
									sql`${networkScore} = ${lastScore}`,
									sql`${posts.createdAt} < ${lastIso}::timestamptz`
								),
								and(
									sql`${networkScore} = ${lastScore}`,
									sql`${posts.createdAt} = ${lastIso}::timestamptz`,
									sql`${posts.id} < ${cursor.lastId}`
								)
							)
						);
					}
				}
			}
		} else {
			// Pas de recherche textuelle : curseur simple (likes ou date)
			const valStr = String(cursor.lastValue);
			const cleanVal = valStr.includes(':') ? valStr.split(':').slice(1).join(':') : valStr;

			if (isPopularSort) {
				const lastLikes = parseInt(cleanVal, 10);
				if (!Number.isNaN(lastLikes)) {
					conditions.push(
						or(
							sql`${posts.likesCount} < ${lastLikes}`,
							and(sql`${posts.likesCount} = ${lastLikes}`, sql`${posts.id} < ${cursor.lastId}`)
						)
					);
				}
			} else {
				const parsedDate = new Date(cleanVal);
				if (!Number.isNaN(parsedDate.getTime())) {
					const lastIso = parsedDate.toISOString();
					conditions.push(
						or(
							sql`${posts.createdAt} < ${lastIso}::timestamptz`,
							and(
								sql`${posts.createdAt} = ${lastIso}::timestamptz`,
								sql`${posts.id} < ${cursor.lastId}`
							)
						)
					);
				}
			}
		}
	}

	const orderByClause: SQL[] = hasQuery
		? [
				desc(networkScore),
				isPopularSort ? desc(posts.likesCount) : desc(posts.createdAt),
				desc(posts.id)
			]
		: [isPopularSort ? desc(posts.likesCount) : desc(posts.createdAt), desc(posts.id)];

	const rows = await db
		.select({
			post: posts,
			author: { id: user.id, username: user.username, name: user.name, image: user.image },
			isLiked:
				sql<boolean>`EXISTS (SELECT 1 FROM ${postLikes} pl WHERE pl.post_id = ${posts.id} AND pl.user_id = ${viewerId})`.as(
					'is_liked'
				),
			isHidden:
				sql<boolean>`EXISTS (SELECT 1 FROM ${hiddenPosts} hp WHERE hp.post_id = ${posts.id} AND hp.user_id = ${viewerId})`.as(
					'is_hidden'
				),
			isFollowingAuthor: isFollowingAuthor,
			networkScore: networkScore
		})
		.from(posts)
		.innerJoin(user, eq(posts.authorId, user.id))
		.where(and(...conditions))
		.orderBy(...orderByClause)
		.limit(limitCount);

	const flatRows = rows.map((row) => ({
		...row.post,
		author: row.author,
		isLiked: row.isLiked,
		isHidden: row.isHidden,
		isFollowingAuthor: row.isFollowingAuthor
	}));

	const postIds = flatRows.map((r) => r.id);
	const tagsMap = await getTagsForPosts(postIds);
	const formattedPosts = formatPosts(flatRows as DbPostRow[], tagsMap);

	let nextCursor: CursorData | null = null;
	if (formattedPosts.length === limitCount) {
		const lastRow = rows[rows.length - 1];
		const lastDate =
			lastRow.post.createdAt instanceof Date
				? lastRow.post.createdAt
				: new Date(lastRow.post.createdAt);
		const isoDate = lastDate.toISOString();

		if (hasQuery) {
			const secondaryValue = isPopularSort ? lastRow.post.likesCount : isoDate;

			nextCursor = {
				type: isPopularSort ? 'network_popular' : 'network_chrono',
				lastValue: `${lastRow.networkScore}:${secondaryValue}`,
				lastId: lastRow.post.id
			};
		} else {
			nextCursor = {
				type: isPopularSort ? 'likes' : 'chrono',
				lastValue: isPopularSort ? String(lastRow.post.likesCount) : isoDate,
				lastId: lastRow.post.id
			};
		}
	}

	return { posts: formattedPosts, nextCursor };
}
