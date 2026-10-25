import { pgTable, varchar, jsonb, uuid, timestamp } from 'drizzle-orm/pg-core';
import { iconSets } from './icons';

export const instanceSettings = pgTable('instance_settings', {
	id: varchar('id', { length: 50 }).primaryKey().default('default'),
	allowedBuiltinIconPacks: jsonb('allowed_builtin_icon_packs')
		.$type<string[]>()
		.default(['lucide', 'original'])
		.notNull(),
	allowedCustomIconSetIds: jsonb('allowed_custom_icon_set_ids')
		.$type<string[]>()
		.default([])
		.notNull(),
	defaultIconPack: varchar('default_icon_pack', { length: 50 }).default('lucide').notNull(),
	defaultIconSetId: uuid('default_icon_set_id').references(() => iconSets.id, {
		onDelete: 'set null'
	}),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});
