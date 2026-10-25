import {
	pgTable,
	uuid,
	varchar,
	text,
	boolean,
	timestamp,
	json,
	primaryKey,
	integer
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { feedSourceEnum } from './enums';

export const algorithms = pgTable('algorithms', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	shortName: varchar('short_name', { length: 50 }).default('').notNull(),
	description: text('description'),
	analyzerFilePath: varchar('analyzer_file_path', { length: 255 }).notNull(),
	generatorFilePath: varchar('generator_file_path', { length: 255 }).notNull(),
	isPermanent: boolean('is_permanent').default(false).notNull(),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const userAlgorithms = pgTable(
	'user_algorithms',
	{
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		algoId: uuid('algo_id')
			.references(() => algorithms.id, { onDelete: 'cascade' })
			.notNull(),
		subscribedAt: timestamp('subscribed_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.algoId] })]
);

export type FeedSortMode = 'chrono' | 'trending' | 'oldest' | 'discussed' | 'random';
export type FeedTimeWindow = '24h' | '7d' | '30d' | 'all';

export const userFeeds = pgTable('user_feeds', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: text('user_id')
		.references(() => user.id, { onDelete: 'cascade' })
		.notNull(),
	name: varchar('name', { length: 50 }).notNull(),
	source: feedSourceEnum('source').default('public').notNull(),
	groupIds: json('group_ids').$type<string[]>().default([]).notNull(),
	excludedGroupIds: json('excluded_group_ids').$type<string[]>().default([]).notNull(),
	contentTypeFilterMode: varchar('content_type_filter_mode', { length: 10 })
		.$type<'all' | 'include' | 'exclude'>()
		.default('all')
		.notNull(),
	contentTypes: json('content_types').$type<string[]>().default([]).notNull(),
	carouselContentTypeFilterMode: varchar('carousel_content_type_filter_mode', { length: 10 })
		.$type<'all' | 'include' | 'exclude'>()
		.default('all')
		.notNull(),
	carouselContentTypes: json('carousel_content_types').$type<string[]>().default([]).notNull(),
	tagFilterMode: varchar('tag_filter_mode', { length: 10 })
		.$type<'all' | 'include' | 'exclude'>()
		.default('all')
		.notNull(),
	includeTags: json('include_tags').$type<string[]>().default([]).notNull(),
	rssUrls: json('rss_urls').$type<string[]>().default([]).notNull(),
	sortMode: varchar('sort_mode', { length: 20 }).$type<FeedSortMode>().default('chrono').notNull(),
	timeWindow: varchar('time_window', { length: 20 })
		.$type<FeedTimeWindow>()
		.default('7d')
		.notNull(),
	hideSeen: boolean('hide_seen').default(false).notNull(),
	showStories: boolean('show_stories').default(true).notNull(),
	blendFeedAId: uuid('blend_feed_a_id'),
	blendFeedBId: uuid('blend_feed_b_id'),
	blendRatio: integer('blend_ratio').default(50).notNull(),
	algoId: uuid('algo_id').references(() => algorithms.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});
