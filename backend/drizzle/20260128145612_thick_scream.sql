ALTER TABLE "players" ADD COLUMN "injured_at" timestamp;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "cleared_at" timestamp;--> statement-breakpoint
CREATE INDEX "players_injured_at_idx" ON "players" USING btree ("injured_at");