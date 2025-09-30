const { executeQuery } = require('./src/config/database');

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking current database structure...\n');
    
    // Check barangay_clearance_applications table structure
    console.log('📋 BARANGAY_CLEARANCE_APPLICATIONS TABLE STRUCTURE:');
    const tableStructure = await executeQuery('DESCRIBE barangay_clearance_applications');
    console.table(tableStructure);
    
    // Check document_types
    console.log('\n📋 DOCUMENT TYPES:');
    const docTypes = await executeQuery('SELECT * FROM document_types ORDER BY id');
    console.table(docTypes);
    
    // Check recent requests
    console.log('\n📋 RECENT BARANGAY CLEARANCE REQUESTS:');
    const recentRequests = await executeQuery(`
      SELECT dr.id, dr.request_number, dr.status_id, dr.created_at,
             bca.has_pending_cases, bca.pending_cases_details
      FROM document_requests dr
      LEFT JOIN barangay_clearance_applications bca ON dr.id = bca.request_id
      WHERE dr.document_type_id = 2
      ORDER BY dr.created_at DESC
      LIMIT 5
    `);
    console.table(recentRequests);
    
    // Check request_status table
    console.log('\n📋 REQUEST STATUS OPTIONS:');
    const statusOptions = await executeQuery('SELECT * FROM request_status ORDER BY id');
    console.table(statusOptions);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

checkDatabaseStructure();
