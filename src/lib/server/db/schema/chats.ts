import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	boolean,
	integer,
	primaryKey,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { chatTypeEnum, chatParticipantStatusEnum } from './enums';

export const chats = pgTable('chats', {
	id: uuid('id').defaultRandom().primaryKey(),
	type: chatTypeEnum('type').notNull(),
	name: varchar('name', { length: 255 }),
	description: text('description'),
	adminOnlyMessaging: boolean('admin_only_messaging').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const chatParticipants = pgTable(
	'chat_participants',
	{
		chatId: uuid('chat_id')
			.references(() => chats.id, { onDelete: 'cascade' })
			.notNull(),
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		isAdmin: boolean('is_admin').default(false).notNull(),
		status: chatParticipantStatusEnum('status').default('accepted').notNull(),
		lastReadAt: timestamp('last_read_at').defaultNow().notNull(),
		isHidden: boolean('is_hidden').default(false).notNull(),
		isMuted: boolean('is_muted').default(false).notNull(),
		clearedAt: timestamp('cleared_at').defaultNow().notNull(),
		joinedAt: timestamp('joined_at').defaultNow().notNull()
	},
	(t) => [
		primaryKey({ columns: [t.chatId, t.userId] }),
		index('chat_participants_user_id_idx').on(t.userId),
		index('chat_participants_user_status_idx').on(t.userId, t.isHidden, t.isMuted)
	]
);

export const messages = pgTable(
	'messages',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		chatId: uuid('chat_id')
			.references(() => chats.id, { onDelete: 'cascade' })
			.notNull(),
		senderId: text('sender_id').references(() => user.id, { onDelete: 'set null' }),
		content: text('content').default('').notNull(),
		mediaUrl: text('media_url'),
		mediaType: varchar('media_type', { length: 20 }), // 'image' | 'video' | 'file'
		mediaName: varchar('media_name', { length: 255 }),
		mediaSize: integer('media_size'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(t) => [
		index('messages_chat_id_idx').on(t.chatId),
		index('messages_created_at_idx').on(t.createdAt),
		index('messages_sender_id_idx').on(t.senderId),
		index('messages_chat_created_idx').on(t.chatId, t.createdAt.desc())
	]
);

export const messageReactions = pgTable(
	'message_reactions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		messageId: uuid('message_id')
			.references(() => messages.id, { onDelete: 'cascade' })
			.notNull(),
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		emojiId: varchar('emoji_id', { length: 64 }).notNull(),
		emojiName: varchar('emoji_name', { length: 64 }).notNull(),
		emojiUrl: text('emoji_url').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		index('message_reactions_message_id_idx').on(t.messageId),
		index('message_reactions_user_id_idx').on(t.userId),
		uniqueIndex('message_reactions_msg_user_emoji_idx').on(t.messageId, t.userId, t.emojiId)
	]
);
