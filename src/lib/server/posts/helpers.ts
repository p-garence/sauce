import { db } from '$lib/server/db';
import { posts, hiddenPosts, postViews } from '$lib/server/db/schema';
import { and, eq, not, exists, type SQL } from 'drizzle-orm';
import type { CarouselItem, PostData, IconSet, EmojiSet } from '$lib/types';
import { canSeePostSql } from '$lib/server/permissions';
import type { DbPostRow } from './types';

export function canSeePost(viewerId?: string | null): SQL {
	return canSeePostSql(viewerId);
}

export function notHidden(userId: string): SQL {
	return not(
		exists(
			db
				.select({ id: hiddenPosts.postId })
				.from(hiddenPosts)
				.where(and(eq(hiddenPosts.postId, posts.id), eq(hiddenPosts.userId, userId)))
		)
	);
}

export function notSeen(userId: string): SQL {
	return not(
		exists(
			db
				.select({ id: postViews.postId })
				.from(postViews)
				.where(and(eq(postViews.postId, posts.id), eq(postViews.userId, userId)))
		)
	);
}

export function formatPosts(
	dbPosts: DbPostRow[],
	tagsMap: Record<string, string[]> = {},
	savedIconSetIds?: Set<string>,
	savedEmojiSetIds?: Set<string>,
	activeEmojiSetIds?: Set<string> | string | null,
	activeIconSetId?: string | null
): PostData[] {
	const activeEmojiSetIdSet =
		activeEmojiSetIds instanceof Set
			? activeEmojiSetIds
			: typeof activeEmojiSetIds === 'string'
				? new Set([activeEmojiSetIds])
				: null;

	return dbPosts.map((post) => {
		let iconSet = (post.iconSet as unknown as IconSet) || null;
		if (iconSet) {
			iconSet = {
				...iconSet,
				isSaved: savedIconSetIds ? savedIconSetIds.has(iconSet.id) : false,
				isActive: activeIconSetId ? activeIconSetId === iconSet.id : false
			};
		}

		let emojiSet = (post.emojiSet as unknown as EmojiSet) || null;
		if (emojiSet) {
			emojiSet = {
				...emojiSet,
				isSaved: savedEmojiSetIds ? savedEmojiSetIds.has(emojiSet.id) : false,
				isActive: activeEmojiSetIdSet ? activeEmojiSetIdSet.has(emojiSet.id) : false
			};
		}

		return {
			id: post.id,
			isSystem: Boolean(post.isSystem),
			author: {
				name: post.isSystem ? 'Le serveur' : post.author.name || 'Utilisateur Inconnu',
				id: post.author.id,
				username: post.isSystem ? 'serveur' : post.author.username || post.author.name || 'Inconnu',
				avatar: post.isSystem ? null : post.author.image,
				isFollowing: Boolean(post.isFollowingAuthor)
			},
			groupId: post.groupId,
			content: post.content,
			postType: post.postType,
			mediaUrls: (post.mediaUrls as CarouselItem[] | null) || [],
			visibility: post.visibility,
			iconSetId: post.iconSetId,
			emojiSetId: post.emojiSetId,
			iconSet,
			emojiSet,
			likesCount: post.likesCount,
			commentsCount: post.commentsCount,
			isLiked: Boolean(post.isLiked),
			isHidden: Boolean(post.isHidden),
			createdAt: post.createdAt,
			likedAt: post.likedAt,
			tags: tagsMap[post.id] || []
		};
	});
}
