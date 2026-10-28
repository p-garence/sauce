import { pgTable, varchar, jsonb, uuid, timestamp } from 'drizzle-orm/pg-core';
import { iconSets } from './icons';
import type {
	InstancePerformanceSettings,
	InstancePrivacySettings,
	InstanceMediaSettings,
	InstanceContentDefaults,
	InstanceGeneralSettings
} from '$lib/types';

export const instanceSettings = pgTable('instance_settings', {
	id: varchar('id', { length: 50 }).primaryKey().default('default'),
	allowedBuiltinIconPacks: jsonb('allowed_builtin_icon_packs')
		.$type<string[]>()
		.default(['lucide', 'original'])
		.notNull(),
	allowedCustomIconSetIds: jsonb('allowed_custom_icon_set_ids')
		.$type<string[]>()
		.default([])
		.notNull(),
	defaultIconPack: varchar('default_icon_pack', { length: 50 }).default('lucide').notNull(),
	defaultIconSetId: uuid('default_icon_set_id').references(() => iconSets.id, {
		onDelete: 'set null'
	}),
	defaultEmojiSetIds: jsonb('default_emoji_set_ids').$type<string[]>().default([]).notNull(),
	performanceSettings: jsonb('performance_settings').$type<InstancePerformanceSettings>().default({
		postsPerScroll: 8,
		postsPerGrid: 6,
		trendingTagsLimit: 10,
		messagesPerChat: 10,
		notificationsPerLoad: 10,
		commentsPerLoad: 5,
		usersPerPage: 5,
		maxPostsPerRequest: 48,
		maxCommentsPerRequest: 50,
		maxCommentLength: 2000,
		maxUsersSearchLimit: 20,
		adminItemsPerPage: 20
	}),
	privacySettings: jsonb('privacy_settings').$type<InstancePrivacySettings>().default({
		isPublicInstance: true,
		defaultPostVisibility: 'public',
		defaultStoryVisibility: 'public',
		defaultRequireFollowRequest: false,
		defaultRequireMessageApproval: false,
		defaultShowFollowers: true,
		defaultShowFollowing: true
	}),
	mediaSettings: jsonb('media_settings')
		.$type<InstanceMediaSettings>()
		.default({
			maxMediaSizeMb: 1000,
			defaultStorageQuotaBytes: 2 * 1024 * 1024 * 1024,
			orphanGracePeriodHours: 2,
			storyDurationHours: 24
		}),
	contentDefaults: jsonb('content_defaults')
		.$type<InstanceContentDefaults>()
		.default({
			defaultGroups: [{ name: 'Amis proches', color: '#10b981' }],
			defaultFeeds: [
				{
					name: 'Chronologique',
					source: 'public',
					sortMode: 'chrono',
					timeWindow: '7d'
				}
			],
			defaultMaxInvites: 10
		}),
	generalSettings: jsonb('general_settings').$type<InstanceGeneralSettings>().default({
		instanceName: 'Sauce et Ail',
		instanceDescription: 'Réseau social auto-hébergé respectueux de la vie privée',
		maintenanceMode: false
	}),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});
