-- Add optional clinic_domain and clinic_source columns to consultations table
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS clinic_domain text,
  ADD COLUMN IF NOT EXISTS clinic_source text;