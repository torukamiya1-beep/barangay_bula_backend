const http = require('http');

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 7000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function debugAuthIssue() {
  console.log('🔍 DEBUGGING AUTHENTICATION ISSUE');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Test if server is running
    console.log('\n📡 STEP 1: Testing server connectivity');
    console.log('-'.repeat(30));
    
    const serverTest = await makeRequest('/api/test');
    console.log(`📝 Server test: ${serverTest.status}`);
    
    // Step 2: Test activity log routes test endpoints
    console.log('\n🔗 STEP 2: Testing route endpoints');
    console.log('-'.repeat(30));
    
    const activityTest = await makeRequest('/api/admin/activity-logs/test');
    console.log(`📝 Activity logs test: ${activityTest.status}`);
    if (activityTest.status === 200) {
      console.log('✅ Activity logs routes are working');
    }
    
    const enhancedTest = await makeRequest('/api/admin/enhanced-activity-logs/test');
    console.log(`📝 Enhanced activity logs test: ${enhancedTest.status}`);
    if (enhancedTest.status === 200) {
      console.log('✅ Enhanced activity logs routes are working');
    }
    
    // Step 3: Test protected endpoints without auth
    console.log('\n🔒 STEP 3: Testing protected endpoints (no auth)');
    console.log('-'.repeat(30));
    
    const protectedTest = await makeRequest('/api/admin/activity-logs/comprehensive');
    console.log(`📝 Protected endpoint: ${protectedTest.status}`);
    console.log(`📝 Response: ${JSON.stringify(protectedTest.data)}`);
    
    // Step 4: Try to get a valid token
    console.log('\n🔑 STEP 4: Attempting to get valid token');
    console.log('-'.repeat(30));
    
    // Try different admin credentials
    const credentialsList = [
      { username: 'admin', password: 'admin' },
      { username: 'admin', password: 'password' },
      { username: 'admin', password: '123456' },
      { username: 'admin12345', password: 'admin' },
      { username: 'admin12345', password: 'password' },
      { username: 'admin12345', password: '123456' },
      { username: 'admin12345', password: 'admin123' },
      { username: 'admin12345', password: 'admin12345' }
    ];
    
    let validToken = null;
    let validCredentials = null;
    
    for (const creds of credentialsList) {
      console.log(`🔐 Trying: ${creds.username} / ${creds.password}`);
      
      const loginResponse = await makeRequest('/api/admin/auth/login', 'POST', creds);
      console.log(`   Result: ${loginResponse.status} - ${loginResponse.data.message || 'No message'}`);
      
      if (loginResponse.status === 200 && loginResponse.data.data && loginResponse.data.data.token) {
        validToken = loginResponse.data.data.token;
        validCredentials = creds;
        console.log('✅ SUCCESS! Got valid token');
        break;
      }
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Step 5: Test with valid token if we got one
    if (validToken) {
      console.log('\n🎯 STEP 5: Testing with valid token');
      console.log('-'.repeat(30));
      
      const authHeaders = { 'Authorization': `Bearer ${validToken}` };
      
      const authTest = await makeRequest('/api/admin/activity-logs/comprehensive', 'GET', null, authHeaders);
      console.log(`📝 Authenticated request: ${authTest.status}`);
      
      if (authTest.status === 200) {
        console.log('✅ AUTHENTICATION WORKING!');
        console.log(`📊 Data received: ${authTest.data.data ? authTest.data.data.activities?.length || 0 : 0} activities`);
        
        if (authTest.data.data && authTest.data.data.activities && authTest.data.data.activities.length > 0) {
          console.log('\n📋 Sample activity:');
          const activity = authTest.data.data.activities[0];
          console.log(`   ID: ${activity.id} - ${activity.action}`);
          console.log(`   User: ${activity.user_name} (${activity.user_type})`);
          console.log(`   Time: ${activity.timestamp}`);
        }
      } else {
        console.log('❌ Authentication failed even with valid token');
        console.log(`Error: ${JSON.stringify(authTest.data)}`);
      }
    } else {
      console.log('\n❌ STEP 5: Could not obtain valid token');
      console.log('This means either:');
      console.log('1. Admin credentials are different than expected');
      console.log('2. Admin login endpoint has issues');
      console.log('3. Database connection problems');
    }
    
    // Step 6: Summary
    console.log('\n🎯 DIAGNOSIS SUMMARY');
    console.log('='.repeat(30));
    
    if (validToken && validCredentials) {
      console.log(`✅ Valid credentials found: ${validCredentials.username} / ${validCredentials.password}`);
      console.log('🔧 SOLUTION: Frontend needs to use these credentials for authentication');
    } else {
      console.log('❌ No valid credentials found');
      console.log('🔧 SOLUTION: Need to check admin account passwords in database');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugAuthIssue();
