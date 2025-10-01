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

