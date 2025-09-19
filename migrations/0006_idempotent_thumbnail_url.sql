DO $$
BEGIN
    -- Add thumbnail_url column to images table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'images'
        AND column_name = 'thumbnail_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "images" ADD COLUMN "thumbnail_url" text;
    END IF;
EXCEPTION
    WHEN duplicate_column THEN
        -- Column already exists, do nothing
        NULL;
END $$;