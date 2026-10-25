import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	boolean,
	integer,
	jsonb,
	primaryKey,
	type AnyPgColumn,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { iconSets } from './icons';
import { emojiSets } from './emojis';
import { postTypeEnum, interactionTypeEnum, postVisibilityEnum } from './enums';

export const posts = pgTable(
	'posts',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		authorId: text('author_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		postType: postTypeEnum('post_type').notNull(),
		content: text('content'),
		mediaUrls: jsonb('media_urls'),
		iconSetId: uuid('icon_set_id').references(() => iconSets.id, { onDelete: 'set null' }),
		emojiSetId: uuid('emoji_set_id').references(() => emojiSets.id, { onDelete: 'set null' }),
		visibility: postVisibilityEnum('visibility').default('public').notNull(),
		groupId: text('group_id'),
		expiresAt: timestamp('expires_at'),
		isFederated: boolean('is_federated').default(false).notNull(),
		isSystem: boolean('is_system').default(false).notNull(),
		originalUrl: varchar('original_url', { length: 512 }),
		likesCount: integer('likes_count').default(0).notNull(),
		commentsCount: integer('comments_count').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [
		index('posts_author_id_idx').on(t.authorId),
		index('posts_created_at_idx').on(t.createdAt),
		index('posts_visibility_idx').on(t.visibility),
		index('posts_created_at_id_idx').on(t.createdAt.desc(), t.id.desc()),
		index('posts_author_created_id_idx').on(t.authorId, t.createdAt.desc(), t.id.desc()),
		index('posts_likes_id_idx').on(t.likesCount.desc(), t.id.desc())
	]
);

export const comments = pgTable(
	'comments',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		postId: uuid('post_id')
			.references(() => posts.id, { onDelete: 'cascade' })
			.notNull(),
		authorId: text('author_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		parentId: uuid('parent_id').references((): AnyPgColumn => comments.id, { onDelete: 'cascade' }),
		content: text('content').notNull(),
		likesCount: integer('likes_count').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('comments_post_id_idx').on(table.postId),
		index('comments_author_id_idx').on(table.authorId),
		index('comments_post_created_idx').on(table.postId, table.createdAt.asc())
	]
);

export const postLikes = pgTable(
	'post_likes',
	{
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		postId: uuid('post_id')
			.references(() => posts.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		primaryKey({ columns: [t.userId, t.postId] }),
		index('post_likes_post_id_idx').on(t.postId),
		index('post_likes_user_created_idx').on(t.userId, t.createdAt)
	]
);

export const commentLikes = pgTable(
	'comment_likes',
	{
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		commentId: uuid('comment_id')
			.references(() => comments.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.commentId] })]
);

export const hiddenPosts = pgTable(
	'hidden_posts',
	{
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		postId: uuid('post_id')
			.references(() => posts.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.postId] })]
);

export const postViews = pgTable(
	'post_views',
	{
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		postId: uuid('post_id')
			.references(() => posts.id, { onDelete: 'cascade' })
			.notNull(),
		viewedAt: timestamp('viewed_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.postId] })]
);

export const interactions = pgTable('interactions', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: text('user_id')
		.references(() => user.id, { onDelete: 'cascade' })
		.notNull(),
	postId: uuid('post_id')
		.references(() => posts.id, { onDelete: 'cascade' })
		.notNull(),
	type: interactionTypeEnum('type').notNull(),
	watchTimeSeconds: integer('watch_time_seconds').default(0),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
