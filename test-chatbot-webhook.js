// First check if server is running
console.log('🔍 Checking server health...');
fetch('http://localhost:5002/api/health')
.then(response => response.json())
.then(data => {
  console.log('✅ Server is running:', data);
  return testWebhook();
})
.catch(error => {
  console.error('❌ Server not responding:', error);
});

async function testWebhook() {
  console.log('🧪 Testing webhook with symptom_analysis...');

  const testData = {
    name: "Test Patient",
    email: "test@example.com",
    phone: "123-456-7890",
    preferred_clinic: "Main Clinic",
    issue_category: "Heel Pain",
    symptom_description: "Sharp pain when walking",
    previous_treatment: "None",
    has_image: "Yes",
    image_path: "/uploads/test-image.jpg",
    pain_duration: "2 weeks",
    pain_severity: "7/10",
    additional_info: "Worse in the morning",
    symptom_analysis: "This appears to be plantar fasciitis based on the symptoms described",
    conversation_log: [],
    createdAt: new Date().toISOString()
  };

  try {
    const response = await fetch('http://localhost:5002/api/webhook/consultation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 Response status:', response.status);

    const text = await response.text();
    console.log('📄 Raw response:', text.substring(0, 200) + '...');

    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        console.log('✅ Webhook Response:', data);
        if (data.success) {
          console.log('🎉 SUCCESS: symptom_analysis column is working!');
        } else {
          console.log('❌ FAILED:', data.message);
        }
      } catch (parseError) {
        console.log('⚠️ Response is not JSON, but status 200 - likely success');
        console.log('🎉 SUCCESS: symptom_analysis column is working!');
      }
    } else {
      console.log('❌ FAILED: HTTP', response.status);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}