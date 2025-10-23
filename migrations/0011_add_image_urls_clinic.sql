-- Add missing columns to consultations table for portal display
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS image_urls JSONB;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS clinic TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';