import {
	pgTable,
	uuid,
	varchar,
	text,
	timestamp,
	boolean,
	primaryKey,
	index
} from 'drizzle-orm/pg-core';
import { user } from './auth';
import { followStatusEnum, notificationTypeEnum, trustLevelEnum } from './enums';

export const follows = pgTable(
	'follows',
	{
		followerId: text('follower_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		followingId: text('following_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		status: followStatusEnum('status').default('accepted').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.followerId, t.followingId] }),
		index('follows_following_id_idx').on(t.followingId)
	]
);

export const userBlocks = pgTable(
	'user_blocks',
	{
		blockerId: text('blocker_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		blockedId: text('blocked_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		primaryKey({ columns: [t.blockerId, t.blockedId] }),
		index('user_blocks_blocker_idx').on(t.blockerId),
		index('user_blocks_blocked_idx').on(t.blockedId)
	]
);

export const notifications = pgTable(
	'notifications',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		recipientId: text('recipient_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
		type: notificationTypeEnum('type').notNull(),
		actionState: varchar('action_state', { length: 20 }),
		entityId: uuid('entity_id'),
		content: text('content'),
		isRead: boolean('is_read').default(false).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [
		index('notifications_recipient_id_idx').on(t.recipientId),
		index('notifications_recipient_unread_idx').on(t.recipientId, t.isRead, t.createdAt.desc())
	]
);

export const instances = pgTable('instances', {
	id: uuid('id').defaultRandom().primaryKey(),
	domain: varchar('domain', { length: 255 }).notNull().unique(),
	trustLevel: trustLevelEnum('trust_level').default('known').notNull(),
	addedAt: timestamp('added_at').defaultNow().notNull()
});

export const userInstanceConsents = pgTable(
	'user_instance_consents',
	{
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		instanceId: uuid('instance_id')
			.references(() => instances.id, { onDelete: 'cascade' })
			.notNull(),
		consentedAt: timestamp('consented_at').defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.instanceId] })]
);
