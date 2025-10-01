const express = require('express');
const { executeQuery } = require('../config/database');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/diagnostic/tables
 * @desc    Check which tables exist in the database
 * @access  Private (Admin only)
 */
router.get('/tables', protect, authorize('admin'), async (req, res) => {
  try {
    const query = 'SHOW TABLES';
    const tables = await executeQuery(query);
    
    res.json({
      success: true,
      message: 'Database tables retrieved',
      data: {
        count: tables.length,
        tables: tables.map(t => Object.values(t)[0])
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tables',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/diagnostic/table-structure/:tableName
 * @desc    Check the structure of a specific table
 * @access  Private (Admin only)
 */
router.get('/table-structure/:tableName', protect, authorize('admin'), async (req, res) => {
  try {
    const { tableName } = req.params;
    const query = `DESCRIBE \`${tableName}\``;
    const structure = await executeQuery(query);
    
    res.json({
      success: true,
      message: `Structure of table ${tableName}`,
      data: structure,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to retrieve structure for table ${req.params.tableName}`,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/diagnostic/test-document-requests
 * @desc    Test document requests query specifically
 * @access  Public (for debugging)
 */
router.get('/test-document-requests', async (req, res) => {
  try {
    console.log('🔍 Testing document requests query...');

    // Test the exact query from adminDocumentService
    const testQuery = `
      SELECT
        dr.id,
        dr.request_number,
        dr.client_id,
        dr.document_type_id,
        dr.purpose_category_id,
        dr.purpose_details,
        dr.requestor_notes,
        dr.status_id,
        dr.priority,
        dr.processed_by,
        dr.approved_by,
        dr.processed_at,
        dr.approved_at,
        dr.payment_method_id,
        dr.payment_status,
        dr.payment_reference,
        dr.total_document_fee,
        dr.requested_at,
        dr.target_completion_date,
        dr.completed_at,
        dr.created_at,
        dr.updated_at,
        dt.type_name as document_type_name,
        pc.category_name as purpose_category_name,
        rs.status_name,
        rs.status_color,
        cp.first_name as client_first_name,
        cp.last_name as client_last_name,
        cp.email as client_email,
        cp.phone_number as client_phone_number
      FROM document_requests dr
      LEFT JOIN document_types dt ON dr.document_type_id = dt.id
      LEFT JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
      LEFT JOIN request_status rs ON dr.status_id = rs.id
      LEFT JOIN client_accounts ca ON dr.client_id = ca.id
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      ORDER BY dr.requested_at DESC
      LIMIT 5
    `;

    const results = await executeQuery(testQuery);
    console.log('✅ Document requests query successful, returned', results.length, 'rows');

    res.json({
      success: true,
      data: {
        query_executed: 'document_requests_with_joins',
        results_count: results.length,
        sample_data: results.length > 0 ? results[0] : null
      }
    });
  } catch (error) {
    console.error('❌ Document requests query failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      query_type: 'document_requests_with_joins'
    });
  }
});

/**
 * @route   GET /api/diagnostic/test-simple
 * @desc    Test simple database queries without authentication
 * @access  Public (for debugging)
 */
router.get('/test-simple', async (req, res) => {
  try {
    console.log('🔍 Starting simple diagnostic test...');

    // Test 1: List all tables
    console.log('📋 Step 1: Listing all tables...');
    const tablesQuery = 'SHOW TABLES';
    const tables = await executeQuery(tablesQuery);
    console.log('✅ Found tables:', tables.map(t => Object.values(t)[0]));

    // Test 2: Check document_requests table structure
    console.log('📋 Step 2: Checking document_requests structure...');
    const docRequestsStructure = await executeQuery('DESCRIBE document_requests');
    console.log('✅ document_requests columns:', docRequestsStructure.map(c => c.Field));

    // Test 3: Simple count query
    console.log('📋 Step 3: Testing simple count...');
    const countResult = await executeQuery('SELECT COUNT(*) as count FROM document_requests');
    console.log('✅ document_requests count:', countResult[0].count);

    res.json({
      success: true,
      data: {
        tables: tables.map(t => Object.values(t)[0]),
        document_requests_columns: docRequestsStructure.map(c => c.Field),
        document_requests_count: countResult[0].count
      }
    });
  } catch (error) {
    console.error('❌ Simple diagnostic test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
  }
});

/**
 * @route   GET /api/diagnostic/test-query
 * @desc    Test a simple query to document_requests table
 * @access  Private (Admin only)
 */
router.get('/test-query', protect, authorize('admin'), async (req, res) => {
  try {
    // Test simple query first
    const simpleQuery = 'SELECT COUNT(*) as count FROM document_requests';
    const simpleResult = await executeQuery(simpleQuery);

    // Test query with JOIN
    const joinQuery = `
      SELECT dr.id, dr.request_number, rs.status_name
      FROM document_requests dr
      LEFT JOIN request_status rs ON dr.status_id = rs.id
      LIMIT 1
    `;
    const joinResult = await executeQuery(joinQuery);
    
    res.json({
      success: true,
      message: 'Test queries executed successfully',
      data: {
        simple_query: {
          query: simpleQuery,
          result: simpleResult
        },
        join_query: {
          query: joinQuery,
          result: joinResult
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test query failed',
      error: {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/diagnostic/check-columns
 * @desc    Check if required columns exist in key tables
 * @access  Private (Admin only)
 */
router.get('/check-columns', protect, authorize('admin'), async (req, res) => {
  try {
    const tablesToCheck = [
      'document_requests',
      'request_status',
      'document_types',
      'client_accounts',
      'client_profiles',
      'admin_employee_accounts',
      'admin_employee_profiles',
      'notifications',
      'audit_logs'
    ];
    
    const results = {};
    
    for (const table of tablesToCheck) {
      try {
        const query = `DESCRIBE \`${table}\``;
        const columns = await executeQuery(query);
        results[table] = {
          exists: true,
          columns: columns.map(c => c.Field)
        };
      } catch (error) {
        results[table] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    res.json({
      success: true,
      message: 'Column check completed',
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Column check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;

