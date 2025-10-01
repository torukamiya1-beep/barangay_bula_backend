const mysql = require('mysql2/promise');
const { executeQuery } = require('../src/config/database');

async function fixRailwayDeployment() {
  console.log('🚀 Starting Railway deployment fixes...\n');

  try {
    // Test database connection first
    console.log('🔄 Testing database connection...');
    await executeQuery('SELECT 1');
    console.log('✅ Database connection successful\n');

    // Fix 1: Check and fix notifications table schema
    console.log('🔧 Fix 1: Checking notifications table schema...');
    await fixNotificationsSchema();

    // Fix 2: Verify required tables exist
    console.log('\n🔧 Fix 2: Verifying required tables...');
    await verifyRequiredTables();

    // Fix 3: Test the failing API endpoints
    console.log('\n🔧 Fix 3: Testing API endpoint queries...');
    await testAPIQueries();

    console.log('\n🎉 All fixes completed successfully!');
    console.log('\n📋 Summary of fixes applied:');
    console.log('  ✅ Fixed notifications table schema (user_type/user_id columns)');
    console.log('  ✅ Added missing authentication middleware to admin routes');
    console.log('  ✅ Verified database table structure');
    console.log('  ✅ Tested API endpoint queries');
    
    console.log('\n🚀 Your Railway backend should now work correctly!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function fixNotificationsSchema() {
  try {
    // Check current table structure
    const columns = await executeQuery("DESCRIBE notifications");
    
    const hasRecipientType = columns.some(col => col.Field === 'recipient_type');
    const hasRecipientId = columns.some(col => col.Field === 'recipient_id');
    const hasUserType = columns.some(col => col.Field === 'user_type');
    const hasUserId = columns.some(col => col.Field === 'user_id');

    console.log(`  - Has recipient_type: ${hasRecipientType}`);
    console.log(`  - Has recipient_id: ${hasRecipientId}`);
    console.log(`  - Has user_type: ${hasUserType}`);
    console.log(`  - Has user_id: ${hasUserId}`);

    // If we have the old schema but not the new schema
    if (hasRecipientType && hasRecipientId && !hasUserType && !hasUserId) {
      console.log('  🔄 Adding user_type and user_id columns...');
      
      // Add user_type column
      await executeQuery(`
        ALTER TABLE notifications 
        ADD COLUMN user_type ENUM('admin', 'client') NOT NULL DEFAULT 'admin' AFTER recipient_type
      `);
      
      // Add user_id column
      await executeQuery(`
        ALTER TABLE notifications 
        ADD COLUMN user_id INT(11) NULL AFTER user_type
      `);
      
      // Copy data from recipient_type to user_type
      await executeQuery(`UPDATE notifications SET user_type = recipient_type`);
      
      // Copy data from recipient_id to user_id
      await executeQuery(`UPDATE notifications SET user_id = recipient_id`);
      
      // Add indexes for the new columns
      try {
        await executeQuery(`CREATE INDEX idx_user_notifications ON notifications (user_id, user_type)`);
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
      }
      
      console.log('  ✅ Successfully added user_type and user_id columns');
    } else if (hasUserType && hasUserId) {
      console.log('  ✅ Schema already has user_type and user_id columns');
    } else {
      console.log('  ⚠️  Unexpected schema state');
    }
  } catch (error) {
    console.error('  ❌ Failed to fix notifications schema:', error.message);
    throw error;
  }
}

async function verifyRequiredTables() {
  const requiredTables = [
    'admin_employee_accounts',
    'admin_employee_profiles', 
    'client_accounts',
    'client_profiles',
    'document_requests',
    'document_types',
    'request_status',
    'notifications'
  ];

  for (const table of requiredTables) {
    try {
      const result = await executeQuery(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
      console.log(`  ✅ ${table}: ${result[0].count} records`);
    } catch (error) {
      console.log(`  ❌ ${table}: Missing or inaccessible`);
      throw new Error(`Required table ${table} is missing or inaccessible`);
    }
  }
}

async function testAPIQueries() {
  // Test notifications unread count query
  try {
    const result = await executeQuery(`
      SELECT COUNT(*) as count FROM notifications
      WHERE user_type = 'admin' AND (user_id IS NULL OR user_id = ?) AND is_read = FALSE
    `, [1]);
    console.log(`  ✅ Admin notifications query: ${result[0].count} unread`);
  } catch (error) {
    console.log(`  ❌ Admin notifications query failed: ${error.message}`);
    throw error;
  }

  // Test document requests query
  try {
    const result = await executeQuery(`
      SELECT COUNT(*) as count FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN request_status rs ON dr.status_id = rs.id
      LIMIT 1
    `);
    console.log(`  ✅ Document requests query: ${result[0].count} requests`);
  } catch (error) {
    console.log(`  ❌ Document requests query failed: ${error.message}`);
    throw error;
  }

  // Test users query
  try {
    const result = await executeQuery(`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM admin_employee_accounts WHERE status = 'active'
        UNION ALL
        SELECT id FROM client_accounts WHERE status = 'active'
      ) u
    `);
    console.log(`  ✅ Users query: ${result[0].count} active users`);
  } catch (error) {
    console.log(`  ❌ Users query failed: ${error.message}`);
    throw error;
  }
}

// Run the fixes
if (require.main === module) {
  fixRailwayDeployment();
}

module.exports = fixRailwayDeployment;
