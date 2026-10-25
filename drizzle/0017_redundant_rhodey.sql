ALTER TYPE "public"."feed_source" ADD VALUE 'rss';--> statement-breakpoint
ALTER TYPE "public"."post_type" ADD VALUE 'rss';--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN "tag_filter_mode" varchar(10) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN "rss_urls" json DEFAULT '[]'::json NOT NULL;