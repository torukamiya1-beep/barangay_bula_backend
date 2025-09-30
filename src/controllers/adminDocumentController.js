const { body, validationResult } = require('express-validator');
const adminDocumentService = require('../services/adminDocumentService');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');
const {
  ACTIVITY_TYPES,
  logDocumentStatusChange,
  logAdminActivity
} = require('../middleware/enhancedActivityLogger');

class AdminDocumentController {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(req, res) {
    try {
      const stats = await adminDocumentService.getDashboardStats();
      return successResponse(res, 'Dashboard statistics retrieved successfully', stats);
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      return errorResponse(res, 'Failed to retrieve dashboard statistics', 500);
    }
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity(req, res) {
    try {
      const { limit = 10 } = req.query;
      const activity = await adminDocumentService.getRecentActivity(parseInt(limit));
      return successResponse(res, 'Recent activity retrieved successfully', activity);
    } catch (error) {
      logger.error('Get recent activity error:', error);
      return errorResponse(res, 'Failed to retrieve recent activity', 500);
    }
  }

  /**
   * Get all document requests with filtering and pagination
   */
  async getAllRequests(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        document_type,
        priority,
        search,
        date_from,
        date_to,
        sort_by = 'requested_at',
        sort_order = 'desc'
      } = req.query;

      const filters = {
        status,
        document_type,
        priority,
        search,
        date_from,
        date_to
      };

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort_by,
        sort_order
      };

      const result = await adminDocumentService.getAllRequests(filters, options);
      return successResponse(res, 'Document requests retrieved successfully', result);
    } catch (error) {
      logger.error('Get all requests error:', error);
      return errorResponse(res, 'Failed to retrieve document requests', 500);
    }
  }

  /**
   * Get specific document request details
   */
  async getRequestDetails(req, res) {
    try {
      const { id } = req.params;
      const request = await adminDocumentService.getRequestDetails(parseInt(id));
      
      if (!request) {
        return errorResponse(res, 'Document request not found', 404);
      }

      return successResponse(res, 'Document request details retrieved successfully', request);
    } catch (error) {
      logger.error('Get request details error:', error);
      return errorResponse(res, 'Failed to retrieve document request details', 500);
    }
  }

  /**
   * Get request status history
   */
  async getRequestHistory(req, res) {
    try {
      const { id } = req.params;
      const history = await adminDocumentService.getRequestHistory(parseInt(id));
      return successResponse(res, 'Request history retrieved successfully', history);
    } catch (error) {
      logger.error('Get request history error:', error);
      return errorResponse(res, 'Failed to retrieve request history', 500);
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const { status_id, reason } = req.body;
      const adminId = req.user.id;

      const result = await adminDocumentService.updateRequestStatus(
        parseInt(id),
        parseInt(status_id),
        adminId,
        reason
      );

      // Log document status change activity
      if (result && result.request) {
        await logDocumentStatusChange(req, adminId, 'admin', parseInt(id),
          result.oldStatus || 'Unknown',
          result.newStatus || 'Unknown',
          result.request.document_type || 'Unknown Document Type',
          result.request.request_number || `REQ-${id}`
        );
      }

      return successResponse(res, 'Request status updated successfully', result);
    } catch (error) {
      logger.error('Update request status error:', error);
      return errorResponse(res, error.message || 'Failed to update request status', 500);
    }
  }

  /**
   * Approve document request
   */
  async approveRequest(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      const result = await adminDocumentService.approveRequest(parseInt(id), adminId, reason);
      return successResponse(res, 'Request approved successfully', result);
    } catch (error) {
      logger.error('Approve request error:', error);
      return errorResponse(res, error.message || 'Failed to approve request', 500);
    }
  }

  /**
   * Reject document request
   */
  async rejectRequest(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      if (!reason || reason.trim().length === 0) {
        return errorResponse(res, 'Reason is required for rejection', 400);
      }

      const result = await adminDocumentService.rejectRequest(parseInt(id), adminId, reason);
      return successResponse(res, 'Request rejected successfully', result);
    } catch (error) {
      logger.error('Reject request error:', error);
      return errorResponse(res, error.message || 'Failed to reject request', 500);
    }
  }

  /**
   * Mark request as processing
   */
  async processRequest(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      const result = await adminDocumentService.processRequest(parseInt(id), adminId, reason);
      return successResponse(res, 'Request marked as processing successfully', result);
    } catch (error) {
      logger.error('Process request error:', error);
      return errorResponse(res, error.message || 'Failed to process request', 500);
    }
  }

  /**
   * Mark request as completed
   */
  async completeRequest(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      const result = await adminDocumentService.completeRequest(parseInt(id), adminId, reason);
      return successResponse(res, 'Request completed successfully', result);
    } catch (error) {
      logger.error('Complete request error:', error);
      return errorResponse(res, error.message || 'Failed to complete request', 500);
    }
  }

  /**
   * Mark request as ready for pickup
   */
  async markReadyForPickup(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      const result = await adminDocumentService.markReadyForPickup(parseInt(id), adminId, reason);
      return successResponse(res, 'Request marked as ready for pickup successfully', result);
    } catch (error) {
      logger.error('Mark ready for pickup error:', error);
      return errorResponse(res, error.message || 'Failed to mark request as ready for pickup', 500);
    }
  }

  /**
   * Verify in-person payment
   */
  async verifyInPersonPayment(req, res) {
    try {
      const { id } = req.params;
      const { amount_received, payment_method_id, receipt_number, notes } = req.body;
      const adminId = req.user.id;

      // Validate required fields
      if (!amount_received || !payment_method_id) {
        return errorResponse(res, 'Amount received and payment method are required', 400);
      }

      const paymentDetails = {
        amount_received: parseFloat(amount_received),
        payment_method_id: parseInt(payment_method_id),
        receipt_number,
        notes
      };

      const result = await adminDocumentService.verifyInPersonPayment(
        parseInt(id),
        adminId,
        paymentDetails
      );

      return successResponse(res, 'In-person payment verified successfully', result);
    } catch (error) {
      logger.error('Verify in-person payment error:', error);
      return errorResponse(res, error.message || 'Failed to verify in-person payment', 500);
    }
  }

  // Removed requireAdditionalInfo method - additional_info_required status is no longer used

  /**
   * Export requests data as CSV
   */
  async exportRequests(req, res) {
    try {
      const { status, document_type, date_from, date_to } = req.query;
      
      const filters = {
        status,
        document_type,
        date_from,
        date_to
      };

      const csvData = await adminDocumentService.exportRequests(filters);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="document_requests.csv"');
      res.send(csvData);
    } catch (error) {
      logger.error('Export requests error:', error);
      return errorResponse(res, 'Failed to export requests data', 500);
    }
  }

  /**
   * Get all available status options
   */
  async getStatusOptions(req, res) {
    try {
      const statusOptions = await adminDocumentService.getStatusOptions();
      return successResponse(res, 'Status options retrieved successfully', statusOptions);
    } catch (error) {
      logger.error('Get status options error:', error);
      return errorResponse(res, 'Failed to retrieve status options', 500);
    }
  }

  /**
   * Get all available document types
   */
  async getDocumentTypes(req, res) {
    try {
      const documentTypes = await adminDocumentService.getDocumentTypes();
      return successResponse(res, 'Document types retrieved successfully', documentTypes);
    } catch (error) {
      logger.error('Get document types error:', error);
      return errorResponse(res, 'Failed to retrieve document types', 500);
    }
  }

  /**
   * Bulk update multiple requests
   */
  async bulkUpdateRequests(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { request_ids, status_id, reason } = req.body;
      const adminId = req.user.id;

      if (!Array.isArray(request_ids) || request_ids.length === 0) {
        return errorResponse(res, 'Request IDs array is required', 400);
      }

      const result = await adminDocumentService.bulkUpdateRequests(
        request_ids,
        parseInt(status_id),
        adminId,
        reason
      );

      return successResponse(res, 'Bulk update completed successfully', result);
    } catch (error) {
      logger.error('Bulk update requests error:', error);
      return errorResponse(res, error.message || 'Failed to bulk update requests', 500);
    }
  }

  /**
   * Get analytics data for reporting
   */
  async getAnalyticsData(req, res) {
    try {
      const { period = 'month' } = req.query;

      const analyticsData = await adminDocumentService.getAnalyticsData(period);

      return successResponse(res, 'Analytics data retrieved successfully', analyticsData);
    } catch (error) {
      logger.error('Get analytics data error:', error);
      return errorResponse(res, 'Failed to retrieve analytics data', 500);
    }
  }

  /**
   * Verify in-person payment
   */
  async verifyInPersonPayment(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const requestId = parseInt(req.params.id);
      const adminId = req.user.id;
      const paymentData = req.body;

      const result = await adminDocumentService.verifyInPersonPayment(requestId, adminId, paymentData);

      return successResponse(res, 'Payment verified successfully', result);
    } catch (error) {
      logger.error('Verify payment error:', error);
      return errorResponse(res, error.message || 'Failed to verify payment', 500);
    }
  }

  /**
   * Schedule pickup appointment
   */
  async schedulePickup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const requestId = parseInt(req.params.id);
      const adminId = req.user.id;
      const scheduleData = req.body;

      const result = await adminDocumentService.schedulePickup(requestId, adminId, scheduleData);

      return successResponse(res, 'Pickup scheduled successfully', result);
    } catch (error) {
      logger.error('Schedule pickup error:', error);
      return errorResponse(res, error.message || 'Failed to schedule pickup', 500);
    }
  }

  /**
   * Confirm document pickup
   */
  async confirmPickup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const requestId = parseInt(req.params.id);
      const adminId = req.user.id;
      const pickupData = req.body;

      // Update pickup schedule with actual pickup details
      await adminDocumentService.confirmDocumentPickup(requestId, adminId, pickupData);

      // Mark request as completed
      await adminDocumentService.completeRequest(requestId, adminId, 'Document picked up successfully');

      return successResponse(res, 'Document pickup confirmed successfully');
    } catch (error) {
      logger.error('Confirm pickup error:', error);
      return errorResponse(res, error.message || 'Failed to confirm pickup', 500);
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateReport(req, res) {
    try {
      const { reportType } = req.params;
      const filters = req.query;

      const reportData = await adminDocumentService.generateReport(reportType, filters);

      if (filters.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}_report_${new Date().toISOString().split('T')[0]}.csv"`);
        return res.send(reportData);
      } else {
        return successResponse(res, 'Report generated successfully', reportData);
      }
    } catch (error) {
      logger.error('Generate report error:', error);
      return errorResponse(res, 'Failed to generate report', 500);
    }
  }

  // Validation middleware methods
  static updateStatusValidation() {
    return [
      body('status_id')
        .isInt({ min: 1 })
        .withMessage('Valid status ID is required'),
      body('reason')
        .optional()
        .isLength({ min: 1, max: 500 })
        .withMessage('Reason must be between 1 and 500 characters')
    ];
  }

  static rejectRequestValidation() {
    return [
      body('reason')
        .notEmpty()
        .isLength({ min: 5, max: 500 })
        .withMessage('Rejection reason is required and must be between 5 and 500 characters')
    ];
  }

  // Removed requireInfoValidation - additional_info_required status is no longer used

  static bulkUpdateValidation() {
    return [
      body('request_ids')
        .isArray({ min: 1 })
        .withMessage('Request IDs array is required'),
      body('request_ids.*')
        .isInt({ min: 1 })
        .withMessage('All request IDs must be valid integers'),
      body('status_id')
        .isInt({ min: 1 })
        .withMessage('Valid status ID is required'),
      body('reason')
        .optional()
        .isLength({ min: 1, max: 500 })
        .withMessage('Reason must be between 1 and 500 characters')
    ];
  }

  /**
   * Get payment verification queue
   */
  async getPaymentVerificationQueue(req, res) {
    try {
      const query = `
        SELECT
          dr.id as request_id,
          dr.request_number,
          dr.status_id,
          rs.status_name,
          dt.document_name,
          dt.base_fee,
          pm.method_name as payment_method,
          CONCAT(c.first_name, ' ', c.last_name) as client_name,
          c.email as client_email,
          dr.created_at as request_date,
          dr.approved_at,
          dr.payment_status
        FROM document_requests dr
        JOIN request_status rs ON dr.status_id = rs.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN payment_methods pm ON dr.payment_method_id = pm.id
        JOIN client_accounts c ON dr.client_id = c.id
        WHERE dr.status_id = 4
          AND pm.is_online = 0
          AND (dr.payment_status = 'pending' OR dr.payment_status IS NULL)
        ORDER BY dr.approved_at ASC
      `;

      const { executeQuery } = require('../config/database');
      const results = await executeQuery(query);

      return successResponse(res, 'Payment verification queue retrieved successfully', results);
    } catch (error) {
      logger.error('Get payment verification queue error:', error);
      return errorResponse(res, error.message || 'Failed to get payment verification queue', 500);
    }
  }

  static verifyPaymentValidation() {
    return [
      body('amount_received')
        .isFloat({ min: 0.01 })
        .withMessage('Amount received must be a positive number'),
      body('payment_method_id')
        .isInt({ min: 1 })
        .withMessage('Valid payment method ID is required'),
      body('receipt_number')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Receipt number must be between 1 and 100 characters'),
      body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters')
    ];
  }

  static schedulePickupValidation() {
    return [
      body('scheduled_date')
        .isDate()
        .withMessage('Valid scheduled date is required'),
      body('scheduled_time_start')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Valid start time is required (HH:MM format)'),
      body('scheduled_time_end')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Valid end time is required (HH:MM format)'),
      body('pickup_notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Pickup notes must not exceed 500 characters')
    ];
  }

  static confirmPickupValidation() {
    return [
      body('picked_up_by_name')
        .notEmpty()
        .isLength({ min: 2, max: 200 })
        .withMessage('Name of person picking up is required (2-200 characters)'),
      body('picked_up_by_id_type')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('ID type must be between 1 and 50 characters'),
      body('picked_up_by_id_number')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('ID number must be between 1 and 50 characters')
    ];
  }
}

module.exports = new AdminDocumentController();
