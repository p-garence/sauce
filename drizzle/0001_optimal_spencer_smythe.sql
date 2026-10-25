CREATE TYPE "public"."feed_source" AS ENUM('public', 'following');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('follow', 'message', 'like', 'comment', 'system');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" text NOT NULL,
	"actor_id" text,
	"type" "notification_type" NOT NULL,
	"entity_id" uuid,
	"content" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"source" "feed_source" DEFAULT 'public' NOT NULL,
	"hide_seen" boolean DEFAULT false NOT NULL,
	"algo_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" RENAME COLUMN "active_algo_id" TO "active_feed_id";--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD CONSTRAINT "user_feeds_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD CONSTRAINT "user_feeds_algo_id_algorithms_id_fk" FOREIGN KEY ("algo_id") REFERENCES "public"."algorithms"("id") ON DELETE set null ON UPDATE no action;