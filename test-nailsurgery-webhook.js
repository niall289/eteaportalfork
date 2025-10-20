import FormData from 'form-data';
import fetch from 'node-fetch';

async function testNailSurgeryWebhook() {
  console.log('🧪 Testing Nail Surgery Webhook...');

  const testData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    issue_category: 'Nail Problem',
    symptom_description: 'Ingrown toenail causing pain',
    previous_treatment: 'None',
    has_image: false
  };

  const form = new FormData();
  form.append('data', JSON.stringify(testData));

  try {
    console.log('📤 Sending POST request to http://localhost:5002/api/webhooks/nailsurgery');
    console.log('🔑 Using X-Webhook-Secret: nailsurgery_secret_2025');
    console.log('📊 Test data:', JSON.stringify(testData, null, 2));

    const response = await fetch('http://localhost:5002/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'X-Webhook-Secret': 'nailsurgery_secret_2025',
        ...form.getHeaders()
      },
      body: form
    });

    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));
    
    const responseText = await response.text();
    console.log('📥 Response Body:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response as JSON:', e.message);
      return;
    }

    if (response.status === 200 && responseData.success) {
      console.log('✅ Test PASSED! Webhook accepted the request');
      console.log('🆔 Created consultation ID:', responseData.id);
    } else {
      console.log('❌ Test FAILED!');
      console.log('Expected: status 200 with { success: true, id: "..." }');
      console.log('Got:', { status: response.status, body: responseData });
    }

  } catch (error) {
    console.error('❌ Test ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testNailSurgeryWebhook();