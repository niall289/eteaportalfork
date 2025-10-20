#!/usr/bin/env node

// Simple test script for the Nail Surgery Webhook
// Run with: node test-nailsurgery-simple.mjs

const testNailSurgeryWebhook = async () => {
  console.log('🧪 Testing Nail Surgery Webhook Implementation...\n');

  const testData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    issue_category: 'Nail Problem',
    symptom_description: 'Ingrown toenail causing pain',
    previous_treatment: 'None'
  };

  // Test 1: Valid webhook request
  console.log('📤 Test 1: Valid webhook request');
  console.log('URL: http://localhost:5002/api/webhooks/nailsurgery');
  console.log('Header: X-Webhook-Secret: nailsurgery_secret_2025');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  try {
    const formData = new FormData();
    formData.append('data', JSON.stringify(testData));

    const response = await fetch('http://localhost:5002/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'X-Webhook-Secret': 'nailsurgery_secret_2025'
      },
      body: formData
    });

    console.log('Status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (response.status === 200) {
      const result = JSON.parse(responseText);
      if (result.success && result.id) {
        console.log('✅ Test 1 PASSED - Got expected response format');
      } else {
        console.log('❌ Test 1 FAILED - Wrong response format');
      }
    } else {
      console.log('❌ Test 1 FAILED - Wrong status code');
    }
  } catch (error) {
    console.error('❌ Test 1 ERROR:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Wrong secret (should return 401)
  console.log('📤 Test 2: Wrong secret (expecting 401)');
  try {
    const formData = new FormData();
    formData.append('data', JSON.stringify(testData));

    const response = await fetch('http://localhost:5002/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'X-Webhook-Secret': 'wrong_secret'
      },
      body: formData
    });

    console.log('Status:', response.status);
    const responseText = await response.text();
    console.log('Response:', responseText);

    if (response.status === 401) {
      console.log('✅ Test 2 PASSED - Correctly rejected wrong secret');
    } else {
      console.log('❌ Test 2 FAILED - Should have returned 401');
    }
  } catch (error) {
    console.error('❌ Test 2 ERROR:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Debug endpoint (development only)
  console.log('📤 Test 3: Debug endpoint');
  try {
    const response = await fetch('http://localhost:5002/api/debug/webhook-test');
    console.log('Status:', response.status);
    
    if (response.status === 200) {
      const result = await response.json();
      console.log('Debug info:', JSON.stringify(result, null, 2));
      console.log('✅ Test 3 PASSED - Debug endpoint working');
    } else if (response.status === 404) {
      console.log('🔒 Debug endpoint disabled (production mode)');
    } else {
      console.log('❌ Test 3 FAILED - Unexpected status');
    }
  } catch (error) {
    console.error('❌ Test 3 ERROR:', error.message);
  }
};

// Run the test if we can access fetch
if (typeof fetch === 'undefined') {
  console.error('❌ This test requires Node.js 18+ with fetch support');
  console.log('Run: npm install node-fetch and update the import');
  process.exit(1);
}

testNailSurgeryWebhook().then(() => {
  console.log('\n🏁 Test complete');
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});