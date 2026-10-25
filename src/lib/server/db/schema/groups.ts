import { pgTable, varchar, timestamp, primaryKey, uuid, index } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { posts } from './posts';

export const userGroups = pgTable('user_group', {
	id: varchar('id', { length: 36 })
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	ownerId: varchar('owner_id', { length: 36 })
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 50 }).notNull(),
	icon: varchar('icon', { length: 50 }).default('star'),
	color: varchar('color', { length: 7 }).default('#10b981').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const userGroupMembers = pgTable(
	'user_group_member',
	{
		groupId: varchar('group_id', { length: 36 })
			.notNull()
			.references(() => userGroups.id, { onDelete: 'cascade' }),
		userId: varchar('user_id', { length: 36 })
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		addedAt: timestamp('added_at').defaultNow().notNull()
	},
	(t) => [
		primaryKey({ columns: [t.groupId, t.userId] }),
		index('user_group_member_user_id_idx').on(t.userId)
	]
);

export const postGroupVisibility = pgTable(
	'post_group_visibility',
	{
		postId: uuid('post_id')
			.references(() => posts.id, { onDelete: 'cascade' })
			.notNull(),
		groupId: varchar('group_id', { length: 36 })
			.references(() => userGroups.id, { onDelete: 'cascade' })
			.notNull()
	},
	(t) => [primaryKey({ columns: [t.postId, t.groupId] })]
);
