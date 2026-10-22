/**
 * @module server/stories/feed
 * @description Récupération et structuration des flux de stories (flux global, par story, par utilisateur).
 */

import { db } from '$lib/server/db';
import {
	stories,
	storyViews,
	storyLikes,
	user,
	userGroups,
	userGroupMembers,
	follows
} from '$lib/server/db/schema';
import { and, eq, gt, desc, inArray, type SQL } from 'drizzle-orm';
import type { StoryBundle, StoryItem } from '$lib/types';
import { canSeeStorySql } from '$lib/server/permissions';

/**
 * Règle de visibilité SQL des stories pour un spectateur donné.
 *
 * @param viewerId Identifiant de l'utilisateur consultant la story
 * @param options Options de filtrage (ex: ignoreExpiration)
 * @returns Clause SQL de filtrage
 */
export function canSeeStory(
	viewerId?: string | null,
	options?: { allowAuthorExpired?: boolean; ignoreExpiration?: boolean }
): SQL {
	return canSeeStorySql(viewerId, options);
}

/**
 * Récupère le flux de stories actives visibles par l'utilisateur connecté,
 * groupées par auteur avec statut vu/non-vu et détection des stories de groupe.
 *
 * @param viewerId Identifiant de l'utilisateur connecté
 * @returns Liste de StoryBundle triés selon les priorités d'affichage
 */
export async function getStoriesFeed(viewerId: string): Promise<StoryBundle[]> {
	const now = new Date();
	const activeStories = await db
		.select({
			story: stories,
			author: {
				id: user.id,
				username: user.username,
				name: user.name,
				image: user.image
			},
			group: {
				id: userGroups.id,
				name: userGroups.name,
				icon: userGroups.icon,
				color: userGroups.color
			}
		})
		.from(stories)
		.innerJoin(user, eq(stories.authorId, user.id))
		.leftJoin(userGroups, eq(stories.groupId, userGroups.id))
		.where(and(gt(stories.expiresAt, now), canSeeStory(viewerId)))
		.orderBy(desc(stories.createdAt));

	if (activeStories.length === 0) return [];

	const storyIds = activeStories.map((s) => s.story.id);

	// Récupère les stories déjà vues par ce spectateur
	const viewedRows = await db
		.select({ storyId: storyViews.storyId })
		.from(storyViews)
		.where(and(eq(storyViews.viewerId, viewerId), inArray(storyViews.storyId, storyIds)));

	const viewedSet = new Set(viewedRows.map((v) => v.storyId));

	// Groupes auxquels le spectateur appartient (membre d'un groupe créé par un autre utilisateur)
	const viewerGroupMemberships = await db
		.select({ groupId: userGroupMembers.groupId })
		.from(userGroupMembers)
		.where(eq(userGroupMembers.userId, viewerId));

	const viewerMemberGroupIds = new Set<string>(viewerGroupMemberships.map((m) => m.groupId));

	// Utilisateurs auxquels le spectateur est abonné
	const followedRows = await db
		.select({ followingId: follows.followingId })
		.from(follows)
		.where(and(eq(follows.followerId, viewerId), eq(follows.status, 'accepted')));

	const followedUserIds = new Set<string>(followedRows.map((f) => f.followingId));

	// Récupère les likes de ce spectateur
	let likedSet = new Set<string>();
	try {
		const likedRows = await db
			.select({ storyId: storyLikes.storyId })
			.from(storyLikes)
			.where(and(eq(storyLikes.userId, viewerId), inArray(storyLikes.storyId, storyIds)));
		likedSet = new Set(likedRows.map((l) => l.storyId));
	} catch {
		// Table story_likes
	}

	// Regroupement par auteur
	const bundlesMap = new Map<string, StoryBundle>();

	for (const row of activeStories) {
		const isViewed = row.story.authorId === viewerId || viewedSet.has(row.story.id);
		const storyItem: StoryItem = {
			id: row.story.id,
			authorId: row.story.authorId,
			mediaUrl: row.story.mediaUrl,
			mediaType: row.story.mediaType as 'image' | 'video',
			caption: row.story.caption,
			visibility: row.story.visibility,
			groupId: row.story.groupId,
			groupName: row.group?.name || null,
			groupColor: row.group?.color || null,
			groupIcon: row.group?.icon || null,
			viewsCount: row.story.viewsCount,
			likesCount: row.story.likesCount ?? 0,
			expiresAt: row.story.expiresAt.toISOString(),
			createdAt: row.story.createdAt.toISOString(),
			isViewed,
			isLiked: likedSet.has(row.story.id),
			isArchived: row.story.isArchived ?? true
		};

		let bundle = bundlesMap.get(row.story.authorId);
		if (!bundle) {
			bundle = {
				author: {
					id: row.author.id,
					username: row.author.username,
					name: row.author.name,
					image: row.author.image
				},
				stories: [],
				hasUnviewed: false,
				hasGroupStory: false,
				hasSpecialGroupStory: false,
				isFollowing: followedUserIds.has(row.story.authorId),
				primaryGroupColor: null,
				latestCreatedAt: row.story.createdAt.toISOString()
			};
			bundlesMap.set(row.story.authorId, bundle);
		}

		bundle.stories.push(storyItem);
		if (!isViewed) {
			bundle.hasUnviewed = true;
		}
		if (row.story.groupId) {
			bundle.hasGroupStory = true;
			if (!bundle.primaryGroupColor && row.group?.color) {
				bundle.primaryGroupColor = row.group.color;
			}
			if (viewerMemberGroupIds.has(row.story.groupId) && followedUserIds.has(row.story.authorId)) {
				bundle.hasSpecialGroupStory = true;
			}
		}
		if (
			!bundle.latestCreatedAt ||
			new Date(row.story.createdAt).getTime() > new Date(bundle.latestCreatedAt).getTime()
		) {
			bundle.latestCreatedAt = row.story.createdAt.toISOString();
		}
	}

	function getBundleTier(b: StoryBundle): number {
		// Tier 0 : Mes propres stories
		if (b.author.id === viewerId) return 0;
		// Tier 1 : "Groupes spéciaux" à qui on est abonnés
		if (b.hasSpecialGroupStory) return 1;
		// Tier 2 : Personnes à qui on est abonné
		if (b.isFollowing) return 2;
		// Tier 3 : Réseau et public
		return 3;
	}

	// Tri des bulles :
	// 1. La bulle de l'utilisateur courant TOUJOURS en tête (Tier 0)
	// 2. Les stories NON-VUES passent TOUJOURS avant les stories DÉJÀ VUES (même celles d'abonnés)
	// 3. À statut égal (toutes deux non-vues ou toutes deux vues) : les plus récentes d'abord !
	const bundles = Array.from(bundlesMap.values());
	bundles.sort((a, b) => {
		const isMeA = a.author.id === viewerId;
		const isMeB = b.author.id === viewerId;
		if (isMeA && !isMeB) return -1;
		if (!isMeA && isMeB) return 1;

		// Règle : Les stories non-vues priment absolument sur les stories déjà vues
		if (a.hasUnviewed && !b.hasUnviewed) return -1;
		if (!a.hasUnviewed && b.hasUnviewed) return 1;

		// Plus récentes en premier
		const timeDiff = new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
		if (timeDiff !== 0) return timeDiff;

		// En cas d'égalité exacte : priorité par tier (Groupes spéciaux > Abonnements > Réseau/Public)
		const tierA = getBundleTier(a);
		const tierB = getBundleTier(b);
		return tierA - tierB;
	});

	return bundles;
}

/**
 * Récupère le bundle de stories correspondant à une story donnée (pour deep-link /story/[id]).
 *
 * @param storyId Identifiant de la story
 * @param viewerId Identifiant du spectateur
 */
export async function getStoryBundleForStory(
	storyId: string,
	viewerId: string
): Promise<
	| { success: true; bundle: StoryBundle; initialStoryIndex: number }
	| { success: false; reason: 'not_found' | 'expired' | 'forbidden' }
> {
	const now = new Date();

	// 1. Vérification de l'existence de la story
	const [target] = await db
		.select({
			story: stories,
			author: {
				id: user.id,
				username: user.username,
				name: user.name,
				image: user.image
			}
		})
		.from(stories)
		.innerJoin(user, eq(stories.authorId, user.id))
		.where(eq(stories.id, storyId));

	if (!target) {
		return { success: false, reason: 'not_found' };
	}

	if (new Date(target.story.expiresAt) <= now) {
		return { success: false, reason: 'expired' };
	}

	// 2. Vérification des permissions
	const [allowed] = await db
		.select({ id: stories.id })
		.from(stories)
		.where(and(eq(stories.id, storyId), canSeeStory(viewerId)));

	if (!allowed) {
		return { success: false, reason: 'forbidden' };
	}

	// 3. Récupération de toutes les stories actives de cet auteur visibles par le spectateur
	const authorStories = await db
		.select({
			story: stories,
			author: {
				id: user.id,
				username: user.username,
				name: user.name,
				image: user.image
			},
			group: {
				id: userGroups.id,
				name: userGroups.name,
				icon: userGroups.icon,
				color: userGroups.color
			}
		})
		.from(stories)
		.innerJoin(user, eq(stories.authorId, user.id))
		.leftJoin(userGroups, eq(stories.groupId, userGroups.id))
		.where(
			and(
				eq(stories.authorId, target.story.authorId),
				gt(stories.expiresAt, now),
				canSeeStory(viewerId)
			)
		)
		.orderBy(desc(stories.createdAt));

	const storyIds = authorStories.map((s) => s.story.id);

	// Vues
	const viewedRows = await db
		.select({ storyId: storyViews.storyId })
		.from(storyViews)
		.where(and(eq(storyViews.viewerId, viewerId), inArray(storyViews.storyId, storyIds)));
	const viewedSet = new Set(viewedRows.map((v) => v.storyId));

	// Likes
	let likedSet = new Set<string>();
	try {
		const likedRows = await db
			.select({ storyId: storyLikes.storyId })
			.from(storyLikes)
			.where(and(eq(storyLikes.userId, viewerId), inArray(storyLikes.storyId, storyIds)));
		likedSet = new Set(likedRows.map((l) => l.storyId));
	} catch {
		// table story_likes
	}

	const isFollowingAuthor =
		(
			await db
				.select({ id: follows.followingId })
				.from(follows)
				.where(
					and(
						eq(follows.followerId, viewerId),
						eq(follows.followingId, target.story.authorId),
						eq(follows.status, 'accepted')
					)
				)
		).length > 0;

	const storyItems: StoryItem[] = authorStories.map((row) => ({
		id: row.story.id,
		authorId: row.story.authorId,
		mediaUrl: row.story.mediaUrl,
		mediaType: row.story.mediaType as 'image' | 'video',
		caption: row.story.caption,
		visibility: row.story.visibility,
		groupId: row.story.groupId,
		groupName: row.group?.name || null,
		groupColor: row.group?.color || null,
		groupIcon: row.group?.icon || null,
		viewsCount: row.story.viewsCount,
		likesCount: row.story.likesCount ?? 0,
		expiresAt: row.story.expiresAt.toISOString(),
		createdAt: row.story.createdAt.toISOString(),
		isViewed: row.story.authorId === viewerId || viewedSet.has(row.story.id),
		isLiked: likedSet.has(row.story.id),
		isArchived: row.story.isArchived ?? true
	}));

	const initialStoryIndex = Math.max(
		0,
		storyItems.findIndex((s) => s.id === storyId)
	);

	const bundle: StoryBundle = {
		author: {
			id: target.author.id,
			username: target.author.username,
			name: target.author.name,
			image: target.author.image
		},
		stories: storyItems,
		hasUnviewed: storyItems.some((s) => !s.isViewed),
		hasGroupStory: storyItems.some((s) => s.groupId !== null),
		isFollowing: isFollowingAuthor,
		latestCreatedAt: target.story.createdAt.toISOString()
	};

	return { success: true, bundle, initialStoryIndex };
}

/**
 * Récupère le bundle de stories actives d'un utilisateur spécifique visibles par le spectateur.
 *
 * @param targetUserId Identifiant de l'auteur ciblé
 * @param viewerId Identifiant du spectateur
 */
export async function getUserStoryBundle(
	targetUserId: string,
	viewerId: string
): Promise<StoryBundle | null> {
	const now = new Date();

	const authorStories = await db
		.select({
			story: stories,
			author: {
				id: user.id,
				username: user.username,
				name: user.name,
				image: user.image
			},
			group: {
				id: userGroups.id,
				name: userGroups.name,
				icon: userGroups.icon,
				color: userGroups.color
			}
		})
		.from(stories)
		.innerJoin(user, eq(stories.authorId, user.id))
		.leftJoin(userGroups, eq(stories.groupId, userGroups.id))
		.where(
			and(eq(stories.authorId, targetUserId), gt(stories.expiresAt, now), canSeeStory(viewerId))
		)
		.orderBy(desc(stories.createdAt));

	if (authorStories.length === 0) {
		return null;
	}

	const storyIds = authorStories.map((s) => s.story.id);

	// Vues
	const viewedRows = await db
		.select({ storyId: storyViews.storyId })
		.from(storyViews)
		.where(and(eq(storyViews.viewerId, viewerId), inArray(storyViews.storyId, storyIds)));
	const viewedSet = new Set(viewedRows.map((v) => v.storyId));

	// Likes
	let likedSet = new Set<string>();
	try {
		const likedRows = await db
			.select({ storyId: storyLikes.storyId })
			.from(storyLikes)
			.where(and(eq(storyLikes.userId, viewerId), inArray(storyLikes.storyId, storyIds)));
		likedSet = new Set(likedRows.map((l) => l.storyId));
	} catch {
		// table story_likes
	}

	const isFollowingAuthor =
		targetUserId === viewerId ||
		(
			await db
				.select({ id: follows.followingId })
				.from(follows)
				.where(
					and(
						eq(follows.followerId, viewerId),
						eq(follows.followingId, targetUserId),
						eq(follows.status, 'accepted')
					)
				)
		).length > 0;

	const storyItems: StoryItem[] = authorStories.map((row) => ({
		id: row.story.id,
		authorId: row.story.authorId,
		mediaUrl: row.story.mediaUrl,
		mediaType: row.story.mediaType as 'image' | 'video',
		caption: row.story.caption,
		visibility: row.story.visibility,
		groupId: row.story.groupId,
		groupName: row.group?.name || null,
		groupColor: row.group?.color || null,
		groupIcon: row.group?.icon || null,
		viewsCount: row.story.viewsCount,
		likesCount: row.story.likesCount ?? 0,
		expiresAt: row.story.expiresAt.toISOString(),
		createdAt: row.story.createdAt.toISOString(),
		isViewed: row.story.authorId === viewerId || viewedSet.has(row.story.id),
		isLiked: likedSet.has(row.story.id),
		isArchived: row.story.isArchived ?? true
	}));

	const firstAuthor = authorStories[0].author;
	const primaryGroup = authorStories.find((s) => s.story.groupId && s.group?.color);

	return {
		author: {
			id: firstAuthor.id,
			username: firstAuthor.username,
			name: firstAuthor.name,
			image: firstAuthor.image
		},
		stories: storyItems,
		hasUnviewed: storyItems.some((s) => !s.isViewed),
		hasGroupStory: storyItems.some((s) => s.groupId !== null),
		isFollowing: isFollowingAuthor,
		primaryGroupColor: primaryGroup?.group?.color || null,
		latestCreatedAt: authorStories[0].story.createdAt.toISOString()
	};
}
