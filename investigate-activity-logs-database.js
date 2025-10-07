const mysql = require('mysql2/promise');

async function investigateActivityLogsDatabase() {
  console.log('🔍 INVESTIGATING ACTIVITY LOGS DATABASE STRUCTURE');
  console.log('='.repeat(60));

  const connection = await mysql.createConnection({
    host: 'hopper.proxy.rlwy.net',
    port: 26646,
    user: 'root',
    password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
    database: 'railway'
  });

  try {
    console.log('✅ Connected to Railway database');

    // Check audit_logs table structure
    console.log('\n🔍 1. AUDIT_LOGS TABLE STRUCTURE:');
    try {
      const [structure] = await connection.execute('DESCRIBE audit_logs');
      console.table(structure);
    } catch (error) {
      console.error('❌ Error checking audit_logs structure:', error.message);
    }

    // Check sample audit_logs data
    console.log('\n🔍 2. SAMPLE AUDIT_LOGS DATA:');
    try {
      const [auditLogs] = await connection.execute(`
        SELECT id, user_id, user_type, action, table_name, record_id, 
               old_values, new_values, ip_address, created_at 
        FROM audit_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('Found', auditLogs.length, 'audit log entries:');
      auditLogs.forEach((log, index) => {
        console.log(`\n--- Audit Log ${index + 1} ---`);
        console.log('ID:', log.id);
        console.log('User ID:', log.user_id);
        console.log('User Type:', log.user_type);
        console.log('Action:', log.action);
        console.log('Table Name:', log.table_name);
        console.log('Record ID:', log.record_id);
        console.log('Old Values:', log.old_values ? log.old_values.substring(0, 200) + '...' : 'NULL');
        console.log('New Values:', log.new_values ? log.new_values.substring(0, 200) + '...' : 'NULL');
        console.log('IP Address:', log.ip_address);
        console.log('Created At:', log.created_at);
      });
    } catch (error) {
      console.error('❌ Error checking audit_logs data:', error.message);
    }

    // Check document_types table
    console.log('\n🔍 3. DOCUMENT_TYPES TABLE:');
    try {
      const [docTypes] = await connection.execute('SELECT * FROM document_types');
      console.log('Document Types Available:');
      console.table(docTypes);
    } catch (error) {
      console.error('❌ Error checking document_types:', error.message);
    }

    // Check sample request_status_history data with document types
    console.log('\n🔍 4. SAMPLE REQUEST_STATUS_HISTORY WITH DOCUMENT TYPES:');
    try {
      const [statusHistory] = await connection.execute(`
        SELECT 
          rsh.id,
          rsh.request_id,
          rsh.old_status_id,
          rsh.new_status_id,
          rsh.changed_at,
          rsh.changed_by,
          dr.request_number,
          dr.document_type_id,
          dt.type_name as document_type,
          old_rs.status_name as old_status,
          new_rs.status_name as new_status
        FROM request_status_history rsh
        JOIN document_requests dr ON rsh.request_id = dr.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        LEFT JOIN request_status old_rs ON rsh.old_status_id = old_rs.id
        JOIN request_status new_rs ON rsh.new_status_id = new_rs.id
        ORDER BY rsh.changed_at DESC
        LIMIT 5
      `);
      
      console.log('Found', statusHistory.length, 'status history entries:');
      console.table(statusHistory);
    } catch (error) {
      console.error('❌ Error checking status history with document types:', error.message);
    }

    // Check what the backend service is actually returning
    console.log('\n🔍 5. TESTING DOCUMENT TYPE EXTRACTION:');
    try {
      const [testData] = await connection.execute(`
        SELECT old_values, new_values 
        FROM audit_logs 
        WHERE old_values IS NOT NULL OR new_values IS NOT NULL
        LIMIT 3
      `);
      
      console.log('Testing document type extraction from audit_logs:');
      testData.forEach((row, index) => {
        console.log(`\n--- Test ${index + 1} ---`);
        console.log('Old Values:', row.old_values);
        console.log('New Values:', row.new_values);
        
        // Test the extraction logic
        try {
          const values = row.new_values || row.old_values;
          if (values) {
            const parsed = JSON.parse(values);
            console.log('Parsed JSON:', parsed);
            console.log('Document Type Found:', parsed.document_type || 'NOT FOUND');
          }
        } catch (e) {
          console.log('JSON Parse Error:', e.message);
        }
      });
    } catch (error) {
      console.error('❌ Error testing document type extraction:', error.message);
    }

  } catch (error) {
    console.error('❌ Database investigation error:', error.message);
  } finally {
    await connection.end();
    console.log('\n🔌 Database connection closed');
  }
}

investigateActivityLogsDatabase().catch(console.error);
