ALTER TABLE "interactions" DROP CONSTRAINT "interactions_post_id_posts_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "action_state" varchar(20);--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;