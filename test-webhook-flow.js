// test-webhook-flow.js
// A script to test the full webhook flow with our fixes

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Supabase client for verification
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

const WEBHOOK_ENDPOINT = 'http://localhost:5002/api/webhooks/lasercare';
const WEBHOOK_SECRET = process.env.LASER_WEBHOOK_SECRET || 'lasercare_secret_2025';

// Generate a unique identifier for this test
const testId = Date.now();

async function sendWebhookRequest() {
  console.log(`\n🚀 Sending test webhook request to ${WEBHOOK_ENDPOINT}...`);
  console.log(`🔑 Using webhook secret: ${WEBHOOK_SECRET}`);

  // Create test consultation data
  const consultationData = {
    name: `Test Patient ${testId}`,
    email: `test-${testId}@example.com`,
    phone: `555-${testId}`,
    preferred_clinic: 'lasercare',
    issue_category: 'Test Category',
    issue_specifics: 'Test Specifics',
    symptom_description: 'Test Symptoms',
    created_at: new Date().toISOString()
  };

  // Create form data (multipart/form-data)
  const form = new FormData();
  
  // Add JSON fields
  Object.entries(consultationData).forEach(([key, value]) => {
    form.append(key, value);
  });

  try {
    console.log(`📤 Sending data:`, JSON.stringify(consultationData, null, 2));
    
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      body: form,
      headers: {
        'X-Lasercare-Secret': WEBHOOK_SECRET,
        ...form.getHeaders()
      }
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.log('⚠️ Response is not valid JSON, displaying raw text');
      console.log(responseText);
      return null;
    }
    
    console.log(`✅ Webhook response: ${response.status} ${response.statusText}`);
    console.log(`📊 Response data:`, responseData);
    
    return responseData.id;
  } catch (error) {
    console.error(`❌ Error sending webhook request:`, error);
    return null;
  }
}

async function verifyDataInSupabase(consultationId) {
  if (!consultationId) {
    console.error('❌ Cannot verify data: No consultation ID received from webhook');
    return false;
  }

  console.log(`\n🔍 Verifying data in Supabase for consultation ID: ${consultationId}...`);
  
  try {
    // Wait a moment for the data to be fully processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Query Supabase for the consultation
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();
      
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return false;
    }
    
    if (!data) {
      console.error('❌ No data found in Supabase');
      return false;
    }
    
    console.log('✅ Successfully retrieved data from Supabase');
    console.log('📊 Consultation data:', {
      id: data.id,
      name: data.name,
      email: data.email,
      preferred_clinic: data.preferred_clinic,
      clinic: data.clinic,
      created_at: data.created_at
    });
    
    // Verify essential fields
    const verification = {
      hasName: !!data.name,
      hasEmail: !!data.email,
      hasPreferredClinic: !!data.preferred_clinic,
      hasClinic: !!data.clinic
    };
    
    console.log('✅ Field verification:', verification);
    
    return Object.values(verification).every(v => v === true);
  } catch (error) {
    console.error('❌ Verification error:', error);
    return false;
  }
}

async function runTest() {
  console.log('🧪 Starting webhook flow verification test');
  
  // Step 1: Send the webhook request
  const consultationId = await sendWebhookRequest();
  
  // Step 2: Verify the data was stored in Supabase
  if (consultationId) {
    const verificationSuccess = await verifyDataInSupabase(consultationId);
    
    if (verificationSuccess) {
      console.log('\n✅ VERIFICATION SUCCESS: Webhook data successfully stored in Supabase');
      console.log('🏁 Both environment variable and schema fixes are working correctly!');
    } else {
      console.log('\n❌ VERIFICATION FAILED: Webhook data not properly stored in Supabase');
    }
  } else {
    console.log('\n❌ TEST FAILED: Could not send webhook or receive consultation ID');
  }
}

// Run the test
runTest().catch(error => {
  console.error('💥 Unhandled error during test:', error);
});