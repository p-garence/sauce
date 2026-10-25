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

export interface EmojiItem {
	id: string;
	name: string; // Nom de l'emoji (ex: "super_chat")
	url: string; // /media/xxx.webp
}

export const emojiSets = pgTable('emoji_sets', {
	id: uuid('id').defaultRandom().primaryKey(),
	ownerId: text('owner_id')
		.references(() => user.id, { onDelete: 'cascade' })
		.notNull(),
	name: varchar('name', { length: 50 }).notNull(),
	description: text('description'),
	emojis: jsonb('emojis').$type<EmojiItem[]>().default([]).notNull(),
	favoriteEmojiIds: jsonb('favorite_emoji_ids').$type<string[]>().default([]).notNull(),
	isPublished: boolean('is_published').default(false).notNull(),
	isDeletedByOwner: boolean('is_deleted_by_owner').default(false).notNull(),
	isInstanceDefault: boolean('is_instance_default').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const userSavedEmojiSets = pgTable(
	'user_saved_emoji_sets',
	{
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		emojiSetId: uuid('emoji_set_id')
			.references(() => emojiSets.id, { onDelete: 'cascade' })
			.notNull(),
		savedAt: timestamp('saved_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.emojiSetId] })]
);
