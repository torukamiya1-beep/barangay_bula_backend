const axios = require('axios');

async function testArchiveEndpoint() {
  try {
    console.log('🧪 Testing Archive Endpoint Directly');
    
    const url = 'http://localhost:7000/api/users/archive/list';
    const params = {
      page: 1,
      limit: 10
    };
    
    console.log(`Making request to: ${url}`);
    console.log('Params:', params);
    
    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Success!');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing archive endpoint:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Request setup error:', error.message);
    }
    
    console.error('Full error:', error);
  }
}

testArchiveEndpoint();
