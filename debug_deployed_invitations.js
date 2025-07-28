import https from 'https';

// Test invitation lookup without authentication 
function testInvitationLookup(code) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'crm-project-management.replit.app',
      port: 443,
      path: `/api/user-invitations/${code}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n=== Code: ${code} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Headers:`, res.headers);
        console.log(`Response:`, data);
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      console.error(`Error testing ${code}:`, error);
      reject(error);
    });

    req.end();
  });
}

// Test the accept invitation page directly
function testAcceptPage(code) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'crm-project-management.replit.app',
      port: 443,
      path: `/accept-invitation?code=${code}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n=== Accept Page Test: ${code} ===`);
        console.log(`Status: ${res.statusCode}`);
        console.log(`Content Type: ${res.headers['content-type']}`);
        console.log(`Response Length: ${data.length}`);
        resolve({ statusCode: res.statusCode, contentType: res.headers['content-type'] });
      });
    });

    req.on('error', (error) => {
      console.error(`Error testing accept page for ${code}:`, error);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  console.log('=== DEBUGGING DEPLOYED INVITATION SYSTEM ===');
  
  const testCodes = ['ALEX2025', 'test123', 'invalid'];
  
  for (const code of testCodes) {
    try {
      await testInvitationLookup(code);
      await testAcceptPage(code);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed test for ${code}:`, error.message);
    }
  }
}

runTests();