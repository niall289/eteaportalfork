/* server/db.ts  Node/pg version for Neon over TLS (no WebSocket) */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

/** Remove channel_binding from the connection string (can break some clients) */
function stripChannelBinding(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return urlStr;
  }
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  throw new Error("DATABASE_URL is not set");
}
const connectionString = stripChannelBinding(rawUrl);

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Neon requires SSL; pooler uses standard TLS
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error:", err);
});

// optional: warm-up probe
(async () => {
  try {
    await pool.query("SELECT 1");
    console.log(" Postgres pool ready");
  } catch (e) {
    console.error(" Postgres init failed", e);
  }
})();

export const db = drizzle(pool);
export default db;
