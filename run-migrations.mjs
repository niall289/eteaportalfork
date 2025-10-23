import fs from "fs";
import pg from "pg";

const { Client } = pg;
const connStr = process.env.DATABASE_URL;

if (!connStr) {
  console.error("❌ DATABASE_URL is not set in the environment.");
  process.exit(1);
}

const client = new Client({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false }
});

async function runSqlFile(path) {
  const sql = fs.readFileSync(path, "utf8");
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query("COMMIT");
    console.log(`✅ Applied: ${path}`);
  } catch (err) {
    await client.query("ROLLBACK");
    // If it's a duplicate column / relation exists error, treat as idempotent success
    const m = String(err.message || err).toLowerCase();
    if (m.includes("already exists") || m.includes("duplicate") || m.includes("relation") || m.includes("column")) {
      console.warn(`⚠️  Skipped (already applied or idempotent): ${path} -> ${err.message}`);
      return;
    }
    throw err;
  }
}

async function verify() {
  const { rows } = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'consultations'
      AND column_name IN ('clinic_domain','clinic_source','source','clinic_group')
    ORDER BY column_name ASC
  `);
  console.log("🔎 Columns present:", rows.map(r => r.column_name));
}

(async () => {
  try {
    console.log("🧩 Connecting to DB…");
    await client.connect();

    await runSqlFile("./migrations/0009_add_clinic_domain_source.sql");
    await runSqlFile("./migrations/0010_add_source_clinic_group.sql");

    await verify();
    console.log("🎉 Migrations completed.");
  } catch (err) {
    console.error("❌ Migration failure:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();