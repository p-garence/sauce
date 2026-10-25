import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { user } from './auth';

export const pushSubscriptions = pgTable(
	'push_subscriptions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		userId: text('user_id')
			.references(() => user.id, { onDelete: 'cascade' })
			.notNull(),
		endpoint: text('endpoint').notNull().unique(),
		p256dh: text('p256dh').notNull(),
		auth: text('auth').notNull(),
		userAgent: text('user_agent'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [index('push_subscriptions_user_id_idx').on(t.userId)]
);

export type PushSubscriptionDb = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscriptionDb = typeof pushSubscriptions.$inferInsert;
