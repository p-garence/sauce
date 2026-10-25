import {
	pgTable,
	uuid,
	varchar,
	text,
	boolean,
	timestamp,
	jsonb,
	primaryKey
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export const iconSets = pgTable('icon_sets', {
	id: uuid('id').defaultRandom().primaryKey(),
	ownerId: text('owner_id')
		.references(() => user.id, { onDelete: 'cascade' })
		.notNull(),
	name: varchar('name', { length: 50 }).notNull(),
	description: text('description'),
	icons: jsonb('icons').$type<Record<string, string>>().default({}).notNull(),
	fallback: varchar('fallback', { length: 20 }).default('lucide').notNull(),
	isPublished: boolean('is_published').default(false).notNull(),
	isDeletedByOwner: boolean('is_deleted_by_owner').default(false).notNull(),
	isInstanceDefault: boolean('is_instance_default').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const userSavedIconSets = pgTable(
	'user_saved_icon_sets',
	{
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		iconSetId: uuid('icon_set_id')
			.references(() => iconSets.id, { onDelete: 'cascade' })
			.notNull(),
		savedAt: timestamp('saved_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.iconSetId] })]
);
