import {
	pgTable,
	text,
	varchar,
	timestamp,
	boolean,
	integer,
	bigint,
	jsonb,
	uuid,
	index
} from 'drizzle-orm/pg-core';
import { consentLevelEnum, roleEnum } from './enums';
import type { ProfileVisibility, NotificationSettings } from '$lib/types';

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),

	username: varchar('username', { length: 50 }).unique(),
	bio: text('bio'),
	contactEmail: varchar('contact_email', { length: 255 }),
	site: varchar('site', { length: 255 }),
	genre: varchar('genre', { length: 50 }),
	age: varchar('age', { length: 50 }),

	profileVisibility: jsonb('profile_visibility')
		.$type<ProfileVisibility>()
		.default({
			bio: true,
			site: false,
			age: false,
			genre: false,
			contactEmail: false,
			requireFollowRequest: false,
			requireMessageApproval: false,
			showFollowers: true,
			showFollowing: true
		})
		.notNull(),

	notificationSettings: jsonb('notification_settings')
		.$type<NotificationSettings>()
		.default({
			all: true,
			follow: true,
			message: true,
			like: true,
			comment: true
		})
		.notNull(),
	doubleTap: boolean('double_tap').default(false).notNull(),
	invitedById: text('invited_by_id'),
	activeFeedId: uuid('active_feed_id'),
	activeIconSetId: uuid('active_icon_set_id'),
	activeEmojiSetId: uuid('active_emoji_set_id'),
	activeEmojiSetIds: jsonb('active_emoji_set_ids').$type<string[]>().default([]).notNull(),
	disabledEmojiSetIds: jsonb('disabled_emoji_set_ids').$type<string[]>().default([]).notNull(),
	favoriteEmojiIds: jsonb('favorite_emoji_ids').$type<string[]>().default([]).notNull(),
	consentLevel: consentLevelEnum('consent_level').default('none').notNull(),

	followersCount: integer('followers_count').default(0).notNull(),
	followingCount: integer('following_count').default(0).notNull(),

	hasCompletedSetup: boolean('has_completed_setup').default(false).notNull(),
	role: roleEnum('role').default('user').notNull(),
	isBanned: boolean('is_banned').default(false).notNull(),
	maxInvites: integer('max_invites').default(10).notNull(),
	storageQuotaBytes: bigint('storage_quota_bytes', { mode: 'number' }).default(2147483648).notNull()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		expiresAt: timestamp('expires_at').notNull(),
		token: text('token').notNull().unique(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text('ip_address'),
		userAgent: text('user_agent'),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' })
	},
	(table) => [index('session_userId_idx').on(table.userId)]
);

export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		accountId: text('account_id').notNull(),
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at'),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
		scope: text('scope'),
		password: text('password'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('account_userId_idx').on(table.userId)]
);

export const verification = pgTable(
	'verification',
	{
		id: text('id').primaryKey(),
		identifier: text('identifier').notNull(),
		value: text('value').notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('verification_identifier_idx').on(table.identifier)]
);

export const inviteKeys = pgTable('invite_keys', {
	id: uuid('id').defaultRandom().primaryKey(),
	key: varchar('key', { length: 50 }).notNull().unique(),
	createdBy: text('created_by')
		.references(() => user.id, { onDelete: 'cascade' })
		.notNull(),
	usedBy: text('used_by').references(() => user.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	usedAt: timestamp('used_at')
});
