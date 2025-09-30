const { body, validationResult } = require('express-validator');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { executeQuery } = require('../config/database');
const activityLogService = require('../services/activityLogService');

class ActivityLogController {
  /**
   * Get activity logs with filtering and pagination
   */
  async getActivityLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        dateFrom,
        dateTo,
        type,
        userType,
        documentType,
        statusChange,
        user,
        ipAddress
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      let whereConditions = [];
      let queryParams = [];

      // Build the main query combining multiple sources
      let baseQuery = `
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
            CASE 
              WHEN old_rs.status_name IS NOT NULL THEN 
                CONCAT('Status Changed: ', old_rs.status_name, ' → ', new_rs.status_name, '\\n')
              ELSE 
                CONCAT('Status Set: ', new_rs.status_name, '\\n')
            END,
            CASE 
              WHEN rsh.change_reason IS NOT NULL THEN 
                CONCAT('Reason: ', rsh.change_reason, '\\n')
              ELSE ''
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
      `;

      // Add filters
      if (dateFrom) {
        whereConditions.push('rsh.changed_at >= ?');
        queryParams.push(dateFrom);
      }

      if (dateTo) {
        whereConditions.push('rsh.changed_at <= ?');
        queryParams.push(dateTo + ' 23:59:59');
      }

      if (documentType) {
        whereConditions.push('dt.type_name LIKE ?');
        queryParams.push(`%${documentType}%`);
      }

      if (statusChange) {
        whereConditions.push('new_rs.status_name LIKE ?');
        queryParams.push(`%${statusChange}%`);
      }

      if (user) {
        whereConditions.push('(aep.first_name LIKE ? OR aep.last_name LIKE ?)');
        queryParams.push(`%${user}%`, `%${user}%`);
      }

      // Add WHERE clause if there are conditions
      if (whereConditions.length > 0) {
        baseQuery += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Add ORDER BY and LIMIT
      baseQuery += ' ORDER BY rsh.changed_at DESC LIMIT ? OFFSET ?';
      queryParams.push(parseInt(limit), offset);

      // Execute the query
      const activities = await executeQuery(baseQuery, queryParams);

      // Get total count for pagination
      let countQuery = `
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
      `;

      if (whereConditions.length > 0) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }

      const countParams = queryParams.slice(0, -2); // Remove LIMIT and OFFSET params
      const [countResult] = await executeQuery(countQuery, countParams);
      const total = countResult.total;

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      };

      return successResponse(res, 'Activity logs retrieved successfully', {
        activities,
        pagination
      });

    } catch (error) {
      logger.error('Get activity logs error:', error);
      return errorResponse(res, 'Failed to retrieve activity logs', 500);
    }
  }

  /**
   * Get activity log details by ID
   */
  async getActivityLogDetails(req, res) {
    try {
      const { id } = req.params;

      const query = `
        SELECT 
          rsh.id,
          rsh.changed_at as timestamp,
          rsh.change_reason,
          COALESCE(
            CONCAT(aep.first_name, ' ', aep.last_name),
            'System'
          ) as user_name,
          dt.type_name as document_type,
          old_rs.status_name as old_status,
          new_rs.status_name as new_status,
          dr.request_number,
          CONCAT(cp.first_name, ' ', cp.last_name) as client_name
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

      const [activity] = await executeQuery(query, [id]);

      if (!activity) {
        return errorResponse(res, 'Activity log not found', 404);
      }

      return successResponse(res, 'Activity log details retrieved successfully', activity);

    } catch (error) {
      logger.error('Get activity log details error:', error);
      return errorResponse(res, 'Failed to retrieve activity log details', 500);
    }
  }

  /**
   * Export activity logs as CSV
   */
  async exportActivityLogs(req, res) {
    try {
      // This would implement CSV export functionality
      // For now, return a simple response
      return successResponse(res, 'Export functionality not yet implemented', {
        message: 'CSV export will be available in a future update'
      });

    } catch (error) {
      logger.error('Export activity logs error:', error);
      return errorResponse(res, 'Failed to export activity logs', 500);
    }
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(req, res) {
    try {
      const { period = 'week' } = req.query;

      // This would implement statistics functionality
      // For now, return basic stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total_activities,
          COUNT(DISTINCT rsh.changed_by) as unique_users,
          COUNT(DISTINCT dr.document_type_id) as document_types_affected
        FROM request_status_history rsh
        JOIN document_requests dr ON rsh.request_id = dr.id
        WHERE rsh.changed_at >= DATE_SUB(NOW(), INTERVAL 1 ${period.toUpperCase()})
      `;

      const [stats] = await executeQuery(statsQuery);

      return successResponse(res, 'Activity statistics retrieved successfully', stats);

    } catch (error) {
      logger.error('Get activity stats error:', error);
      return errorResponse(res, 'Failed to retrieve activity statistics', 500);
    }
  }

  /**
   * Get comprehensive activity logs from audit_logs table
   * This method uses the new audit_logs table for complete activity tracking
   */
  async getComprehensiveActivityLogs(req, res) {
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

      // Prepare filters object
      const filters = {};
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (type) filters.type = type;
      if (userType) filters.userType = userType;
      if (documentType) filters.documentType = documentType;
      if (statusChange) filters.statusChange = statusChange;
      if (user) filters.user = user;
      if (ipAddress) filters.ipAddress = ipAddress;

      // Get activity logs from service
      const result = await activityLogService.getActivityLogs(filters, parseInt(page), parseInt(limit));

      return successResponse(res, 'Comprehensive activity logs retrieved successfully', result.data);

    } catch (error) {
      logger.error('Get comprehensive activity logs error:', error);
      return errorResponse(res, 'Failed to retrieve comprehensive activity logs', 500);
    }
  }

  /**
   * Get activity statistics from audit_logs table
   */
  async getComprehensiveActivityStats(req, res) {
    try {
      const { period = 'day' } = req.query;

      const result = await activityLogService.getActivityStats(period);

      return successResponse(res, 'Activity statistics retrieved successfully', result.data);

    } catch (error) {
      logger.error('Get comprehensive activity stats error:', error);
      return errorResponse(res, 'Failed to retrieve activity statistics', 500);
    }
  }
}

module.exports = new ActivityLogController();
