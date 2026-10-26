/**
 * @module server/db/schema/backups
 * @description Schéma Drizzle pour les configurations de sauvegardes multiples, restauration et statut en cours.
 */

import { pgTable, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const backupConfig = pgTable('backup_config', {
	id: varchar('id', { length: 50 }).primaryKey(),
	name: text('name').notNull().default('Sauvegarde Cloud'),
	enabled: boolean('enabled').notNull().default(false),
	webdavUrl: text('webdav_url').notNull().default(''),
	webdavUsername: text('webdav_username').notNull().default(''),
	webdavPassword: text('webdav_password').notNull().default(''),
	frequency: varchar('frequency', { length: 20 }).notNull().default('daily'),
	retentionCount: integer('retention_count').notNull().default(7),
	chunkSizeMb: integer('chunk_size_mb').notNull().default(10),
	encryptionKey: text('encryption_key').notNull().default(''),
	lastRunAt: timestamp('last_run_at', { withTimezone: true }),
	lastRunStatus: varchar('last_run_status', { length: 20 }), // 'idle' | 'running' | 'success' | 'error'
	lastRunError: text('last_run_error'),
	restoreStatus: varchar('restore_status', { length: 20 }).notNull().default('idle'), // 'idle' | 'running' | 'success' | 'error'
	restoreError: text('restore_error'),
	restoreMessage: text('restore_message'),
	restoreStartedAt: timestamp('restore_started_at', { withTimezone: true }),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});
