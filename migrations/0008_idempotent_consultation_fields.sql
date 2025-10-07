DO $$
BEGIN
    -- Add symptom_analysis column to consultations table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consultations'
        AND column_name = 'symptom_analysis'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "consultations" ADD COLUMN "symptom_analysis" text;
    END IF;

    -- Add pain_duration column to consultations table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consultations'
        AND column_name = 'pain_duration'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "consultations" ADD COLUMN "pain_duration" text;
    END IF;

    -- Add pain_severity column to consultations table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consultations'
        AND column_name = 'pain_severity'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "consultations" ADD COLUMN "pain_severity" text;
    END IF;

    -- Add additional_info column to consultations table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'consultations'
        AND column_name = 'additional_info'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "consultations" ADD COLUMN "additional_info" text;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        -- Column already exists, do nothing
        NULL;
END $$;