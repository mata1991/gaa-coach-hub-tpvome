CREATE TYPE "public"."training_attendance_status" AS ENUM('TRAINED', 'INJURED', 'EXCUSED', 'NO_CONTACT');--> statement-breakpoint
CREATE TABLE "training_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "training_attendance_status" DEFAULT 'NO_CONTACT' NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "attendance" CASCADE;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "crest_url" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "colours" text;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "training_sessions" ADD COLUMN "created_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "training_attendance" ADD CONSTRAINT "training_attendance_session_id_training_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."training_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_attendance" ADD CONSTRAINT "training_attendance_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_attendance_session_id_idx" ON "training_attendance" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "training_attendance_player_id_idx" ON "training_attendance" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "training_attendance_session_player_unique_idx" ON "training_attendance" USING btree ("session_id","player_id");--> statement-breakpoint
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_sessions_created_by_idx" ON "training_sessions" USING btree ("created_by");