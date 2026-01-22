ALTER TABLE "match_events" ADD COLUMN "half" text;--> statement-breakpoint
ALTER TABLE "match_state" ADD COLUMN "half" text DEFAULT 'H1' NOT NULL;--> statement-breakpoint
ALTER TABLE "match_state" DROP COLUMN "period";