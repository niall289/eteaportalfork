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

async function checkColumns() {
  try {
    console.log('Checking consultations table columns...');

    // Query to check if symptom_analysis column exists
    const result = await db.execute(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'consultations'
      AND table_schema = 'public'
      AND column_name = 'symptom_analysis'
    `);

    if (result.rows.length > 0) {
      console.log('✅ symptom_analysis column EXISTS');
    } else {
      console.log('❌ symptom_analysis column does NOT exist');
    }

    // Show all columns in consultations table
    const allColumns = await db.execute(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'consultations'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('All columns in consultations table:');
    allColumns.rows.forEach(row => {
      console.log(' -', row.column_name);
    });

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkColumns();