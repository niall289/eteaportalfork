-- Add source and clinic_group columns to consultations table
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS clinic_group text;