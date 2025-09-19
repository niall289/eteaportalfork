DO $$ BEGIN
  ALTER TABLE "chatbot_settings" ADD COLUMN "clinic_group" text NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chatbot_settings_clinic_group_idx" ON "chatbot_settings" USING btree ("clinic_group");