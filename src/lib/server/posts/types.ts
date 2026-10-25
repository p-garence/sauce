import type { PostType, PostVisibility } from '$lib/types';

export interface DbPostRow {
	id: string;
	content: string | null;
	postType: PostType;
	mediaUrls: unknown;
	visibility: PostVisibility;
	groupId: string | null;
	likesCount: number;
	commentsCount: number;
	createdAt: Date;
	isLiked: unknown;
	isHidden: unknown;
	isFollowingAuthor?: unknown;
	isSystem?: boolean;
	iconSetId?: string | null;
	emojiSetId?: string | null;
	iconSet?: unknown;
	emojiSet?: unknown;
	author: { id: string; username: string | null; name: string | null; image: string | null };
	likedAt?: Date;
}
