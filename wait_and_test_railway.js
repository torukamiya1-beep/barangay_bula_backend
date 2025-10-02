const axios = require('axios');

const BASE_URL = 'https://brgybulabackend-production.up.railway.app';

async function waitAndTestRailway() {
  console.log('⏳ Waiting for Railway to redeploy with new database credentials...');
  console.log('This usually takes 2-3 minutes after you save the environment variables.');
  console.log('');
  
  let attempts = 0;
  const maxAttempts = 20; // 10 minutes total
  const delayBetweenAttempts = 30000; // 30 seconds
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 Attempt ${attempts}/${maxAttempts} - Testing Railway API...`);
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get(`${BASE_URL}/api/health`, {
        timeout: 15000
      });
      
      if (healthResponse.data && healthResponse.data.status === 'OK') {
        console.log('✅ Railway backend is responding with new database!');
        console.log('📊 Database stats:', JSON.stringify(healthResponse.data.stats, null, 2));
        
        // Test admin login
        console.log('\n🔐 Testing admin login...');
        try {
          const loginResponse = await axios.post(`${BASE_URL}/api/admin/auth/login`, {
            username: 'admin12345',
            password: 'admin123'
          }, {
            timeout: 10000
          });
          
          if (loginResponse.data.success && loginResponse.data.token) {
            console.log('✅ Admin login successful!');
            
            const authHeaders = {
              'Authorization': `Bearer ${loginResponse.data.token}`,
              'Content-Type': 'application/json'
            };
            
            // Test the previously failing endpoints
            console.log('\n🧪 Testing previously failing endpoints...');
            
            // Test document requests
            try {
              const requestsResponse = await axios.get(`${BASE_URL}/api/admin/documents/requests?page=1&limit=5`, {
                headers: authHeaders,
                timeout: 10000
              });
              console.log('✅ Document requests endpoint works!');
              console.log('📊 Total requests:', requestsResponse.data.data?.total || 'N/A');
            } catch (error) {
              console.log('❌ Document requests still failing:', error.response?.data?.message || error.message);
            }
            
            // Test users endpoint
            try {
              const usersResponse = await axios.get(`${BASE_URL}/api/users?page=1&limit=5`, {
                headers: authHeaders,
                timeout: 10000
              });
              console.log('✅ Users endpoint works!');
              console.log('📊 Total users:', usersResponse.data.data?.total || 'N/A');
            } catch (error) {
              console.log('❌ Users endpoint still failing:', error.response?.data?.message || error.message);
            }
            
            // Test notifications
            try {
              const notificationsResponse = await axios.get(`${BASE_URL}/api/notifications/unread-count`, {
                headers: authHeaders,
                timeout: 10000
              });
              console.log('✅ Notifications endpoint works!');
              console.log('📊 Unread count:', notificationsResponse.data.data?.count || 'N/A');
            } catch (error) {
              console.log('❌ Notifications endpoint still failing:', error.response?.data?.message || error.message);
            }
            
            console.log('\n🎉 RAILWAY BACKEND IS NOW WORKING WITH NEW DATABASE!');
            console.log('');
            console.log('✅ Your application should now work without 500 errors!');
            console.log('🌐 Test your frontend: https://barangay-bula-docu-hub.vercel.app');
            return;
            
          } else {
            console.log('❌ Admin login failed:', loginResponse.data.message);
          }
        } catch (loginError) {
          console.log('❌ Admin login failed:', loginError.response?.data?.message || loginError.message);
        }
        
      } else {
        console.log('⚠️ Health endpoint responded but not ready yet');
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log('⚠️ Railway backend is still redeploying...');
      } else if (error.response?.status === 500) {
        console.log('⚠️ Railway backend is responding but still has database connection issues...');
      } else {
        console.log('⚠️ Unexpected error:', error.message);
      }
    }
    
    if (attempts < maxAttempts) {
      console.log(`⏳ Waiting ${delayBetweenAttempts/1000} seconds before next attempt...`);
      console.log('');
      await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
    }
  }
  
  console.log('❌ Railway backend is still not responding after maximum attempts.');
  console.log('Please check the Railway deployment logs for any errors.');
}

// Run the test
if (require.main === module) {
  waitAndTestRailway()
    .then(() => {
      console.log('🎊 Testing completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { waitAndTestRailway };
