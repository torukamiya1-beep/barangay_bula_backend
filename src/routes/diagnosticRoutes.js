const express = require('express');
const { executeQuery } = require('../config/database');
const { protect, authorize } = require('../middleware/auth');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');

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

/**
 * @route   GET /api/diagnostic/sms-quota
 * @desc    Check SMS service quota status
 * @access  Private (Admin only)
 */
router.get('/sms-quota', protect, authorize('admin'), async (req, res) => {
  try {
    const quotaInfo = await smsService.checkQuota();
    
    res.json({
      success: true,
      message: 'SMS quota retrieved',
      data: quotaInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check SMS quota',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/diagnostic/email-status
 * @desc    Check email service status
 * @access  Private (Admin only)
 */
router.get('/email-status', protect, authorize('admin'), async (req, res) => {
  try {
    await emailService.verifyConnection();
    
    res.json({
      success: true,
      message: 'Email service is operational',
      data: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        user: process.env.EMAIL_USER ? '***' + process.env.EMAIL_USER.slice(-10) : 'Not configured',
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email service check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   GET /api/diagnostic/notifications
 * @desc    Check both email and SMS notification services
 * @access  Private (Admin only)
 */
router.get('/notifications', protect, authorize('admin'), async (req, res) => {
  try {
    // Check email
    let emailStatus;
    try {
      await emailService.verifyConnection();
      emailStatus = {
        operational: true,
        message: 'Email service is working'
      };
    } catch (emailError) {
      emailStatus = {
        operational: false,
        error: emailError.message
      };
    }
    
    // Check SMS
    const smsQuota = await smsService.checkQuota();
    const smsStatus = {
      enabled: smsService.enabled,
      operational: smsQuota.success,
      quota: smsQuota.quota || null,
      error: smsQuota.error || null
    };
    
    res.json({
      success: true,
      message: 'Notification services status',
      data: {
        email: emailStatus,
        sms: smsStatus
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check notification services',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @route   POST /api/diagnostic/test-email
 * @desc    Send a test email to verify Railway email configuration
 * @access  Private (Admin only)
 */
router.post('/test-email', protect, authorize('admin'), async (req, res) => {
  try {
    const { testEmail } = req.body;
    const recipientEmail = testEmail || 'p71345453@gmail.com'; // Default test email

    const subject = 'Railway Email Test - ' + new Date().toISOString();
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #007bff;">🚀 Railway Email Test</h2>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> Railway Production</p>
        <p><strong>Recipient:</strong> ${recipientEmail}</p>
        <p><strong>Status:</strong> ✅ If you received this, Railway email is working!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated test email from Railway environment.
        </p>
      </div>
    `;

    const result = await emailService.sendEmail(recipientEmail, subject, htmlContent);

    res.json({
      success: true,
      message: 'Test email sent from Railway',
      data: {
        recipient: recipientEmail,
        messageId: result.messageId,
        environment: 'Railway Production',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test email from Railway',
      error: error.message,
      environment: 'Railway Production',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
