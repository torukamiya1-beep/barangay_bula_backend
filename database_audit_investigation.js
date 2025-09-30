require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('./src/config/database');

async function investigateDatabaseStructure() {
  try {
    console.log('🔍 Starting comprehensive database structure investigation...\n');

    // Test database connection
    console.log('Attempting to connect to database...');
    await connectDatabase();
    console.log('Database connection successful!\n');
    
    // 1. Check if audit_logs table exists
    console.log('📋 STEP 1: Checking for audit_logs table...');
    const auditTableCheck = await executeQuery(`
      SELECT COUNT(*) as table_exists 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'audit_logs'
    `, [process.env.DB_NAME || 'barangay_management_system']);
    
    const auditTableExists = auditTableCheck[0].table_exists > 0;
    console.log(`   Audit logs table exists: ${auditTableExists ? '✅ YES' : '❌ NO'}\n`);
    
    // 2. Check request_status_history table
    console.log('📋 STEP 2: Analyzing request_status_history table...');
    const statusHistoryStructure = await executeQuery(`DESCRIBE request_status_history`);
    
    console.log('   📊 request_status_history structure:');
    statusHistoryStructure.forEach(column => {
      console.log(`      ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${column.Key ? `[${column.Key}]` : ''}`);
    });
    
    const statusHistoryCount = await executeQuery(`SELECT COUNT(*) as total_records FROM request_status_history`);
    console.log(`   📊 Total records: ${statusHistoryCount[0].total_records}\n`);
    
    // 3. Sample data from request_status_history
    console.log('📋 STEP 3: Sample data from request_status_history...');
    const statusHistorySample = await executeQuery(`
      SELECT rsh.*, dr.request_number,
             COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'System') as changed_by_name
      FROM request_status_history rsh
      LEFT JOIN document_requests dr ON rsh.request_id = dr.id
      LEFT JOIN admin_employee_accounts aea ON rsh.changed_by = aea.id
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      ORDER BY rsh.changed_at DESC
      LIMIT 5
    `);
    
    console.log('   📊 Sample records:');
    statusHistorySample.forEach((record, index) => {
      console.log(`      ${index + 1}. ID: ${record.id}, Request: ${record.request_number}`);
      console.log(`         Status IDs: ${record.old_status_id} → ${record.new_status_id}`);
      console.log(`         Changed: ${record.changed_at}, By: ${record.changed_by_name}`);
      console.log(`         Reason: ${record.change_reason || 'N/A'}\n`);
    });
    
    // 4. If audit_logs exists, analyze it
    if (auditTableExists) {
      console.log('📋 STEP 4: Analyzing audit_logs table...');
      const auditLogsStructure = await executeQuery(`DESCRIBE audit_logs`);
      
      console.log('   📊 audit_logs structure:');
      auditLogsStructure.forEach(column => {
        console.log(`      ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : '(NULLABLE)'} ${column.Key ? `[${column.Key}]` : ''}`);
      });
      
      const auditLogsCount = await executeQuery(`SELECT COUNT(*) as total_records FROM audit_logs`);
      console.log(`   📊 Total records: ${auditLogsCount[0].total_records}`);
      
      // Sample data from audit_logs
      const auditLogsSample = await executeQuery(`
        SELECT * FROM audit_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('   📊 Sample records:');
      auditLogsSample.forEach((record, index) => {
        console.log(`      ${index + 1}. ID: ${record.id}, Action: ${record.action}`);
        console.log(`         User: ${record.user_id}, IP: ${record.ip_address || 'N/A'}`);
        console.log(`         Created: ${record.created_at}`);
        console.log(`         Details: ${record.details || 'N/A'}\n`);
      });
    } else {
      console.log('📋 STEP 4: audit_logs table does not exist - will need to create it\n');
    }
    
    // 5. Check for other activity-related tables
    console.log('📋 STEP 5: Checking for other activity-related tables...');
    const allTables = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND (table_name LIKE '%log%' OR table_name LIKE '%activity%' OR table_name LIKE '%audit%' OR table_name LIKE '%history%')
      ORDER BY table_name
    `, [process.env.DB_NAME || 'barangay_management_system']);
    
    console.log('   📊 Activity-related tables found:');
    allTables.forEach(table => {
      console.log(`      - ${table.table_name}`);
    });
    
    // 6. Check user authentication tables for IP tracking
    console.log('\n📋 STEP 6: Checking user authentication tables...');
    const userTables = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ? 
      AND (table_name LIKE '%user%' OR table_name LIKE '%admin%' OR table_name LIKE '%client%' OR table_name LIKE '%auth%')
      ORDER BY table_name
    `, [process.env.DB_NAME || 'barangay_management_system']);
    
    console.log('   📊 User-related tables:');
    userTables.forEach(table => {
      console.log(`      - ${table.table_name}`);
    });
    
    // 7. Check current IP address tracking capabilities
    console.log('\n📋 STEP 7: Checking current IP address tracking...');
    
    // Check if any tables have IP address fields
    const ipFields = await executeQuery(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = ?
      AND (column_name LIKE '%ip%' OR column_name LIKE '%address%')
      ORDER BY table_name, column_name
    `, [process.env.DB_NAME || 'barangay_management_system']);
    
    console.log('   📊 IP address related fields:');
    if (ipFields.length > 0) {
      ipFields.forEach(field => {
        console.log(`      - ${field.table_name}.${field.column_name} (${field.data_type})`);
      });
    } else {
      console.log('      ❌ No IP address fields found in database');
    }
    
    // 8. Generate comprehensive recommendations
    console.log('\n🎯 COMPREHENSIVE RECOMMENDATIONS:');
    
    if (auditTableExists) {
      console.log('✅ OPTION A: Use existing audit_logs table');
      console.log('   - Enhance audit_logs schema if needed');
      console.log('   - Migrate request_status_history data to audit_logs format');
      console.log('   - Implement comprehensive activity logging using audit_logs');
    } else {
      console.log('🔧 OPTION B: Create new comprehensive audit_logs table');
      console.log('   - Design schema to handle all activity types');
      console.log('   - Keep request_status_history for document-specific status changes');
      console.log('   - Use audit_logs for authentication, registration, and admin activities');
    }
    
    console.log('\n🔧 REQUIRED IMPLEMENTATIONS:');
    console.log('   1. IP address tracking middleware');
    console.log('   2. Activity logging hooks in all controllers');
    console.log('   3. Unified activity logging service');
    console.log('   4. Authentication activity logging');
    console.log('   5. Registration activity logging');
    console.log('   6. Administrative activity logging');
    
  } catch (error) {
    console.error('❌ Database investigation failed:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run the investigation
investigateDatabaseStructure()
  .then(() => {
    console.log('\n✅ Database structure investigation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Investigation failed:', error);
    process.exit(1);
  });
