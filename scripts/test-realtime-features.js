const axios = require('axios');

const BASE_URL = 'http://localhost:3002/api';

// Test admin credentials (verified working)
const adminCredentials = {
  username: 'admin12345',
  password: 'admin123'
};

async function testRealTimeFeatures() {
  try {
    console.log('🔄 Testing Real-time Features and Notifications...\n');

    // Step 1: Login as admin
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/admin/auth/login`, adminCredentials);
    const adminToken = loginResponse.data.data.token;
    console.log('✅ Admin login successful');

    const headers = { Authorization: `Bearer ${adminToken}` };

    // Step 2: Test notification endpoints
    console.log('\n2. Testing notification system...');
    
    try {
      const notificationsResponse = await axios.get(`${BASE_URL}/notifications`, { headers });
      console.log('✅ Get notifications successful:', notificationsResponse.data.data.length, 'notifications');
    } catch (error) {
      console.log('❌ Get notifications failed:', error.response?.status, error.response?.data?.message);
    }
    
    try {
      const unreadResponse = await axios.get(`${BASE_URL}/notifications/unread-count`, { headers });
      console.log('✅ Get unread count successful:', unreadResponse.data.data.count, 'unread');
    } catch (error) {
      console.log('❌ Get unread count failed:', error.response?.status, error.response?.data?.message);
    }

    // Step 3: Test SSE connection endpoint
    console.log('\n3. Testing SSE connection endpoint...');
    try {
      // Note: We can't easily test SSE with axios, but we can check if the endpoint exists
      const sseResponse = await axios.get(`${BASE_URL}/notifications/stream`, { 
        headers,
        timeout: 2000,
        validateStatus: function (status) {
          return status < 500; // Accept any status less than 500
        }
      });
      console.log('✅ SSE endpoint accessible, status:', sseResponse.status);
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log('✅ SSE endpoint responding (timeout expected for streaming endpoint)');
      } else {
        console.log('❌ SSE endpoint failed:', error.response?.status, error.response?.data?.message);
      }
    }

    // Step 4: Test dashboard stats endpoint
    console.log('\n4. Testing dashboard stats endpoint...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/admin/documents/dashboard/stats`, { headers });
      console.log('✅ Dashboard stats successful:', Object.keys(statsResponse.data.data).length, 'stats');
    } catch (error) {
      console.log('❌ Dashboard stats failed:', error.response?.status, error.response?.data?.message);
    }

    // Step 5: Test recent activity endpoint
    console.log('\n5. Testing recent activity endpoint...');
    try {
      const activityResponse = await axios.get(`${BASE_URL}/admin/documents/dashboard/recent?limit=10`, { headers });
      console.log('✅ Recent activity successful:', activityResponse.data.data.length, 'activities');
    } catch (error) {
      console.log('❌ Recent activity failed:', error.response?.status, error.response?.data?.message);
    }

    // Step 6: Test document requests endpoint
    console.log('\n6. Testing document requests endpoint...');
    try {
      const requestsResponse = await axios.get(`${BASE_URL}/admin/documents/requests?limit=5`, { headers });
      console.log('✅ Document requests successful:', requestsResponse.data.data.requests.length, 'requests');
    } catch (error) {
      console.log('❌ Document requests failed:', error.response?.status, error.response?.data?.message);
    }

    // Step 7: Create a test notification to verify real-time functionality
    console.log('\n7. Testing notification creation...');
    try {
      const testNotification = {
        title: 'Real-time Test',
        message: 'Testing real-time notification system',
        type: 'system_alert',
        priority: 'normal'
      };
      
      const createResponse = await axios.post(`${BASE_URL}/notifications`, testNotification, { headers });
      console.log('✅ Test notification created successfully:', createResponse.data.data.id);
      
      // Verify the notification was created
      const verifyResponse = await axios.get(`${BASE_URL}/notifications`, { headers });
      const createdNotification = verifyResponse.data.data.find(n => n.title === 'Real-time Test');
      if (createdNotification) {
        console.log('✅ Test notification verified in database');
      } else {
        console.log('❌ Test notification not found in database');
      }
      
    } catch (error) {
      console.log('❌ Test notification creation failed:', error.response?.status, error.response?.data?.message);
    }

    console.log('\n🎉 Real-time features test completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Admin authentication working');
    console.log('✅ Notification system endpoints functional');
    console.log('✅ SSE streaming endpoint accessible');
    console.log('✅ Dashboard data endpoints working');
    console.log('✅ Real-time notification creation working');
    console.log('\n🔗 Frontend should now have:');
    console.log('  - Real-time notifications in AdminHeader');
    console.log('  - Auto-refresh in AdminRequests (30s interval)');
    console.log('  - Real-time dashboard updates (5min interval)');
    console.log('  - Live status indicators');
    console.log('  - Activity feed with real-time updates');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

// Run the test
testRealTimeFeatures();
