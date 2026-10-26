CREATE TABLE "backup_config" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Sauvegarde Cloud' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"webdav_url" text DEFAULT '' NOT NULL,
	"webdav_username" text DEFAULT '' NOT NULL,
	"webdav_password" text DEFAULT '' NOT NULL,
	"frequency" varchar(20) DEFAULT 'daily' NOT NULL,
	"retention_count" integer DEFAULT 7 NOT NULL,
	"chunk_size_mb" integer DEFAULT 10 NOT NULL,
	"encryption_key" text DEFAULT '' NOT NULL,
	"last_run_at" timestamp with time zone,
	"last_run_status" varchar(20),
	"last_run_error" text,
	"restore_status" varchar(20) DEFAULT 'idle' NOT NULL,
	"restore_error" text,
	"restore_message" text,
	"restore_started_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"emoji_id" varchar(64) NOT NULL,
	"emoji_name" varchar(64) NOT NULL,
	"emoji_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_reactions_message_id_idx" ON "message_reactions" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "message_reactions_user_id_idx" ON "message_reactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_reactions_msg_user_emoji_idx" ON "message_reactions" USING btree ("message_id","user_id","emoji_id");