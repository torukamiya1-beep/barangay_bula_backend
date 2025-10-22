const SupportingDocumentService = require('../services/supportingDocumentService');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');

class SupportingDocumentController {
  constructor() {
    this.logger = logger;
  }

  // Update supporting document verification status (Admin only)
  async updateDocumentStatus(req, res) {
    try {
      const { documentId } = req.params;
      const { verification_status } = req.body;
      const adminId = req.user.id;

      if (!documentId || isNaN(parseInt(documentId))) {
        return ApiResponse.error(res, 'Valid document ID is required', 400);
      }

      if (!verification_status || !['approved', 'rejected'].includes(verification_status)) {
        return ApiResponse.error(res, 'Valid verification status is required (approved or rejected)', 400);
      }

      const result = await SupportingDocumentService.updateDocumentVerificationStatus(
        parseInt(documentId),
        verification_status,
        adminId
      );

      logger.info('Supporting document verification status updated', {
        documentId,
        status: verification_status,
        adminId,
        ip: req.ip
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Failed to update supporting document verification status', {
        documentId: req.params.documentId,
        adminId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get rejected supporting documents for current client
  async getRejectedDocuments(req, res) {
    try {
      console.log('🔍 getRejectedDocuments called');
      console.log('🔍 req.user:', req.user);
      
      const clientId = req.user.id;
      console.log('🔍 clientId:', clientId);

      const documents = await SupportingDocumentService.getRejectedDocumentsForClient(clientId);
      console.log('🔍 documents retrieved:', documents ? documents.length : 'null', typeof documents);

      logger.info('Rejected supporting documents retrieved', {
        clientId,
        count: documents.length
      });

      return ApiResponse.success(res, documents, 'Rejected documents retrieved successfully');
    } catch (error) {
      console.error('❌ ERROR in getRejectedDocuments:');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error:', error);
      
      logger.error('Failed to get rejected supporting documents', {
        clientId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Reupload a rejected supporting document (Client only)
  async reuploadDocument(req, res) {
    try {
      const { documentId } = req.params;
      const clientId = req.user.id;

      if (!documentId || isNaN(parseInt(documentId))) {
        return ApiResponse.error(res, 'Valid document ID is required', 400);
      }

      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const result = await SupportingDocumentService.reuploadDocument(
        parseInt(documentId),
        req.file,
        clientId
      );

      logger.info('Supporting document reuploaded', {
        documentId,
        clientId,
        filename: req.file.filename
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Failed to reupload supporting document', {
        documentId: req.params.documentId,
        clientId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }
}

module.exports = new SupportingDocumentController();
