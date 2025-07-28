// Test invitation creation to debug email sender issue
const fetch = require('node-fetch');

async function testInvitation() {
  console.log('=== TESTING INVITATION EMAIL SENDER ===\n');
  
  try {
    // Get session cookie first by hitting the main page
    const response = await fetch('http://127.0.0.1:5000/api/user-invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail due to auth, but we want to see the debug logs
      },
      body: JSON.stringify({
        email: 'testuser@example.com',
        firstName: 'Test',
        lastName: 'User',
        accessLevel: 'team_member'
      })
    });

    const result = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', result);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testInvitation();