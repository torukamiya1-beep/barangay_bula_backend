const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function checkRealDatabaseState() {
  console.log('🔍 CHECKING REAL DATABASE STATE');
  console.log('='.repeat(50));
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // 1. Check audit_logs table
    console.log('\n1. AUDIT_LOGS TABLE:');
    console.log('-'.repeat(30));
    
    const [auditCount] = await connection.execute('SELECT COUNT(*) as count FROM audit_logs');
    console.log(`📊 Total records: ${auditCount[0].count}`);
    
    if (auditCount[0].count > 0) {
      // Get all records to see what's actually there
      const [allAuditLogs] = await connection.execute('SELECT * FROM audit_logs ORDER BY created_at DESC');
      console.log('\n📋 ALL AUDIT_LOGS RECORDS:');
      allAuditLogs.forEach((log, i) => {
        console.log(`${i+1}. ID: ${log.id}`);
        console.log(`   User: ${log.user_type} user ${log.user_id || 'null'}`);
        console.log(`   Action: ${log.action}`);
        console.log(`   Table: ${log.table_name || 'null'}`);
        console.log(`   IP: ${log.ip_address || 'null'}`);
        console.log(`   Created: ${log.created_at}`);
        console.log(`   Old Values: ${log.old_values ? JSON.stringify(JSON.parse(log.old_values)) : 'null'}`);
        console.log(`   New Values: ${log.new_values ? JSON.stringify(JSON.parse(log.new_values)) : 'null'}`);
        console.log('   ---');
      });
    } else {
      console.log('❌ NO RECORDS FOUND IN audit_logs');
    }
    
    // 2. Check request_status_history table
    console.log('\n2. REQUEST_STATUS_HISTORY TABLE:');
    console.log('-'.repeat(30));
    
    const [historyCount] = await connection.execute('SELECT COUNT(*) as count FROM request_status_history');
    console.log(`📊 Total records: ${historyCount[0].count}`);
    
    if (historyCount[0].count > 0) {
      const [allHistory] = await connection.execute('SELECT * FROM request_status_history ORDER BY changed_at DESC LIMIT 10');
      console.log('\n📋 RECENT REQUEST_STATUS_HISTORY RECORDS:');
      allHistory.forEach((record, i) => {
        console.log(`${i+1}. ID: ${record.id}`);
        console.log(`   Request ID: ${record.request_id}`);
        console.log(`   Status Change: ${record.old_status_id} → ${record.new_status_id}`);
        console.log(`   Changed By: ${record.changed_by || 'null'}`);
        console.log(`   Reason: ${record.change_reason || 'null'}`);
        console.log(`   Changed At: ${record.changed_at}`);
        console.log('   ---');
      });
    }
    
    // 3. Check if there are any document requests
    console.log('\n3. DOCUMENT_REQUESTS TABLE:');
    console.log('-'.repeat(30));
    
    const [docCount] = await connection.execute('SELECT COUNT(*) as count FROM document_requests');
    console.log(`📊 Total document requests: ${docCount[0].count}`);
    
    if (docCount[0].count > 0) {
      const [recentDocs] = await connection.execute('SELECT id, request_number, document_type_id, status_id, created_at FROM document_requests ORDER BY created_at DESC LIMIT 5');
      console.log('\n📋 RECENT DOCUMENT REQUESTS:');
      recentDocs.forEach((doc, i) => {
        console.log(`${i+1}. ID: ${doc.id}, Number: ${doc.request_number}, Type: ${doc.document_type_id}, Status: ${doc.status_id}, Created: ${doc.created_at}`);
      });
    }
    
    // 4. Check admin accounts
    console.log('\n4. ADMIN_EMPLOYEE_ACCOUNTS TABLE:');
    console.log('-'.repeat(30));
    
    const [adminCount] = await connection.execute('SELECT COUNT(*) as count FROM admin_employee_accounts');
    console.log(`📊 Total admin accounts: ${adminCount[0].count}`);
    
    if (adminCount[0].count > 0) {
      const [admins] = await connection.execute('SELECT id, username, role, status, last_login FROM admin_employee_accounts LIMIT 5');
      console.log('\n📋 ADMIN ACCOUNTS:');
      admins.forEach((admin, i) => {
        console.log(`${i+1}. ID: ${admin.id}, Username: ${admin.username}, Role: ${admin.role}, Status: ${admin.status}, Last Login: ${admin.last_login || 'Never'}`);
      });
    }
    
    // 5. Check client accounts
    console.log('\n5. CLIENT_ACCOUNTS TABLE:');
    console.log('-'.repeat(30));
    
    const [clientCount] = await connection.execute('SELECT COUNT(*) as count FROM client_accounts');
    console.log(`📊 Total client accounts: ${clientCount[0].count}`);
    
    if (clientCount[0].count > 0) {
      const [clients] = await connection.execute('SELECT id, username, status, last_login, created_at FROM client_accounts ORDER BY created_at DESC LIMIT 5');
      console.log('\n📋 RECENT CLIENT ACCOUNTS:');
      clients.forEach((client, i) => {
        console.log(`${i+1}. ID: ${client.id}, Username: ${client.username}, Status: ${client.status}, Last Login: ${client.last_login || 'Never'}, Created: ${client.created_at}`);
      });
    }
    
    await connection.end();
    
    console.log('\n🎯 ANALYSIS:');
    console.log('='.repeat(30));
    if (auditCount[0].count === 0) {
      console.log('❌ CRITICAL: audit_logs table is EMPTY - no activities are being logged!');
    } else {
      console.log(`✅ audit_logs has ${auditCount[0].count} records`);
    }
    
    if (historyCount[0].count > 0) {
      console.log(`✅ request_status_history has ${historyCount[0].count} records (legacy data)`);
    }
    
    console.log(`📊 Document requests: ${docCount[0].count}`);
    console.log(`📊 Admin accounts: ${adminCount[0].count}`);
    console.log(`📊 Client accounts: ${clientCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkRealDatabaseState();
