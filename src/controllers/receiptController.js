const Receipt = require('../models/Receipt');
const logger = require('../utils/logger');
const { ApiResponse } = require('../utils/response');

/**
 * Receipt Controller
 * Handles receipt-related operations for client transactions
 */
class ReceiptController {
  /**
   * Get client receipts with pagination and filtering
   * @route GET /api/client/receipts
   * @access Private (Client only)
   */
  async getClientReceipts(req, res) {
    try {
      const clientId = req.user.id;
      const {
        page = 1,
        limit = 10,
        status,
        startDate,
        endDate,
        sortBy = 'receipt_date',
        sortOrder = 'DESC'
      } = req.query;

      // Validate pagination parameters
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max 50 per page

      // Validate sort parameters
      const allowedSortFields = ['receipt_date', 'amount', 'document_type', 'payment_method'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'receipt_date';
      const sortDirection = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      const options = {
        page: pageNum,
        limit: limitNum,
        status,
        startDate,
        endDate,
        sortBy: sortField,
        sortOrder: sortDirection
      };

      const result = await Receipt.getClientReceipts(clientId, options);

      logger.info('Client receipts retrieved', {
        clientId,
        page: pageNum,
        limit: limitNum,
        totalReceipts: result.pagination.total
      });

      return ApiResponse.success(res, result, 'Receipts retrieved successfully');
    } catch (error) {
      logger.error('Failed to get client receipts', {
        clientId: req.user?.id,
        error: error.message
      });
      return ApiResponse.error(res, 'Failed to retrieve receipts', 500);
    }
  }

  /**
   * Get specific receipt details
   * @route GET /api/client/receipts/:id
   * @access Private (Client only - own receipts)
   */
  async getReceiptDetails(req, res) {
    try {
      const { id } = req.params;
      const clientId = req.user.id;

      // Validate receipt ID
      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Invalid receipt ID', 400);
      }

      // Get complete receipt information
      const receipt = await Receipt.getCompleteReceipt(parseInt(id));

      if (!receipt) {
        return ApiResponse.error(res, 'Receipt not found', 404);
      }

      // Ensure client can only access their own receipts
      if (receipt.client_id !== clientId) {
        return ApiResponse.error(res, 'Access denied', 403);
      }

      logger.info('Receipt details retrieved', {
        receiptId: id,
        clientId,
        receiptNumber: receipt.receipt_number
      });

      return ApiResponse.success(res, receipt, 'Receipt details retrieved successfully');
    } catch (error) {
      logger.error('Failed to get receipt details', {
        receiptId: req.params.id,
        clientId: req.user?.id,
        error: error.message
      });
      return ApiResponse.error(res, 'Failed to retrieve receipt details', 500);
    }
  }

  /**
   * Get receipt by receipt number
   * @route GET /api/client/receipts/number/:receiptNumber
   * @access Private (Client only - own receipts)
   */
  async getReceiptByNumber(req, res) {
    try {
      const { receiptNumber } = req.params;
      const clientId = req.user.id;

      if (!receiptNumber) {
        return ApiResponse.error(res, 'Receipt number is required', 400);
      }

      const receipt = await Receipt.findByReceiptNumber(receiptNumber);

      if (!receipt) {
        return ApiResponse.error(res, 'Receipt not found', 404);
      }

      // Ensure client can only access their own receipts
      if (receipt.client_id !== clientId) {
        return ApiResponse.error(res, 'Access denied', 403);
      }

      // Get complete receipt information
      const completeReceipt = await Receipt.getCompleteReceipt(receipt.id);

      logger.info('Receipt retrieved by number', {
        receiptNumber,
        clientId,
        receiptId: receipt.id
      });

      return ApiResponse.success(res, completeReceipt, 'Receipt retrieved successfully');
    } catch (error) {
      logger.error('Failed to get receipt by number', {
        receiptNumber: req.params.receiptNumber,
        clientId: req.user?.id,
        error: error.message
      });
      return ApiResponse.error(res, 'Failed to retrieve receipt', 500);
    }
  }

  /**
   * Get client receipt statistics
   * @route GET /api/client/receipts/statistics
   * @access Private (Client only)
   */
  async getClientStatistics(req, res) {
    try {
      const clientId = req.user.id;

      const statistics = await Receipt.getClientStatistics(clientId);

      logger.info('Client receipt statistics retrieved', {
        clientId,
        totalReceipts: statistics.total_receipts
      });

      return ApiResponse.success(res, statistics, 'Receipt statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get client receipt statistics', {
        clientId: req.user?.id,
        error: error.message
      });
      return ApiResponse.error(res, 'Failed to retrieve receipt statistics', 500);
    }
  }

  /**
   * Download receipt as PDF (placeholder for future implementation)
   * @route GET /api/client/receipts/:id/download
   * @access Private (Client only - own receipts)
   */
  async downloadReceipt(req, res) {
    try {
      const { id } = req.params;
      const clientId = req.user.id;

      // Validate receipt ID
      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, 'Invalid receipt ID', 400);
      }

      // Get receipt
      const receipt = await Receipt.findById(parseInt(id));

      if (!receipt) {
        return ApiResponse.error(res, 'Receipt not found', 404);
      }

      // Ensure client can only access their own receipts
      if (receipt.client_id !== clientId) {
        return ApiResponse.error(res, 'Access denied', 403);
      }

      // TODO: Implement PDF generation
      // For now, return the receipt data
      logger.info('Receipt download requested', {
        receiptId: id,
        clientId,
        receiptNumber: receipt.receipt_number
      });

      return ApiResponse.success(res, {
        message: 'PDF download feature coming soon',
        receipt: receipt.toJSON()
      }, 'Receipt data retrieved for download');
    } catch (error) {
      logger.error('Failed to download receipt', {
        receiptId: req.params.id,
        clientId: req.user?.id,
        error: error.message
      });
      return ApiResponse.error(res, 'Failed to download receipt', 500);
    }
  }

  /**
   * Admin: Get all receipts with pagination and filtering
   * @route GET /api/admin/receipts
   * @access Private (Admin only)
   */
  async getAllReceipts(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        clientId,
        status,
        startDate,
        endDate,
        sortBy = 'receipt_date',
        sortOrder = 'DESC'
      } = req.query;

      // This would be implemented for admin access
      // For now, return placeholder
      return ApiResponse.success(res, {
        message: 'Admin receipt management coming soon'
      }, 'Admin receipts endpoint');
    } catch (error) {
      logger.error('Failed to get all receipts (admin)', {
        adminId: req.user?.id,
        error: error.message
      });
      return ApiResponse.error(res, 'Failed to retrieve receipts', 500);
    }
  }

  /**
   * Admin: Get receipt by request ID
   * @route GET /api/admin/receipts/:requestId
   * @access Private (Admin only)
   */
  async getReceiptByRequestId(req, res) {
    try {
      const { requestId } = req.params;

      // Validate request ID
      if (!requestId || isNaN(parseInt(requestId))) {
        return ApiResponse.error(res, 'Invalid request ID', 400);
      }

      // Get receipt by request ID
      const receipt = await Receipt.findByRequestId(parseInt(requestId));

      if (!receipt) {
        // For GCash manual payments, generate receipt data from request
        console.log('📋 No receipt found, generating from request data', { requestId });
        logger.info('No receipt found, generating from request data', { requestId });
        
        try {
          const { pool } = require('../config/database');
          console.log('🔍 Querying document_requests for ID:', requestId);
          
          const [requests] = await pool.query(`
            SELECT 
              dr.id,
              dr.request_number,
              dr.total_document_fee,
              dr.payment_status,
              dr.gcash_verified_at,
              dr.gcash_reference_number,
              dr.requested_at,
              dr.paid_at,
              ca.id as client_id,
              cp.first_name,
              cp.last_name,
              cp.email,
              cp.phone_number,
              dt.type_name as document_type,
              pm.method_name as payment_method,
              pm.method_code as payment_method_code
            FROM document_requests dr
            JOIN client_accounts ca ON dr.client_id = ca.id
            LEFT JOIN client_profiles cp ON ca.id = cp.account_id
            LEFT JOIN document_types dt ON dr.document_type_id = dt.id
            LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
            WHERE dr.id = ?
          `, [parseInt(requestId)]);

          console.log('📊 Query result:', {
            found: requests && requests.length > 0,
            count: requests ? requests.length : 0,
            data: requests && requests.length > 0 ? requests[0] : null
          });

          if (!requests || requests.length === 0) {
            console.error('❌ Request not found in database:', requestId);
            return ApiResponse.error(res, 'Request not found', 404);
          }

          const request = requests[0];
          console.log('✅ Request found:', {
            id: request.id,
            request_number: request.request_number,
            client_name: `${request.first_name} ${request.last_name}`
          });

          // Generate receipt-like data for GCash manual payments
          const generatedReceipt = {
            id: null,
            receipt_number: `GCASH-${request.request_number}`,
            request_id: request.id,
            request_number: request.request_number,
            client_id: request.client_id,
            client_name: `${request.first_name || ''} ${request.last_name || ''}`.trim() || 'N/A',
            client_email: request.email || 'N/A',
            client_phone: request.phone_number || 'N/A',
            document_type: request.document_type || 'N/A',
            amount: parseFloat(request.total_document_fee) || 0,
            payment_method: request.payment_method || 'GCash Manual',
            payment_method_code: request.payment_method_code || 'gcash_manual',
            payment_reference: request.gcash_reference_number || 'N/A',
            payment_status: request.payment_status || 'pending',
            payment_date: request.gcash_verified_at || request.paid_at || request.requested_at,
            receipt_date: request.gcash_verified_at || request.paid_at || request.requested_at,
            created_at: request.requested_at,
            is_generated: true // Flag to indicate this is generated, not from receipts table
          };

          console.log('✅ Generated receipt:', generatedReceipt);
          logger.info('Generated receipt data for GCash manual payment', {
            requestId,
            receiptNumber: generatedReceipt.receipt_number,
            adminId: req.user?.id
          });

          return ApiResponse.success(res, generatedReceipt, 'Receipt data generated successfully');
        } catch (generateError) {
          console.error('❌ Error generating receipt from request:', generateError);
          logger.error('Error generating receipt from request', {
            requestId,
            error: generateError.message,
            stack: generateError.stack
          });
          return ApiResponse.error(res, `Failed to generate receipt: ${generateError.message}`, 500);
        }
      }

      // Get complete receipt information
      const completeReceipt = await Receipt.getCompleteReceipt(receipt.id);

      logger.info('Admin retrieved receipt by request ID', {
        requestId,
        receiptId: receipt.id,
        adminId: req.user?.id
      });

      return ApiResponse.success(res, completeReceipt, 'Receipt retrieved successfully');
    } catch (error) {
      logger.error('Failed to get receipt by request ID (admin)', {
        requestId: req.params.requestId,
        adminId: req.user?.id,
        error: error.message,
        stack: error.stack
      });
      return ApiResponse.error(res, 'Failed to retrieve receipt', 500);
    }
  }

  /**
   * Validation middleware for receipt queries
   */
  static receiptQueryValidation() {
    return [
      // Add validation rules here if needed
    ];
  }

  /**
   * Validation middleware for receipt ID parameter
   */
  static receiptIdValidation() {
    return [
      // Add validation rules here if needed
    ];
  }
}

module.exports = new ReceiptController();
