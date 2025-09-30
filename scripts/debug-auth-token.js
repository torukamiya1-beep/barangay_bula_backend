const axios = require('axios');
const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:7000/api';

async function debugAuthToken() {
  try {
    console.log('🧪 Debugging Authentication Token');
    
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
    console.log('✅ Login successful');
    console.log('Full login response:', JSON.stringify(loginResponse.data, null, 2));

    if (!token) {
      throw new Error('No token received from login response');
    }

    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    
    // Step 2: Decode the JWT token to see its contents
    console.log('\n2. Decoding JWT token...');
    try {
      const decoded = jwt.decode(token);
      console.log('Decoded token payload:', JSON.stringify(decoded, null, 2));
    } catch (error) {
      console.error('❌ Failed to decode token:', error.message);
    }
    
    // Step 3: Test a simple protected endpoint first
    console.log('\n3. Testing simple protected endpoint...');
    try {
      const userResponse = await axios.get(`${BASE_URL}/users`, {
        params: { page: 1, limit: 5 },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Basic user endpoint successful!');
      console.log('Response status:', userResponse.status);
      console.log('User count:', userResponse.data.data ? userResponse.data.data.length : 'N/A');
      
    } catch (error) {
      console.error('❌ Basic user endpoint failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
    }
    
    // Step 4: Test the archive endpoint
    console.log('\n4. Testing archive endpoint...');
    try {
      const archiveResponse = await axios.get(`${BASE_URL}/archive/users`, {
        params: { page: 1, limit: 10 },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Archive endpoint successful!');
      console.log('Response:', JSON.stringify(archiveResponse.data, null, 2));
      
    } catch (error) {
      console.error('❌ Archive endpoint failed:');
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during debugging:');
    console.error('Error:', error.message);
  }
}

debugAuthToken();
