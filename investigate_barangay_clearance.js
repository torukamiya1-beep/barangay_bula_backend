const { executeQuery } = require('./src/config/database');

async function investigateDatabase() {
  try {
    console.log('🔍 Investigating Barangay Clearance database schema and recent submissions...\n');
    
    // 1. Check barangay_clearance_applications table structure
    console.log('📋 1. BARANGAY_CLEARANCE_APPLICATIONS TABLE STRUCTURE:');
    const tableStructure = await executeQuery('DESCRIBE barangay_clearance_applications');
    console.table(tableStructure);
    
    // 2. Check recent document requests for barangay clearance
    console.log('\n📋 2. RECENT BARANGAY CLEARANCE REQUESTS (Last 10):');
    const recentRequests = await executeQuery(`
      SELECT
        dr.id, dr.request_number, dr.created_at, dr.status_id,
        dr.is_third_party_request, dr.purpose_details,
        bca.has_pending_cases, bca.pending_cases_details
      FROM document_requests dr
      LEFT JOIN barangay_clearance_applications bca ON dr.id = bca.request_id
      WHERE dr.document_type_id = 2
      ORDER BY dr.created_at DESC
      LIMIT 10
    `);
    console.table(recentRequests);
    
    // 3. Check if barangay_clearance_applications has any data
    console.log('\n📋 3. BARANGAY_CLEARANCE_APPLICATIONS DATA (Last 10):');
    const bcaData = await executeQuery(`
      SELECT bca.*, dr.request_number 
      FROM barangay_clearance_applications bca
      JOIN document_requests dr ON bca.request_id = dr.id
      ORDER BY bca.created_at DESC 
      LIMIT 10
    `);
    console.table(bcaData);
    
    // 4. Check supporting documents for recent barangay clearance requests
    console.log('\n📋 4. SUPPORTING DOCUMENTS FOR BARANGAY CLEARANCE:');
    const supportingDocs = await executeQuery(`
      SELECT 
        sd.id, sd.request_id, sd.document_type, sd.document_name, 
        sd.file_path, sd.created_at, dr.request_number
      FROM supporting_documents sd
      JOIN document_requests dr ON sd.request_id = dr.id
      WHERE dr.document_type_id = 2
      ORDER BY sd.created_at DESC 
      LIMIT 10
    `);
    console.table(supportingDocs);
    
    // 5. Check document_requests table structure for missing fields
    console.log('\n📋 5. DOCUMENT_REQUESTS TABLE STRUCTURE:');
    const drStructure = await executeQuery('DESCRIBE document_requests');
    console.table(drStructure);
    
    // 6. Check if there are any authorized pickup persons
    console.log('\n📋 6. AUTHORIZED PICKUP PERSONS:');
    const pickupPersons = await executeQuery(`
      SELECT app.*, dr.request_number 
      FROM authorized_pickup_persons app
      JOIN document_requests dr ON app.request_id = dr.id
      WHERE dr.document_type_id = 2
      ORDER BY app.created_at DESC 
      LIMIT 5
    `);
    console.table(pickupPersons);
    
  } catch (error) {
    console.error('❌ Database investigation failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

investigateDatabase();
