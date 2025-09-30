const { executeQuery } = require('./src/config/database');

async function checkAuditLogs() {
  try {
    console.log('🔍 Checking audit_logs table...');
    
    // Check if table exists
    const tableExists = await executeQuery('SHOW TABLES LIKE ?', ['audit_logs']);
    console.log('Table exists:', tableExists.length > 0);
    
    if (tableExists.length > 0) {
      // Check table structure
      const structure = await executeQuery('DESCRIBE audit_logs');
      console.log('Table structure:', structure.map(col => col.Field).join(', '));
      
      // Check record count
      const count = await executeQuery('SELECT COUNT(*) as count FROM audit_logs');
      console.log('Total records in audit_logs:', count[0].count);
      
      // Get recent records
      const recent = await executeQuery('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5');
      console.log('Recent records:', recent.length);
      recent.forEach((record, i) => {
        console.log(`Record ${i+1}:`, {
          id: record.id,
          user_type: record.user_type,
          action: record.action,
          ip_address: record.ip_address,
          created_at: record.created_at
        });
      });
    }
    
    // Also check request_status_history for comparison
    const historyCount = await executeQuery('SELECT COUNT(*) as count FROM request_status_history');
    console.log('Total records in request_status_history:', historyCount[0].count);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAuditLogs();
