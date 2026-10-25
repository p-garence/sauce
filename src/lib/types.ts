import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
	user,
	posts,
	interactions,
	messages,
	chats,
	chatParticipants,
	inviteKeys,
	postVisibilityEnum,
	postTypeEnum,
	iconSets,
	emojiSets
} from './server/db/schema';

// ==========================================
// TYPES DE LA BASE DE DONNÉES (Drizzle)
// ==========================================

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type ConsentLevel = User['consentLevel'];

export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;

export type IconSet = InferSelectModel<typeof iconSets> & {
	isSaved?: boolean;
	isActive?: boolean;
	owner?: {
		id: string;
		username: string | null;
		name: string | null;
		image?: string | null;
	} | null;
};
export type NewIconSet = InferInsertModel<typeof iconSets>;

export type EmojiSet = InferSelectModel<typeof emojiSets> & {
	isSaved?: boolean;
	isActive?: boolean;
	owner?: {
		id: string;
		username: string | null;
		name: string | null;
		image: string | null;
	} | null;
};
export type NewEmojiSet = InferInsertModel<typeof emojiSets>;
export type { EmojiItem } from './server/db/schema/emojis';

export type Interaction = InferSelectModel<typeof interactions>;

export type Chat = InferSelectModel<typeof chats>;
export type NewChat = InferInsertModel<typeof chats>;

export type ChatParticipant = InferSelectModel<typeof chatParticipants>;

export type Message = InferSelectModel<typeof messages>;
export type NewMessage = InferInsertModel<typeof messages>;

export type InviteKey = InferSelectModel<typeof inviteKeys>;
// ==========================================
// TYPES FRONTEND (UI)
// ==========================================

export type CarouselItem = {
	type: 'text' | 'image' | 'video';
	content: string;
	poster?: string;
	align?: 'left' | 'center' | 'right';
};

/**
 * Item d'édition utilisé côté client par l'éditeur de carrousel (publier / modifier_post).
 * `file` (création) et `isUploading` (édition) sont optionnels car utilisés
 * différemment selon le contexte : upload différé à la soumission vs upload immédiat.
 */
export type EditorCarouselItem = {
	id: string;
	type: 'text' | 'image' | 'video';
	text: string;
	url: string;
	file?: File | null;
	isUploading?: boolean;
	align?: 'left' | 'center' | 'right';
};

export type PostVisibility = (typeof postVisibilityEnum.enumValues)[number];
export type PostType = (typeof postTypeEnum.enumValues)[number];

export type TrendingTagItem = {
	name: string;
	count?: number;
};
export type RssItemData = {
	title: string;
	url: string;
	siteName: string;
	siteUrl: string;
	faviconUrl?: string | null;
	summary?: string | null;
	imageUrl?: string | null;
	publishedAt: Date;
};

export type PostData = {
	id: string;
	author: {
		id: string;
		name: string;
		username: string;
		avatar?: string | null;
		isFollowing?: boolean;
	};
	groupId: string | null;
	content: string | null;
	postType: PostType;
	mediaUrls: CarouselItem[] | null;
	likesCount: number;
	commentsCount: number;
	createdAt: Date;
	isLiked: boolean;
	isHidden: boolean;
	likedAt?: Date;
	visibility: PostVisibility;
	iconSetId?: string | null;
	emojiSetId?: string | null;
	iconSet?: IconSet | null;
	emojiSet?: EmojiSet | null;
	tags?: string[];
	isSystem?: boolean;
	rssItem?: RssItemData | null;
};

export type ApiPost = Omit<Post, 'createdAt' | 'expiresAt' | 'mediaUrls'> & {
	createdAt: string;
	expiresAt: string | null;
	mediaUrls: CarouselItem[] | null;
	isLiked: boolean;
	isHidden: boolean;
	likedAt?: string;
};

export type UserGroup = {
	id: string;
	name: string;
	icon: string | null;
	color: string;
	membersCount: number;
};

export type PostSortMode = 'chrono' | 'oldest' | 'popular' | 'popular_week';
export type SerializedPost = Omit<PostData, 'createdAt'> & { createdAt: string };

export type ProfileVisibility = {
	bio: boolean;
	site: boolean;
	age: boolean;
	genre: boolean;
	contactEmail: boolean;
	requireFollowRequest: boolean;
	showFollowers: boolean;
	showFollowing: boolean;
	requireMessageApproval: boolean;
	allowMentions?: boolean;
};

export type NotificationSettings = {
	all: boolean;
	follow: boolean;
	message: boolean;
	like: boolean;
	comment: boolean;
};
export type UserSearchResult = {
	id: string;
	username: string;
	name: string | null;
	image: string | null;
	is_following: boolean;
	is_follower: boolean;
};

export type MenuAction = {
	label: string;
	icon?: string;
	iconId?: import('./icons/types').IconId;
	variant?: 'default' | 'danger';
	dividerBelow?: boolean;
	onClick: () => void;
};
export type CommentData = {
	id: string;
	postId: string;
	authorId: string;
	parentId: string | null;
	content: string;
	likesCount: number;
	isLiked: boolean;
	createdAt: string;
	updatedAt: string;
	author: {
		id: string;
		username: string;
		image: string | null;
		name: string | null;
	};
	replies?: CommentData[];
	showReplies?: boolean;
	repliesCount?: number;
	isLoadingReplies?: boolean;
	hasMoreReplies?: boolean;
	repliesPage?: number;
};

export type ChatMessage = Message & {
	sender?: { name: string | null; username: string | null; image: string | null } | null;
};

export type ChatContact = {
	id: string;
	type: 'direct' | 'group';
	title: string;
	image: string | null;
	status: 'accepted' | 'pending' | 'refused' | 'blocked';
	lastMessageTime: number;
	lastMessageContent: string;
	isLastMessageFromMe: boolean;
	lastMessageSenderName: string | null;
	isUnread?: boolean; // Optionnel car ajouté par le store côté client
	isMuted?: boolean;
};

// ==========================================
// TYPES TEMPS RÉEL (SSE)
// ==========================================

export type NotificationActorData = {
	id: string;
	username: string;
	name?: string | null;
	image: string | null;
};

export type AppNotification = {
	id: string;
	type: 'follow' | 'like' | 'comment' | 'system' | 'message' | 'mention';
	isRead: boolean;
	createdAt: string;
	content?: string | null;
	actor?: NotificationActorData | null;
	entityId?: string | null;
	actionState?: 'pending' | 'accepted' | 'refused' | null;
};

export type NotificationPayload = {
	recipientId: string;
	actorId?: string | null;
	type: 'follow' | 'like' | 'comment' | 'system' | 'mention' | 'message';
	entityId?: string | null;
	content?: string | null;
	actionState?: 'pending' | 'accepted' | 'refused' | null;
};

export type MessageStreamEvent = {
	type: 'message';
	data: ChatMessage;
};

export type MessageUpdatedStreamEvent = {
	type: 'message_updated';
	data: ChatMessage;
};

export type MessageDeletedStreamEvent = {
	type: 'message_deleted';
	data: { messageId: string; chatId: string; message?: ChatMessage };
};

export type NotificationStreamEvent = {
	type: 'notification';
	data: AppNotification;
};

// Événement déclenché quand une notification est supprimée
export type NotificationDeletedStreamEvent = {
	type: 'notification_deleted';
	data: { id: string };
};

// Événement déclenché quand les messages d'un chat sont consultés
export type ChatSeenStreamEvent = {
	type: 'chat_seen';
	data: { chatId: string; userId?: string };
};

// L'union de tous les événements possibles
export type StreamEvent =
	| MessageStreamEvent
	| MessageUpdatedStreamEvent
	| MessageDeletedStreamEvent
	| NotificationStreamEvent
	| ChatSeenStreamEvent
	| NotificationDeletedStreamEvent;

export type { IconId } from './icons/types';

// Remplacez 'any' par 'unknown'
export type FormResult = { success?: boolean; message?: string; [key: string]: unknown } | null;

export type StoryItem = {
	id: string;
	authorId: string;
	mediaUrl: string;
	mediaType: 'image' | 'video';
	caption: string | null;
	visibility: PostVisibility;
	groupId: string | null;
	groupName?: string | null;
	groupColor?: string | null;
	groupIcon?: string | null;
	viewsCount: number;
	likesCount: number;
	expiresAt: string;
	createdAt: string;
	isViewed: boolean;
	isLiked: boolean;
	isArchived?: boolean;
};

export type StoryBundle = {
	author: {
		id: string;
		username: string | null;
		name: string | null;
		image: string | null;
	};
	stories: StoryItem[];
	hasUnviewed: boolean;
	hasGroupStory: boolean;
	hasSpecialGroupStory?: boolean;
	isFollowing?: boolean;
	primaryGroupColor?: string | null;
	latestCreatedAt: string;
};

export type FeedSource = 'public' | 'following' | 'groups' | 'blend' | 'rss';
export type FeedSortMode = 'chrono' | 'trending' | 'oldest' | 'discussed' | 'random';
export type FeedTimeWindow = '24h' | '7d' | '30d' | 'all';

export type UserFeed = {
	id: string;
	userId: string;
	name: string;
	source: FeedSource;
	groupIds: string[];
	excludedGroupIds?: string[];
	contentTypeFilterMode?: 'all' | 'include' | 'exclude';
	contentTypes?: string[];
	carouselContentTypeFilterMode?: 'all' | 'include' | 'exclude';
	carouselContentTypes?: string[];
	tagFilterMode?: 'all' | 'include' | 'exclude';
	includeTags: string[];
	rssUrls?: string[];
	sortMode: FeedSortMode;
	timeWindow: FeedTimeWindow;
	hideSeen: boolean;
	showStories: boolean;
	blendFeedAId?: string | null;
	blendFeedBId?: string | null;
	blendRatio?: number;
	algoId?: string | null;
	createdAt: Date | string;
	updatedAt: Date | string;
};
