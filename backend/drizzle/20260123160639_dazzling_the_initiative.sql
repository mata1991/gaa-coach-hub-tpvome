ALTER TABLE "players" ADD COLUMN "is_injured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "injury_note" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "injury_updated_at" timestamp;--> statement-breakpoint
CREATE INDEX "players_is_injured_idx" ON "players" USING btree ("is_injured");