DO $$ BEGIN
  ALTER TABLE "consultations" ADD COLUMN "raw_json" jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;