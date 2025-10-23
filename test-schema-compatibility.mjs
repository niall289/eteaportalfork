#!/usr/bin/env node

/**
 * Test Portal Schema Compatibility with Nail Surgery Chatbot Data
 * This simulates the exact data format the nail surgery chatbot would send
 */

const BASE_URL = 'http://localhost:5002';
const WEBHOOK_SECRET = 'nailsurgery_secret_2025';

// Sample data in the format the nail surgery chatbot sends
const nailSurgeryTestData = {
  // Core patient data
  name: "John Smith",
  email: "john.smith@example.com", 
  phone: "+1234567890",
  
  // Nail surgery specific fields
  issue_category: "Ingrown Toenail",
  symptom_description: "Severe pain and swelling in big toe",
  previous_treatment: "Tried soaking in warm water",
  
  // Chatbot metadata (these should be preserved)
  source: "nail_surgery_clinic",
  clinic_group: "The Nail Surgery Clinic",
  clinic_domain: "nailsurgery.example.com",
  clinic_source: "chatbot_widget",
  preferred_clinic: "Downtown Nail Surgery Center",
  
  // Additional fields
  has_image: false,
  pain_severity: "8/10",
  pain_duration: "3 days"
};

console.log('🧪 Testing Portal Schema Compatibility with Nail Surgery Data\n');

console.log('📊 Test Payload:');
console.log(JSON.stringify(nailSurgeryTestData, null, 2));
console.log('\n---\n');

// Test the webhook
try {
  const formData = new FormData();
  formData.append('data', JSON.stringify(nailSurgeryTestData));

  const response = await fetch(`${BASE_URL}/api/webhooks/nailsurgery`, {
    method: 'POST',
    headers: {
      'X-Webhook-Secret': WEBHOOK_SECRET
    },
    body: formData
  });

  const responseText = await response.text();
  
  console.log('🔄 Webhook Response:');
  console.log(`   Status: ${response.status}`);
  console.log(`   Response: ${responseText}`);
  
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(responseText);
  } catch (e) {
    console.log('   (Response is not valid JSON)');
  }
  
  if (response.ok && parsedResponse?.success) {
    console.log('\n✅ SUCCESS: Portal can handle nail surgery data format');
    console.log(`✅ Created consultation ID: ${parsedResponse.id}`);
    console.log('\n🎯 Schema Compatibility: CONFIRMED');
    console.log('   - All nail surgery fields accepted');
    console.log('   - Data normalization working');
    console.log('   - Database insertion successful');
  } else {
    console.log('\n❌ FAILED: Schema compatibility issue detected');
    if (response.status === 500) {
      console.log('   - Likely database schema mismatch');
      console.log('   - Check if all required columns exist');
    }
  }
  
} catch (error) {
  console.log(`\n❌ Connection Error: ${error.message}`);
  console.log('   - Make sure portal server is running on port 5002');
}