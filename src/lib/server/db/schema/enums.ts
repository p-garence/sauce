import { pgEnum } from 'drizzle-orm/pg-core';

export const consentLevelEnum = pgEnum('consent_level', ['none', 'partial', 'total']);
export const postTypeEnum = pgEnum('post_type', [
	'text',
	'image',
	'video',
	'carousel',
	'icon_set',
	'emoji_set',
	'rss'
]);
export const trustLevelEnum = pgEnum('trust_level', [
	'fusion',
	'ally',
	'known',
	'accessible',
	'banned'
]);
export type TrustLevel = 'fusion' | 'ally' | 'known' | 'accessible' | 'banned';
export const interactionTypeEnum = pgEnum('interaction_type', ['like', 'view', 'share', 'comment']);
export const roleEnum = pgEnum('role', ['user', 'admin']);
export const notificationTypeEnum = pgEnum('notification_type', [
	'follow',
	'message',
	'like',
	'comment',
	'system',
	'mention'
]);
export const followStatusEnum = pgEnum('follow_status', ['pending', 'accepted']);
export const feedSourceEnum = pgEnum('feed_source', [
	'public',
	'following',
	'groups',
	'blend',
	'rss'
]);
export const chatTypeEnum = pgEnum('chat_type', ['direct', 'group']);
export const chatParticipantStatusEnum = pgEnum('chat_participant_status', [
	'pending',
	'accepted',
	'refused',
	'blocked'
]);
export const postVisibilityEnum = pgEnum('post_visibility', [
	'public',
	'followers',
	'group',
	'private',
	'network'
]);
