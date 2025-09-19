import dotenv from 'dotenv';
dotenv.config();
dotenv.config({path: './server/.env'});
import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  return client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'consultations' AND column_name = 'raw_json'");
}).then(res => {
  console.log('raw_json column exists:', res.rows.length > 0);
  return client.end();
}).catch(err => {
  console.error(err);
  client.end();
});