/**
 * @module server/posts/feed
 * @description Récupération et filtrage des publications du flux utilisateur (sources, tags, visibilité, pagination).
 */

import {
	and,
	sql,
	eq,
	exists,
	not,
	or,
	desc,
	inArray,
	notInArray,
	isNotNull,
	isNull,
	type SQL
} from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	posts,
	postLikes,
	hiddenPosts,
	userFeeds,
	follows,
	userGroups,
	userGroupMembers,
	tags,
	postTags,
	userSavedIconSets,
	userSavedEmojiSets,
	user as userTable
} from '$lib/server/db/schema';
import type { PostData, FeedSortMode, PostType, UserFeed } from '$lib/types';
import { POSTS_PER_SCROLL } from '$lib/constants';
import type { CursorData } from '../cursor';
import { getTagsForPosts } from '$lib/server/tags';
import { canSeePost, notHidden, notSeen, formatPosts } from './helpers';
import type { DbPostRow } from './types';
import { getRssFeedPosts } from '$lib/server/rss';
import { getBlendedFeedPosts } from './blend';
import { buildSortStrategy, buildNextCursor } from './sorting';

export { getBlendedFeedPosts };

/**
 * Exécute une requête de sélection de posts avec injection des champs dérivés utilisateur
 * (isLiked, isHidden, isFollowingAuthor) et association des tags en batch.
 *
 * @param options - Options de filtrage, limite, ordre et identifiant du spectateur
 * @returns Liste de posts typés PostData
 */
export async function queryPosts(options: {
	where: SQL | undefined;
	limit: number;
	viewerId: string;
	orderBy?: SQL[];
}): Promise<PostData[]> {
	const { where, limit, viewerId, orderBy = [desc(posts.createdAt)] } = options;

	const dbPosts = await db.query.posts.findMany({
		limit,
		orderBy,
		where,
		extras: {
			isLiked:
				sql<boolean>`EXISTS (SELECT 1 FROM ${postLikes} pl WHERE pl.post_id = ${posts.id} AND pl.user_id = ${viewerId})`.as(
					'is_liked'
				),
			isHidden:
				sql<boolean>`EXISTS (SELECT 1 FROM ${hiddenPosts} hp WHERE hp.post_id = ${posts.id} AND hp.user_id = ${viewerId})`.as(
					'is_hidden'
				),
			isFollowingAuthor:
				sql<boolean>`EXISTS (SELECT 1 FROM ${follows} f WHERE f.follower_id = ${viewerId} AND f.following_id = ${posts.authorId} AND f.status = 'accepted')`.as(
					'is_following_author'
				)
		},
		with: {
			author: { columns: { id: true, username: true, name: true, image: true } },
			iconSet: {
				with: {
					owner: { columns: { id: true, username: true, name: true, image: true } }
				}
			},
			emojiSet: {
				with: {
					owner: { columns: { id: true, username: true, name: true, image: true } }
				}
			}
		}
	});

	const postIds = dbPosts.map((p) => p.id);
	const tagsMap = await getTagsForPosts(postIds);

	const iconSetIds = dbPosts.map((p) => p.iconSetId).filter((id): id is string => Boolean(id));
	const emojiSetIds = dbPosts.map((p) => p.emojiSetId).filter((id): id is string => Boolean(id));
	let savedIconSetIds = new Set<string>();
	let savedEmojiSetIds = new Set<string>();

	if (options.viewerId) {
		if (iconSetIds.length > 0) {
			const savedRows = await db.query.userSavedIconSets.findMany({
				where: and(
					eq(userSavedIconSets.userId, options.viewerId),
					inArray(userSavedIconSets.iconSetId, iconSetIds)
				),
				columns: { iconSetId: true }
			});
			savedIconSetIds = new Set(savedRows.map((r) => r.iconSetId));
		}

		if (emojiSetIds.length > 0) {
			const savedRows = await db.query.userSavedEmojiSets.findMany({
				where: and(
					eq(userSavedEmojiSets.userId, options.viewerId),
					inArray(userSavedEmojiSets.emojiSetId, emojiSetIds)
				),
				columns: { emojiSetId: true }
			});
			savedEmojiSetIds = new Set(savedRows.map((r) => r.emojiSetId));
		}

		const currentUser = await db.query.user.findFirst({
			where: eq(userTable.id, options.viewerId),
			columns: { activeIconSetId: true, activeEmojiSetId: true, activeEmojiSetIds: true }
		});
		let activeIds = (currentUser?.activeEmojiSetIds as string[]) || [];
		if (activeIds.length === 0 && currentUser?.activeEmojiSetId) {
			activeIds = [currentUser.activeEmojiSetId];
		}
		const activeEmojiSetIdSet = new Set(activeIds);

		return formatPosts(
			dbPosts as DbPostRow[],
			tagsMap,
			savedIconSetIds,
			savedEmojiSetIds,
			activeEmojiSetIdSet,
			currentUser?.activeIconSetId || null
		);
	}

	return formatPosts(dbPosts as DbPostRow[], tagsMap, savedIconSetIds, savedEmojiSetIds);
}

/**
 * Récupère le flux de posts principal en appliquant les règles de filtrage d'un flux :
 * source (public, following, groups, blend), tags inclus, exclusion des posts masqués/vus,
 * mode de tri (chrono, popular, random) et fenêtre temporelle avec pagination par curseur.
 *
 * @param userId - ID de l'utilisateur connecté consultant le flux
 * @param feedId - Identifiant du flux personnalisé (ou null pour le flux par défaut)
 * @param limitCount - Nombre maximal de posts à récupérer
 * @param cursor - Curseur d'offset/pagination décodé
 * @param depth - Compteur de récursion pour les flux combinés (blend)
 * @param forceHideSeen - Si true, force l'exclusion des posts déjà visionnés
 * @returns Objet contenant la liste des publications formatées et le curseur suivant
 */
export async function getFilteredPosts(
	userId: string,
	feedId: string | null = null,
	limitCount = POSTS_PER_SCROLL,
	cursor?: CursorData | null,
	depth = 0,
	forceHideSeen = false,
	forceRefresh = false
): Promise<{ posts: PostData[]; nextCursor: CursorData | null }> {
	const conditions: (SQL | undefined)[] = [];

	conditions.push(canSeePost(userId));
	conditions.push(notHidden(userId));

	let sortMode: FeedSortMode = 'chrono';
	let timeWindow = '7d';

	if (feedId) {
		const feedConfig = await db.query.userFeeds.findFirst({
			where: and(eq(userFeeds.id, feedId), eq(userFeeds.userId, userId))
		});

		if (feedConfig) {
			if (feedConfig.source === 'blend' && depth < 2) {
				return getBlendedFeedPosts(userId, feedConfig, limitCount, cursor, depth + 1, forceRefresh);
			}

			if (feedConfig.source === 'rss') {
				return getRssFeedPosts(userId, feedConfig as UserFeed, limitCount, cursor, forceRefresh);
			}

			sortMode = (feedConfig.sortMode as FeedSortMode) || 'chrono';
			timeWindow = feedConfig.timeWindow || '7d';

			// 1. Stratégie de source
			if (feedConfig.source === 'following') {
				conditions.push(
					or(
						exists(
							db
								.select({ id: follows.followingId })
								.from(follows)
								.where(
									and(
										eq(follows.followerId, userId),
										eq(follows.followingId, posts.authorId),
										eq(follows.status, 'accepted')
									)
								)
						),
						eq(posts.authorId, userId)
					)
				);
			} else if (
				feedConfig.source === 'groups' &&
				feedConfig.groupIds &&
				Array.isArray(feedConfig.groupIds) &&
				feedConfig.groupIds.length > 0
			) {
				const groupIds = feedConfig.groupIds as string[];
				conditions.push(
					or(
						exists(
							db
								.select({ id: userGroupMembers.groupId })
								.from(userGroupMembers)
								.innerJoin(userGroups, eq(userGroups.id, userGroupMembers.groupId))
								.where(
									and(
										eq(userGroups.ownerId, userId),
										inArray(userGroupMembers.groupId, groupIds),
										eq(userGroupMembers.userId, posts.authorId)
									)
								)
						),
						and(isNotNull(posts.groupId), inArray(posts.groupId, groupIds))
					)
				);
			}

			// 2. Stratégie de tags (inclusion ou exclusion)
			const tagMode =
				feedConfig.tagFilterMode ||
				(feedConfig.includeTags && feedConfig.includeTags.length > 0 ? 'include' : 'all');
			if (
				tagMode !== 'all' &&
				feedConfig.includeTags &&
				Array.isArray(feedConfig.includeTags) &&
				feedConfig.includeTags.length > 0
			) {
				const normalizedTags = (feedConfig.includeTags as string[])
					.map((t) => t.trim().toLowerCase().replace(/^#+/, ''))
					.filter(Boolean);

				if (normalizedTags.length > 0) {
					const tagExistsQuery = exists(
						db
							.select({ postId: postTags.postId })
							.from(postTags)
							.innerJoin(tags, eq(tags.id, postTags.tagId))
							.where(
								and(
									eq(postTags.postId, posts.id),
									inArray(sql`lower(${tags.name})`, normalizedTags)
								)
							)
					);

					if (tagMode === 'include') {
						conditions.push(tagExistsQuery);
					} else if (tagMode === 'exclude') {
						conditions.push(not(tagExistsQuery));
					}
				}
			}

			// 3. Stratégie : Masquer les vus
			if (feedConfig.hideSeen || forceHideSeen) {
				conditions.push(notSeen(userId));
			}

			// 4. Stratégie : Exclure des groupes
			if (
				feedConfig.excludedGroupIds &&
				Array.isArray(feedConfig.excludedGroupIds) &&
				feedConfig.excludedGroupIds.length > 0
			) {
				const excludedGroupIds = feedConfig.excludedGroupIds as string[];
				conditions.push(
					and(
						or(isNull(posts.groupId), notInArray(posts.groupId, excludedGroupIds)),
						not(
							exists(
								db
									.select({ id: userGroupMembers.groupId })
									.from(userGroupMembers)
									.innerJoin(userGroups, eq(userGroups.id, userGroupMembers.groupId))
									.where(
										and(
											eq(userGroups.ownerId, userId),
											inArray(userGroupMembers.groupId, excludedGroupIds),
											eq(userGroupMembers.userId, posts.authorId)
										)
									)
							)
						)
					)
				);
			}

			// 5. Stratégie : Filtrage par type de contenu (inclusion ou exclusion)
			if (
				feedConfig.contentTypeFilterMode === 'include' &&
				feedConfig.contentTypes &&
				Array.isArray(feedConfig.contentTypes) &&
				feedConfig.contentTypes.length > 0
			) {
				conditions.push(inArray(posts.postType, feedConfig.contentTypes as PostType[]));
			} else if (
				feedConfig.contentTypeFilterMode === 'exclude' &&
				feedConfig.contentTypes &&
				Array.isArray(feedConfig.contentTypes) &&
				feedConfig.contentTypes.length > 0
			) {
				conditions.push(notInArray(posts.postType, feedConfig.contentTypes as PostType[]));
			}

			// 6. Stratégie : Filtrage des diapositives enfants de carrousel (inclusion ou exclusion)
			const validCarouselChildTypes = ['image', 'video', 'text'];
			if (
				feedConfig.carouselContentTypeFilterMode === 'include' &&
				feedConfig.carouselContentTypes &&
				Array.isArray(feedConfig.carouselContentTypes) &&
				feedConfig.carouselContentTypes.length > 0
			) {
				const filteredChildTypes = (feedConfig.carouselContentTypes as string[]).filter((t) =>
					validCarouselChildTypes.includes(t)
				);
				if (filteredChildTypes.length > 0) {
					const typesListSql = sql.join(
						filteredChildTypes.map((t) => sql`${t}`),
						sql`, `
					);
					conditions.push(
						sql`NOT (${posts.postType} = 'carousel' AND NOT EXISTS (
							SELECT 1 FROM jsonb_array_elements(COALESCE(${posts.mediaUrls}, '[]'::jsonb)) elem
							WHERE elem->>'type' IN (${typesListSql})
						))`
					);
				}
			} else if (
				feedConfig.carouselContentTypeFilterMode === 'exclude' &&
				feedConfig.carouselContentTypes &&
				Array.isArray(feedConfig.carouselContentTypes) &&
				feedConfig.carouselContentTypes.length > 0
			) {
				const filteredChildTypes = (feedConfig.carouselContentTypes as string[]).filter((t) =>
					validCarouselChildTypes.includes(t)
				);
				if (filteredChildTypes.length > 0) {
					const typesListSql = sql.join(
						filteredChildTypes.map((t) => sql`${t}`),
						sql`, `
					);
					conditions.push(
						sql`NOT (${posts.postType} = 'carousel' AND EXISTS (
							SELECT 1 FROM jsonb_array_elements(COALESCE(${posts.mediaUrls}, '[]'::jsonb)) elem
							WHERE elem->>'type' IN (${typesListSql})
						))`
					);
				}
			}
		}
	} else if (forceHideSeen) {
		conditions.push(notSeen(userId));
	}

	const { conditions: sortConditions, orderByClause, randomSeed } = buildSortStrategy(
		sortMode,
		cursor,
		timeWindow
	);
	conditions.push(...sortConditions);

	const where = and(...conditions);
	const fetchedPosts = await queryPosts({
		where,
		limit: limitCount,
		viewerId: userId,
		orderBy: orderByClause
	});

	let nextCursor: CursorData | null = null;
	if (fetchedPosts.length === limitCount) {
		const lastPost = fetchedPosts[fetchedPosts.length - 1];
		nextCursor = buildNextCursor(lastPost, sortMode, randomSeed);
	}

	return { posts: fetchedPosts, nextCursor };
}
