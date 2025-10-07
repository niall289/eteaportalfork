// test-image-upload.js
// A script to test the image upload functionality of the webhook endpoint

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

const WEBHOOK_ENDPOINT = 'http://localhost:5002/api/webhooks/footcare';
const WEBHOOK_SECRET = process.env.FOOTCARE_WEBHOOK_SECRET || 'footcare_secret_2025';
const TEST_IMAGE_PATH = path.join(__dirname, 'test.png');

// If test image doesn't exist, create a simple one
async function ensureTestImage() {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.log(`📷 Test image not found, creating one at ${TEST_IMAGE_PATH}`);
    
    // Create a simple test image if one doesn't exist
    // You can replace this with your own image or use a library to create a more complex one
    const imageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABGdBTUEAALGPC/xhBQAAAAlwSFlz'
      + 'AAALEwAACxMBAJqcGAAAASxJREFUOE/tk8ERgjAQRRNKoARLoARKoAQ7sARKoARLsARKoARLoQRK'
      + 'YP7CLEMQEAbUGW/7Z7LJ7tt/k4OI/Odnh+M4yQqptm2PbdteUNN1XZKVn5GkaRqDoihMURSmaZrY'
      + 'BwVJQRqIrKqqFJWrqkqqqsqAbhxU3/cqtbZtVUC5LEvVEhTOWSA/z3PDQVVVGVB+1rquDf3jOGoP'
      + '0zRVYSTnM1WQB8xQcAySc4HTOOxBEGlZliYMQ8Pn05HneZqlbgKTR5ZlGtR13XDuK9xkAG1GIYqi'
      + 'SMA5jQoEwrE0OUmSJR9nCQyygjSWS7JBrMsJyj2W5xM5AKOO1vdxFhZZECvPc5VaFEU6zVYSQ3W8'
      + '4NluCcTxk/4gEEaIpJrNiGB4xP18kqzs4xtvskJCXpbqEkoAAAAASUVORK5CYII=',
      'base64'
    );
    fs.writeFileSync(TEST_IMAGE_PATH, imageData);
  }
}

async function sendWebhookWithImage() {
  console.log(`\n🚀 Sending webhook with image to ${WEBHOOK_ENDPOINT}...`);
  console.log(`🔑 Using webhook secret: ${WEBHOOK_SECRET}`);

  // Generate a unique identifier for this test
  const testId = Date.now();

  // Create test consultation data
  const consultationData = {
    name: `Test Patient ${testId}`,
    email: `test-${testId}@example.com`,
    phone: `555-${testId}`,
    preferred_clinic: 'footcare',
    issue_category: 'Test Category',
    issue_specifics: 'Test Specifics',
    symptom_description: 'Test Symptoms',
    hasImage: 'yes',  // Flag that we're sending an image
    created_at: new Date().toISOString()
  };

  // Create form data (multipart/form-data)
  const form = new FormData();
  
  // Add JSON fields
  Object.entries(consultationData).forEach(([key, value]) => {
    form.append(key, value);
  });

  // Add the image file
  const imageFileStream = fs.createReadStream(TEST_IMAGE_PATH);
  form.append('image', imageFileStream, {
    filename: 'test-foot-image.png',
    contentType: 'image/png'
  });

  try {
    console.log(`📤 Sending data:`, JSON.stringify(consultationData, null, 2));
    console.log(`📷 Attaching image: ${TEST_IMAGE_PATH}`);
    
    const response = await fetch(WEBHOOK_ENDPOINT, {
      method: 'POST',
      body: form,
      headers: {
        'X-Footcare-Secret': WEBHOOK_SECRET,
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
    
    return responseData;
  } catch (error) {
    console.error(`❌ Error sending webhook request:`, error);
    return null;
  }
}

async function verifyImageUpload(responseData) {
  if (!responseData || !responseData.id) {
    console.error('❌ Cannot verify image: No consultation ID received from webhook');
    return false;
  }

  const consultationId = responseData.id;
  const imageUrl = responseData.image_url;
  
  console.log(`\n🔍 Verifying image upload for consultation ID: ${consultationId}...`);
  
  try {
    // Wait a moment for the data to be fully processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Query Supabase for the consultation
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select('*')
      .eq('id', consultationId)
      .single();
      
    if (consultationError) {
      console.error('❌ Supabase consultation query error:', consultationError.message);
      return false;
    }
    
    if (!consultation) {
      console.error('❌ No consultation data found in Supabase');
      return false;
    }
    
    console.log('✅ Successfully retrieved consultation from Supabase');
    console.log('📊 Consultation data:', {
      id: consultation.id,
      name: consultation.name,
      image_url: consultation.image_url,
      has_image: consultation.has_image
    });
    
    // Verify image fields
    if (!consultation.image_url) {
      console.error('❌ No image_url in consultation record');
      return false;
    }

    if (!consultation.has_image) {
      console.error('❌ has_image flag is not set to true');
      return false;
    }
    
    // Query Supabase for the image record
    const { data: images, error: imagesError } = await supabase
      .from('images')
      .select('*')
      .eq('consultation_id', consultationId);
      
    if (imagesError) {
      console.error('❌ Supabase images query error:', imagesError.message);
      return false;
    }
    
    if (!images || images.length === 0) {
      console.error('❌ No image records found in Supabase');
      return false;
    }
    
    const imageRecord = images[0];
    
    console.log('✅ Successfully retrieved image record from Supabase');
    console.log('📊 Image data:', {
      id: imageRecord.id,
      url: imageRecord.url,
      consultation_id: imageRecord.consultationId,
      source_type: imageRecord.sourceType,
      created_at: imageRecord.created_at
    });
    
    // Try to verify the image exists in storage by checking the bucket
    const bucketName = process.env.SUPABASE_BUCKET || 'triageimages';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Check the directory structure
    const { data: directoryFiles, error: directoryError } = await supabase
      .storage
      .from(bucketName)
      .list(`footcare/${year}/${month}`);
    
    if (directoryError) {
      console.error('❌ Error listing files in Supabase Storage bucket:', directoryError.message);
      // Continue with other verifications even if this fails
    } else {
      console.log(`📁 Files in ${bucketName}/footcare/${year}/${month}:`, directoryFiles);
    }
    
    console.log(`\n🔍 Checking image URL format...`);
    const urlFormat = new RegExp(`${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/footcare/\\d{4}/\\d{2}/.+/original\\..+`);
    const formatCorrect = urlFormat.test(consultation.image_url);
    
    if (formatCorrect) {
      console.log(`✅ Image URL format is correct: ${consultation.image_url}`);
    } else {
      console.error(`❌ Image URL format is incorrect: ${consultation.image_url}`);
      console.error(`Expected format: ${process.env.SUPABASE_URL}/storage/v1/object/public/${bucketName}/footcare/YYYY/MM/consultationId/original.ext`);
    }
    
    // Make a request to check if the image URL is accessible
    try {
      const imageResponse = await fetch(consultation.image_url);
      if (imageResponse.ok) {
        console.log(`✅ Image URL is accessible: ${imageResponse.status} ${imageResponse.statusText}`);
      } else {
        console.error(`❌ Image URL returns error: ${imageResponse.status} ${imageResponse.statusText}`);
      }
    } catch (fetchError) {
      console.error(`❌ Error fetching image URL:`, fetchError);
    }
    
    // Overall verification
    const verification = {
      hasImageUrl: !!consultation.image_url,
      hasImageFlag: !!consultation.has_image,
      hasImageRecord: images.length > 0,
      correctUrlFormat: formatCorrect
    };
    
    console.log('\n✅ Image verification summary:', verification);
    
    return Object.values(verification).every(v => v === true);
  } catch (error) {
    console.error('❌ Verification error:', error);
    return false;
  }
}

async function runTest() {
  console.log('🧪 Starting image upload verification test');
  
  // Make sure we have a test image
  await ensureTestImage();
  
  // Step 1: Send the webhook request with an image
  const responseData = await sendWebhookWithImage();
  
  if (!responseData) {
    console.log('\n❌ TEST FAILED: Could not send webhook or receive response data');
    return;
  }
  
  // Step 2: Verify the image was uploaded to Supabase
  const verificationSuccess = await verifyImageUpload(responseData);
  
  if (verificationSuccess) {
    console.log('\n✅ VERIFICATION SUCCESS: Image successfully uploaded to Supabase');
    console.log('🏁 Image upload functionality is working correctly!');
  } else {
    console.log('\n❌ VERIFICATION FAILED: Image not properly uploaded to Supabase');
  }
}

// Run the test
runTest().catch(error => {
  console.error('💥 Unhandled error during test:', error);
});