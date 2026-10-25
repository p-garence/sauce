CREATE TABLE IF NOT EXISTS "story_likes" (
	"story_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "story_likes_story_id_user_id_pk" PRIMARY KEY("story_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN IF NOT EXISTS "show_stories" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "likes_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT true NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "story_likes" ADD CONSTRAINT "story_likes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "story_likes_story_id_idx" ON "story_likes" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "story_likes_user_id_idx" ON "story_likes" USING btree ("user_id");