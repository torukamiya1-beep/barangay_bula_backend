const axios = require('axios');

async function testServerStatus() {
  try {
    console.log('🔍 Testing server status...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:7000/health', {
      timeout: 5000
    });
    
    console.log('✅ Server is running!');
    console.log('Health check response:', healthResponse.data);
    
    // Test basic API endpoint
    try {
      const apiResponse = await axios.get('http://localhost:7000/api', {
        timeout: 5000
      });
      console.log('✅ API endpoint accessible');
    } catch (apiError) {
      console.log('ℹ️ API root endpoint not accessible (this is normal)');
    }
    
    // Test user routes
    try {
      const userResponse = await axios.get('http://localhost:7000/api/users', {
        timeout: 5000
      });
      console.log('❌ User endpoint accessible without auth (this should not happen)');
    } catch (userError) {
      if (userError.response && userError.response.status === 401) {
        console.log('✅ User endpoint properly protected (401 Unauthorized)');
      } else {
        console.log('⚠️ User endpoint error:', userError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Server not running or not accessible:');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 The server is not running on port 7000');
    }
  }
}

testServerStatus();
