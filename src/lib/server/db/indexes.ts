import { db } from './index';
import { sql } from 'drizzle-orm';

let indexesEnsured = false;

/**
 * Assure la création idempotente des tables et index composites critiques au démarrage.
 * Ne bloque jamais l'application si l'index existe déjà ou si une migration est en cours.
 */
export async function ensureOptimizationIndexes() {
	if (indexesEnsured) return;
	indexesEnsured = true;

	try {
		await db.execute(sql`
			SET client_min_messages TO WARNING;

			-- Table user_blocks
			CREATE TABLE IF NOT EXISTS "user_blocks" (
				"blocker_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
				"blocked_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
				"created_at" timestamp DEFAULT now() NOT NULL,
				PRIMARY KEY ("blocker_id", "blocked_id")
			);
			CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx" ON "user_blocks" ("blocker_id");
			CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx" ON "user_blocks" ("blocked_id");

			-- Index composites pour le flux et les profils
			CREATE INDEX IF NOT EXISTS "posts_created_at_id_idx" ON "posts" ("created_at" DESC, "id" DESC);
			CREATE INDEX IF NOT EXISTS "posts_author_created_id_idx" ON "posts" ("author_id", "created_at" DESC, "id" DESC);
			CREATE INDEX IF NOT EXISTS "posts_likes_id_idx" ON "posts" ("likes_count" DESC, "id" DESC);

			-- Index composite pour les commentaires
			CREATE INDEX IF NOT EXISTS "comments_post_created_idx" ON "comments" ("post_id", "created_at" ASC);

			-- Index composites pour les chats et messages
			CREATE INDEX IF NOT EXISTS "chat_participants_user_status_idx" ON "chat_participants" ("user_id", "is_hidden", "is_muted");
			CREATE INDEX IF NOT EXISTS "messages_chat_created_idx" ON "messages" ("chat_id", "created_at" DESC);

			-- Index composite pour les notifications non lues et la pagination
			CREATE INDEX IF NOT EXISTS "notifications_recipient_unread_idx" ON "notifications" ("recipient_id", "is_read", "created_at" DESC);

			-- Index GIN sur les URLs de médias des posts pour éliminer le scan séquentiel LIKE
			CREATE INDEX IF NOT EXISTS "posts_media_urls_gin_idx" ON "posts" USING gin ("media_urls");

			RESET client_min_messages;
		`);
	} catch (e) {
		console.error('Erreur initialisation des index d’optimisation:', e);
	}
}
