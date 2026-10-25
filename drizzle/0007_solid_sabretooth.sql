CREATE TYPE "public"."post_visibility" AS ENUM('public', 'followers', 'group', 'private', 'network');--> statement-breakpoint
CREATE TABLE "post_group_visibility" (
	"post_id" uuid NOT NULL,
	"group_id" varchar(36) NOT NULL,
	CONSTRAINT "post_group_visibility_post_id_group_id_pk" PRIMARY KEY("post_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "user_group_member" (
	"group_id" varchar(36) NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_group_member_group_id_user_id_pk" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_group" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"owner_id" varchar(36) NOT NULL,
	"name" varchar(50) NOT NULL,
	"icon" varchar(50) DEFAULT 'star',
	"color" varchar(7) DEFAULT '#10b981' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_tags_post_id_tag_id_pk" PRIMARY KEY("post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_author_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "post_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."post_type";--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('text', 'image', 'video', 'carousel');--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "post_type" SET DATA TYPE "public"."post_type" USING "post_type"::"public"."post_type";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "visibility" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "visibility" SET DATA TYPE "public"."post_visibility" USING "visibility"::text::"public"."post_visibility";--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "visibility" SET DEFAULT 'public';--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "group_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "storage_quota_bytes" bigint DEFAULT 2147483648 NOT NULL;--> statement-breakpoint
ALTER TABLE "post_group_visibility" ADD CONSTRAINT "post_group_visibility_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_group_visibility" ADD CONSTRAINT "post_group_visibility_group_id_user_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_member" ADD CONSTRAINT "user_group_member_group_id_user_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group_member" ADD CONSTRAINT "user_group_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_group_member_user_id_idx" ON "user_group_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "post_tags_tag_id_idx" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "post_tags_created_at_idx" ON "post_tags" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_participants_user_id_idx" ON "chat_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "comments_post_id_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "comments_author_id_idx" ON "comments" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "follows_following_id_idx" ON "follows" USING btree ("following_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_idx" ON "messages" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_id_idx" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "post_likes_post_id_idx" ON "post_likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "post_likes_user_created_idx" ON "post_likes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "posts_author_id_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_visibility_idx" ON "posts" USING btree ("visibility");--> statement-breakpoint
DROP TYPE "public"."visibility";