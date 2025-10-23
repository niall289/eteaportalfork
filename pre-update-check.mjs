#!/usr/bin/env node

// Pre-update verification for live production system
// Run this to check current state before applying updates

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('🔍 PRE-UPDATE VERIFICATION\n');

// 1. Check if this is the feature branch
console.log('1. 📋 CHECKING CURRENT BRANCH...');
try {
  const { execSync } = require('child_process');
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  console.log(`   Current branch: ${branch}`);
  
  if (branch === 'feature/portal-webhook-consistency') {
    console.log('   ✅ On correct feature branch');
  } else {
    console.log('   ⚠️  Not on feature branch. Run: git checkout feature/portal-webhook-consistency');
  }
} catch (error) {
  console.log('   ❌ Could not check git branch');
}

// 2. Check database connection
console.log('\n2. 🗄️  CHECKING DATABASE CONNECTION...');
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  console.log('   ✅ DATABASE_URL found');
  console.log(`   📍 Database: ${dbUrl.split('@')[1]?.split('/')[0] || 'unknown'}`);
} else {
  console.log('   ❌ DATABASE_URL not set');
  console.log('   💡 Set with: $env:DATABASE_URL = "your-production-url"');
}

// 3. Check current schema
console.log('\n3. 🏗️  CHECKING CURRENT SCHEMA...');
if (dbUrl) {
  try {
    const pg = require('pg');
    const client = new pg.Client(dbUrl);
    await client.connect();
    
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consultations'
      ORDER BY column_name
    `);
    
    const columns = result.rows.map(row => row.column_name);
    console.log(`   📊 Current columns (${columns.length}):`, columns.join(', '));
    
    // Check for new columns
    const newColumns = ['clinic_domain', 'clinic_source', 'source', 'clinic_group'];
    const existing = newColumns.filter(col => columns.includes(col));
    const missing = newColumns.filter(col => !columns.includes(col));
    
    if (existing.length > 0) {
      console.log(`   ✅ Already has: ${existing.join(', ')}`);
    }
    if (missing.length > 0) {
      console.log(`   📋 Needs migration for: ${missing.join(', ')}`);
    }
    
    await client.end();
  } catch (error) {
    console.log(`   ❌ Could not check schema: ${error.message}`);
  }
} else {
  console.log('   ⏭️  Skipped - no database URL');
}

// 4. Check build status
console.log('\n4. 🔨 CHECKING BUILD...');
try {
  const fs = require('fs');
  const distExists = fs.existsSync('./dist');
  const buildExists = fs.existsSync('./build');
  
  if (distExists || buildExists) {
    console.log('   ✅ Built files exist');
  } else {
    console.log('   📋 Need to run: npm run build');
  }
  
  // Check package.json for scripts
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  if (pkg.scripts?.build) {
    console.log(`   📋 Build command: npm run ${Object.keys(pkg.scripts).find(s => s === 'build')}`);
  }
} catch (error) {
  console.log('   ⚠️  Could not check build files');
}

// 5. Check dependencies
console.log('\n5. 📦 CHECKING DEPENDENCIES...');
try {
  const fs = require('fs');
  const lockExists = fs.existsSync('./package-lock.json') || fs.existsSync('./npm-shrinkwrap.json');
  
  if (lockExists) {
    console.log('   ✅ Lock file exists');
    console.log('   📋 Run: npm install (to ensure sync)');
  } else {
    console.log('   ⚠️  No lock file - run npm install first');
  }
} catch (error) {
  console.log('   ⚠️  Could not check dependencies');
}

// 6. Check files exist
console.log('\n6. 📁 CHECKING KEY FILES...');
const keyFiles = [
  './server/index.ts',
  './shared/schema.ts', 
  './run-migrations.mjs',
  './migrations/0009_add_clinic_domain_source.sql',
  './migrations/0010_add_source_clinic_group.sql'
];

keyFiles.forEach(file => {
  try {
    const fs = require('fs');
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ Missing: ${file}`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check: ${file}`);
  }
});

console.log('\n🎯 NEXT STEPS:');
console.log('1. Follow LIVE_UPDATE_GUIDE.md');
console.log('2. Backup your live system first');
console.log('3. Run database migrations');
console.log('4. Deploy code updates');
console.log('5. Test webhook functionality');

console.log('\n🚀 Ready for live update!');