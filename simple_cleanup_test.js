const { executeQuery } = require('./src/config/database');

async function simpleCleanupAndTest() {
  try {
    console.log('🧹 Simple cleanup and test...\n');
    
    // 1. Clean up the incomplete request
    console.log('1. Cleaning up incomplete request ID 173:');
    const deleteResult = await executeQuery('DELETE FROM document_requests WHERE id = 173');
    console.log('✅ Deleted incomplete request, affected rows:', deleteResult.affectedRows || 'unknown');
    
    // 2. Verify cleanup
    console.log('\n2. Verifying cleanup:');
    const verifyCleanup = await executeQuery('SELECT * FROM document_requests WHERE id = 173');
    console.log('Remaining records with ID 173:', verifyCleanup.length);
    
    // 3. Check current rate limiting status
    console.log('\n3. Checking current rate limiting status:');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    
    const limitingRequests = await executeQuery(`
      SELECT 
        dr.id, dr.request_number, dr.client_id, dr.created_at, rs.status_name
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      WHERE dr.document_type_id = 2
        AND dr.created_at >= ?
        AND rs.status_name IN ('pending', 'under_review', 'additional_info_required', 'approved', 'processing', 'ready_for_pickup', 'completed')
      ORDER BY dr.created_at DESC
    `, [cutoffDate]);
    
    console.log('Barangay Clearance requests within 180 days that count toward limit:', limitingRequests.length);
    if (limitingRequests.length > 0) {
      console.table(limitingRequests);
    } else {
      console.log('✅ No limiting requests found - rate limiting should be cleared');
    }
    
    // 4. Test basic database operations
    console.log('\n4. Testing basic database operations:');
    const testQuery = await executeQuery('SELECT COUNT(*) as total FROM document_requests');
    console.log('Total document requests in database:', testQuery[0].total);
    
    const bcaCount = await executeQuery('SELECT COUNT(*) as total FROM barangay_clearance_applications');
    console.log('Total barangay clearance applications:', bcaCount[0].total);
    
    console.log('\n✅ Cleanup and basic tests completed successfully!');
    console.log('The rate limiting issue should now be resolved.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

simpleCleanupAndTest();
