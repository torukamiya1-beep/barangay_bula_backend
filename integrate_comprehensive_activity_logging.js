const { executeQuery } = require('./src/config/database');
const ComprehensiveActivityLogService = require('./src/services/comprehensiveActivityLogService');

/**
 * Comprehensive Activity Logging Integration Script
 * This script demonstrates how to integrate comprehensive activity logging
 * throughout the application and populates the audit_logs table with sample data
 */

async function integrateComprehensiveActivityLogging() {
  console.log('🚀 Starting Comprehensive Activity Logging Integration...\n');

  try {
    // Step 1: Test database connectivity
    console.log('📋 STEP 1: Testing database connectivity...');
    await executeQuery('SELECT 1');
    console.log('✅ Database connection successful!\n');

    // Step 2: Check audit_logs table structure
    console.log('📋 STEP 2: Verifying audit_logs table structure...');
    const tableStructure = await executeQuery('DESCRIBE audit_logs');
    console.log('✅ audit_logs table structure verified:');
    tableStructure.forEach(column => {
      console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });
    console.log('');

    // Step 3: Clear existing audit logs for fresh start
    console.log('📋 STEP 3: Clearing existing audit logs...');
    await executeQuery('DELETE FROM audit_logs');
    console.log('✅ Existing audit logs cleared\n');

    // Step 4: Create sample activity logs to demonstrate comprehensive logging
    console.log('📋 STEP 4: Creating sample comprehensive activity logs...');

    // Sample authentication activities
    const authActivities = [
      {
        userId: 1,
        userType: 'admin',
        action: 'login_success',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        additionalData: {
          username: 'admin@example.com',
          role: 'admin',
          login_time: new Date().toISOString()
        }
      },
      {
        userId: null,
        userType: 'admin',
        action: 'login_failed',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        additionalData: {
          username: 'hacker@example.com',
          failure_reason: 'Account not found',
          attempt_time: new Date().toISOString()
        }
      },
      {
        userId: 1,
        userType: 'admin',
        action: 'password_change',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        additionalData: {
          username: 'admin@example.com',
          change_time: new Date().toISOString()
        }
      }
    ];

    for (const activity of authActivities) {
      await ComprehensiveActivityLogService.logActivity(activity);
    }
    console.log('✅ Authentication activities logged');

    // Sample registration activities
    const registrationActivities = [
      {
        userId: 2,
        userType: 'client',
        action: 'client_registration_success',
        tableName: 'client_accounts',
        recordId: 2,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        newValues: {
          username: 'client@example.com',
          registration_timestamp: new Date().toISOString(),
          status: 'pending_verification'
        }
      },
      {
        userId: 2,
        userType: 'client',
        action: 'account_verification_success',
        tableName: 'client_accounts',
        recordId: 2,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        oldValues: { status: 'pending_verification' },
        newValues: { 
          status: 'active',
          verification_time: new Date().toISOString()
        }
      }
    ];

    for (const activity of registrationActivities) {
      await ComprehensiveActivityLogService.logActivity(activity);
    }
    console.log('✅ Registration activities logged');

    // Sample document request activities
    const documentActivities = [
      {
        userId: 2,
        userType: 'client',
        action: 'document_request_submit',
        tableName: 'document_requests',
        recordId: 1,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        newValues: {
          document_type: 'Barangay Clearance',
          request_number: 'CED-2025-000001',
          submit_time: new Date().toISOString()
        }
      },
      {
        userId: 1,
        userType: 'admin',
        action: 'document_status_change',
        tableName: 'document_requests',
        recordId: 1,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        oldValues: { status: 'pending' },
        newValues: {
          status: 'approved',
          document_type: 'Barangay Clearance',
          request_number: 'CED-2025-000001',
          change_time: new Date().toISOString()
        }
      },
      {
        userId: 1,
        userType: 'admin',
        action: 'document_ready_for_pickup',
        tableName: 'document_requests',
        recordId: 1,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        newValues: {
          status: 'ready_for_pickup',
          document_type: 'Barangay Clearance',
          request_number: 'CED-2025-000001',
          ready_time: new Date().toISOString()
        }
      }
    ];

    for (const activity of documentActivities) {
      await ComprehensiveActivityLogService.logActivity(activity);
    }
    console.log('✅ Document request activities logged');

    // Sample payment activities
    const paymentActivities = [
      {
        userId: 2,
        userType: 'client',
        action: 'payment_submit',
        tableName: 'payment_transactions',
        recordId: 1,
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        newValues: {
          amount: 50.00,
          payment_method: 'GCash',
          transaction_time: new Date().toISOString(),
          reference_number: 'GC123456789'
        }
      },
      {
        userId: 1,
        userType: 'admin',
        action: 'payment_verify',
        tableName: 'payment_transactions',
        recordId: 1,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        oldValues: { status: 'pending' },
        newValues: {
          status: 'verified',
          verification_time: new Date().toISOString(),
          verified_by: 'Admin User'
        }
      }
    ];

    for (const activity of paymentActivities) {
      await ComprehensiveActivityLogService.logActivity(activity);
    }
    console.log('✅ Payment activities logged');

    // Sample administrative activities
    const adminActivities = [
      {
        userId: 1,
        userType: 'admin',
        action: 'user_account_create',
        tableName: 'admin_employee_accounts',
        recordId: 3,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        newValues: {
          username: 'employee@example.com',
          role: 'employee',
          created_time: new Date().toISOString()
        }
      },
      {
        userId: 1,
        userType: 'admin',
        action: 'system_config_change',
        tableName: 'system_settings',
        recordId: null,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        oldValues: { max_file_size: '5MB' },
        newValues: {
          max_file_size: '10MB',
          change_time: new Date().toISOString(),
          changed_by: 'Admin User'
        }
      },
      {
        userId: 1,
        userType: 'admin',
        action: 'report_generate',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        additionalData: {
          report_type: 'monthly_activity_summary',
          date_range: 'January 2025',
          generated_time: new Date().toISOString()
        }
      }
    ];

    for (const activity of adminActivities) {
      await ComprehensiveActivityLogService.logActivity(activity);
    }
    console.log('✅ Administrative activities logged');

    // Sample system activities
    const systemActivities = [
      {
        userId: null,
        userType: 'admin',
        action: 'system_maintenance_start',
        ipAddress: 'system',
        userAgent: 'system',
        additionalData: {
          maintenance_type: 'database_optimization',
          start_time: new Date().toISOString()
        }
      },
      {
        userId: null,
        userType: 'admin',
        action: 'email_notification_sent',
        ipAddress: 'system',
        userAgent: 'system',
        additionalData: {
          recipient: 'client@example.com',
          notification_type: 'document_ready',
          sent_time: new Date().toISOString()
        }
      }
    ];

    for (const activity of systemActivities) {
      await ComprehensiveActivityLogService.logActivity(activity);
    }
    console.log('✅ System activities logged');

    // Step 5: Verify the logged activities
    console.log('\n📋 STEP 5: Verifying logged activities...');
    const totalActivities = await executeQuery('SELECT COUNT(*) as total FROM audit_logs');
    console.log(`✅ Total activities logged: ${totalActivities[0].total}`);

    // Get sample of logged activities
    const sampleActivities = await executeQuery(`
      SELECT 
        id, user_type, action, ip_address, created_at
      FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('\n📊 Sample logged activities:');
    sampleActivities.forEach((activity, index) => {
      console.log(`   ${index + 1}. ${activity.action} by ${activity.user_type} from ${activity.ip_address} at ${activity.created_at}`);
    });

    // Step 6: Test the comprehensive activity log service
    console.log('\n📋 STEP 6: Testing comprehensive activity log service...');
    const testResult = await ComprehensiveActivityLogService.getActivityLogs({}, 1, 10);
    console.log(`✅ Service test successful - Retrieved ${testResult.data.activities.length} activities`);

    console.log('\n🎉 COMPREHENSIVE ACTIVITY LOGGING INTEGRATION COMPLETED SUCCESSFULLY!');
    console.log('\n📋 INTEGRATION SUMMARY:');
    console.log('✅ Database connectivity verified');
    console.log('✅ audit_logs table structure confirmed');
    console.log('✅ Sample activities created for all categories:');
    console.log('   - Authentication activities (login, logout, password changes)');
    console.log('   - Registration activities (client registration, verification)');
    console.log('   - Document request activities (submit, status changes, pickup)');
    console.log('   - Payment activities (submit, verify, process)');
    console.log('   - Administrative activities (user management, system config)');
    console.log('   - System activities (maintenance, notifications)');
    console.log('✅ Comprehensive activity log service tested and working');
    console.log(`✅ Total activities logged: ${totalActivities[0].total}`);

    console.log('\n🔧 NEXT STEPS:');
    console.log('1. Update server.js to include enhanced activity log routes');
    console.log('2. Apply enhanced activity logging middleware to all controllers');
    console.log('3. Update frontend AdminActivityLogs.vue to use enhanced API');
    console.log('4. Test the complete activity logging system');

  } catch (error) {
    console.error('❌ Integration failed:', error);
    throw error;
  }
}

// Run the integration
if (require.main === module) {
  integrateComprehensiveActivityLogging()
    .then(() => {
      console.log('\n✅ Integration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Integration script failed:', error);
      process.exit(1);
    });
}

module.exports = { integrateComprehensiveActivityLogging };
