-- Idempotent guards for table and column creations to prevent migration failures
-- This migration ensures that re-running migrations won't fail on existing objects

-- Guard for assessment_conditions table creation
CREATE TABLE IF NOT EXISTS "assessment_conditions" (
  "assessment_id" integer NOT NULL,
  "condition_id" integer NOT NULL,
  CONSTRAINT "assessment_conditions_assessment_id_condition_id_pk" PRIMARY KEY("assessment_id","condition_id")
);

-- Guard for raw_json column addition to consultations table
DO $do$
BEGIN
  ALTER TABLE "consultations" ADD COLUMN "raw_json" jsonb;
EXCEPTION WHEN duplicate_column THEN NULL;
END $do$;

-- Guard for clinic_group column addition to chatbot_settings table
DO $do$
BEGIN
  ALTER TABLE "chatbot_settings" ADD COLUMN "clinic_group" text NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $do$;