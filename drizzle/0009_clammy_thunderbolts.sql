ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'mention';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" text NOT NULL,
	"media_url" text NOT NULL,
	"media_type" varchar(10) NOT NULL,
	"caption" text,
	"visibility" "post_visibility" DEFAULT 'public' NOT NULL,
	"group_id" varchar(36),
	"views_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "story_views" (
	"story_id" uuid NOT NULL,
	"viewer_id" text NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_views_story_id_viewer_id_pk" PRIMARY KEY("story_id","viewer_id")
);
--> statement-breakpoint
ALTER TABLE "chat_participants" ADD COLUMN IF NOT EXISTS "is_muted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stories" ADD CONSTRAINT "stories_group_id_user_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_group"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewer_id_user_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_author_id_idx" ON "stories" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_expires_at_idx" ON "stories" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stories_group_id_idx" ON "stories" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "story_views_story_id_idx" ON "story_views" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "story_views_viewer_id_idx" ON "story_views" USING btree ("viewer_id");