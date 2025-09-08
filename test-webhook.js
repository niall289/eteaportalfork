
const testData = {
  name: "John Doe",
  email: "john@example.com", 
  phone: "123-456-7890",
  preferredClinic: "Main Clinic",
  issueCategory: "Heel Pain",
  symptomDescription: "Sharp pain when walking",
  previousTreatment: "None",
  hasImage: "No",
  createdAt: new Date().toISOString()
};

fetch('https://footcareclinicadmin.engageiobots.com/api/webhook/consultation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => console.log('✅ Webhook Response:', data))
.catch(error => console.error('❌ Error:', error));
