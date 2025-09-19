DROP INDEX IF EXISTS "images_consultation_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "images_created_at_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "images_consultation_id_created_at_idx" ON "images" USING btree ("consultation_id","created_at");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "images" ADD CONSTRAINT "images_source_type_check" CHECK ("images"."source_type" in ('upload', 'link'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;