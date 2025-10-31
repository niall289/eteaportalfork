import fetch from 'node-fetch';

async function testNailSurgeryWebhook() {
    const testData = {
        name: "Test Patient",
        email: "test@example.com",
        phone: "07123456789",
        issue_category: "Nail Surgery Consultation",
        issue_specifics: "Test webhook submission",
        source: "nailsurgery",
        chatbotSource: "nailsurgery",
        preferred_clinic: "nailsurgery"
    };

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
        console.log('✅ Webhook Response:', data);
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testNailSurgeryWebhook();