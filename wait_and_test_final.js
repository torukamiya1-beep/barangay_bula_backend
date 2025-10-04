const axios = require('axios');

const BASE_URL = 'https://brgybulabackend-production.up.railway.app';

async function waitForDeployment() {
  console.log('⏳ Waiting for Railway deployment to complete...');
  console.log('🚀 Code has been pushed to GitHub, Railway should redeploy automatically');
  console.log('');

  let attempts = 0;
  const maxAttempts = 20; // Wait up to 10 minutes (30 seconds * 20)
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 Attempt ${attempts}/${maxAttempts} - Testing deployment...`);
    
    try {
      // Test health endpoint to see if deployment is complete
      const healthResponse = await axios.get(`${BASE_URL}/health`, { timeout: 10000 });
      
      if (healthResponse.status === 200) {
        console.log('✅ Backend is responding');
        
        // Test if the fixes are deployed by testing the users endpoint
        try {
          // Login first
          const loginResponse = await axios.post(`${BASE_URL}/api/admin/auth/login`, {
            username: 'admin12345',
            password: 'admin123'
          }, { timeout: 10000 });

          if (loginResponse.status === 200 && loginResponse.data.success) {
            const token = loginResponse.data.data.token;
            
            // Test users endpoint
            const usersResponse = await axios.get(`${BASE_URL}/api/users?page=1&limit=1`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            });

            if (usersResponse.status === 200) {
              console.log('🎉 DEPLOYMENT SUCCESSFUL! Users endpoint is now working!');
              return true;
            } else {
              console.log(`⚠️ Users endpoint returned status: ${usersResponse.status}`);
            }
          }
        } catch (apiError) {
          if (apiError.response?.status === 500) {
            console.log('⚠️ Still getting 500 errors - deployment may not be complete yet');
          } else {
            console.log(`⚠️ API test error: ${apiError.message}`);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Health check failed: ${error.message}`);
    }
    
    if (attempts < maxAttempts) {
      console.log('⏳ Waiting 30 seconds before next attempt...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  console.log('❌ Deployment check timed out');
  return false;
}

async function testAllEndpoints() {
  try {
    console.log('\n🧪 Testing all previously failing endpoints...');
    console.log('');

    // Login first
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

    // Test all endpoints
    const endpoints = [
      { name: 'Document Requests', url: '/api/admin/documents/requests?page=1&limit=1' },
      { name: 'Users Endpoint', url: '/api/users?page=1&limit=1' },
      { name: 'Archived Users', url: '/api/users/get-archived-users?page=1&limit=1' },
      { name: 'Notifications Unread Count', url: '/api/notifications/unread-count' },
      { name: 'Dashboard Stats', url: '/api/admin/documents/dashboard/stats' }
    ];

    console.log('\n2. Testing all endpoints...');
    let allWorking = true;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        });

        if (response.status === 200) {
          console.log(`✅ ${endpoint.name}: Working perfectly!`);
        } else {
          console.log(`⚠️ ${endpoint.name}: Unexpected status (${response.status})`);
          allWorking = false;
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Failed (${error.response?.status || 'Network Error'})`);
        if (error.response?.data) {
          console.log(`   Error: ${JSON.stringify(error.response.data).substring(0, 100)}...`);
        }
        allWorking = false;
      }
    }

    if (allWorking) {
      console.log('\n🎊 🎉 ALL ENDPOINTS ARE NOW WORKING! 🎉 🎊');
      console.log('');
      console.log('✅ Your Railway backend is fully functional!');
      console.log('✅ All 500 errors have been resolved!');
      console.log('✅ Frontend should now work perfectly!');
      console.log('');
      console.log('🌐 Test your application:');
      console.log('   Frontend: https://barangay-bula-docu-hub.vercel.app');
      console.log('   Backend:  https://brgybulabackend-production.up.railway.app');
      return true;
    } else {
      console.log('\n⚠️ Some endpoints are still having issues');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Overall endpoint testing failed:', error.message);
    return false;
  }
}

// Run the complete test
if (require.main === module) {
  waitForDeployment()
    .then((deploymentSuccess) => {
      if (deploymentSuccess) {
        return testAllEndpoints();
      } else {
        console.log('\n⚠️ Deployment check timed out, but let\'s test anyway...');
        return testAllEndpoints();
      }
    })
    .then((allSuccess) => {
      if (allSuccess) {
        console.log('\n🎊 SUCCESS! All issues have been resolved! 🎊');
        process.exit(0);
      } else {
        console.log('\n💥 Some issues remain');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { waitForDeployment, testAllEndpoints };
