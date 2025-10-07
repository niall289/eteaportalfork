async function testListConsultations() {
  try {
    // First login
    console.log('🔐 Logging in...');
    const loginResponse = await fetch('http://localhost:5002/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: 'your-auth-token-here' })
    });

    console.log('Login status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    // Now fetch consultations
    const response = await fetch('http://localhost:5002/api/consultations', {
      credentials: 'include' // Include cookies
    });

    console.log('📡 Response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Consultations list:', JSON.stringify(data, null, 2));
      console.log('📊 Total consultations:', data.length);

      // Check if our recent consultation is there
      const recent = data.find(c => c.id === 69);
      if (recent) {
        console.log('🎉 Found our test consultation:', recent);
      }
    } else {
      const text = await response.text();
      console.log('❌ Error:', text);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testListConsultations();