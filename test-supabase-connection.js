// test-supabase-connection.js
// Simple script to test Supabase connection and data operations

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables
dotenv.config();

// Log environment variables (redacted for security)
console.log('🔌 Testing Supabase connection with:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '[SET]' : '[MISSING]'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : '[MISSING]'}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '[SET]' : '[MISSING]'}`);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test functions
async function testConnection() {
  console.log('\n📡 Testing basic Supabase connection...');
  try {
    const { data, error } = await supabase.from('consultations').select('count');
    
    if (error) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log(`📊 Current consultation count:`, data[0]?.count || 'No count returned');
    return true;
  } catch (e) {
    console.error('❌ Exception during connection test:', e);
    return false;
  }
}

async function testInsert() {
  console.log('\n📝 Testing data insertion...');
  
  const testData = {
    name: 'Test Patient',
    email: `test-${Date.now()}@example.com`,
    phone: '555-TEST',
    preferred_clinic: 'lasercare',
    issue_category: 'Test Issue',
    created_at: new Date(),
    conversation_log: []
  };
  
  try {
    const { data, error } = await supabase
      .from('consultations')
      .insert(testData)
      .select();
    
    if (error) {
      console.error('❌ Insert test failed:', error.message);
      if (error.details) console.error('Details:', error.details);
      if (error.hint) console.error('Hint:', error.hint);
      return false;
    }
    
    console.log('✅ Insert successful!');
    console.log('📄 Inserted record:', data[0]?.id);
    return data[0]?.id;
  } catch (e) {
    console.error('❌ Exception during insert test:', e);
    return false;
  }
}

async function testRetrieve(id) {
  if (!id) return false;
  
  console.log(`\n🔍 Testing data retrieval for ID ${id}...`);
  
  try {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('❌ Retrieval test failed:', error.message);
      return false;
    }
    
    console.log('✅ Retrieval successful!');
    console.log('📄 Retrieved record:', {
      id: data.id,
      name: data.name,
      email: data.email,
      clinic: data.preferred_clinic,
      created_at: data.created_at
    });
    return true;
  } catch (e) {
    console.error('❌ Exception during retrieval test:', e);
    return false;
  }
}

async function testImageStorage() {
  console.log('\n🖼️ Testing Supabase Storage...');
  
  try {
    // Get bucket info
    const bucketName = process.env.SUPABASE_BUCKET || 'triageimages';
    console.log(`🪣 Using bucket: ${bucketName}`);
    
    const { data: bucketData, error: bucketError } = await supabase
      .storage
      .getBucket(bucketName);
    
    if (bucketError) {
      console.error('❌ Bucket access failed:', bucketError.message);
      return false;
    }
    
    console.log('✅ Bucket access successful!');
    console.log('📊 Bucket info:', {
      id: bucketData.id,
      name: bucketData.name,
      public: bucketData.public,
      created_at: bucketData.created_at
    });
    
    // List files in bucket
    const { data: listData, error: listError } = await supabase
      .storage
      .from(bucketName)
      .list();
      
    if (listError) {
      console.error('❌ List files failed:', listError.message);
    } else {
      console.log(`✅ Listed ${listData.length} files/folders in bucket`);
      listData.slice(0, 5).forEach(item => {
        console.log(`  - ${item.name} (${item.metadata?.size || 'N/A'} bytes)`);
      });
      if (listData.length > 5) console.log(`  ... and ${listData.length - 5} more`);
    }
    
    return true;
  } catch (e) {
    console.error('❌ Exception during storage test:', e);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Supabase integration tests...');
  
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('❌ Connection failed, aborting further tests');
    process.exit(1);
  }
  
  const insertId = await testInsert();
  if (insertId) {
    await testRetrieve(insertId);
  }
  
  await testImageStorage();
  
  console.log('\n🏁 Test suite complete!');
}

// Run tests
runTests().catch(error => {
  console.error('💥 Unhandled error during tests:', error);
  process.exit(1);
});