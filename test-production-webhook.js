
const testProductionWebhook = async () => {
  const webhookUrl = 'https://footcareclinicadmin.engageiobots.com/api/webhook/consultation';
  
  console.log('🧪 Testing PRODUCTION webhook:', webhookUrl);
  
  const testData = {
    name: 'Production Test User',
    email: 'production.test@footcare.com',
    phone: '555-0199',
    issueCategory: 'Real Production Test',
    preferredClinic: 'Donnycarney',
    symptomDescription: 'Testing production webhook',
    createdAt: new Date().toISOString()
  };
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('✅ Production Response Status:', response.status);
    const result = await response.json();
    console.log('✅ Production Response:', result);
    
    if (response.status === 200) {
      console.log('🎉 PRODUCTION WEBHOOK WORKS! Check your deployed portal now.');
    } else {
      console.log('❌ Production webhook failed:', result);
    }
  } catch (error) {
    console.error('❌ Production Error:', error.message);
  }
};

testProductionWebhook();
