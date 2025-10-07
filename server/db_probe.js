import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.query('SELECT 1', (err, res) => {
  if (err) {
    console.error('DB ERROR:', err.message);
    process.exit(1);
  } else {
    console.log('DB OK');
    pool.query(`select column_name, data_type from information_schema.columns where table_name = 'consultations' order by ordinal_position;`, (err, res) => {
      if (err) {
        console.error('SCHEMA ERROR:', err.message);
      } else {
        console.log('Consultations schema:');
        res.rows.forEach(row => console.log(`${row.column_name}: ${row.data_type}`));
      }
      pool.end();
    });
  }
});