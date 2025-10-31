// Test with minimal data to prove middleware works
const testData = {
  name: "Final Test Patient",
  email: "final@test.com",
  phone: "07777777777",
  issue_category: "Test Issue",
  // Deliberately omit all clinic identifiers to prove middleware adds them
};

fetch('https://eteaportal.engageiobots.com/api/webhooks/nailsurgery', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Secret': 'nailsurgery_secret_2025'
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => {
  console.log('Webhook Response:', data);
  
  // Wait 2 seconds then check if it appears in the nail surgery group
  return new Promise(resolve => setTimeout(resolve, 2000))
    .then(() => fetch('https://eteaportal.engageiobots.com/api/consultations?clinic_group=The%20Nail%20Surgery%20Clinic'));
})
.then(response => response.json())
.then(data => {
  console.log('Recent Nail Surgery consultations:', data);
  // Look for our test patient
  const found = data.find(c => c.email === 'final@test.com');
  if (found) {
    console.log('✅ Test successful! Consultation appeared in Nail Surgery group');
  } else {
    console.log('❌ Test failed - consultation not found in Nail Surgery group');
  }
})
.catch(error => console.error('Error:', error));