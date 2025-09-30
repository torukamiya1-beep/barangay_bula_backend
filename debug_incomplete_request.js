const { executeQuery } = require('./src/config/database');

async function debugIncompleteRequest() {
  try {
    console.log('🔍 Debugging incomplete request ID 173...\n');
    
    // Check the document request details
    console.log('📋 DOCUMENT REQUEST DETAILS:');
    const requestDetails = await executeQuery(`
      SELECT * FROM document_requests WHERE id = 173
    `);
    console.table(requestDetails);
    
    // Check if barangay_clearance_applications entry exists
    console.log('\n📋 BARANGAY CLEARANCE APPLICATION CHECK:');
    const bcaCheck = await executeQuery(`
      SELECT * FROM barangay_clearance_applications WHERE request_id = 173
    `);
    console.log('BCA records found:', bcaCheck.length);
    if (bcaCheck.length > 0) {
      console.table(bcaCheck);
    } else {
      console.log('❌ NO barangay_clearance_applications record found for request 173');
    }
    
    // Check supporting documents
    console.log('\n📋 SUPPORTING DOCUMENTS CHECK:');
    const docsCheck = await executeQuery(`
      SELECT * FROM supporting_documents WHERE request_id = 173
    `);
    console.log('Supporting documents found:', docsCheck.length);
    if (docsCheck.length > 0) {
      console.table(docsCheck);
    } else {
      console.log('❌ NO supporting documents found for request 173');
    }
    
    // Check if this is causing the rate limiting issue
    console.log('\n📋 RATE LIMITING IMPACT:');
    console.log('This incomplete request (ID 173) is in "pending" status');
    console.log('It counts toward the 180-day rate limit for Barangay Clearance');
    console.log('Next allowed date: 3/15/2026 (180 days from 9/16/2025)');
    console.log('');
    console.log('SOLUTION OPTIONS:');
    console.log('1. Delete the incomplete request (ID 173)');
    console.log('2. Complete the missing barangay_clearance_applications record');
    console.log('3. Change status to "cancelled" or "rejected" (these don\'t count toward limit)');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

debugIncompleteRequest();
