const axios = require('axios');

const BASE_URL = 'http://localhost:7000/api';

async function finalArchiveTest() {
  try {
    console.log('🔧 Final Archive Functionality Test');
    
    // Step 1: Test server health
    console.log('\n1. Testing server health...');
    const healthResponse = await axios.get('http://localhost:7000/health');
    console.log('✅ Server is healthy:', healthResponse.data.status);
    
    // Step 2: Login
    console.log('\n2. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/admin/auth/login`, {
      username: 'admin12345',
      password: '12345QWERTqwert'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Step 3: Test basic user endpoint
    console.log('\n3. Testing basic user endpoint...');
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      params: { page: 1, limit: 5 },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Basic user endpoint works');
    
    // Step 4: Test all possible archive endpoints
    const archiveEndpoints = [
      '/users/archive/list',
      '/users/archived', 
      '/users/archive-list',
      '/archive/users'
    ];
    
    console.log('\n4. Testing archive endpoints...');
    for (const endpoint of archiveEndpoints) {
      try {
        console.log(`   Testing: ${BASE_URL}${endpoint}`);
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          params: { page: 1, limit: 10 },
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`   ✅ SUCCESS: ${endpoint} - Status: ${response.status}`);
        console.log(`   📊 Data: ${JSON.stringify(response.data, null, 2)}`);
        break; // If one works, we're good
        
      } catch (error) {
        if (error.response) {
          console.log(`   ❌ FAILED: ${endpoint} - Status: ${error.response.status} - ${error.response.data.error || error.response.data.message}`);
        } else {
          console.log(`   ❌ FAILED: ${endpoint} - ${error.message}`);
        }
      }
    }
    
    // Step 5: Test direct service call
    console.log('\n5. Testing direct service call...');
    try {
      const UserService = require('../src/services/userServiceNew');
      const directResult = await UserService.getArchivedUsers(1, 10, {});
      console.log('✅ Direct service call works');
      console.log('📊 Direct result:', JSON.stringify(directResult, null, 2));
    } catch (error) {
      console.log('❌ Direct service call failed:', error.message);
    }
    
    console.log('\n🎯 Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

finalArchiveTest();
