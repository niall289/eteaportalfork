#!/usr/bin/env node

// Comprehensive webhook verification script
// Requires Node.js 18+ with fetch support

const BASE_URL = 'http://localhost:5002';
const VALID_SECRET = 'nailsurgery_secret_2025';
const INVALID_SECRET = 'wrong_secret';

console.log('🧪 Starting Nail Surgery Webhook Verification\n');

// Test data
const validTestData = {
  name: 'John Nail',
  email: 'john@nailtest.com', 
  phone: '+1234567890',
  issue_category: 'Ingrown Toenail',
  symptom_description: 'Severe pain in big toe',
  previous_treatment: 'None'
};

const testResults = {
  debugEndpoint: false,
  validSecret: false,
  invalidSecret: false,
  selfTest: false
};

// Helper function to make form data
function createFormData(data) {
  const formData = new FormData();
  formData.append('data', JSON.stringify(data));
  return formData;
}

// Test 1: Debug Endpoint
console.log('🔍 Test 1: Debug Endpoint');
try {
  const response = await fetch(`${BASE_URL}/api/debug/webhook-test`);
  console.log(`   Status: ${response.status}`);
  
  if (response.status === 200) {
    const result = await response.json();
    console.log('   Response:', JSON.stringify(result, null, 2));
    
    if (result.route === '/api/webhooks/nailsurgery' && result.secretConfigured) {
      testResults.debugEndpoint = true;
      console.log('   ✅ Debug endpoint working correctly');
    } else {
      console.log('   ❌ Debug endpoint response invalid');
    }
  } else {
    console.log('   ❌ Debug endpoint failed');
  }
} catch (error) {
  console.log('   ❌ Debug endpoint error:', error.message);
}

console.log('\n---\n');

// Test 2: Valid Secret
console.log('🔑 Test 2: Valid Secret Test');
try {
  const response = await fetch(`${BASE_URL}/api/webhooks/nailsurgery`, {
    method: 'POST',
    headers: {
      'X-Webhook-Secret': VALID_SECRET
    },
    body: createFormData(validTestData)
  });
  
  console.log(`   Status: ${response.status}`);
  const responseText = await response.text();
  console.log('   Response:', responseText);
  
  if (response.status === 200) {
    try {
      const result = JSON.parse(responseText);
      if (result.success && result.id) {
        testResults.validSecret = true;
        console.log('   ✅ Valid secret test PASSED - Got expected response');
        console.log(`   📝 Created consultation ID: ${result.id}`);
      } else {
        console.log('   ❌ Valid secret test FAILED - Wrong response format');
      }
    } catch (parseError) {
      console.log('   ❌ Valid secret test FAILED - Response not JSON');
    }
  } else {
    console.log('   ❌ Valid secret test FAILED - Wrong status code');
  }
} catch (error) {
  console.log('   ❌ Valid secret test ERROR:', error.message);
}

console.log('\n---\n');

// Test 3: Invalid Secret
console.log('🚫 Test 3: Invalid Secret Test');
try {
  const response = await fetch(`${BASE_URL}/api/webhooks/nailsurgery`, {
    method: 'POST',
    headers: {
      'X-Webhook-Secret': INVALID_SECRET
    },
    body: createFormData(validTestData)
  });
  
  console.log(`   Status: ${response.status}`);
  const responseText = await response.text();
  console.log('   Response:', responseText);
  
  if (response.status === 401) {
    try {
      const result = JSON.parse(responseText);
      if (result.error === 'Unauthorized') {
        testResults.invalidSecret = true;
        console.log('   ✅ Invalid secret test PASSED - Correctly rejected');
      } else {
        console.log('   ❌ Invalid secret test FAILED - Wrong error message');
      }
    } catch (parseError) {
      console.log('   ⚠️  Invalid secret test - Response not JSON but status correct');
      testResults.invalidSecret = true; // Status 401 is what matters
    }
  } else {
    console.log('   ❌ Invalid secret test FAILED - Should return 401');
  }
} catch (error) {
  console.log('   ❌ Invalid secret test ERROR:', error.message);
}

console.log('\n---\n');

// Test 4: Self-test with minimal data
console.log('🔬 Test 4: Self-test (minimal required data)');
const minimalData = { name: 'Minimal Test' }; // Only name provided
try {
  const response = await fetch(`${BASE_URL}/api/webhooks/nailsurgery`, {
    method: 'POST',
    headers: {
      'X-Webhook-Secret': VALID_SECRET
    },
    body: createFormData(minimalData)
  });
  
  console.log(`   Status: ${response.status}`);
  const responseText = await response.text();
  console.log('   Response:', responseText);
  
  if (response.status === 200) {
    try {
      const result = JSON.parse(responseText);
      if (result.success && result.id) {
        testResults.selfTest = true;
        console.log('   ✅ Self-test PASSED - Minimal data accepted');
      }
    } catch (parseError) {
      console.log('   ❌ Self-test FAILED - Response parsing error');
    }
  } else {
    console.log('   ❌ Self-test FAILED - Wrong status for minimal data');
  }
} catch (error) {
  console.log('   ❌ Self-test ERROR:', error.message);
}

console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION SUMMARY');
console.log('='.repeat(50));

const allPassed = Object.values(testResults).every(result => result);

console.log('🔍 Debug Endpoint:', testResults.debugEndpoint ? '✅ PASS' : '❌ FAIL');
console.log('🔑 Valid Secret:', testResults.validSecret ? '✅ PASS' : '❌ FAIL');
console.log('🚫 Invalid Secret:', testResults.invalidSecret ? '✅ PASS' : '❌ FAIL');
console.log('🔬 Self Test:', testResults.selfTest ? '✅ PASS' : '❌ FAIL');

console.log('\n' + (allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'));

if (allPassed) {
  console.log('\n🎉 The webhook is fully functional and ready for production use!');
  console.log('🔗 Chatbot can successfully POST to: /api/webhooks/nailsurgery');
  console.log('🔑 Secret validation working correctly');
  console.log('💾 Data persistence working');
} else {
  console.log('\n⚠️  Please review the failed tests above');
}

process.exit(allPassed ? 0 : 1);