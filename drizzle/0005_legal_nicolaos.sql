CREATE TYPE "public"."chat_participant_status" AS ENUM('pending', 'accepted', 'refused', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."chat_type" AS ENUM('direct', 'group');--> statement-breakpoint
CREATE TABLE "chat_participants" (
	"chat_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"status" "chat_participant_status" DEFAULT 'accepted' NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"cleared_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "chat_participants_chat_id_user_id_pk" PRIMARY KEY("chat_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "chat_type" NOT NULL,
	"name" varchar(255),
	"description" text,
	"admin_only_messaging" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_receiver_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "sender_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "profile_visibility" SET DEFAULT '{"bio":true,"site":false,"age":false,"genre":false,"contactEmail":false,"requireFollowRequest":false,"requireMessageApproval":false,"showFollowers":true,"showFollowing":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "chat_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "receiver_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "is_read";