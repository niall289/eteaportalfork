-- Idempotent enum creation to fix 'type already exists' error
-- This migration makes enum creation safe to re-run

DO $$
BEGIN
    -- Create the enum type if it doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chatbot_tone') THEN
        CREATE TYPE "public"."chatbot_tone" AS ENUM('Friendly', 'Professional', 'Clinical', 'Casual');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Enum already exists, do nothing
        NULL;
END $$;