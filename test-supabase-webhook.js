// Test script for the Supabase-integrated webhook endpoint
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const WEBHOOK_URL = 'http://localhost:5002/api/webhooks/footcare';
const SECRET_HEADER = 'X-Footcare-Secret';
const SECRET_VALUE = 'footcare_secret_2025'; // Using the new secret format

// Test data
const testData = {
  name: 'Test Patient',
  email: 'test@example.com',
  phone: '123-456-7890',
  issue_category: 'Pain',
  symptom_description: 'Pain in the right heel after walking',
  previous_treatment: 'None',
  created_at: new Date().toISOString(),
  conversation_log: [
    { role: 'system', content: 'Conversation started' },
    { role: 'user', content: 'I have pain in my heel' },
    { role: 'assistant', content: 'I understand you have heel pain. Can you describe it in more detail?' }
  ]
};

// Function to run the test
async function runTest(includeImage = false) {
  try {
    console.log('⏳ Starting webhook test with Supabase integration...');
    
    // Create form data
    const formData = new FormData();
    
    // Add JSON data
    formData.append('json', JSON.stringify(testData));
    
    // Add each field individually
    Object.entries(testData).forEach(([key, value]) => {
      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    });
    
    // Add test image if requested
    if (includeImage) {
      try {
        // Try to find a test image
        const testImagePath = path.join(__dirname, 'test.png');
        
        // Check if the file exists
        if (fs.existsSync(testImagePath)) {
          console.log('📎 Adding test image to request...');
          formData.append('image', fs.createReadStream(testImagePath));
        } else {
          console.warn('⚠️ Test image not found at', testImagePath);
          console.log('ℹ️ Continuing without image...');
        }
      } catch (err) {
        console.error('❌ Error adding image:', err.message);
      }
    }
    
    // Send request
    console.log(`🔄 Sending request to ${WEBHOOK_URL}`);
    console.log(`🔑 Using secret: ${SECRET_VALUE}`);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      body: formData,
      headers: {
        [SECRET_HEADER]: SECRET_VALUE,
      },
    });
    
    const responseBody = await response.json();
    
    // Display results
    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    console.log('📄 Response Body:', JSON.stringify(responseBody, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Test completed successfully!');
      console.log(`💾 Consultation ID: ${responseBody.id}`);
      if (responseBody.image_url) {
        console.log(`🖼️ Image URL: ${responseBody.image_url}`);
      }
    } else {
      console.log('\n❌ Test failed!');
    }
  } catch (error) {
    console.error('\n❌ Error during test:', error);
  }
}

// Run with arguments
const includeImage = process.argv.includes('--with-image');
runTest(includeImage);

console.log('\n📝 Usage:');
console.log('  Basic test: node test-supabase-webhook.js');
console.log('  With image: node test-supabase-webhook.js --with-image');