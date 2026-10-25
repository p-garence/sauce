ALTER TABLE "messages" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "messages" SET "updated_at" = "created_at" WHERE "content" != '[deleted]';--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN "carousel_content_type_filter_mode" varchar(10) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN "carousel_content_types" json DEFAULT '[]'::json NOT NULL;