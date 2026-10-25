import { pgTable, uuid, varchar, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { posts } from './posts';

export const tags = pgTable('tags', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const postTags = pgTable(
	'post_tags',
	{
		postId: uuid('post_id')
			.references(() => posts.id, { onDelete: 'cascade' })
			.notNull(),
		tagId: uuid('tag_id')
			.references(() => tags.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		primaryKey({ columns: [t.postId, t.tagId] }),
		index('post_tags_tag_id_idx').on(t.tagId),
		index('post_tags_created_at_idx').on(t.createdAt)
	]
);
