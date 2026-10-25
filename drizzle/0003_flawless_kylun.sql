CREATE TYPE "public"."follow_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
ALTER TABLE "follows" ADD COLUMN "status" "follow_status" DEFAULT 'accepted' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "notification_settings" jsonb DEFAULT '{"all":true,"follow":true,"message":true,"like":true,"comment":true}'::jsonb NOT NULL;