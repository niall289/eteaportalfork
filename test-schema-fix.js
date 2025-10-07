// test-schema-fix.js
// Modified test script to verify the schema fix with the clinic field

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Log environment variables (redacted for security)
console.log('🔌 Testing Supabase connection with:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '[SET]' : '[MISSING]'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : '[MISSING]'}`);

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

async function testInsertWithClinic(clinicName) {
  console.log(`\n📝 Testing data insertion for ${clinicName}...`);
  
  const testData = {
    name: 'Test Patient',
    email: `test-${Date.now()}@example.com`,
    phone: '555-TEST',
    preferred_clinic: clinicName,
    clinic: clinicName,  // This is the critical field we fixed
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

async function testInsertWithoutClinic(clinicName) {
  console.log(`\n⚠️ Testing data insertion WITHOUT clinic field for ${clinicName}...`);
  
  const testData = {
    name: 'Test Patient (No Clinic)',
    email: `test-no-clinic-${Date.now()}@example.com`,
    phone: '555-TEST',
    preferred_clinic: clinicName,
    // clinic field intentionally omitted
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
      console.log('✅ Insert without clinic field correctly failed:', error.message);
      if (error.details) console.log('Details:', error.details);
      if (error.hint) console.log('Hint:', error.hint);
      return true; // This should fail, so returning true if it fails
    }
    
    console.error('❌ Insert without clinic field unexpectedly succeeded!');
    console.error('📄 Inserted record:', data[0]?.id);
    return false;
  } catch (e) {
    console.log('✅ Exception when inserting without clinic (expected):', e.message);
    return true;
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
      preferred_clinic: data.preferred_clinic,
      clinic: data.clinic, // Verify the clinic field is present
      created_at: data.created_at
    });
    return true;
  } catch (e) {
    console.error('❌ Exception during retrieval test:', e);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Schema Fix Verification Tests...');
  
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('❌ Connection failed, aborting further tests');
    process.exit(1);
  }
  
  console.log('\n✨ TESTING WITH CLINIC FIELD (Should succeed)');
  
  // Test all three clinic types
  const clinics = ['footcare', 'nailsurgery', 'lasercare'];
  let allSucceeded = true;
  
  for (const clinic of clinics) {
    const insertId = await testInsertWithClinic(clinic);
    if (insertId) {
      const retrieveOk = await testRetrieve(insertId);
      if (!retrieveOk) allSucceeded = false;
    } else {
      allSucceeded = false;
    }
  }
  
  console.log('\n⚠️ TESTING WITHOUT CLINIC FIELD (Should fail)');
  const noClinicTest = await testInsertWithoutClinic('footcare');
  if (!noClinicTest) {
    console.error('❌ Test without clinic field did not fail as expected. Schema constraint may not be working.');
    allSucceeded = false;
  }
  
  console.log('\n🏁 Test suite complete!');
  console.log(`Overall result: ${allSucceeded ? '✅ All tests PASSED' : '❌ Some tests FAILED'}`);
  
  if (allSucceeded) {
    console.log('🎉 The schema fix for requiring the clinic field is working correctly!');
  } else {
    console.log('⚠️ There may still be issues with the schema fix.');
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Unhandled error during tests:', error);
  process.exit(1);
});