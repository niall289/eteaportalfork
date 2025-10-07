import { config } from 'dotenv';
import { Pool } from 'pg';

config({ path: 'server/.env' });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is not set");
}

function stripChannelBinding(urlStr) {
  try {
    const u = new URL(urlStr);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return urlStr;
  }
}

const connectionString = stripChannelBinding(rawUrl);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    // First check if table exists
    const tableCheck = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'consultations');");
    console.log('Table exists:', tableCheck.rows[0].exists);

    if (tableCheck.rows[0].exists) {
      // Add image_url column if not exists
      await pool.query(`
        DO $$
        BEGIN
          ALTER TABLE "consultations" ADD COLUMN "image_url" text;
        EXCEPTION WHEN duplicate_column THEN NULL;
        END $$;
      `);

      // Check columns
      const columns = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'consultations' AND table_schema = 'public';");
      console.log('Columns:', columns.rows.map(r => r.column_name));

      const result = await pool.query('SELECT image_url FROM consultations ORDER BY created_at DESC LIMIT 1;');
      console.log('Query result:', result.rows[0]?.image_url || 'No result');
    } else {
      console.log('Table does not exist');
    }
  } catch (e) {
    console.error('Query failed', e);
  } finally {
    await pool.end();
  }
})();