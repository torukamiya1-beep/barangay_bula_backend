const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function checkMissingActivities() {
  console.log('🔍 CHECKING FOR MISSING ACTIVITY LOGGING');
  console.log('='.repeat(60));
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Check current audit_logs content
    console.log('\n📊 CURRENT AUDIT_LOGS ANALYSIS');
    console.log('-'.repeat(40));
    
    const [allLogs] = await connection.execute('SELECT action, user_type, COUNT(*) as count FROM audit_logs GROUP BY action, user_type ORDER BY count DESC');
    
    console.log('📋 Activity types currently being logged:');
    allLogs.forEach((log, i) => {
      console.log(`${i+1}. ${log.action} (${log.user_type}) - ${log.count} records`);
    });
    
    // Check for specific missing activities
    console.log('\n🔍 CHECKING FOR MISSING ACTIVITY TYPES');
    console.log('-'.repeat(40));
    
    const expectedActivities = {
      'Authentication Activities': [
        'login_success',
        'login_failed', 
        'logout',
        'password_reset_request',
        'session_timeout'
      ],
      'Registration Activities': [
        'client_registration_attempt',
        'client_registration_success',
        'account_verification',
        'client_approval',
        'client_rejection'
      ],
      'Document Request Activities': [
        'document_request_submit',
        'document_status_change',
        'payment_submission',
        'payment_confirmation',
        'document_pickup'
      ],
      'Administrative Activities': [
        'admin_login',
        'admin_logout',
        'user_management',
        'system_config_change',
        'report_generation'
      ]
    };
    
    const loggedActions = new Set(allLogs.map(log => log.action));
    
    for (const [category, activities] of Object.entries(expectedActivities)) {
      console.log(`\n📂 ${category}:`);
      activities.forEach(activity => {
        const isLogged = loggedActions.has(activity);
        console.log(`   ${isLogged ? '✅' : '❌'} ${activity} - ${isLogged ? 'LOGGED' : 'NOT LOGGED'}`);
      });
    }
    
    // Check for logout activities specifically
    console.log('\n🚪 LOGOUT ACTIVITY ANALYSIS');
    console.log('-'.repeat(40));
    
    const [logoutLogs] = await connection.execute("SELECT * FROM audit_logs WHERE action LIKE '%logout%' ORDER BY created_at DESC");
    
    if (logoutLogs.length > 0) {
      console.log(`✅ Found ${logoutLogs.length} logout records:`);
      logoutLogs.forEach((log, i) => {
        console.log(`${i+1}. ${log.created_at} - ${log.action} (${log.user_type} user ${log.user_id})`);
      });
    } else {
      console.log('❌ NO LOGOUT ACTIVITIES FOUND');
      console.log('This suggests logout endpoints are not calling logging functions');
    }
    
    // Check recent admin logins to see if logout should have been logged
    console.log('\n🔐 RECENT LOGIN ANALYSIS');
    console.log('-'.repeat(40));
    
    const [recentLogins] = await connection.execute("SELECT * FROM audit_logs WHERE action IN ('login_success', 'admin_login') ORDER BY created_at DESC LIMIT 5");
    
    console.log('📋 Recent successful logins:');
    recentLogins.forEach((log, i) => {
      console.log(`${i+1}. ${log.created_at} - ${log.action} (user ${log.user_id})`);
    });
    
    // Check admin_employee_accounts for last_login times
    const [adminAccounts] = await connection.execute('SELECT id, username, last_login FROM admin_employee_accounts ORDER BY last_login DESC');
    
    console.log('\n📋 Admin account login times:');
    adminAccounts.forEach((admin, i) => {
      console.log(`${i+1}. ${admin.username} (ID: ${admin.id}) - Last login: ${admin.last_login || 'Never'}`);
    });
    
    // Check for document activities
    console.log('\n📄 DOCUMENT ACTIVITY ANALYSIS');
    console.log('-'.repeat(40));
    
    const [docActivities] = await connection.execute("SELECT * FROM audit_logs WHERE action LIKE '%document%' ORDER BY created_at DESC LIMIT 5");
    
    if (docActivities.length > 0) {
      console.log(`✅ Found ${docActivities.length} document-related activities:`);
      docActivities.forEach((log, i) => {
        console.log(`${i+1}. ${log.created_at} - ${log.action} (record ${log.record_id})`);
      });
    } else {
      console.log('❌ NO DOCUMENT ACTIVITIES FOUND');
      
      // Check if there are recent document status changes in request_status_history
      const [recentStatusChanges] = await connection.execute('SELECT * FROM request_status_history ORDER BY changed_at DESC LIMIT 3');
      
      if (recentStatusChanges.length > 0) {
        console.log('\n⚠️  But request_status_history has recent changes:');
        recentStatusChanges.forEach((change, i) => {
          console.log(`${i+1}. ${change.changed_at} - Request ${change.request_id}: ${change.old_status_id} → ${change.new_status_id}`);
        });
        console.log('🔧 This suggests document status changes are not calling audit logging functions');
      }
    }
    
    // Check for client registration activities
    console.log('\n👤 CLIENT REGISTRATION ANALYSIS');
    console.log('-'.repeat(40));
    
    const [clientRegActivities] = await connection.execute("SELECT * FROM audit_logs WHERE action LIKE '%registration%' OR action LIKE '%client%' ORDER BY created_at DESC LIMIT 5");
    
    if (clientRegActivities.length > 0) {
      console.log(`✅ Found ${clientRegActivities.length} client registration activities:`);
      clientRegActivities.forEach((log, i) => {
        console.log(`${i+1}. ${log.created_at} - ${log.action} (user ${log.user_id})`);
      });
    } else {
      console.log('❌ NO CLIENT REGISTRATION ACTIVITIES FOUND');
      
      // Check if there are recent client registrations
      const [recentClients] = await connection.execute('SELECT id, username, created_at FROM client_accounts ORDER BY created_at DESC LIMIT 3');
      
      if (recentClients.length > 0) {
        console.log('\n⚠️  But client_accounts has recent registrations:');
        recentClients.forEach((client, i) => {
          console.log(`${i+1}. ${client.created_at} - ${client.username} (ID: ${client.id})`);
        });
        console.log('🔧 This suggests client registration is not calling audit logging functions');
      }
    }
    
    await connection.end();
    
    // Summary and recommendations
    console.log('\n🎯 MISSING ACTIVITY LOGGING SUMMARY');
    console.log('='.repeat(50));
    
    const missingCategories = [];
    
    if (logoutLogs.length === 0) {
      missingCategories.push('Logout activities');
    }
    
    if (docActivities.length === 0) {
      missingCategories.push('Document activities');
    }
    
    if (clientRegActivities.length === 0) {
      missingCategories.push('Client registration activities');
    }
    
    if (missingCategories.length > 0) {
      console.log('❌ MISSING ACTIVITY CATEGORIES:');
      missingCategories.forEach((category, i) => {
        console.log(`${i+1}. ${category}`);
      });
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      console.log('1. Check logout endpoints in controllers - ensure they call logging functions');
      console.log('2. Verify document status change controllers call logDocumentStatusChange()');
      console.log('3. Check client registration controllers call logRegistrationActivity()');
      console.log('4. Test these activities manually to verify logging works');
    } else {
      console.log('✅ All major activity categories are being logged');
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

checkMissingActivities();
