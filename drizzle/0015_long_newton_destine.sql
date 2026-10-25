ALTER TYPE "public"."post_type" ADD VALUE 'icon_set';--> statement-breakpoint
ALTER TYPE "public"."post_type" ADD VALUE 'emoji_set';--> statement-breakpoint
CREATE TABLE "emoji_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"emojis" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"favorite_emoji_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_deleted_by_owner" boolean DEFAULT false NOT NULL,
	"is_instance_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_saved_emoji_sets" (
	"user_id" text NOT NULL,
	"emoji_set_id" uuid NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_saved_emoji_sets_user_id_emoji_set_id_pk" PRIMARY KEY("user_id","emoji_set_id")
);
--> statement-breakpoint
CREATE TABLE "icon_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"icons" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"fallback" varchar(20) DEFAULT 'lucide' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"is_deleted_by_owner" boolean DEFAULT false NOT NULL,
	"is_instance_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_saved_icon_sets" (
	"user_id" text NOT NULL,
	"icon_set_id" uuid NOT NULL,
	"saved_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_saved_icon_sets_user_id_icon_set_id_pk" PRIMARY KEY("user_id","icon_set_id")
);
--> statement-breakpoint
CREATE TABLE "instance_settings" (
	"id" varchar(50) PRIMARY KEY DEFAULT 'default' NOT NULL,
	"allowed_builtin_icon_packs" jsonb DEFAULT '["lucide","original"]'::jsonb NOT NULL,
	"allowed_custom_icon_set_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"default_icon_pack" varchar(50) DEFAULT 'lucide' NOT NULL,
	"default_icon_set_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "double_tap" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "active_icon_set_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "active_emoji_set_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "active_emoji_set_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "disabled_emoji_set_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "favorite_emoji_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN "excluded_group_ids" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN "content_type_filter_mode" varchar(10) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feeds" ADD COLUMN "content_types" json DEFAULT '[]'::json NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "icon_set_id" uuid;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "emoji_set_id" uuid;--> statement-breakpoint
ALTER TABLE "emoji_sets" ADD CONSTRAINT "emoji_sets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_emoji_sets" ADD CONSTRAINT "user_saved_emoji_sets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_emoji_sets" ADD CONSTRAINT "user_saved_emoji_sets_emoji_set_id_emoji_sets_id_fk" FOREIGN KEY ("emoji_set_id") REFERENCES "public"."emoji_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "icon_sets" ADD CONSTRAINT "icon_sets_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_icon_sets" ADD CONSTRAINT "user_saved_icon_sets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_saved_icon_sets" ADD CONSTRAINT "user_saved_icon_sets_icon_set_id_icon_sets_id_fk" FOREIGN KEY ("icon_set_id") REFERENCES "public"."icon_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "instance_settings" ADD CONSTRAINT "instance_settings_default_icon_set_id_icon_sets_id_fk" FOREIGN KEY ("default_icon_set_id") REFERENCES "public"."icon_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_icon_set_id_icon_sets_id_fk" FOREIGN KEY ("icon_set_id") REFERENCES "public"."icon_sets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_emoji_set_id_emoji_sets_id_fk" FOREIGN KEY ("emoji_set_id") REFERENCES "public"."emoji_sets"("id") ON DELETE set null ON UPDATE no action;