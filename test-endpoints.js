const https = require('https');

const baseUrl = 'https://brgybulabackend-production.up.railway.app/api';

// Function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testEndpoints() {
  try {
    console.log('🔍 Testing Backend Endpoints...\n');
    
    // 1. Login to get token
    console.log('1. Testing login...');
    const loginResponse = await makeRequest(`${baseUrl}/auth/unified/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    if (loginResponse.status !== 200 || !loginResponse.data.success) {
      console.log('   ❌ Login failed:', loginResponse.data);
      return;
    }
    
    const token = loginResponse.data.data.token;
    console.log('   ✅ Login successful');
    
    // 2. Test the endpoints that were failing
    const endpoints = [
      { name: 'Document Requests', url: `${baseUrl}/admin/documents/requests?page=1&limit=10` },
      { name: 'Notifications', url: `${baseUrl}/notifications?page=1&limit=10` },
      { name: 'Users', url: `${baseUrl}/users?page=1&limit=50` },
      { name: 'Archived Users', url: `${baseUrl}/users/get-archived-users?page=1&limit=100` },
      { name: 'Analytics', url: `${baseUrl}/admin/documents/analytics?period=month` },
      { name: 'Activity Logs', url: `${baseUrl}/admin/activity-logs/comprehensive?page=1&limit=100` }
    ];
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    for (const endpoint of endpoints) {
      console.log(`2. Testing ${endpoint.name}...`);
      try {
        const response = await makeRequest(endpoint.url, { method: 'GET', headers });
        
        if (response.status === 200) {
          console.log(`   ✅ ${endpoint.name} - SUCCESS (${response.status})`);
        } else {
          console.log(`   ❌ ${endpoint.name} - FAILED (${response.status}):`, response.data);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint.name} - ERROR:`, error.message);
      }
    }
    
    console.log('\n🎉 Testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testEndpoints();
