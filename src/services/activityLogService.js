const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Activity Log Service
 * Handles retrieval and management of activity logs from audit_logs table
 */

class ActivityLogService {
  
  /**
   * Get comprehensive activity logs combining audit_logs and request_status_history
   */
  async getActivityLogs(filters = {}, page = 1, limit = 50) {
    try {
      // Get activities from both audit_logs and request_status_history
      const auditActivities = await this.getAuditLogActivities(filters);
      const documentActivities = await this.getDocumentStatusActivities(filters);

      // Combine and sort all activities by timestamp
      const allActivities = [...auditActivities, ...documentActivities]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedActivities = allActivities.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          activities: paginatedActivities,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: allActivities.length,
            pages: Math.ceil(allActivities.length / limit)
          }
        }
      };
    } catch (error) {
      logger.error('Get activity logs error:', error);
      throw error;
    }
  }

  /**
   * Get activities from audit_logs table (login/registration activities)
   */
  async getAuditLogActivities(filters = {}) {
    try {
      // Check if audit_logs table exists
      const tableCheckQuery = `
        SELECT COUNT(*) as table_exists
        FROM information_schema.tables
        WHERE table_schema = DATABASE() AND table_name = 'audit_logs'
      `;
      const [tableCheck] = await executeQuery(tableCheckQuery);

      if (tableCheck.table_exists === 0) {
        return [];
      }

      // Build WHERE clause based on filters for audit_logs
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

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
      
      // Query audit_logs for login/registration activities
      const query = `
        SELECT
          al.id,
          al.user_id,
          al.user_type,
          al.action,
          al.ip_address,
          al.created_at as timestamp,
          CASE
            WHEN al.user_type = 'admin' OR al.user_type = 'employee' THEN
              COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'Unknown Admin')
            WHEN al.user_type = 'client' THEN
              COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Unknown Client')
            ELSE 'System'
          END as user_name,
          CASE
            WHEN al.user_type = 'admin' THEN 'Administrator'
            WHEN al.user_type = 'employee' THEN 'Employee'
            WHEN al.user_type = 'client' THEN 'Client'
            ELSE 'System'
          END as user_role,
          CASE
            WHEN al.action = 'login_success' THEN CONCAT(COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), CONCAT(cp.first_name, ' ', cp.last_name), 'User'), ' logged in successfully')
            WHEN al.action = 'login_failed' THEN 'Failed login attempt'
            WHEN al.action = 'logout' THEN CONCAT(COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), CONCAT(cp.first_name, ' ', cp.last_name), 'User'), ' logged out')
            ELSE CONCAT(al.action, ' by ', COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), CONCAT(cp.first_name, ' ', cp.last_name), 'User'))
          END as activity
        FROM audit_logs al
        LEFT JOIN admin_employee_accounts aea ON al.user_id = aea.id AND al.user_type IN ('admin', 'employee')
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        LEFT JOIN client_accounts ca ON al.user_id = ca.id AND al.user_type = 'client'
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ${whereClause}
        ORDER BY al.created_at DESC
        LIMIT 100
      `;

      const activities = await executeQuery(query, queryParams);

      // Process activities and add missing fields
      return activities.map(activity => ({
        ...activity,
        type: this.categorizeActivity(activity.action),
        document_type: null, // Audit logs don't have document types
        status_change: null, // Audit logs don't have status changes
        details: `Action: ${activity.action}\nUser: ${activity.user_name}\nIP Address: ${activity.ip_address || 'N/A'}\nTimestamp: ${activity.timestamp}`
      }));
      
    } catch (error) {
      console.error('Error fetching audit log activities:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get activities from request_status_history table (document request activities)
   */
  async getDocumentStatusActivities(filters = {}) {
    try {
      // Build WHERE clause based on filters for request_status_history
      let whereConditions = [];
      let queryParams = [];

      // Date range filters
      if (filters.dateFrom) {
        whereConditions.push('DATE(rsh.changed_at) >= ?');
        queryParams.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereConditions.push('DATE(rsh.changed_at) <= ?');
        queryParams.push(filters.dateTo);
      }

      // Document type filter
      if (filters.documentType) {
        whereConditions.push('dt.type_name LIKE ?');
        queryParams.push(`%${filters.documentType}%`);
      }

      // User type filter (admin/employee who made the change)
      if (filters.userType && filters.userType === 'admin') {
        whereConditions.push('rsh.changed_by IS NOT NULL');
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Query request_status_history for document activities
      const query = `
        SELECT
          rsh.id,
          rsh.changed_by as user_id,
          'admin' as user_type,
          rsh.changed_at as timestamp,
          COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'System') as user_name,
          'Administrator' as user_role,
          CONCAT(
            COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'System'),
            ' changed status from "',
            COALESCE(old_rs.status_name, 'None'),
            '" to "',
            new_rs.status_name,
            '" for ',
            dt.type_name,
            ' request ',
            dr.request_number
          ) as activity,
          dt.type_name as document_type,
          new_rs.status_name as status_change,
          'N/A' as ip_address,
          CONCAT(
            'Request: ', dr.request_number, '\\n',
            'Document Type: ', dt.type_name, '\\n',
            'Client: ', COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Unknown'), '\\n',
            CASE
              WHEN old_rs.status_name IS NOT NULL THEN
                CONCAT('Status Changed: ', old_rs.status_name, ' → ', new_rs.status_name, '\\n')
              ELSE
                CONCAT('Status Set: ', new_rs.status_name, '\\n')
            END,
            'Changed At: ', DATE_FORMAT(rsh.changed_at, '%Y-%m-%d %H:%i:%s'), '\\n',
            'Changed By: ', COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'System')
          ) as details
        FROM request_status_history rsh
        JOIN document_requests dr ON rsh.request_id = dr.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        LEFT JOIN request_status old_rs ON rsh.old_status_id = old_rs.id
        JOIN request_status new_rs ON rsh.new_status_id = new_rs.id
        LEFT JOIN admin_employee_accounts aea ON rsh.changed_by = aea.id
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        LEFT JOIN client_accounts ca ON dr.client_id = ca.id
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ${whereClause}
        ORDER BY rsh.changed_at DESC
        LIMIT 100
      `;

      const activities = await executeQuery(query, queryParams);

      // Process activities and add missing fields
      return activities.map(activity => ({
        ...activity,
        type: 'status_change'
      }));

    } catch (error) {
      console.error('Error fetching document status activities:', error);
      return []; // Return empty array on error
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
