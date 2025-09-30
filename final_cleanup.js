const { executeQuery } = require('./src/config/database');

async function finalCleanup() {
  try {
    console.log('🧹 Final cleanup to resolve rate limiting...\n');
    
    // Option 1: Change status to 'cancelled' (doesn't count toward limit)
    console.log('1. Changing test request status to cancelled:');
    await executeQuery('UPDATE document_requests SET status_id = 6 WHERE id IN (174, 175)');
    console.log('✅ Changed test requests to cancelled status');
    
    // Verify rate limiting is now clear
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    
    const limitingRequests = await executeQuery(`
      SELECT COUNT(*) as count
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      WHERE dr.document_type_id = 2
        AND dr.created_at >= ?
        AND rs.status_name IN ('pending', 'under_review', 'additional_info_required', 'approved', 'processing', 'ready_for_pickup', 'completed')
    `, [cutoffDate]);
    
    console.log('\n📋 Rate limiting check:');
    console.log('Limiting requests within 180 days:', limitingRequests[0].count);
    
    if (limitingRequests[0].count === 0) {
      console.log('✅ Rate limiting completely resolved!');
      console.log('✅ Users can now submit new Barangay Clearance requests');
    } else {
      console.log('⚠️  Still some limiting requests found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

finalCleanup();
