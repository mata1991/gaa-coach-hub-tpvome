CREATE TYPE "public"."primary_position_group" AS ENUM('GK', 'BACK', 'MID', 'FWD');--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "primary_position_group" "primary_position_group";--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "depth_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "players_position_group_depth_idx" ON "players" USING btree ("primary_position_group","depth_order");