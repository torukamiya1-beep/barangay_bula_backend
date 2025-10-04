const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = 'https://brgybulabackend-production.up.railway.app';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testWithAuthentication() {
  console.log('🚀 TESTING RAILWAY DEPLOYMENT WITH AUTHENTICATION');
  console.log('='.repeat(60));
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('='.repeat(60));

  try {
    // Step 1: Login to get token
    console.log('\n🔐 Step 1: Attempting admin login...');
    const loginResponse = await makeRequest(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      body: {
        username: 'admin12345',
        password: 'admin123'
      }
    });

    console.log(`Login Status: ${loginResponse.statusCode}`);
    
    if (loginResponse.statusCode !== 200) {
      console.log('❌ Login failed:', loginResponse.data);
      return;
    }

    if (!loginResponse.data.token) {
      console.log('❌ No token in login response:', loginResponse.data);
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // Step 2: Test protected endpoints with authentication
    console.log('\n🧪 Step 2: Testing protected endpoints with authentication...');
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`
    };

    const endpoints = [
      { name: 'Document Requests', path: '/api/admin/documents/requests?page=1&limit=5' },
      { name: 'Notifications Unread Count', path: '/api/notifications/unread-count' },
      { name: 'Users List', path: '/api/users?page=1&limit=5' },
      { name: 'Archived Users', path: '/api/users/get-archived-users?page=1&limit=5' }
    ];

    let allPassed = true;

    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Testing: ${endpoint.name}`);
        console.log(`   GET ${endpoint.path}`);
        
        const response = await makeRequest(`${BASE_URL}${endpoint.path}`, {
          method: 'GET',
          headers: authHeaders
        });

        console.log(`   Status: ${response.statusCode}`);
        
        if (response.statusCode === 200) {
          console.log('   ✅ SUCCESS - Endpoint working correctly');
          
          // Show sample data
          if (response.data && typeof response.data === 'object') {
            if (response.data.data) {
              console.log(`   📊 Data count: ${Array.isArray(response.data.data) ? response.data.data.length : 'N/A'}`);
            } else if (response.data.count !== undefined) {
              console.log(`   📊 Count: ${response.data.count}`);
            }
          }
        } else if (response.statusCode === 500) {
          console.log('   🚨 CRITICAL: Still getting 500 error!');
          console.log(`   📄 Error: ${JSON.stringify(response.data)}`);
          allPassed = false;
        } else {
          console.log(`   ⚠️  Unexpected status: ${response.statusCode}`);
          console.log(`   📄 Response: ${JSON.stringify(response.data)}`);
          allPassed = false;
        }
        
      } catch (error) {
        console.log(`   ❌ Request failed: ${error.message}`);
        allPassed = false;
      }
    }

    // Step 3: Summary
    console.log('\n📊 FINAL RESULTS:');
    console.log('='.repeat(60));
    
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED!');
      console.log('✅ Authentication working correctly');
      console.log('✅ All endpoints returning 200 with valid tokens');
      console.log('✅ No 500 errors detected');
      console.log('\n💡 CONCLUSION: Your system is working correctly!');
      console.log('💡 The 401 errors you saw earlier are EXPECTED for protected endpoints without authentication.');
    } else {
      console.log('❌ Some tests failed - there may still be issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testWithAuthentication().catch(console.error);
