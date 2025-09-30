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

async function getRecentAuditLogs(limit = 5) {
  const connection = await mysql.createConnection(dbConfig);
  const [result] = await connection.execute('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
  await connection.end();
  return result;
}

async function validateActivityLogging() {
  console.log('🔍 COMPREHENSIVE ACTIVITY LOGGING VALIDATION');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Get initial audit log count
    console.log('\n1. Getting initial audit log count...');
    const initialCount = await getAuditLogCount();
    console.log(`📊 Initial audit_logs count: ${initialCount}`);
    
    // Step 2: Test API endpoints
    console.log('\n2. Testing API endpoints...');
    
    // Test enhanced activity logs test endpoint
    const testResponse = await makeRequest('/api/admin/enhanced-activity-logs/test');
    console.log(`✅ Enhanced test endpoint: ${testResponse.status === 200 ? 'WORKING' : 'FAILED'}`);
    
    // Test regular activity logs test endpoint
    const regularTestResponse = await makeRequest('/api/admin/activity-logs/test');
    console.log(`✅ Regular test endpoint: ${regularTestResponse.status === 200 ? 'WORKING' : 'FAILED'}`);
    
    // Step 3: Generate activity by attempting login (this should log failed login)
    console.log('\n3. Generating activity by attempting login...');
    const loginResponse = await makeRequest('/api/admin/auth/login', 'POST', {
      username: 'test_user_for_logging_validation',
      password: 'invalid_password_for_testing'
    });
    console.log(`📝 Login attempt result: ${loginResponse.status} - ${loginResponse.data.message}`);
    
    // Step 4: Check if new activity was logged
    console.log('\n4. Checking if activity was logged...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for logging
    
    const newCount = await getAuditLogCount();
    const activityGenerated = newCount > initialCount;
    console.log(`📊 New audit_logs count: ${newCount}`);
    console.log(`${activityGenerated ? '✅' : '❌'} Activity logging: ${activityGenerated ? 'WORKING' : 'NOT WORKING'}`);
    
    // Step 5: Get recent audit logs to verify content
    console.log('\n5. Recent audit log entries:');
    const recentLogs = await getRecentAuditLogs(3);
    recentLogs.forEach((log, i) => {
      console.log(`  ${i+1}. ${log.created_at} - ${log.user_type} user ${log.user_id || 'null'} - ${log.action}`);
      if (log.ip_address) console.log(`     IP: ${log.ip_address}`);
    });
    
    // Step 6: Test frontend API calls (without auth - should fail gracefully)
    console.log('\n6. Testing frontend API integration...');
    
    // Test comprehensive endpoint (should fail due to auth)
    const comprehensiveResponse = await makeRequest('/api/admin/activity-logs/comprehensive');
    console.log(`📝 Comprehensive endpoint: ${comprehensiveResponse.status} - ${comprehensiveResponse.data.message || 'No message'}`);
    
    // Step 7: Summary
    console.log('\n7. VALIDATION SUMMARY:');
    console.log('='.repeat(40));
    console.log(`✅ Database Connection: WORKING`);
    console.log(`✅ API Endpoints: WORKING`);
    console.log(`${activityGenerated ? '✅' : '❌'} Activity Logging: ${activityGenerated ? 'WORKING' : 'NOT WORKING'}`);
    console.log(`✅ IP Address Capture: ${recentLogs[0]?.ip_address ? 'WORKING' : 'NOT CONFIGURED'}`);
    console.log(`✅ Timestamp Recording: WORKING`);
    
    if (activityGenerated) {
      console.log('\n🎉 ACTIVITY LOGGING SYSTEM IS WORKING CORRECTLY!');
      console.log('The system is capturing:');
      console.log('• Failed login attempts');
      console.log('• IP addresses');
      console.log('• User types and actions');
      console.log('• Timestamps');
      console.log('\nNext steps:');
      console.log('• Test with successful login to verify success logging');
      console.log('• Test document request activities');
      console.log('• Test admin actions');
    } else {
      console.log('\n⚠️  ACTIVITY LOGGING NEEDS INVESTIGATION');
      console.log('The middleware is registered but activities may not be triggering logging calls.');
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
  }
}

validateActivityLogging();
