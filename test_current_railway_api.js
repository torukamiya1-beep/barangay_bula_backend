const axios = require('axios');

const BASE_URL = 'https://brgybulabackend-production.up.railway.app';

async function testCurrentRailwayAPI() {
  try {
    console.log('🧪 Testing current Railway API endpoints...');
    console.log('Base URL:', BASE_URL);
    console.log('');

    // Test 1: Health endpoint
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`, {
        timeout: 10000
      });
      console.log('✅ Health check response:', JSON.stringify(healthResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Health check failed:', error.response?.status, error.response?.data || error.message);
    }

    // Test 2: Admin login to get token
    console.log('\n2. Testing admin login...');
    let authToken = null;
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/admin/auth/login`, {
        username: 'admin12345',
        password: 'admin123'
      }, {
        timeout: 10000
      });
      
      if (loginResponse.data.success && loginResponse.data.token) {
        authToken = loginResponse.data.token;
        console.log('✅ Admin login successful, token obtained');
      } else {
        console.log('❌ Admin login failed:', loginResponse.data);
      }
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.status, error.response?.data || error.message);
    }

    if (!authToken) {
      console.log('⚠️ Cannot test protected endpoints without authentication token');
      return;
    }

    const authHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Test 3: Dashboard stats (was working)
    console.log('\n3. Testing dashboard stats...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/admin/documents/dashboard/stats`, {
        headers: authHeaders,
        timeout: 10000
      });
      console.log('✅ Dashboard stats works:', statsResponse.data.success);
    } catch (error) {
      console.log('❌ Dashboard stats failed:', error.response?.status, error.response?.data || error.message);
    }

    // Test 4: Document requests (was failing)
    console.log('\n4. Testing document requests...');
    try {
      const requestsResponse = await axios.get(`${BASE_URL}/api/admin/documents/requests?page=1&limit=10`, {
        headers: authHeaders,
        timeout: 10000
      });
      console.log('✅ Document requests works:', requestsResponse.data.success);
      console.log('📊 Total requests:', requestsResponse.data.data?.total || 'N/A');
    } catch (error) {
      console.log('❌ Document requests failed:', error.response?.status, error.response?.data || error.message);
      console.log('📋 Error details:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test 5: Users endpoint (was failing)
    console.log('\n5. Testing users endpoint...');
    try {
      const usersResponse = await axios.get(`${BASE_URL}/api/users?page=1&limit=10`, {
        headers: authHeaders,
        timeout: 10000
      });
      console.log('✅ Users endpoint works:', usersResponse.data.success);
      console.log('📊 Total users:', usersResponse.data.data?.total || 'N/A');
    } catch (error) {
      console.log('❌ Users endpoint failed:', error.response?.status, error.response?.data || error.message);
      console.log('📋 Error details:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test 6: Archived users endpoint (was failing)
    console.log('\n6. Testing archived users endpoint...');
    try {
      const archivedResponse = await axios.get(`${BASE_URL}/api/users/get-archived-users?page=1&limit=10`, {
        headers: authHeaders,
        timeout: 10000
      });
      console.log('✅ Archived users endpoint works:', archivedResponse.data.success);
      console.log('📊 Total archived users:', archivedResponse.data.data?.total || 'N/A');
    } catch (error) {
      console.log('❌ Archived users endpoint failed:', error.response?.status, error.response?.data || error.message);
      console.log('📋 Error details:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test 7: Notifications unread count (was failing)
    console.log('\n7. Testing notifications unread count...');
    try {
      const notificationsResponse = await axios.get(`${BASE_URL}/api/notifications/unread-count`, {
        headers: authHeaders,
        timeout: 10000
      });
      console.log('✅ Notifications unread count works:', notificationsResponse.data.success);
      console.log('📊 Unread count:', notificationsResponse.data.data?.count || 'N/A');
    } catch (error) {
      console.log('❌ Notifications unread count failed:', error.response?.status, error.response?.data || error.message);
      console.log('📋 Error details:', JSON.stringify(error.response?.data, null, 2));
    }

    console.log('\n🎉 API endpoint testing completed!');
    
  } catch (error) {
    console.error('💥 API testing failed:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testCurrentRailwayAPI()
    .then(() => {
      console.log('🎊 API testing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 API testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testCurrentRailwayAPI };
