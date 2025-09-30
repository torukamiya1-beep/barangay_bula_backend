const express = require('express');
const { executeQuery } = require('../config/database');
const DatabaseUtils = require('../utils/database');
const smsService = require('../services/smsService');

const router = express.Router();

// Test database connection
router.get('/connection', async (req, res) => {
  try {
    const health = await DatabaseUtils.checkHealth();
    res.json({
      success: true,
      message: 'Database connection test',
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test database tables
router.get('/tables', async (req, res) => {
  try {
    const tables = await DatabaseUtils.checkTables();
    res.json({
      success: true,
      message: 'Database tables check',
      data: tables,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database tables check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test database statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await DatabaseUtils.getStats();
    res.json({
      success: true,
      message: 'Database statistics',
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test specific table data
router.get('/sample-data', async (req, res) => {
  try {
    const queries = {
      civil_status: 'SELECT * FROM civil_status LIMIT 5',
      document_types: 'SELECT * FROM document_types LIMIT 5',
      request_status: 'SELECT * FROM request_status LIMIT 5',
      purpose_categories: 'SELECT * FROM purpose_categories LIMIT 5'
    };

    const results = {};
    for (const [key, query] of Object.entries(queries)) {
      try {
        const result = await executeQuery(query);
        results[key] = result;
      } catch (error) {
        results[key] = { error: error.message };
      }
    }

    res.json({
      success: true,
      message: 'Sample data from lookup tables',
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get sample data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test admin account
router.get('/admin-check', async (req, res) => {
  try {
    const query = `
      SELECT 
        aea.id,
        aea.username,
        aea.role,
        aea.status,
        aep.first_name,
        aep.last_name,
        aep.email,
        aep.position
      FROM admin_employee_accounts aea
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      WHERE aea.role = 'admin'
      LIMIT 5
    `;
    
    const admins = await executeQuery(query);
    
    res.json({
      success: true,
      message: 'Admin accounts check',
      data: {
        admin_count: admins.length,
        admins: admins
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check admin accounts',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test client view
router.get('/client-view', async (req, res) => {
  try {
    const query = `
      SELECT * FROM v_client_complete 
      LIMIT 5
    `;
    
    const clients = await executeQuery(query);
    
    res.json({
      success: true,
      message: 'Client view test',
      data: {
        client_count: clients.length,
        clients: clients
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test client view',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test age calculation function
router.get('/test-functions', async (req, res) => {
  try {
    const queries = [
      "SELECT CalculateAge('1990-05-15') as age_test_1",
      "SELECT CalculateAge('2000-12-25') as age_test_2",
      "SELECT GenerateRequestNumber('CED') as request_number_test"
    ];

    const results = {};
    for (let i = 0; i < queries.length; i++) {
      try {
        const result = await executeQuery(queries[i]);
        results[`test_${i + 1}`] = result[0];
      } catch (error) {
        results[`test_${i + 1}`] = { error: error.message };
      }
    }

    res.json({
      success: true,
      message: 'Database functions test',
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to test database functions',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test document request validation without authentication
router.post('/validate-request', async (req, res) => {
  try {
    const { validateSubmitRequest } = require('../middleware/documentRequestValidation');
    const { validationResult } = require('express-validator');

    // Run validation
    await Promise.all(validateSubmitRequest.map(validation => validation.run(req)));

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Validation passed',
      data: req.body,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Validation test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test SMS functionality
router.post('/sms', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required',
        timestamp: new Date().toISOString()
      });
    }

    console.log('Testing SMS functionality', { phoneNumber, message });

    const result = await smsService.sendSMS(phoneNumber, message);

    res.json({
      success: true,
      message: 'SMS test completed',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SMS test failed:', error);
    res.status(500).json({
      success: false,
      message: 'SMS test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
