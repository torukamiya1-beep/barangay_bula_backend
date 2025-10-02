const axios = require('axios');

const BASE_URL = 'https://brgybulabackend-production.up.railway.app';

async function testLiveRailwayBackend() {
  try {
    console.log('🧪 Testing live Railway backend...');
    console.log(`🌐 Backend URL: ${BASE_URL}`);
    console.log('');

    // Test 1: Health endpoint
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
      console.log('✅ Health endpoint works');
      console.log(`📊 Status: ${healthResponse.status}`);
      
      if (healthResponse.data) {
        console.log('📄 Health data:');
        console.log(`  Database status: ${healthResponse.data.database?.status || 'unknown'}`);
        console.log(`  Total clients: ${healthResponse.data.stats?.total_clients || 'unknown'}`);
        console.log(`  Admin count: ${healthResponse.data.stats?.admin_count || 'unknown'}`);
      }
    } catch (error) {
      console.log('❌ Health endpoint failed:', error.message);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
      }
    }

    // Test 2: Admin login
    console.log('\n2. Testing admin login...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/admin/auth/login`, {
        username: 'admin12345',
        password: 'admin123'
      }, { timeout: 10000 });

      if (loginResponse.status === 200 && loginResponse.data.success) {
        console.log('✅ Admin login successful');
        const token = loginResponse.data.data.token;
        
        // Test 3: Document requests endpoint (the main failing one)
        console.log('\n3. Testing document requests endpoint...');
        try {
          const requestsResponse = await axios.get(`${BASE_URL}/api/admin/documents/requests?page=1&limit=1`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000
          });

          if (requestsResponse.status === 200) {
            console.log('✅ Document requests endpoint works!');
            console.log(`📊 Found ${requestsResponse.data.data?.requests?.length || 0} requests`);
            console.log('🎉 THE MAIN ISSUE IS FIXED!');
          } else {
            console.log(`⚠️ Document requests unexpected status: ${requestsResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Document requests endpoint still failing:', error.message);
          if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 300)}...`);
          }
        }

        // Test 4: Other previously failing endpoints
        console.log('\n4. Testing other endpoints...');
        const endpoints = [
          { name: 'Users', url: '/api/users?page=1&limit=1' },
          { name: 'Archived Users', url: '/api/users/get-archived-users?page=1&limit=1' },
          { name: 'Notifications', url: '/api/notifications/unread-count' },
          { name: 'Dashboard Stats', url: '/api/admin/documents/dashboard/stats' }
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });

            if (response.status === 200) {
              console.log(`✅ ${endpoint.name}: Working`);
            } else {
              console.log(`⚠️ ${endpoint.name}: Status ${response.status}`);
            }
          } catch (error) {
            console.log(`❌ ${endpoint.name}: Failed (${error.response?.status || 'Network'})`);
            if (error.response?.data) {
              console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
            }
          }
        }
        
      } else {
        console.log('❌ Admin login failed - unexpected response');
        console.log('Response:', loginResponse.data);
      }
      
    } catch (error) {
      console.log('❌ Admin login failed:', error.message);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}...`);
      }
    }

    // Test 5: Check if backend is using new database
    console.log('\n5. Checking database connection...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
      
      if (healthResponse.data?.stats) {
        const stats = healthResponse.data.stats;
        console.log('📊 Current database stats:');
        console.log(`   Total clients: ${stats.total_clients}`);
        console.log(`   Admin count: ${stats.admin_count}`);
        console.log(`   Total requests: ${stats.total_requests}`);
        
        // These should match our imported data
        if (stats.total_clients === 10 && stats.admin_count === 3 && stats.total_requests === 6) {
          console.log('✅ Backend is using the NEW database (imported data matches)');
        } else {
          console.log('❌ Backend might still be using OLD database (stats don\'t match imported data)');
          console.log('   Expected: clients=10, admins=3, requests=6');
        }
      }
    } catch (error) {
      console.log('❌ Could not check database stats:', error.message);
    }

    console.log('\n🎉 Live backend testing completed!');
    
  } catch (error) {
    console.log('❌ Overall test failed:', error.message);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testLiveRailwayBackend()
    .then(() => {
      console.log('🎊 Live backend testing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Live backend testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testLiveRailwayBackend };
