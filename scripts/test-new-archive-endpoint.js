const axios = require('axios');

const BASE_URL = 'http://localhost:7000/api';

async function testNewArchiveEndpoint() {
  try {
    console.log('🧪 Testing New Archive Endpoint');
    
    // Login
    const loginResponse = await axios.post(`${BASE_URL}/admin/auth/login`, {
      username: 'admin12345',
      password: '12345QWERTqwert'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Test new archive endpoint
    console.log('\n📋 Testing /users/get-archived-users endpoint...');
    const archiveResponse = await axios.get(`${BASE_URL}/users/get-archived-users`, {
      params: { page: 1, limit: 10 },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Archive endpoint successful!');
    console.log('Status:', archiveResponse.status);
    console.log('Data:', JSON.stringify(archiveResponse.data, null, 2));
    
    // Test restore if we have archived users
    if (archiveResponse.data.data && archiveResponse.data.data.length > 0) {
      const firstUser = archiveResponse.data.data[0];
      console.log(`\n🔄 Testing restore for user: ${firstUser.full_name}`);
      
      const restoreResponse = await axios.patch(`${BASE_URL}/users/${firstUser.id}/restore`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Restore successful!');
      console.log('Restore result:', JSON.stringify(restoreResponse.data, null, 2));
      
      // Re-archive for future tests
      console.log('\n🗄️ Re-archiving user for future tests...');
      const deleteResponse = await axios.delete(`${BASE_URL}/users/${firstUser.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ User re-archived');
    }
    
    console.log('\n🎉 All tests passed! Archive functionality is working!');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testNewArchiveEndpoint();
