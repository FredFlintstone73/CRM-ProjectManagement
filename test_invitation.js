// Test script to check if invitation codes work in deployed environment
import https from 'https';

function testInvitationCode(code) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'crm-project-management.replit.app',
      port: 443,
      path: `/api/user-invitations/${code}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n=== Testing code: ${code} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data}`);
        resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
      });
    });

    req.on('error', (error) => {
      console.error(`Error testing ${code}:`, error);
      reject(error);
    });

    req.end();
  });
}

async function testAllCodes() {
  const codes = [
    'alex2025invite',
    'devyn2025invite', 
    'megan2025invite',
    'taylor2025invite',
    'mike2025invite'
  ];

  console.log('Testing invitation codes in deployed environment...');
  
  for (const code of codes) {
    try {
      await testInvitationCode(code);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between requests
    } catch (error) {
      console.error(`Failed to test ${code}:`, error.message);
    }
  }
}

testAllCodes();