ALTER TABLE "fixtures" DROP CONSTRAINT "fixtures_competition_id_competitions_id_fk";
--> statement-breakpoint
ALTER TABLE "fixtures" ALTER COLUMN "competition_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE set null ON UPDATE no action;