
const testCompleteConsultation = async () => {
  const webhookUrl = 'https://footcareclinicadmin.engageiobots.com/api/webhook/consultation';
  
  console.log('🧪 Testing COMPLETE consultation payload with all fields');
  
  const completeTestData = {
    // Basic patient info
    name: 'Complete Test Patient',
    email: 'complete.test@footcare.com',
    phone: '555-0123',
    preferred_clinic: 'Donnycarney',
    issue_category: 'Heel Pain',
    
    // HIGH Priority Medical Fields
    symptom_description: 'Sharp, stabbing pain in the heel when taking first steps in the morning. Pain subsides after walking for a few minutes but returns after sitting for extended periods.',
    previous_treatment: 'Tried over-the-counter pain medication (ibuprofen) and heel pads. Previously saw a physiotherapist 6 months ago.',
    issue_specifics: 'Pain is specifically located on the bottom of the heel, worse on the right foot. Started approximately 3 months ago.',
    image_analysis: 'AI analysis shows possible plantar fasciitis indicators. Heel area appears slightly inflamed. Recommend clinical examination.',
    
    // MEDIUM Priority Fields
    calendar_booking: 'Patient requested appointment for next Tuesday at 2:00 PM with Dr. Smith',
    emoji_survey: '😊 Very satisfied with chatbot experience',
    survey_response: 'The chatbot was very helpful and asked all the right questions. Easy to use.',
    additional_help: 'Patient also asked about preventive exercises and proper footwear recommendations',
    
    // LOW Priority Fields
    final_question: 'Will insurance cover the consultation? How long is the typical appointment?',
    booking_confirmation: 'Appointment confirmed for Tuesday, January 16th at 2:00 PM',
    
    // System fields
    has_image: 'Yes',
    image_path: '/uploads/heel-pain-photo-123.jpg',
    createdAt: new Date().toISOString(),
    
    // Additional variants to test field mapping
    issueSpecifics: 'Testing camelCase variant',
    symptomDescription: 'Testing camelCase variant',
    previousTreatment: 'Testing camelCase variant',
    imageAnalysis: 'Testing camelCase variant',
    calendarBooking: 'Testing camelCase variant',
    emojiSurvey: 'Testing camelCase variant',
    surveyResponse: 'Testing camelCase variant',
    additionalHelp: 'Testing camelCase variant',
    finalQuestion: 'Testing camelCase variant'
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(completeTestData)
    });
    
    console.log('✅ Response Status:', response.status);
    const result = await response.json();
    console.log('✅ Webhook Response:', result);
    
    if (response.status === 200) {
      console.log('🎉 COMPLETE CONSULTATION TEST SUCCESSFUL!');
      console.log('📊 Consultation ID:', result.consultationId);
      console.log('👤 Patient ID:', result.patientId);
      console.log('📋 Assessment ID:', result.assessmentId);
      
      // Test the debug endpoint
      console.log('\n🔍 Testing debug endpoint...');
      const debugResponse = await fetch('https://footcareclinicadmin.engageiobots.com/api/debug/recent-webhook');
      const debugData = await debugResponse.json();
      console.log('📊 Debug data:', debugData);
      
    } else {
      console.log('❌ Complete consultation test failed:', result);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testCompleteConsultation();
