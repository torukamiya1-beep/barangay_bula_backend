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
