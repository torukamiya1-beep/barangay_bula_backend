const { executeQuery } = require('../config/database');

/**
 * Activity Log Service
 * Handles retrieval and management of activity logs from audit_logs table
 */

class ActivityLogService {
  
  /**
   * Get activity logs with filtering and pagination
   */
  async getActivityLogs(filters = {}, page = 1, limit = 50) {
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
          success: true,
          data: {
            activities: [],
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: 0,
              pages: 0
            }
          }
        };
      }

      const offset = (page - 1) * limit;

      // Build WHERE clause based on filters
      let whereConditions = [];
      let queryParams = [];
      
      // Date range filters
      if (filters.dateFrom) {
        whereConditions.push('DATE(al.created_at) >= ?');
        queryParams.push(filters.dateFrom);
      }
      
      if (filters.dateTo) {
        whereConditions.push('DATE(al.created_at) <= ?');
        queryParams.push(filters.dateTo);
      }
      
      // Activity type filter
      if (filters.type && filters.type !== '') {
        whereConditions.push('al.action LIKE ?');
        queryParams.push(`%${filters.type}%`);
      }
      
      // User type filter
      if (filters.userType && filters.userType !== '') {
        whereConditions.push('al.user_type = ?');
        queryParams.push(filters.userType);
      }
      
      // User filter (by name)
      if (filters.user && filters.user !== '') {
        whereConditions.push(`(
          CONCAT(COALESCE(aep.first_name, ''), ' ', COALESCE(aep.last_name, '')) LIKE ? OR
          CONCAT(COALESCE(cp.first_name, ''), ' ', COALESCE(cp.last_name, '')) LIKE ?
        )`);
        queryParams.push(`%${filters.user}%`, `%${filters.user}%`);
      }
      
      // IP address filter
      if (filters.ipAddress && filters.ipAddress !== '') {
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
          -- Get user names based on user type
          CASE 
            WHEN al.user_type = 'admin' OR al.user_type = 'employee' THEN 
              COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'Unknown Admin')
            WHEN al.user_type = 'client' THEN 
              COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Unknown Client')
            ELSE 'System'
          END as user_name,
          -- Get user role
          CASE 
            WHEN al.user_type = 'admin' THEN 'Administrator'
            WHEN al.user_type = 'employee' THEN 'Employee'
            WHEN al.user_type = 'client' THEN 'Client'
            ELSE 'System'
          END as user_role,
          -- Generate activity description
          CASE 
            WHEN al.action = 'login_success' THEN CONCAT(COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), CONCAT(cp.first_name, ' ', cp.last_name), 'User'), ' logged in successfully')
            WHEN al.action = 'login_failed' THEN 'Failed login attempt'
            WHEN al.action = 'logout' THEN CONCAT(COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), CONCAT(cp.first_name, ' ', cp.last_name), 'User'), ' logged out')
            WHEN al.action = 'document_request_submit' THEN CONCAT(COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Client'), ' submitted a document request')
            WHEN al.action = 'document_status_change' THEN CONCAT(COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'Admin'), ' changed document status')
            WHEN al.action = 'payment_submit' THEN CONCAT(COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Client'), ' submitted payment')
            WHEN al.action = 'payment_confirm' THEN CONCAT(COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'Admin'), ' confirmed payment')
            ELSE CONCAT(al.action, ' by ', COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), CONCAT(cp.first_name, ' ', cp.last_name), 'User'))
          END as activity,
          -- Generate detailed description
          CONCAT(
            'Action: ', al.action, '\\n',
            'User: ', COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), CONCAT(cp.first_name, ' ', cp.last_name), 'System'), '\\n',
            'IP Address: ', COALESCE(al.ip_address, 'N/A'), '\\n',
            'Timestamp: ', al.created_at, '\\n',
            CASE WHEN al.table_name IS NOT NULL THEN CONCAT('Table: ', al.table_name, '\\n') ELSE '' END,
            CASE WHEN al.record_id IS NOT NULL THEN CONCAT('Record ID: ', al.record_id, '\\n') ELSE '' END,
            CASE WHEN al.user_agent IS NOT NULL THEN CONCAT('User Agent: ', al.user_agent) ELSE '' END
          ) as details
        FROM audit_logs al
        LEFT JOIN admin_employee_accounts aea ON al.user_id = aea.id AND al.user_type IN ('admin', 'employee')
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
        LEFT JOIN admin_employee_accounts aea ON al.user_id = aea.id AND al.user_type IN ('admin', 'employee')
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        LEFT JOIN client_accounts ca ON al.user_id = ca.id AND al.user_type = 'client'
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ${whereClause}
      `;
      
      const countResult = await executeQuery(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
      const total = countResult[0].total;
      
      // Process activities to ensure proper data types
      const processedActivities = activities.map(activity => ({
        ...activity,
        type: this.categorizeActivity(activity.action),
        document_type: this.extractDocumentType(activity.old_values, activity.new_values),
        status_change: this.extractStatusChange(activity.old_values, activity.new_values)
      }));
      
      return {
        success: true,
        data: {
          activities: processedActivities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
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
   * Get activity statistics
   */
  async getActivityStats(period = 'day') {
    try {
      let dateCondition = '';
      
      switch (period) {
        case 'day':
          dateCondition = 'DATE(created_at) = CURDATE()';
          break;
        case 'week':
          dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case 'month':
          dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
        default:
          dateCondition = 'DATE(created_at) = CURDATE()';
      }
      
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_activities,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(CASE WHEN action LIKE '%login%' THEN 1 END) as login_activities,
          COUNT(CASE WHEN action LIKE '%document%' THEN 1 END) as document_activities,
          COUNT(CASE WHEN action LIKE '%payment%' THEN 1 END) as payment_activities,
          COUNT(CASE WHEN user_type = 'admin' THEN 1 END) as admin_activities,
          COUNT(CASE WHEN user_type = 'client' THEN 1 END) as client_activities
        FROM audit_logs 
        WHERE ${dateCondition}
      `);
      
      return {
        success: true,
        data: stats[0]
      };
      
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }
  
  /**
   * Helper method to categorize activity types
   */
  categorizeActivity(action) {
    if (action.includes('login') || action.includes('logout')) return 'authentication';
    if (action.includes('document')) return 'document_request';
    if (action.includes('payment')) return 'payment';
    if (action.includes('user') || action.includes('account')) return 'user_management';
    if (action.includes('system') || action.includes('config')) return 'system';
    return 'other';
  }
  
  /**
   * Helper method to extract document type from values
   */
  extractDocumentType(oldValues, newValues) {
    try {
      const values = newValues || oldValues;
      if (values) {
        const parsed = JSON.parse(values);
        return parsed.document_type || null;
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }
  
  /**
   * Helper method to extract status change from values
   */
  extractStatusChange(oldValues, newValues) {
    try {
      if (oldValues && newValues) {
        const old = JSON.parse(oldValues);
        const newVal = JSON.parse(newValues);
        if (old.status !== newVal.status) {
          return newVal.status;
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }
}

module.exports = new ActivityLogService();
