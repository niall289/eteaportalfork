DO $do$
BEGIN
  ALTER TABLE "consultations" ADD COLUMN "image_url" text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $do$;