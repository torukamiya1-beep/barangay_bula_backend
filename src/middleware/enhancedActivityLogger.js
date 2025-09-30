const ComprehensiveActivityLogService = require('../services/comprehensiveActivityLogService');

/**
 * Enhanced Activity Logger Middleware
 * Captures IP addresses, user agents, and provides comprehensive logging functions
 */

// Helper function to get client IP address
const getClientIP = (req) => {
  return req.ip ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.headers['x-client-ip'] ||
         req.headers['cf-connecting-ip'] ||
         'unknown';
};

// Helper function to get user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Main middleware function that attaches logging capabilities to request object
 */
const enhancedActivityLogger = (req, res, next) => {
  // Capture client information
  req.clientIP = getClientIP(req);
  req.userAgent = getUserAgent(req);
  
  // Attach comprehensive logging functions to request object
  req.logActivity = async (options) => {
    return await ComprehensiveActivityLogService.logActivity({
      ...options,
      ipAddress: req.clientIP,
      userAgent: req.userAgent
    });
  };

  req.logAuthActivity = async (userId, userType, action, additionalData = {}) => {
    return await ComprehensiveActivityLogService.logAuthActivity(
      userId, userType, action, req.clientIP, req.userAgent, additionalData
    );
  };

  req.logRegistrationActivity = async (userId, userType, action, additionalData = {}) => {
    return await ComprehensiveActivityLogService.logRegistrationActivity(
      userId, userType, action, req.clientIP, req.userAgent, additionalData
    );
  };

  req.logDocumentActivity = async (userId, userType, action, documentId, oldValues = null, newValues = null) => {
    return await ComprehensiveActivityLogService.logDocumentActivity(
      userId, userType, action, documentId, oldValues, newValues, req.clientIP, req.userAgent
    );
  };

  req.logAdminActivity = async (adminId, action, targetTable = null, targetId = null, oldValues = null, newValues = null) => {
    return await ComprehensiveActivityLogService.logAdminActivity(
      adminId, action, targetTable, targetId, oldValues, newValues, req.clientIP, req.userAgent
    );
  };

  req.logSystemActivity = async (action, additionalData = {}) => {
    return await ComprehensiveActivityLogService.logSystemActivity(
      action, additionalData, req.clientIP, req.userAgent
    );
  };

  next();
};

/**
 * Activity type constants for consistency across the application
 */
const ACTIVITY_TYPES = {
  // Authentication Activities
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_SUCCESS: 'password_reset_success',
  PASSWORD_CHANGE: 'password_change',
  SESSION_TIMEOUT: 'session_timeout',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',

  // Registration Activities
  CLIENT_REGISTRATION_ATTEMPT: 'client_registration_attempt',
  CLIENT_REGISTRATION_SUCCESS: 'client_registration_success',
  CLIENT_REGISTRATION_FAILED: 'client_registration_failed',
  ACCOUNT_VERIFICATION_SENT: 'account_verification_sent',
  ACCOUNT_VERIFICATION_SUCCESS: 'account_verification_success',
  ACCOUNT_VERIFICATION_FAILED: 'account_verification_failed',
  ACCOUNT_APPROVAL: 'account_approval',
  ACCOUNT_REJECTION: 'account_rejection',
  ACCOUNT_ACTIVATION: 'account_activation',
  ACCOUNT_DEACTIVATION: 'account_deactivation',

  // Document Request Activities
  DOCUMENT_REQUEST_SUBMIT: 'document_request_submit',
  DOCUMENT_REQUEST_UPDATE: 'document_request_update',
  DOCUMENT_REQUEST_DELETE: 'document_request_delete',
  DOCUMENT_STATUS_CHANGE: 'document_status_change',
  DOCUMENT_APPROVAL: 'document_approval',
  DOCUMENT_REJECTION: 'document_rejection',
  DOCUMENT_PROCESSING_START: 'document_processing_start',
  DOCUMENT_PROCESSING_COMPLETE: 'document_processing_complete',
  DOCUMENT_READY_FOR_PICKUP: 'document_ready_for_pickup',
  DOCUMENT_PICKUP: 'document_pickup',
  DOCUMENT_COMPLETE: 'document_complete',
  DOCUMENT_CANCELLED: 'document_cancelled',

  // Payment Activities
  PAYMENT_SUBMIT: 'payment_submit',
  PAYMENT_CONFIRM: 'payment_confirm',
  PAYMENT_VERIFY: 'payment_verify',
  PAYMENT_REJECT: 'payment_reject',
  PAYMENT_REFUND: 'payment_refund',
  PAYMENT_METHOD_CHANGE: 'payment_method_change',

  // Administrative Activities
  ADMIN_LOGIN: 'admin_login',
  ADMIN_LOGOUT: 'admin_logout',
  ADMIN_PASSWORD_CHANGE: 'admin_password_change',
  USER_ACCOUNT_CREATE: 'user_account_create',
  USER_ACCOUNT_UPDATE: 'user_account_update',
  USER_ACCOUNT_DELETE: 'user_account_delete',
  USER_ROLE_CHANGE: 'user_role_change',
  USER_PERMISSION_CHANGE: 'user_permission_change',
  SYSTEM_CONFIG_CHANGE: 'system_config_change',
  SYSTEM_SETTINGS_UPDATE: 'system_settings_update',
  REPORT_GENERATE: 'report_generate',
  REPORT_EXPORT: 'report_export',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  BACKUP_CREATE: 'backup_create',
  BACKUP_RESTORE: 'backup_restore',

  // System Activities
  DATABASE_BACKUP: 'database_backup',
  DATABASE_RESTORE: 'database_restore',
  EMAIL_NOTIFICATION_SENT: 'email_notification_sent',
  SMS_NOTIFICATION_SENT: 'sms_notification_sent',
  SYSTEM_ERROR: 'system_error',
  SYSTEM_WARNING: 'system_warning',
  SYSTEM_MAINTENANCE_START: 'system_maintenance_start',
  SYSTEM_MAINTENANCE_END: 'system_maintenance_end',
  SYSTEM_UPDATE: 'system_update',
  SECURITY_ALERT: 'security_alert',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',

  // Third-party and Authorization Activities
  THIRD_PARTY_REQUEST: 'third_party_request',
  AUTHORIZATION_GRANTED: 'authorization_granted',
  AUTHORIZATION_REVOKED: 'authorization_revoked',
  PICKUP_AUTHORIZATION: 'pickup_authorization',
  BENEFICIARY_ADDED: 'beneficiary_added',
  BENEFICIARY_REMOVED: 'beneficiary_removed'
};

/**
 * Helper functions for specific activity logging scenarios
 */

// Log successful login
const logSuccessfulLogin = async (req, userId, userType, username, additionalData = {}) => {
  return await req.logAuthActivity(userId, userType, ACTIVITY_TYPES.LOGIN_SUCCESS, {
    username,
    login_time: new Date().toISOString(),
    ...additionalData
  });
};

// Log failed login attempt
const logFailedLogin = async (req, username, userType, reason, additionalData = {}) => {
  return await req.logAuthActivity(null, userType, ACTIVITY_TYPES.LOGIN_FAILED, {
    username,
    failure_reason: reason,
    attempt_time: new Date().toISOString(),
    ...additionalData
  });
};

// Log logout
const logLogout = async (req, userId, userType, username, additionalData = {}) => {
  return await req.logAuthActivity(userId, userType, ACTIVITY_TYPES.LOGOUT, {
    username,
    logout_time: new Date().toISOString(),
    ...additionalData
  });
};

// Log document status change
const logDocumentStatusChange = async (req, userId, userType, documentId, oldStatus, newStatus, documentType, requestNumber) => {
  return await req.logDocumentActivity(userId, userType, ACTIVITY_TYPES.DOCUMENT_STATUS_CHANGE, documentId, 
    { status: oldStatus },
    { 
      status: newStatus,
      document_type: documentType,
      request_number: requestNumber,
      change_time: new Date().toISOString()
    }
  );
};

// Log new document request
const logDocumentRequest = async (req, userId, userType, documentId, documentType, requestNumber, additionalData = {}) => {
  return await req.logDocumentActivity(userId, userType, ACTIVITY_TYPES.DOCUMENT_REQUEST_SUBMIT, documentId, null, {
    document_type: documentType,
    request_number: requestNumber,
    submit_time: new Date().toISOString(),
    ...additionalData
  });
};

// Log payment activity
const logPaymentActivity = async (req, userId, userType, action, paymentId, amount, method, additionalData = {}) => {
  return await req.logActivity({
    userId,
    userType,
    action,
    tableName: 'payment_transactions',
    recordId: paymentId,
    newValues: {
      amount,
      payment_method: method,
      transaction_time: new Date().toISOString(),
      ...additionalData
    }
  });
};

// Log user management activity
const logUserManagement = async (req, adminId, action, targetUserId, targetUserType, oldValues = null, newValues = null) => {
  const tableName = targetUserType === 'client' ? 'client_accounts' : 'admin_employee_accounts';
  return await req.logAdminActivity(adminId, action, tableName, targetUserId, oldValues, newValues);
};

// Log system configuration change
const logSystemConfigChange = async (req, adminId, configKey, oldValue, newValue, additionalData = {}) => {
  return await req.logAdminActivity(adminId, ACTIVITY_TYPES.SYSTEM_CONFIG_CHANGE, 'system_settings', null,
    { [configKey]: oldValue },
    { 
      [configKey]: newValue,
      change_time: new Date().toISOString(),
      ...additionalData
    }
  );
};

module.exports = {
  enhancedActivityLogger,
  ACTIVITY_TYPES,
  logSuccessfulLogin,
  logFailedLogin,
  logLogout,
  logDocumentStatusChange,
  logDocumentRequest,
  logPaymentActivity,
  logUserManagement,
  logSystemConfigChange
};
