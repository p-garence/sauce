import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	integer,
	boolean,
	primaryKey,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { userGroups } from './groups';
import { postVisibilityEnum } from './enums';

export const stories = pgTable(
	'stories',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		authorId: text('author_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		mediaUrl: text('media_url').notNull(),
		mediaType: varchar('media_type', { length: 10 }).notNull(), // 'image' | 'video'
		caption: text('caption'),
		visibility: postVisibilityEnum('visibility').default('public').notNull(),
		groupId: varchar('group_id', { length: 36 }).references(() => userGroups.id, {
			onDelete: 'set null'
		}),
		viewsCount: integer('views_count').default(0).notNull(),
		likesCount: integer('likes_count').default(0).notNull(),
		isArchived: boolean('is_archived').default(true).notNull(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		index('stories_author_id_idx').on(t.authorId),
		index('stories_expires_at_idx').on(t.expiresAt),
		index('stories_group_id_idx').on(t.groupId)
	]
);

export const storyViews = pgTable(
	'story_views',
	{
		storyId: uuid('story_id')
			.references(() => stories.id, { onDelete: 'cascade' })
			.notNull(),
		viewerId: text('viewer_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		viewedAt: timestamp('viewed_at').defaultNow().notNull()
	},
	(t) => [
		primaryKey({ columns: [t.storyId, t.viewerId] }),
		index('story_views_story_id_idx').on(t.storyId),
		index('story_views_viewer_id_idx').on(t.viewerId)
	]
);

export const storyLikes = pgTable(
	'story_likes',
	{
		storyId: uuid('story_id')
			.references(() => stories.id, { onDelete: 'cascade' })
			.notNull(),
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		primaryKey({ columns: [t.storyId, t.userId] }),
		index('story_likes_story_id_idx').on(t.storyId),
		index('story_likes_user_id_idx').on(t.userId)
	]
);
