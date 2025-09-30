const axios = require('axios');

const BASE_URL = 'http://localhost:7000/api';

async function testArchiveWithAuth() {
  try {
    console.log('🧪 Testing Archive Endpoint with Authentication');
    
    // Step 1: Login to get a valid token
    console.log('\n1. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/admin/auth/login`, {
      username: 'admin12345',
      password: '12345QWERTqwert'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful, token received');
    
    // Step 2: Test the archive endpoint with valid token
    console.log('\n2. Testing archive endpoint...');
    const archiveResponse = await axios.get(`${BASE_URL}/users/archive/list`, {
      params: {
        page: 1,
        limit: 10
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Archive endpoint successful!');
    console.log('Status:', archiveResponse.status);
    console.log('Response:', JSON.stringify(archiveResponse.data, null, 2));
    
    // Step 3: Test with search parameter
    console.log('\n3. Testing archive endpoint with search...');
    const searchResponse = await axios.get(`${BASE_URL}/users/archive/list`, {
      params: {
        page: 1,
        limit: 10,
        search: 'jerome'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Archive search successful!');
    console.log('Search results:', JSON.stringify(searchResponse.data, null, 2));
    
    // Step 4: Test restore endpoint if we have archived users
    if (archiveResponse.data.data && archiveResponse.data.data.length > 0) {
      const firstArchivedUser = archiveResponse.data.data[0];
      console.log(`\n4. Testing restore endpoint for user: ${firstArchivedUser.full_name}`);
      
      const restoreResponse = await axios.patch(`${BASE_URL}/users/${firstArchivedUser.id}/restore`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Restore endpoint successful!');
      console.log('Restore result:', JSON.stringify(restoreResponse.data, null, 2));
      
      // Re-archive the user for future tests
      console.log('\n5. Re-archiving user for future tests...');
      const deleteResponse = await axios.delete(`${BASE_URL}/users/${firstArchivedUser.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ User re-archived successfully');
    } else {
      console.log('\n4. No archived users found to test restore functionality');
    }
    
    console.log('\n🎉 All archive functionality tests passed!');
    
  } catch (error) {
    console.error('\n❌ Error during testing:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.message);
    } else {
      console.error('Request setup error:', error.message);
    }
    
    console.error('\nFull error:', error.message);
  }
}

testArchiveWithAuth();
