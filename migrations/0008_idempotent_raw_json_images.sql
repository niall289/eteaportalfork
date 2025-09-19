DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='consultations' AND column_name='raw_json') THEN
      ALTER TABLE consultations ADD COLUMN raw_json jsonb;
    END IF;
  EXCEPTION WHEN duplicate_column THEN NULL; END $$;

  DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema='public' AND table_name='images') THEN
      CREATE TABLE public.images(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        consultation_id integer NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
        url text NOT NULL,
        source_type text NOT NULL CHECK (source_type IN ('upload','link')),
        meta jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_images_consultation_id_created_at ON public.images(consultation_id, created_at);
    END IF;
  EXCEPTION WHEN duplicate_table THEN NULL; END $$;