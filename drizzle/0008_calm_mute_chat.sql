ALTER TABLE "chat_participants" ADD COLUMN IF NOT EXISTS "is_muted" boolean DEFAULT false NOT NULL;
