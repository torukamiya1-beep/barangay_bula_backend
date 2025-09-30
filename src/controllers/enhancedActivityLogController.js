const { executeQuery } = require('../config/database');
const ComprehensiveActivityLogService = require('../services/comprehensiveActivityLogService');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Enhanced Activity Log Controller
 * Handles comprehensive activity logging using the audit_logs table
 * with fallback to request_status_history for backward compatibility
 */
class EnhancedActivityLogController {
  
  /**
   * Get comprehensive activity logs with filtering and pagination
   * Uses audit_logs table primarily, with fallback to request_status_history
   */
  static async getActivityLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        dateFrom,
        dateTo,
        type,
        userType,
        documentType,
        statusChange,
        user,
        ipAddress,
        action
      } = req.query;

      console.log('📋 Enhanced Activity Log Request:', {
        page, limit, dateFrom, dateTo, type, userType, documentType, statusChange, user, ipAddress, action
      });

      // Use the comprehensive activity log service
      const result = await ComprehensiveActivityLogService.getActivityLogs({
        dateFrom,
        dateTo,
        userType,
        action: type || action, // Support both 'type' and 'action' parameters
        userId: user,
        ipAddress
      }, page, limit);

      // If no data from audit_logs, fallback to request_status_history for backward compatibility
      if (result.data.activities.length === 0) {
        console.log('⚠️  No data in audit_logs, falling back to request_status_history...');
        return await this.getActivityLogsFromHistory(req, res);
      }

      console.log('✅ Retrieved', result.data.activities.length, 'activities from audit_logs');

      return successResponse(res, 'Activity logs retrieved successfully', result.data);

    } catch (error) {
      console.error('❌ Error fetching enhanced activity logs:', error);
      return errorResponse(res, 'Failed to fetch activity logs', 500, error.message);
    }
  }

  /**
   * Fallback method to get activity logs from request_status_history
   * Used when audit_logs table is empty (for backward compatibility)
   */
  static async getActivityLogsFromHistory(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        dateFrom,
        dateTo,
        type,
        userType,
        documentType,
        statusChange,
        user,
        ipAddress
      } = req.query;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];

      // Build WHERE conditions based on filters
      if (dateFrom) {
        whereConditions.push('rsh.changed_at >= ?');
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('rsh.changed_at <= ?');
        queryParams.push(dateTo + ' 23:59:59');
      }

      if (userType) {
        if (userType === 'admin') {
          whereConditions.push('aep.id IS NOT NULL');
        } else if (userType === 'system') {
          whereConditions.push('aep.id IS NULL');
        }
      }

      if (user) {
        whereConditions.push('CONCAT(aep.first_name, " ", aep.last_name) LIKE ?');
        queryParams.push(`%${user}%`);
      }

      if (documentType) {
        whereConditions.push('dt.type_name LIKE ?');
        queryParams.push(`%${documentType}%`);
      }

      if (statusChange) {
        whereConditions.push('new_rs.status_name LIKE ?');
        queryParams.push(`%${statusChange}%`);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Main query to get activity logs from request_status_history
      const query = `
        SELECT 
          rsh.id,
          rsh.changed_at as timestamp,
          COALESCE(
            CONCAT(aep.first_name, ' ', aep.last_name),
            'System'
          ) as user_name,
          CASE 
            WHEN aep.id IS NOT NULL THEN 'Administrator'
            ELSE 'System'
          END as user_role,
          CASE 
            WHEN aep.id IS NOT NULL THEN 'admin'
            ELSE 'system'
          END as user_type,
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
          'status_change' as type,
          dt.type_name as document_type,
          new_rs.status_name as status_change,
          'N/A' as ip_address,
          CONCAT(
            'Request: ', dr.request_number, '\\n',
            'Document Type: ', dt.type_name, '\\n',
            'Client: ', COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Unknown'), '\\n',
            'Status Changed: ', COALESCE(old_rs.status_name, 'None'), ' → ', new_rs.status_name, '\\n',
            'Changed At: ', DATE_FORMAT(rsh.changed_at, '%Y-%m-%d %H:%i:%s'), '\\n',
            'Changed By: ', COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'System'),
            CASE WHEN rsh.change_reason IS NOT NULL THEN CONCAT('\\nReason: ', rsh.change_reason) ELSE '' END
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
        LIMIT ? OFFSET ?
      `;

      queryParams.push(parseInt(limit), parseInt(offset));
      const activities = await executeQuery(query, queryParams);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
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
      `;
      
      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      const [{ total }] = await executeQuery(countQuery, countParams);

      console.log('✅ Retrieved', activities.length, 'activities from request_status_history (fallback)');

      return successResponse(res, 'Activity logs retrieved successfully (from request history)', {
        activities,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total),
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('❌ Error fetching activity logs from history:', error);
      return errorResponse(res, 'Failed to fetch activity logs', 500, error.message);
    }
  }

  /**
   * Get activity log details by ID
   */
  static async getActivityLogDetails(req, res) {
    try {
      const { id } = req.params;

      // Try to get from audit_logs first
      const auditQuery = `
        SELECT 
          al.*,
          CASE 
            WHEN al.user_type = 'admin' AND al.user_id IS NOT NULL THEN 
              COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'Admin User')
            WHEN al.user_type = 'client' AND al.user_id IS NOT NULL THEN 
              COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Client User')
            ELSE 'System'
          END as user_name
        FROM audit_logs al
        LEFT JOIN admin_employee_accounts aea ON al.user_id = aea.id AND al.user_type = 'admin'
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        LEFT JOIN client_accounts ca ON al.user_id = ca.id AND al.user_type = 'client'
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE al.id = ?
      `;

      const auditResult = await executeQuery(auditQuery, [id]);

      if (auditResult.length > 0) {
        const activity = auditResult[0];
        const formattedActivity = {
          id: activity.id,
          timestamp: activity.created_at,
          user_name: activity.user_name,
          user_type: activity.user_type,
          action: activity.action,
          table_name: activity.table_name,
          record_id: activity.record_id,
          old_values: activity.old_values ? JSON.parse(activity.old_values) : null,
          new_values: activity.new_values ? JSON.parse(activity.new_values) : null,
          ip_address: activity.ip_address,
          user_agent: activity.user_agent,
          details: ComprehensiveActivityLogService.formatActivityDetails(activity)
        };

        return successResponse(res, 'Activity log details retrieved successfully', formattedActivity);
      }

      // Fallback to request_status_history
      const historyQuery = `
        SELECT 
          rsh.*,
          dr.request_number,
          dt.type_name as document_type,
          old_rs.status_name as old_status,
          new_rs.status_name as new_status,
          COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'System') as user_name,
          COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Unknown') as client_name
        FROM request_status_history rsh
        JOIN document_requests dr ON rsh.request_id = dr.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        LEFT JOIN request_status old_rs ON rsh.old_status_id = old_rs.id
        JOIN request_status new_rs ON rsh.new_status_id = new_rs.id
        LEFT JOIN admin_employee_accounts aea ON rsh.changed_by = aea.id
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        LEFT JOIN client_accounts ca ON dr.client_id = ca.id
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE rsh.id = ?
      `;

      const historyResult = await executeQuery(historyQuery, [id]);

      if (historyResult.length === 0) {
        return errorResponse(res, 'Activity log not found', 404);
      }

      const activity = historyResult[0];
      const formattedActivity = {
        id: activity.id,
        timestamp: activity.changed_at,
        user_name: activity.user_name,
        user_type: activity.user_name === 'System' ? 'system' : 'admin',
        action: 'document_status_change',
        table_name: 'document_requests',
        record_id: activity.request_id,
        old_values: { status: activity.old_status },
        new_values: { 
          status: activity.new_status,
          document_type: activity.document_type,
          request_number: activity.request_number
        },
        ip_address: 'N/A',
        user_agent: 'N/A',
        details: `Request: ${activity.request_number}\nDocument Type: ${activity.document_type}\nClient: ${activity.client_name}\nStatus Changed: ${activity.old_status || 'None'} → ${activity.new_status}\nChanged At: ${new Date(activity.changed_at).toLocaleString()}\nChanged By: ${activity.user_name}${activity.change_reason ? '\nReason: ' + activity.change_reason : ''}`
      };

      return successResponse(res, 'Activity log details retrieved successfully (from request history)', formattedActivity);

    } catch (error) {
      console.error('❌ Error fetching activity log details:', error);
      return errorResponse(res, 'Failed to fetch activity log details', 500, error.message);
    }
  }

  /**
   * Export activity logs as CSV
   */
  static async exportActivityLogs(req, res) {
    try {
      // Get all activities without pagination for export
      const result = await ComprehensiveActivityLogService.getActivityLogs(req.query, 1, 10000);
      
      if (result.data.activities.length === 0) {
        // Fallback to request_status_history
        const tempReq = { ...req, query: { ...req.query, limit: 10000, page: 1 } };
        const tempRes = {
          status: () => ({ json: (data) => data }),
          json: (data) => data
        };
        
        const fallbackResult = await this.getActivityLogsFromHistory(tempReq, tempRes);
        if (fallbackResult && fallbackResult.data && fallbackResult.data.activities) {
          result.data.activities = fallbackResult.data.activities;
        }
      }

      // Generate CSV content
      const csvHeaders = [
        'ID', 'Timestamp', 'User Name', 'User Role', 'User Type', 
        'Activity', 'Type', 'Document Type', 'Status Change', 'IP Address'
      ];

      const csvRows = result.data.activities.map(activity => [
        activity.id,
        new Date(activity.timestamp).toLocaleString(),
        activity.user_name,
        activity.user_role,
        activity.user_type,
        activity.activity,
        activity.type,
        activity.document_type || '',
        activity.status_change || '',
        activity.ip_address
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);

    } catch (error) {
      console.error('❌ Error exporting activity logs:', error);
      return errorResponse(res, 'Failed to export activity logs', 500, error.message);
    }
  }

  /**
   * Get activity statistics
   */
  static async getActivityStats(req, res) {
    try {
      const { period = 'day' } = req.query;
      
      let dateCondition = '';
      switch (period) {
        case 'week':
          dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case 'month':
          dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
        default:
          dateCondition = 'DATE(created_at) = CURDATE()';
      }

      // Get stats from audit_logs
      const statsQuery = `
        SELECT 
          user_type,
          action,
          COUNT(*) as count
        FROM audit_logs 
        WHERE ${dateCondition}
        GROUP BY user_type, action
        ORDER BY count DESC
      `;

      const stats = await executeQuery(statsQuery);

      // If no data in audit_logs, get from request_status_history
      if (stats.length === 0) {
        const fallbackQuery = `
          SELECT 
            'admin' as user_type,
            'document_status_change' as action,
            COUNT(*) as count
          FROM request_status_history 
          WHERE ${dateCondition.replace('created_at', 'changed_at')}
        `;
        
        const fallbackStats = await executeQuery(fallbackQuery);
        return successResponse(res, 'Activity statistics retrieved successfully (from request history)', {
          period,
          stats: fallbackStats,
          total: fallbackStats.reduce((sum, stat) => sum + stat.count, 0)
        });
      }

      return successResponse(res, 'Activity statistics retrieved successfully', {
        period,
        stats,
        total: stats.reduce((sum, stat) => sum + stat.count, 0)
      });

    } catch (error) {
      console.error('❌ Error fetching activity statistics:', error);
      return errorResponse(res, 'Failed to fetch activity statistics', 500, error.message);
    }
  }

  /**
   * Test endpoint to verify the enhanced activity log controller
   */
  static async test(req, res) {
    try {
      // Test database connectivity
      const testQuery = 'SELECT COUNT(*) as audit_count FROM audit_logs';
      const auditResult = await executeQuery(testQuery);
      
      const historyQuery = 'SELECT COUNT(*) as history_count FROM request_status_history';
      const historyResult = await executeQuery(historyQuery);

      return successResponse(res, 'Enhanced Activity Log Controller is working!', {
        timestamp: new Date().toISOString(),
        database_status: 'connected',
        audit_logs_count: auditResult[0].audit_count,
        request_history_count: historyResult[0].history_count,
        endpoints: [
          'GET /api/admin/activity-logs - Get activity logs with filtering',
          'GET /api/admin/activity-logs/:id - Get specific activity log details',
          'GET /api/admin/activity-logs/export - Export activity logs as CSV',
          'GET /api/admin/activity-logs/stats - Get activity statistics',
          'GET /api/admin/activity-logs/test - Test endpoint'
        ]
      });

    } catch (error) {
      console.error('❌ Enhanced Activity Log Controller test failed:', error);
      return errorResponse(res, 'Enhanced Activity Log Controller test failed', 500, error.message);
    }
  }
}

module.exports = EnhancedActivityLogController;
