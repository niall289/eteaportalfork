import fetch from 'node-fetch';
import FormData from 'form-data';

async function testNailSurgeryWebhook() {
  console.log('🧪 Testing Nail Surgery Webhook Endpoint\n');

  // Test 1: Missing webhook secret (should return 401)
  console.log('Test 1: Missing webhook secret');
  try {
    const response = await fetch('http://localhost:5002/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Patient',
        email: 'test@example.com',
        phone: '555-1234'
      })
    });
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, result);
    console.log(response.status === 401 ? '✅ PASS\n' : '❌ FAIL\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 2: Wrong webhook secret (should return 401)
  console.log('Test 2: Wrong webhook secret');
  try {
    const response = await fetch('http://localhost:5002/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': 'wrong-secret'
      },
      body: JSON.stringify({
        name: 'Test Patient',
        email: 'test@example.com',
        phone: '555-1234'
      })
    });
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, result);
    console.log(response.status === 401 ? '✅ PASS\n' : '❌ FAIL\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 3: Valid webhook with JSON body (should return 201)
  console.log('Test 3: Valid webhook with JSON body');
  try {
    const response = await fetch('http://localhost:5002/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': process.env.NAIL_WEBHOOK_SECRET || 'test-secret-123'
      },
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-9876',
        issue_category: 'Ingrown toenail',
        symptom_description: 'Pain and swelling on big toe'
      })
    });
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, result);
    console.log(response.status === 201 && result.success && result.id ? '✅ PASS\n' : '❌ FAIL\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 4: Valid webhook with FormData 'data' field (should return 201)
  console.log('Test 4: Valid webhook with FormData data field');
  try {
    const form = new FormData();
    form.append('data', JSON.stringify({
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      phone: '555-4567',
      issue_category: 'Nail fungus',
      symptom_description: 'Discolored and thickened nail'
    }));

    const response = await fetch('http://localhost:5002/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'x-webhook-secret': process.env.NAIL_WEBHOOK_SECRET || 'test-secret-123',
        ...form.getHeaders()
      },
      body: form
    });
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, result);
    console.log(response.status === 201 && result.success && result.id ? '✅ PASS\n' : '❌ FAIL\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  // Test 5: Case-insensitive header check (X-Webhook-Secret uppercase)
  console.log('Test 5: Case-insensitive header (X-Webhook-Secret)');
  try {
    const response = await fetch('http://localhost:5002/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.NAIL_WEBHOOK_SECRET || 'test-secret-123'
      },
      body: JSON.stringify({
        name: 'Test Patient 3',
        email: 'test3@example.com',
        phone: '555-1111'
      })
    });
    const result = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, result);
    console.log(response.status === 201 && result.success && result.id ? '✅ PASS\n' : '❌ FAIL\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('🏁 Test suite completed');
}

testNailSurgeryWebhook().catch(console.error);
