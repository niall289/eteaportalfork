import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve('.env') });

// Set DATABASE_URL directly if not loaded
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_NBr0pweSC9Dz@ep-curly-mountain-a91glxrg-pooler.gwc.azure.neon.tech/neondb?sslmode=require';
}

console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

// Dynamic import to ensure env vars are loaded
const { db } = await import('./server/db.ts');

async function runMigration() {
  try {
    console.log('Running migration to add symptom_analysis column...');

    // Run the idempotent migration SQL
    await db.execute(`
      DO $$ BEGIN
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
    `);

    console.log('✅ Migration completed successfully');

    // Verify the column was added
    const result = await db.execute(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'consultations'
      AND table_schema = 'public'
      AND column_name = 'symptom_analysis'
    `);

    if (result.rows.length > 0) {
      console.log('✅ symptom_analysis column now EXISTS');
    } else {
      console.log('❌ symptom_analysis column still does NOT exist');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();