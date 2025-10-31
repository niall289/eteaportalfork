import fetch from 'node-fetch';

// Test with minimal data to prove middleware works
const testData = {
  name: "Final Test Patient",
  email: "final@test.com",
  phone: "07777777777",
  issue_category: "Test Issue",
  // Deliberately omit all clinic identifiers to prove middleware adds them
};

const test = async () => {
  try {
    const response = await fetch('https://eteaportal.engageiobots.com/api/webhooks/nailsurgery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': 'nailsurgery_secret_2025'
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    console.log('Webhook Response:', data);
    
    // Wait 2 seconds then check if it appears in the nail surgery group
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const checkResponse = await fetch('https://eteaportal.engageiobots.com/api/consultations?clinic_group=The%20Nail%20Surgery%20Clinic');
    const consultations = await checkResponse.json();
    
    console.log('Recent Nail Surgery consultations:', consultations);
    // Look for our test patient
    const found = consultations.find(c => c.email === 'final@test.com');
    if (found) {
      console.log('✅ Test successful! Consultation appeared in Nail Surgery group');
    } else {
      console.log('❌ Test failed - consultation not found in Nail Surgery group');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

test();