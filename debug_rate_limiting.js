const { executeQuery } = require('./src/config/database');

async function debugRateLimiting() {
  try {
    console.log('🔍 Debugging Barangay Clearance Rate Limiting Issue...\n');
    
    // 1. Check recent Barangay Clearance requests for all clients
    console.log('📋 1. RECENT BARANGAY CLEARANCE REQUESTS (All Clients):');
    const allRequests = await executeQuery(`
      SELECT 
        dr.id, dr.request_number, dr.client_id, dr.created_at, dr.status_id,
        rs.status_name, cp.first_name, cp.last_name,
        bca.has_pending_cases, bca.pending_cases_details
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      LEFT JOIN barangay_clearance_applications bca ON dr.id = bca.request_id
      WHERE dr.document_type_id = 2
      ORDER BY dr.created_at DESC 
      LIMIT 10
    `);
    console.table(allRequests);
    
    // 2. Check for today's requests (9/16/2025)
    console.log('\n📋 2. BARANGAY CLEARANCE REQUESTS FROM TODAY (9/16/2025):');
    const todayRequests = await executeQuery(`
      SELECT 
        dr.id, dr.request_number, dr.client_id, dr.created_at, dr.status_id,
        rs.status_name, cp.first_name, cp.last_name
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      WHERE dr.document_type_id = 2
        AND DATE(dr.created_at) = '2025-09-16'
      ORDER BY dr.created_at DESC
    `);
    console.table(todayRequests);
    
    // 3. Check rate limiting statuses
    console.log('\n📋 3. REQUEST STATUSES THAT COUNT TOWARD RATE LIMITING:');
    const limitingStatuses = ['pending', 'under_review', 'additional_info_required', 'approved', 'processing', 'ready_for_pickup', 'completed'];
    console.log('Limiting statuses:', limitingStatuses);
    
    // 4. Check requests within 180 days (Barangay Clearance limit)
    console.log('\n📋 4. BARANGAY CLEARANCE REQUESTS WITHIN 180 DAYS:');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    console.log('Cutoff date (180 days ago):', cutoffDate.toISOString());
    
    const recentLimitingRequests = await executeQuery(`
      SELECT 
        dr.id, dr.request_number, dr.client_id, dr.created_at, dr.status_id,
        rs.status_name, cp.first_name, cp.last_name,
        DATEDIFF(NOW(), dr.created_at) as days_ago
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      WHERE dr.document_type_id = 2
        AND dr.created_at >= ?
        AND rs.status_name IN ('pending', 'under_review', 'additional_info_required', 'approved', 'processing', 'ready_for_pickup', 'completed')
      ORDER BY dr.created_at DESC
    `, [cutoffDate]);
    console.table(recentLimitingRequests);
    
    // 5. Check for incomplete/failed requests
    console.log('\n📋 5. INCOMPLETE/FAILED BARANGAY CLEARANCE REQUESTS:');
    const incompleteRequests = await executeQuery(`
      SELECT 
        dr.id, dr.request_number, dr.client_id, dr.created_at, dr.status_id,
        rs.status_name, cp.first_name, cp.last_name,
        CASE WHEN bca.id IS NULL THEN 'NO_BCA_RECORD' ELSE 'HAS_BCA_RECORD' END as bca_status
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      LEFT JOIN barangay_clearance_applications bca ON dr.id = bca.request_id
      WHERE dr.document_type_id = 2
        AND (bca.id IS NULL OR rs.status_name IN ('cancelled', 'rejected'))
      ORDER BY dr.created_at DESC
      LIMIT 5
    `);
    console.table(incompleteRequests);
    
    // 6. Check specific client that's getting rate limited
    console.log('\n📋 6. CHECKING SPECIFIC CLIENT REQUESTS:');
    // Let's check the most recent client who made a request
    if (allRequests.length > 0) {
      const latestClientId = allRequests[0].client_id;
      console.log('Latest client ID:', latestClientId);
      
      const clientRequests = await executeQuery(`
        SELECT 
          dr.id, dr.request_number, dr.created_at, dr.status_id,
          rs.status_name, dt.type_name,
          DATEDIFF(NOW(), dr.created_at) as days_ago
        FROM document_requests dr
        JOIN request_status rs ON dr.status_id = rs.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.client_id = ?
        ORDER BY dr.created_at DESC
        LIMIT 10
      `, [latestClientId]);
      console.table(clientRequests);
    }
    
    // 7. Calculate next allowed date for Barangay Clearance
    console.log('\n📋 7. NEXT ALLOWED DATE CALCULATION:');
    if (recentLimitingRequests.length > 0) {
      const lastRequest = recentLimitingRequests[0];
      const nextAllowedDate = new Date(lastRequest.created_at);
      nextAllowedDate.setDate(nextAllowedDate.getDate() + 180); // 180 days for Barangay Clearance
      
      console.log('Last request date:', new Date(lastRequest.created_at).toLocaleDateString());
      console.log('Next allowed date:', nextAllowedDate.toLocaleDateString());
      console.log('Days remaining:', Math.ceil((nextAllowedDate - new Date()) / (1000 * 60 * 60 * 24)));
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

debugRateLimiting();
