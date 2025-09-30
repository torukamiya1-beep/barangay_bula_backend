const http = require('http');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

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

async function getAuditLogCount() {
  const connection = await mysql.createConnection(dbConfig);
  const [result] = await connection.execute('SELECT COUNT(*) as count FROM audit_logs');
  await connection.end();
  return result[0].count;
}

async function getLatestAuditLogs(limit = 3) {
  const connection = await mysql.createConnection(dbConfig);
  const [result] = await connection.execute('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
  await connection.end();
  return result;
}

async function comprehensiveActivityTest() {
  console.log('🔍 COMPREHENSIVE ACTIVITY LOGGING TEST');
  console.log('='.repeat(60));
  
  try {
    const initialCount = await getAuditLogCount();
    console.log(`📊 Initial audit_logs count: ${initialCount}`);
    
    let testResults = {
      admin_login_failed: false,
      client_login_failed: false,
      client_registration: false,
      document_request: false,
      total_activities_logged: 0
    };
    
    // Test 1: Admin Login Failed (we know this works)
    console.log('\n🔐 TEST 1: Admin Login Failed');
    console.log('-'.repeat(30));
    
    const adminLoginResponse = await makeRequest('/api/admin/auth/login', 'POST', {
      username: 'test_admin_comprehensive',
      password: 'wrong_password'
    });
    
    console.log(`📝 Admin login result: ${adminLoginResponse.status} - ${adminLoginResponse.data.message}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const countAfterAdminLogin = await getAuditLogCount();
    if (countAfterAdminLogin > initialCount) {
      testResults.admin_login_failed = true;
      testResults.total_activities_logged++;
      console.log('✅ Admin login failed - LOGGED');
    } else {
      console.log('❌ Admin login failed - NOT LOGGED');
    }
    
    // Test 2: Client Login Failed
    console.log('\n👤 TEST 2: Client Login Failed');
    console.log('-'.repeat(30));
    
    const clientLoginResponse = await makeRequest('/api/client/auth/login', 'POST', {
      username: 'test_client_comprehensive',
      password: 'wrong_password'
    });
    
    console.log(`📝 Client login result: ${clientLoginResponse.status} - ${clientLoginResponse.data.message}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const countAfterClientLogin = await getAuditLogCount();
    if (countAfterClientLogin > countAfterAdminLogin) {
      testResults.client_login_failed = true;
      testResults.total_activities_logged++;
      console.log('✅ Client login failed - LOGGED');
    } else {
      console.log('❌ Client login failed - NOT LOGGED');
    }
    
    // Test 3: Client Registration (Step 1)
    console.log('\n📝 TEST 3: Client Registration');
    console.log('-'.repeat(30));
    
    const uniqueUsername = `testuser_${Date.now()}`;
    const uniqueEmail = `test_${Date.now()}@example.com`;
    
    const registrationResponse = await makeRequest('/api/client/auth/register-account', 'POST', {
      username: uniqueUsername,
      password: 'testpassword123',
      email: uniqueEmail
    });
    
    console.log(`📝 Registration result: ${registrationResponse.status} - ${registrationResponse.data.message}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const countAfterRegistration = await getAuditLogCount();
    if (countAfterRegistration > countAfterClientLogin) {
      testResults.client_registration = true;
      testResults.total_activities_logged++;
      console.log('✅ Client registration - LOGGED');
    } else {
      console.log('❌ Client registration - NOT LOGGED');
    }
    
    // Test 4: Document Request (requires authentication, so this will likely fail but might still log the attempt)
    console.log('\n📄 TEST 4: Document Request Attempt');
    console.log('-'.repeat(30));
    
    const documentRequestResponse = await makeRequest('/api/client/document-requests/submit', 'POST', {
      document_type_id: 1,
      purpose_category_id: 1,
      purpose_details: 'Testing activity logging',
      payment_method_id: 1
    });
    
    console.log(`📝 Document request result: ${documentRequestResponse.status} - ${documentRequestResponse.data.message}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const finalCount = await getAuditLogCount();
    if (finalCount > countAfterRegistration) {
      testResults.document_request = true;
      testResults.total_activities_logged++;
      console.log('✅ Document request attempt - LOGGED');
    } else {
      console.log('❌ Document request attempt - NOT LOGGED');
    }
    
    // Show recent logs
    console.log('\n📋 RECENT ACTIVITY LOGS:');
    console.log('-'.repeat(30));
    
    const recentLogs = await getLatestAuditLogs(5);
    recentLogs.forEach((log, i) => {
      console.log(`${i+1}. ID: ${log.id} - ${log.action} (${log.user_type} user ${log.user_id || 'null'})`);
      console.log(`   IP: ${log.ip_address} | Time: ${log.created_at}`);
      if (log.new_values) {
        try {
          const details = JSON.parse(log.new_values);
          console.log(`   Details: ${JSON.stringify(details)}`);
        } catch (e) {
          console.log(`   Details: ${log.new_values}`);
        }
      }
      console.log('   ---');
    });
    
    // Summary
    console.log('\n🎯 TEST RESULTS SUMMARY:');
    console.log('='.repeat(40));
    console.log(`📊 Total activities logged: ${testResults.total_activities_logged}`);
    console.log(`📊 Initial count: ${initialCount} → Final count: ${finalCount}`);
    console.log(`📈 Activities added: ${finalCount - initialCount}`);
    console.log('');
    console.log('Activity Type Results:');
    console.log(`✅ Admin Login Failed: ${testResults.admin_login_failed ? 'WORKING' : 'NOT WORKING'}`);
    console.log(`✅ Client Login Failed: ${testResults.client_login_failed ? 'WORKING' : 'NOT WORKING'}`);
    console.log(`✅ Client Registration: ${testResults.client_registration ? 'WORKING' : 'NOT WORKING'}`);
    console.log(`✅ Document Request: ${testResults.document_request ? 'WORKING' : 'NOT WORKING'}`);
    
    if (testResults.total_activities_logged >= 3) {
      console.log('\n🎉 ACTIVITY LOGGING SYSTEM IS WORKING WELL!');
      console.log('Most activity types are being properly logged.');
    } else if (testResults.total_activities_logged >= 1) {
      console.log('\n⚠️  ACTIVITY LOGGING IS PARTIALLY WORKING');
      console.log('Some activities are logged, but others may need fixes.');
    } else {
      console.log('\n❌ ACTIVITY LOGGING SYSTEM NEEDS MAJOR FIXES');
      console.log('No activities are being logged properly.');
    }
    
  } catch (error) {
    console.error('❌ Comprehensive test failed:', error.message);
  }
}

comprehensiveActivityTest();
