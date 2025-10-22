/**
 * Document Fee Controller
 * Handles HTTP requests for document fee management
 */

const documentFeeService = require('../services/documentFeeService');

class DocumentFeeController {
  /**
   * Get all document types with their current fees
   * GET /api/document-fees
   */
  async getAllDocumentFees(req, res) {
    try {
      const fees = await documentFeeService.getAllDocumentFeesWithTypes();
      
      res.status(200).json({
        success: true,
        data: fees,
        count: fees.length
      });
    } catch (error) {
      console.error('Error in getAllDocumentFees:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch document fees',
        error: error.message
      });
    }
  }

  /**
   * Get current fee for a specific document type
   * GET /api/document-fees/:documentTypeId/current
   */
  async getCurrentFee(req, res) {
    try {
      const { documentTypeId } = req.params;
      
      if (!documentTypeId || isNaN(documentTypeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type ID'
        });
      }

      const fee = await documentFeeService.getCurrentFee(documentTypeId);
      
      if (!fee) {
        return res.status(404).json({
          success: false,
          message: 'No active fee found for this document type'
        });
      }

      res.status(200).json({
        success: true,
        data: fee
      });
    } catch (error) {
      console.error('Error in getCurrentFee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch current fee',
        error: error.message
      });
    }
  }

  /**
   * Get fee history for a specific document type
   * GET /api/document-fees/:documentTypeId/history
   */
  async getFeeHistory(req, res) {
    try {
      const { documentTypeId } = req.params;
      
      if (!documentTypeId || isNaN(documentTypeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type ID'
        });
      }

      const history = await documentFeeService.getFeeHistory(documentTypeId);
      
      res.status(200).json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      console.error('Error in getFeeHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch fee history',
        error: error.message
      });
    }
  }

  /**
   * Update fee for a document type
   * PUT /api/document-fees/:documentTypeId
   */
  async updateDocumentFee(req, res) {
    try {
      const { documentTypeId } = req.params;
      const { fee_amount } = req.body;
      
      // Validate inputs
      if (!documentTypeId || isNaN(documentTypeId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type ID'
        });
      }

      if (fee_amount === undefined || fee_amount === null || isNaN(fee_amount)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid fee amount'
        });
      }

      if (parseFloat(fee_amount) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Fee amount cannot be negative'
        });
      }

      // Get admin ID from authenticated user (if available)
      const adminId = req.user?.id || null;

      const result = await documentFeeService.updateDocumentFee(
        documentTypeId,
        fee_amount,
        adminId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in updateDocumentFee:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update document fee',
        error: error.message
      });
    }
  }

  /**
   * Get fee statistics
   * GET /api/document-fees/statistics
   */
  async getFeeStatistics(req, res) {
    try {
      const stats = await documentFeeService.getFeeStatistics();
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getFeeStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch fee statistics',
        error: error.message
      });
    }
  }
}

module.exports = new DocumentFeeController();
