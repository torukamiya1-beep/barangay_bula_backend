const { executeQuery } = require('../config/database');

/**
 * Activity Logger Middleware
 * Captures IP addresses and logs all user activities to audit_logs table
 */

// Helper function to get client IP address
const getClientIP = (req) => {
  // Check for IP from various headers (handles proxies, load balancers, etc.)
  const forwarded = req.headers['x-forwarded-for'];
  const realIP = req.headers['x-real-ip'];
  const cfConnectingIP = req.headers['cf-connecting-ip']; // Cloudflare
  const remoteAddr = req.connection?.remoteAddress || req.socket?.remoteAddress;
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (remoteAddr) {
    // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
    return remoteAddr.replace(/^::ffff:/, '');
  }
  
  return 'unknown';
};

// Helper function to get user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

// Main activity logging function
const logActivity = async (options) => {
  try {
    const {
      userId,
      userType,
      action,
      tableName = null,
      recordId = null,
      oldValues = null,
      newValues = null,
      ipAddress,
      userAgent,
      additionalData = null
    } = options;

    // Prepare values for database insertion
    const oldValuesJson = oldValues ? JSON.stringify(oldValues) : null;
    const newValuesJson = newValues ? JSON.stringify(newValues) : null;
    const additionalDataJson = additionalData ? JSON.stringify(additionalData) : null;

    await executeQuery(`
      INSERT INTO audit_logs (
        user_id, user_type, action, table_name, record_id, 
        old_values, new_values, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      userType,
      action,
      tableName,
      recordId,
      oldValuesJson,
      newValuesJson,
      ipAddress,
      userAgent
    ]);

    console.log(`✅ Activity logged: ${action} by ${userType} user ${userId} from IP ${ipAddress}`);
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    // Don't throw error to avoid breaking the main application flow
  }
};

// Middleware to capture IP and attach logging function to request
const activityLoggerMiddleware = (req, res, next) => {
  // Capture IP address and user agent
  req.clientIP = getClientIP(req);
  req.userAgent = getUserAgent(req);
  
  // Attach logging function to request object
  req.logActivity = async (options) => {
    await logActivity({
      ...options,
      ipAddress: req.clientIP,
      userAgent: req.userAgent
    });
  };
  
  next();
};

// Specific logging functions for different activity types
const logAuthActivity = async (req, userId, userType, action, additionalData = null) => {
  await req.logActivity({
    userId,
    userType,
    action,
    additionalData
  });
};

const logDocumentActivity = async (req, userId, userType, action, documentId, oldValues = null, newValues = null) => {
  await req.logActivity({
    userId,
    userType,
    action,
    tableName: 'document_requests',
    recordId: documentId,
    oldValues,
    newValues
  });
};

const logUserManagementActivity = async (req, adminId, action, targetUserId, oldValues = null, newValues = null) => {
  await req.logActivity({
    userId: adminId,
    userType: 'admin',
    action,
    tableName: 'users',
    recordId: targetUserId,
    oldValues,
    newValues
  });
};

const logSystemActivity = async (req, userId, userType, action, additionalData = null) => {
  await req.logActivity({
    userId,
    userType,
    action,
    additionalData
  });
};

// Activity constants for consistency
const ACTIVITY_TYPES = {
  // Authentication
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_SUCCESS: 'password_reset_success',
  SESSION_TIMEOUT: 'session_timeout',
  
  // Registration
  CLIENT_REGISTRATION_ATTEMPT: 'client_registration_attempt',
  CLIENT_REGISTRATION_SUCCESS: 'client_registration_success',
  ACCOUNT_VERIFICATION: 'account_verification',
  ACCOUNT_APPROVAL: 'account_approval',
  ACCOUNT_REJECTION: 'account_rejection',
  
  // Document Requests
  DOCUMENT_REQUEST_SUBMIT: 'document_request_submit',
  DOCUMENT_STATUS_CHANGE: 'document_status_change',
  PAYMENT_SUBMIT: 'payment_submit',
  PAYMENT_CONFIRM: 'payment_confirm',
  DOCUMENT_PICKUP: 'document_pickup',
  DOCUMENT_COMPLETE: 'document_complete',
  
  // Administrative
  ADMIN_LOGIN: 'admin_login',
  ADMIN_LOGOUT: 'admin_logout',
  USER_ACCOUNT_CREATE: 'user_account_create',
  USER_ACCOUNT_UPDATE: 'user_account_update',
  USER_ACCOUNT_DELETE: 'user_account_delete',
  SYSTEM_CONFIG_CHANGE: 'system_config_change',
  REPORT_GENERATE: 'report_generate',
  
  // System
  DATABASE_BACKUP: 'database_backup',
  EMAIL_NOTIFICATION_SENT: 'email_notification_sent',
  SYSTEM_ERROR: 'system_error'
};

module.exports = {
  activityLoggerMiddleware,
  logActivity,
  logAuthActivity,
  logDocumentActivity,
  logUserManagementActivity,
  logSystemActivity,
  ACTIVITY_TYPES,
  getClientIP,
  getUserAgent
};
