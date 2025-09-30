require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('./src/config/database');

async function simpleDbCheck() {
  try {
    console.log('🔍 Simple Database Check...\n');
    
    await connectDatabase();
    
    // Check if audit_logs exists
    const auditCheck = await executeQuery(`
      SELECT COUNT(*) as exists_count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'audit_logs'
    `, [process.env.DB_NAME || 'barangay_management_system']);
    
    console.log('Audit logs table exists:', auditCheck[0].exists_count > 0 ? 'YES' : 'NO');
    
    if (auditCheck[0].exists_count > 0) {
      // Get audit_logs structure
      const auditStructure = await executeQuery(`DESCRIBE audit_logs`);
      console.log('\nAudit logs structure:');
      auditStructure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
      
      // Get sample data
      const auditSample = await executeQuery(`SELECT * FROM audit_logs LIMIT 3`);
      console.log('\nSample audit logs:');
      auditSample.forEach((record, i) => {
        console.log(`  ${i + 1}. Action: ${record.action}, User: ${record.user_id}, IP: ${record.ip_address || 'N/A'}`);
      });
    }
    
    // Check request_status_history
    const statusCount = await executeQuery(`SELECT COUNT(*) as count FROM request_status_history`);
    console.log(`\nRequest status history records: ${statusCount[0].count}`);
    
    // Check for IP fields in any table
    const ipFields = await executeQuery(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = ? 
      AND (column_name LIKE '%ip%' OR column_name LIKE '%address%')
    `, [process.env.DB_NAME || 'barangay_management_system']);
    
    console.log('\nIP address fields found:');
    ipFields.forEach(field => {
      console.log(`  ${field.table_name}.${field.column_name}`);
    });
    
    await closeDatabase();
    console.log('\n✅ Database check completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await closeDatabase();
  }
}

simpleDbCheck();
