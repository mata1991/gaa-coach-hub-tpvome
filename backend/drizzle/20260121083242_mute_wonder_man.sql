CREATE TYPE "public"."match_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."team_side" AS ENUM('HOME', 'AWAY');--> statement-breakpoint
CREATE TABLE "match_squads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"side" "team_side" NOT NULL,
	"starting_slots" jsonb NOT NULL,
	"bench" jsonb NOT NULL,
	"subs_log" jsonb DEFAULT '[]'::jsonb,
	"locked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"status" "match_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"home_goals" integer DEFAULT 0 NOT NULL,
	"home_points" integer DEFAULT 0 NOT NULL,
	"away_goals" integer DEFAULT 0 NOT NULL,
	"away_points" integer DEFAULT 0 NOT NULL,
	"match_clock" integer DEFAULT 0 NOT NULL,
	"period" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_state_fixture_id_unique" UNIQUE("fixture_id")
);
--> statement-breakpoint
ALTER TABLE "match_events" ADD COLUMN "side" "team_side";--> statement-breakpoint
ALTER TABLE "match_squads" ADD CONSTRAINT "match_squads_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_state" ADD CONSTRAINT "match_state_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_squads_fixture_id_idx" ON "match_squads" USING btree ("fixture_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_squads_fixture_side_unique_idx" ON "match_squads" USING btree ("fixture_id","side");--> statement-breakpoint
CREATE INDEX "match_state_fixture_id_idx" ON "match_state" USING btree ("fixture_id");