require('dotenv').config();
const axios = require('axios');

async function testReceiptsAPI() {
  try {
    console.log('🧪 Testing receipts API...\n');
    
    // Test without authentication first
    console.log('1️⃣ Testing without authentication:');
    try {
      const response = await axios.get('http://localhost:7000/api/client/receipts');
      console.log('✅ Response:', response.data);
    } catch (error) {
      console.log('❌ Expected error (no auth):', error.response?.data?.error || error.message);
    }
    
    // Test with a mock token (this will fail but shows the endpoint is working)
    console.log('\n2️⃣ Testing with mock token:');
    try {
      const response = await axios.get('http://localhost:7000/api/client/receipts', {
        headers: {
          'Authorization': 'Bearer mock-token'
        }
      });
      console.log('✅ Response:', response.data);
    } catch (error) {
      console.log('❌ Expected error (invalid token):', error.response?.data?.error || error.message);
    }
    
    // Test the server health
    console.log('\n3️⃣ Testing server health:');
    try {
      const response = await axios.get('http://localhost:7000/api/webhooks/paymongo/test');
      console.log('✅ Server is running:', response.data);
    } catch (error) {
      console.log('❌ Server error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  process.exit(0);
}

testReceiptsAPI();
