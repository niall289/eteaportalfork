#!/usr/bin/env node

/**
 * Schema Comparison: Expected vs Actual
 * Compares what the nail surgery chatbot expects vs what the portal provides
 */

// Expected fields that nail surgery chatbot sends
const expectedNailSurgeryFields = {
  // Required core fields
  name: { type: 'text', required: true, description: 'Patient name' },
  email: { type: 'text', required: true, description: 'Patient email' },
  phone: { type: 'text', required: false, description: 'Patient phone' },
  
  // Consultation details
  issue_category: { type: 'text', required: false, description: 'Type of nail issue' },
  issue_specifics: { type: 'text', required: false, description: 'Specific details' },
  symptom_description: { type: 'text', required: false, description: 'Patient symptoms' },
  previous_treatment: { type: 'text', required: false, description: 'Prior treatments' },
  
  // Medical assessment
  pain_severity: { type: 'text', required: false, description: 'Pain level 1-10' },
  pain_duration: { type: 'text', required: false, description: 'How long pain exists' },
  
  // Images
  has_image: { type: 'text', required: false, description: 'Boolean as string' },
  image_analysis: { type: 'text', required: false, description: 'AI analysis of image' },
  
  // Clinic metadata (NEW - should be preserved)
  source: { type: 'text', required: false, description: 'Data source identifier', default: 'nail_surgery_clinic' },
  clinic_group: { type: 'text', required: false, description: 'Clinic organization', default: 'The Nail Surgery Clinic' },
  clinic_domain: { type: 'text', required: false, description: 'Origin domain' },
  clinic_source: { type: 'text', required: false, description: 'Acquisition source' },
  preferred_clinic: { type: 'text', required: false, description: 'Patient clinic preference', default: null },
  
  // Booking
  calendar_booking: { type: 'text', required: false, description: 'Booking details' },
  booking_confirmation: { type: 'text', required: false, description: 'Confirmation info' },
  
  // Survey
  emoji_survey: { type: 'text', required: false, description: 'Satisfaction rating' },
  survey_response: { type: 'text', required: false, description: 'Survey feedback' },
  
  // Metadata
  conversation_log: { type: 'jsonb', required: false, description: 'Chat history' },
  completed_steps: { type: 'jsonb', required: false, description: 'Workflow progress' },
  raw_json: { type: 'jsonb', required: false, description: 'Original payload' }
};

console.log('📋 NAIL SURGERY CHATBOT → PORTAL SCHEMA REQUIREMENTS');
console.log('=====================================================\n');

console.log('🎯 Critical Fields for Nail Surgery Integration:');
console.log('-----------------------------------------------');

Object.entries(expectedNailSurgeryFields).forEach(([field, config]) => {
  const req = config.required ? '[REQUIRED]' : '[OPTIONAL]';
  const def = config.default !== undefined ? ` (default: ${config.default})` : '';
  console.log(`  ${field.padEnd(25)} ${config.type.padEnd(10)} ${req}${def}`);
  console.log(`    → ${config.description}`);
});

console.log('\n🔥 NEW FIELDS ADDED FOR WEBHOOK CONSISTENCY:');
console.log('--------------------------------------------');
const newFields = ['source', 'clinic_group', 'clinic_domain', 'clinic_source'];
newFields.forEach(field => {
  const config = expectedNailSurgeryFields[field];
  console.log(`  ✅ ${field.padEnd(20)} - ${config.description}`);
  if (config.default !== undefined) {
    console.log(`     Default: ${config.default}`);
  }
});

console.log('\n📝 PORTAL WEBHOOK ENDPOINT BEHAVIOR:');
console.log('-----------------------------------');
console.log('  Route: POST /api/webhooks/nailsurgery');
console.log('  Auth: X-Webhook-Secret header required');
console.log('  Format: multipart/form-data with "data" field containing JSON');
console.log('  Normalization:');
console.log('    - source: defaults to "nail_surgery_clinic"');
console.log('    - clinic_group: defaults to "The Nail Surgery Clinic"');
console.log('    - preferred_clinic: preserves provided value or null');
console.log('    - clinic_domain/clinic_source: passed through if provided');
console.log('  Response: {"success": true, "id": "<consultation_id>"}');

console.log('\n🧪 TO VERIFY COMPATIBILITY:');
console.log('---------------------------');
console.log('1. Run: $env:DATABASE_URL="..."; node check-schema.mjs');
console.log('2. Run: node test-schema-compatibility.mjs');
console.log('3. Check server logs for any field mapping issues');
console.log('4. Have nail surgery chatbot send test webhook');

console.log('\n✅ EXPECTED OUTCOME:');
console.log('-------------------');
console.log('• All fields accepted without 500 errors');
console.log('• Data normalized with proper defaults');
console.log('• Consultation record created successfully');
console.log('• No schema mismatch warnings in logs');