const { executeQuery } = require('./src/config/database');

async function quickCheck() {
  try {
    console.log('🔍 Quick database check...\n');
    
    // Check document_requests table structure
    console.log('📋 DOCUMENT_REQUESTS TABLE STRUCTURE:');
    const drStructure = await executeQuery('DESCRIBE document_requests');
    console.table(drStructure);
    
    // Check recent barangay clearance requests
    console.log('\n📋 RECENT BARANGAY CLEARANCE REQUESTS:');
    const recentRequests = await executeQuery(`
      SELECT dr.id, dr.request_number, dr.created_at, dr.status_id
      FROM document_requests dr 
      WHERE dr.document_type_id = 2 
      ORDER BY dr.created_at DESC 
      LIMIT 5
    `);
    console.table(recentRequests);
    
    // Check barangay_clearance_applications data
    console.log('\n📋 BARANGAY_CLEARANCE_APPLICATIONS DATA:');
    const bcaData = await executeQuery(`
      SELECT * FROM barangay_clearance_applications 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.table(bcaData);
    
    // Check supporting documents
    console.log('\n📋 SUPPORTING DOCUMENTS FOR BARANGAY CLEARANCE:');
    const supportingDocs = await executeQuery(`
      SELECT sd.id, sd.request_id, sd.document_type, sd.document_name, sd.created_at
      FROM supporting_documents sd
      JOIN document_requests dr ON sd.request_id = dr.id
      WHERE dr.document_type_id = 2
      ORDER BY sd.created_at DESC 
      LIMIT 5
    `);
    console.table(supportingDocs);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

quickCheck();
