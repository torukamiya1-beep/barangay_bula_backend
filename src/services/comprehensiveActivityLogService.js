const { executeQuery } = require('../config/database');

/**
 * Comprehensive Activity Logging Service
 * Uses the audit_logs table for comprehensive activity tracking
 * Handles all types of user activities: authentication, registration, document requests, admin actions
 */
class ComprehensiveActivityLogService {
  
  /**
   * Log any activity to the audit_logs table
   * @param {Object} options - Activity logging options
   * @param {number} options.userId - User ID (can be null for system activities)
   * @param {string} options.userType - 'admin', 'employee', 'client'
   * @param {string} options.action - Action performed
   * @param {string} options.tableName - Table affected (optional)
   * @param {number} options.recordId - Record ID affected (optional)
   * @param {Object} options.oldValues - Previous values (optional)
   * @param {Object} options.newValues - New values (optional)
   * @param {string} options.ipAddress - Client IP address
   * @param {string} options.userAgent - User agent string
   * @param {Object} options.additionalData - Any additional data to store
   */
  static async logActivity(options) {
    try {
      const {
        userId = null,
        userType,
        action,
        tableName = null,
        recordId = null,
        oldValues = null,
        newValues = null,
        ipAddress = null,
        userAgent = null,
        additionalData = null
      } = options;

      // Prepare JSON values
      let oldValuesJson = null;
      let newValuesJson = null;

      if (oldValues) {
        oldValuesJson = JSON.stringify(oldValues);
      }

      if (newValues) {
        newValuesJson = JSON.stringify(newValues);
      }

      // If additionalData is provided, merge it with newValues
      if (additionalData && !newValues) {
        newValuesJson = JSON.stringify(additionalData);
      } else if (additionalData && newValues) {
        newValuesJson = JSON.stringify({ ...newValues, ...additionalData });
      }

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

      console.log(`✅ Activity logged: ${action} by ${userType} user ${userId || 'system'} from IP ${ipAddress || 'unknown'}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
      // Don't throw error to avoid breaking main application flow
      return false;
    }
  }

  /**
   * Log authentication activities
   */
  static async logAuthActivity(userId, userType, action, ipAddress, userAgent, additionalData = {}) {
    return await this.logActivity({
      userId,
      userType,
      action,
      ipAddress,
      userAgent,
      additionalData: {
        timestamp: new Date().toISOString(),
        ...additionalData
      }
    });
  }

  /**
   * Log registration activities
   */
  static async logRegistrationActivity(userId, userType, action, ipAddress, userAgent, additionalData = {}) {
    return await this.logActivity({
      userId,
      userType,
      action,
      tableName: userType === 'client' ? 'client_accounts' : 'admin_employee_accounts',
      recordId: userId,
      ipAddress,
      userAgent,
      newValues: {
        registration_timestamp: new Date().toISOString(),
        ...additionalData
      }
    });
  }

  /**
   * Log document request activities
   */
  static async logDocumentActivity(userId, userType, action, documentId, oldValues = null, newValues = null, ipAddress, userAgent) {
    return await this.logActivity({
      userId,
      userType,
      action,
      tableName: 'document_requests',
      recordId: documentId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    });
  }

  /**
   * Log administrative activities
   */
  static async logAdminActivity(adminId, action, targetTable = null, targetId = null, oldValues = null, newValues = null, ipAddress, userAgent) {
    return await this.logActivity({
      userId: adminId,
      userType: 'admin',
      action,
      tableName: targetTable,
      recordId: targetId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    });
  }

  /**
   * Log system activities
   */
  static async logSystemActivity(action, additionalData = {}, ipAddress = 'system', userAgent = 'system') {
    return await this.logActivity({
      userId: null,
      userType: 'admin', // System activities are logged as admin type
      action,
      ipAddress,
      userAgent,
      additionalData: {
        system_timestamp: new Date().toISOString(),
        ...additionalData
      }
    });
  }

  /**
   * Get comprehensive activity logs with filtering and pagination
   */
  static async getActivityLogs(filters = {}, page = 1, limit = 50) {
    try {
      // Check if audit_logs table exists
      const tableCheckQuery = `
        SELECT COUNT(*) as table_exists
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'audit_logs'
      `;
      const [tableCheck] = await executeQuery(tableCheckQuery);

      if (tableCheck.table_exists === 0) {
        // Return empty result if table doesn't exist
        return {
          activities: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        };
      }

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];

      // Build WHERE conditions based on filters
      if (filters.dateFrom) {
        whereConditions.push('al.created_at >= ?');
        queryParams.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereConditions.push('al.created_at <= ?');
        queryParams.push(filters.dateTo + ' 23:59:59');
      }

      if (filters.userType) {
        whereConditions.push('al.user_type = ?');
        queryParams.push(filters.userType);
      }

      if (filters.action) {
        whereConditions.push('al.action LIKE ?');
        queryParams.push(`%${filters.action}%`);
      }

      if (filters.userId) {
        whereConditions.push('al.user_id = ?');
        queryParams.push(filters.userId);
      }

      if (filters.ipAddress) {
        whereConditions.push('al.ip_address LIKE ?');
        queryParams.push(`%${filters.ipAddress}%`);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Main query to get activity logs
      const query = `
        SELECT 
          al.id,
          al.user_id,
          al.user_type,
          al.action,
          al.table_name,
          al.record_id,
          al.old_values,
          al.new_values,
          al.ip_address,
          al.user_agent,
          al.created_at as timestamp,
          CASE 
            WHEN al.user_type = 'admin' AND al.user_id IS NOT NULL THEN 
              COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'Admin User')
            WHEN al.user_type = 'client' AND al.user_id IS NOT NULL THEN 
              COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Client User')
            ELSE 'System'
          END as user_name,
          CASE 
            WHEN al.user_type = 'admin' THEN 'Administrator'
            WHEN al.user_type = 'employee' THEN 'Employee'
            WHEN al.user_type = 'client' THEN 'Client'
            ELSE 'System'
          END as user_role
        FROM audit_logs al
        LEFT JOIN admin_employee_accounts aea ON al.user_id = aea.id AND al.user_type = 'admin'
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        LEFT JOIN client_accounts ca ON al.user_id = ca.id AND al.user_type = 'client'
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT ? OFFSET ?
      `;

      queryParams.push(limit, offset);
      const activities = await executeQuery(query, queryParams);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM audit_logs al
        ${whereClause}
      `;
      
      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      const [{ total }] = await executeQuery(countQuery, countParams);

      // Format activities for frontend
      const formattedActivities = activities.map(activity => ({
        id: activity.id,
        timestamp: activity.timestamp,
        user_name: activity.user_name,
        user_role: activity.user_role,
        user_type: activity.user_type,
        activity: this.formatActivityDescription(activity),
        type: this.categorizeActivity(activity.action),
        document_type: this.extractDocumentType(activity),
        status_change: this.extractStatusChange(activity),
        ip_address: activity.ip_address || 'N/A',
        details: this.formatActivityDetails(activity)
      }));

      return {
        success: true,
        data: {
          activities: formattedActivities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: parseInt(total),
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  }

  /**
   * Format activity description for display
   */
  static formatActivityDescription(activity) {
    const { action, user_name } = activity;
    
    // Parse additional data if available
    let additionalInfo = '';
    if (activity.new_values) {
      try {
        const data = JSON.parse(activity.new_values);
        if (data.username) additionalInfo = ` (${data.username})`;
        if (data.email) additionalInfo = ` (${data.email})`;
        if (data.document_type) additionalInfo = ` for ${data.document_type}`;
      } catch (e) {
        // Ignore JSON parse errors
      }
    }

    return `${user_name} performed ${action.replace(/_/g, ' ')}${additionalInfo}`;
  }

  /**
   * Categorize activity type for filtering
   */
  static categorizeActivity(action) {
    if (action.includes('login') || action.includes('logout') || action.includes('password')) {
      return 'authentication';
    }
    if (action.includes('register') || action.includes('verification')) {
      return 'registration';
    }
    if (action.includes('document') || action.includes('request') || action.includes('status')) {
      return 'document_request';
    }
    if (action.includes('payment')) {
      return 'payment';
    }
    if (action.includes('admin') || action.includes('user_account') || action.includes('system_config')) {
      return 'administrative';
    }
    return 'system';
  }

  /**
   * Extract document type from activity data
   */
  static extractDocumentType(activity) {
    if (activity.new_values) {
      try {
        const data = JSON.parse(activity.new_values);
        return data.document_type || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Extract status change from activity data
   */
  static extractStatusChange(activity) {
    if (activity.action.includes('status_change') && activity.new_values) {
      try {
        const data = JSON.parse(activity.new_values);
        return data.new_status || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Format detailed activity information
   */
  static formatActivityDetails(activity) {
    let details = `Action: ${activity.action}\n`;
    details += `Timestamp: ${new Date(activity.timestamp).toLocaleString()}\n`;
    details += `IP Address: ${activity.ip_address || 'N/A'}\n`;
    details += `User Agent: ${activity.user_agent || 'N/A'}\n`;

    if (activity.table_name) {
      details += `Table: ${activity.table_name}\n`;
    }

    if (activity.record_id) {
      details += `Record ID: ${activity.record_id}\n`;
    }

    if (activity.old_values) {
      try {
        const oldData = JSON.parse(activity.old_values);
        details += `Previous Values: ${JSON.stringify(oldData, null, 2)}\n`;
      } catch (e) {
        details += `Previous Values: ${activity.old_values}\n`;
      }
    }

    if (activity.new_values) {
      try {
        const newData = JSON.parse(activity.new_values);
        details += `New Values: ${JSON.stringify(newData, null, 2)}\n`;
      } catch (e) {
        details += `New Values: ${activity.new_values}\n`;
      }
    }

    return details;
  }
}

module.exports = ComprehensiveActivityLogService;
