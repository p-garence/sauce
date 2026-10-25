ALTER TYPE "public"."feed_source" ADD VALUE IF NOT EXISTS 'groups';--> statement-breakpoint
ALTER TYPE "public"."feed_source" ADD VALUE IF NOT EXISTS 'blend';--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN IF NOT EXISTS "group_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN IF NOT EXISTS "include_tags" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN IF NOT EXISTS "sort_mode" varchar(20) DEFAULT 'chrono' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN IF NOT EXISTS "time_window" varchar(20) DEFAULT '7d' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN IF NOT EXISTS "blend_feed_a_id" uuid;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN IF NOT EXISTS "blend_feed_b_id" uuid;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN IF NOT EXISTS "blend_ratio" integer DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;