ALTER TABLE "messages" ALTER COLUMN "content" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "media_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "media_type" varchar(20);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "media_name" varchar(255);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "media_size" integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_sender_id_idx" ON "messages" USING btree ("sender_id");