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

async function checkPortalSchema() {
  try {
    console.log("🔍 Checking Portal Database Schema...\n");
    
    // Get all columns in consultations table
    const { rows: columns } = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'consultations' 
      ORDER BY ordinal_position ASC
    `);
    
    console.log("📋 Portal Consultations Table Schema:");
    console.log("=====================================");
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(required)';
      const defaultVal = col.column_default ? ` [default: ${col.column_default}]` : '';
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(15)} ${nullable}${defaultVal}`);
    });
    
    console.log(`\n✅ Total columns: ${columns.length}`);
    
    // Check specifically for nail surgery fields
    const nailSurgeryFields = ['clinic_domain', 'clinic_source', 'source', 'clinic_group', 'preferred_clinic'];
    console.log("\n🎯 Nail Surgery Specific Fields:");
    console.log("=================================");
    
    nailSurgeryFields.forEach(field => {
      const exists = columns.find(col => col.column_name === field);
      if (exists) {
        console.log(`  ✅ ${field.padEnd(20)} - ${exists.data_type} (${exists.is_nullable === 'YES' ? 'optional' : 'required'})`);
      } else {
        console.log(`  ❌ ${field.padEnd(20)} - MISSING`);
      }
    });
    
    // Check recent consultations to see data format
    console.log("\n📊 Recent Consultation Data Sample:");
    console.log("===================================");
    
    const { rows: recent } = await client.query(`
      SELECT 
        id, name, email, source, clinic_group, clinic_domain, clinic_source, preferred_clinic, created_at
      FROM consultations 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (recent.length > 0) {
      recent.forEach((row, i) => {
        console.log(`\nRecord ${i + 1}:`);
        console.log(`  ID: ${row.id}`);
        console.log(`  Name: ${row.name}`);
        console.log(`  Email: ${row.email}`);
        console.log(`  Source: ${row.source || 'null'}`);
        console.log(`  Clinic Group: ${row.clinic_group || 'null'}`);
        console.log(`  Clinic Domain: ${row.clinic_domain || 'null'}`);
        console.log(`  Clinic Source: ${row.clinic_source || 'null'}`);
        console.log(`  Preferred Clinic: ${row.preferred_clinic || 'null'}`);
        console.log(`  Created: ${row.created_at}`);
      });
    } else {
      console.log("  No consultations found in database");
    }
    
  } catch (error) {
    console.error("❌ Schema check failed:", error.message);
  }
}

(async () => {
  try {
    await client.connect();
    await checkPortalSchema();
    console.log("\n🎉 Schema verification completed.");
  } catch (err) {
    console.error("❌ Connection failure:", err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();