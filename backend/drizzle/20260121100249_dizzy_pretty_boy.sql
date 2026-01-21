CREATE TYPE "public"."club_role" AS ENUM('CLUB_ADMIN', 'COACH', 'STATS_PERSON', 'PLAYER');--> statement-breakpoint
CREATE TYPE "public"."team_role" AS ENUM('COACH', 'STATS_PERSON', 'PLAYER');--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "club_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "team_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "county" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "colours" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "crest_url" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "short_name" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "sport" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "grade" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "age_group" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "home_venue" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memberships_club_id_idx" ON "memberships" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "memberships_user_id_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_club_user_unique_idx" ON "memberships" USING btree ("club_id","user_id");--> statement-breakpoint
CREATE INDEX "team_memberships_team_id_idx" ON "team_memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "team_memberships_user_id_idx" ON "team_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_team_user_unique_idx" ON "team_memberships" USING btree ("team_id","user_id");