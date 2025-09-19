#!/usr/bin/env tsx

/**
 * Seed script to create a FootCare consultation with a tiny embedded base64 PNG image
 * Usage: npm run seed:image
 */

console.log('🚀 Script started!');

// Tiny 1x1 pixel transparent PNG in base64 (minimal size)
const TINY_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// Webhook payload with minimal required fields
const payload = {
  name: "Test Patient",
  email: "test@example.com",
  phone: "123-456-7890",
  has_image: "true",
  image_path: TINY_PNG_BASE64,
  issue_category: "Test Consultation",
  preferred_clinic: "Test Clinic"
};

async function seedFootcareImage() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5002';
  const webhookSecret = process.env.FOOTCARE_WEBHOOK_SECRET || '84f4903b9f1a43458ea46c54978fd162';

  console.log('🌱 Seeding FootCare consultation with image...');
  console.log('📍 Target URL:', `${baseUrl}/api/webhooks/footcare`);
  console.log('🔑 Webhook Secret:', webhookSecret.substring(0, 8) + '...');
  console.log('📊 Payload:', JSON.stringify(payload, null, 2));

  try {
    console.log('🚀 Making HTTP request...');
    const response = await fetch(`${baseUrl}/api/webhooks/footcare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Footcare-Secret': webhookSecret,
      },
      body: JSON.stringify(payload),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Success! Created consultation with ID:', data.id);
        console.log('📄 Full response:', JSON.stringify(data, null, 2));
        return data.id;
      } catch (parseError) {
        console.log('✅ Success! Raw response:', responseText);
        return responseText;
      }
    } else {
      console.error('❌ Failed to create consultation');
      console.error('❌ Response:', responseText);
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }
  } catch (error) {
    console.error('❌ Error seeding consultation:', error);
    throw error;
  }
}

// Run the seed function
console.log('🔄 Calling seedFootcareImage...');
seedFootcareImage()
  .then((consultationId) => {
    console.log('🎉 Seed completed successfully!');
    console.log('🆔 Consultation ID:', consultationId);
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  });

export { seedFootcareImage };