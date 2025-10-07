import fs from 'fs';

async function testFootcareWebhook() {
  const form = new FormData();
  form.append('name', 'Test User');
  form.append('email', 'test@example.com');
  form.append('image', fs.createReadStream('test.png'));

  try {
    const response = await fetch('http://localhost:5002/api/webhooks/footcare', {
      method: 'POST',
      headers: {
        'X-Footcare-Secret': 'your-webhook-secret-for-footcare-chatbot',
        ...form.headers
      },
      body: form
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

testFootcareWebhook();