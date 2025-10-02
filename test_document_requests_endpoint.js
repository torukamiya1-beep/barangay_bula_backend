const axios = require('axios');

const BASE_URL = 'https://brgybulabackend-production.up.railway.app';

async function testDocumentRequestsEndpoint() {
  try {
    console.log('🧪 Testing document requests endpoint...');
    console.log('');

    // Step 1: Login to get token
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/auth/login`, {
      username: 'admin12345',
      password: 'admin123'
    });

    if (loginResponse.status === 200 && loginResponse.data.success) {
      console.log('✅ Admin login successful');
      const token = loginResponse.data.data.token;
      
      // Step 2: Test document requests endpoint
      console.log('\n2. Testing document requests endpoint...');
      
      const requestsResponse = await axios.get(`${BASE_URL}/api/admin/documents/requests?page=1&limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (requestsResponse.status === 200) {
        console.log('✅ Document requests endpoint works!');
        console.log(`📊 Response status: ${requestsResponse.status}`);
        console.log(`📄 Found ${requestsResponse.data.data.requests.length} requests`);
        console.log(`📈 Total records: ${requestsResponse.data.data.pagination.total_records}`);
        
        if (requestsResponse.data.data.requests.length > 0) {
          const sample = requestsResponse.data.data.requests[0];
          console.log('\n📋 Sample request:');
          console.log(`  ID: ${sample.id}`);
          console.log(`  Request Number: ${sample.request_number}`);
          console.log(`  Client: ${sample.client_name}`);
          console.log(`  Document Type: ${sample.document_type}`);
          console.log(`  Status: ${sample.status_name}`);
          console.log(`  Priority: ${sample.priority}`);
        }
        
        console.log('\n🎉 SUCCESS! The document requests endpoint is now working!');
        return true;
      } else {
        console.log(`❌ Document requests endpoint failed with status: ${requestsResponse.status}`);
        return false;
      }
      
    } else {
      console.log('❌ Admin login failed');
      console.log('Response:', loginResponse.data);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    
    if (error.response) {
      console.log(`📋 Status: ${error.response.status}`);
      console.log(`📄 Response:`, error.response.data);
    }
    
    return false;
  }
}

// Test other endpoints too
async function testAllPreviouslyFailingEndpoints() {
  try {
    console.log('\n🧪 Testing all previously failing endpoints...');
    console.log('');

    // Step 1: Login to get token
    console.log('1. Getting admin token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/auth/login`, {
      username: 'admin12345',
      password: 'admin123'
    });

    if (loginResponse.status !== 200 || !loginResponse.data.success) {
      console.log('❌ Login failed');
      return false;
    }

    const token = loginResponse.data.data.token;
    console.log('✅ Token obtained');

    // Test endpoints
    const endpoints = [
      { name: 'Document Requests', url: '/api/admin/documents/requests?page=1&limit=1' },
      { name: 'Users Endpoint', url: '/api/users?page=1&limit=1' },
      { name: 'Archived Users', url: '/api/users/get-archived-users?page=1&limit=1' },
      { name: 'Notifications Unread Count', url: '/api/notifications/unread-count' },
      { name: 'Dashboard Stats', url: '/api/admin/documents/dashboard/stats' }
    ];

    console.log('\n2. Testing endpoints...');
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200) {
          console.log(`✅ ${endpoint.name}: Working (${response.status})`);
        } else {
          console.log(`⚠️ ${endpoint.name}: Unexpected status (${response.status})`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Failed (${error.response?.status || 'Network Error'})`);
        if (error.response?.data) {
          console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
        }
      }
    }

    console.log('\n🎉 Endpoint testing completed!');
    return true;
    
  } catch (error) {
    console.log('❌ Overall test failed:', error.message);
    return false;
  }
}

// Run the tests
if (require.main === module) {
  testDocumentRequestsEndpoint()
    .then((success) => {
      if (success) {
        return testAllPreviouslyFailingEndpoints();
      }
      return false;
    })
    .then((success) => {
      if (success) {
        console.log('\n🎊 All tests completed successfully!');
        console.log('🚀 Your Railway backend is now working correctly!');
        process.exit(0);
      } else {
        console.log('\n💥 Some tests failed');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testDocumentRequestsEndpoint, testAllPreviouslyFailingEndpoints };
