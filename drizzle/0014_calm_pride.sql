CREATE TABLE IF NOT EXISTS "user_blocks" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
ALTER TABLE "invite_keys" DROP CONSTRAINT IF EXISTS "invite_keys_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "invite_keys" DROP CONSTRAINT IF EXISTS "invite_keys_used_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_algorithms" DROP CONSTRAINT IF EXISTS "user_algorithms_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_algorithms" DROP CONSTRAINT IF EXISTS "user_algorithms_algo_id_algorithms_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT IF EXISTS "comments_author_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "interactions" DROP CONSTRAINT IF EXISTS "interactions_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_author_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "follows" DROP CONSTRAINT IF EXISTS "follows_follower_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "follows" DROP CONSTRAINT IF EXISTS "follows_following_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_instance_consents" DROP CONSTRAINT IF EXISTS "user_instance_consents_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_instance_consents" DROP CONSTRAINT IF EXISTS "user_instance_consents_instance_id_instances_id_fk";
--> statement-breakpoint
ALTER TABLE "user_blocks" DROP CONSTRAINT IF EXISTS "user_blocks_blocker_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" DROP CONSTRAINT IF EXISTS "user_blocks_blocked_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx" ON "user_blocks" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocked_idx" ON "user_blocks" USING btree ("blocked_id");--> statement-breakpoint
ALTER TABLE "invite_keys" ADD CONSTRAINT "invite_keys_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_keys" ADD CONSTRAINT "invite_keys_used_by_user_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_algorithms" ADD CONSTRAINT "user_algorithms_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_algorithms" ADD CONSTRAINT "user_algorithms_algo_id_algorithms_id_fk" FOREIGN KEY ("algo_id") REFERENCES "public"."algorithms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_user_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_following_id_user_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_instance_consents" ADD CONSTRAINT "user_instance_consents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_instance_consents" ADD CONSTRAINT "user_instance_consents_instance_id_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."instances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_participants_user_status_idx" ON "chat_participants" USING btree ("user_id","is_hidden","is_muted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_chat_created_idx" ON "messages" USING btree ("chat_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_post_created_idx" ON "comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_created_at_id_idx" ON "posts" USING btree ("created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_author_created_id_idx" ON "posts" USING btree ("author_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_likes_id_idx" ON "posts" USING btree ("likes_count" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_id","is_read","created_at" DESC NULLS LAST);