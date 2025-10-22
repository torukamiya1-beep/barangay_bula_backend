const { body, validationResult } = require('express-validator');
const ResidencyService = require('../services/residencyService');
const UserServiceNew = require('../services/userServiceNew');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { validateResidencyDocuments } = require('../middleware/residencyUpload');
const ComprehensiveActivityLogService = require('../services/comprehensiveActivityLogService');

class ResidencyController {
  constructor() {
    this.logger = logger;

    // Bind all methods to ensure 'this' context is preserved
    this.uploadDocuments = this.uploadDocuments.bind(this);
    this.uploadDocumentsForRegistration = this.uploadDocumentsForRegistration.bind(this);
    this.getAccountDocuments = this.getAccountDocuments.bind(this);
    this.getPendingVerifications = this.getPendingVerifications.bind(this);
    this.approveVerification = this.approveVerification.bind(this);
    this.rejectVerification = this.rejectVerification.bind(this);
    this.deleteDocument = this.deleteDocument.bind(this);
    this.getDocumentFile = this.getDocumentFile.bind(this);
    this.updateDocumentStatus = this.updateDocumentStatus.bind(this);
    this.getRejectedDocuments = this.getRejectedDocuments.bind(this);
    this.reuploadDocument = this.reuploadDocument.bind(this);
  }

  // Helper method to parse composite ID and extract actual client account ID
  parseAccountId(accountId) {
    if (typeof accountId === 'string' && accountId.includes('_')) {
      const { type, id } = UserServiceNew.parseCompositeId(accountId);
      // Only client accounts should have residency documents
      if (type !== 'client') {
        throw new Error('Invalid account type for residency verification');
      }
      return id;
    }
    // Handle legacy numeric IDs
    return parseInt(accountId);
  }

  // Validation rules for document upload
  static uploadValidation() {
    return [
      body('account_id')
        .custom((value) => {
          // Handle both string and integer values (FormData sends strings)
          const intValue = parseInt(value);
          if (isNaN(intValue) || intValue <= 0) {
            throw new Error('Valid account ID is required');
          }
          return true;
        }),
      body('document_types')
        .optional()
        .custom((value) => {
          // Handle both array and string values
          if (value && !Array.isArray(value) && typeof value !== 'string') {
            throw new Error('Document types must be an array or string');
          }
          return true;
        })
    ];
  }

  // Validation rules for verification actions
  static verificationValidation() {
    return [
      body('account_id')
        .isInt({ min: 1 })
        .withMessage('Valid account ID is required'),
      body('document_ids')
        .optional()
        .isArray()
        .withMessage('Document IDs must be an array'),
      body('rejection_reason')
        .optional()
        .isLength({ min: 10, max: 500 })
        .withMessage('Rejection reason must be between 10 and 500 characters')
    ];
  }

  // Upload residency documents
  async uploadDocuments(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { account_id, document_types } = req.body;
      const files = req.files;

      // Validate uploaded files
      const fileValidationErrors = validateResidencyDocuments(files);
      if (fileValidationErrors.length > 0) {
        return ApiResponse.error(res, 'File validation failed', 400, fileValidationErrors);
      }

      const result = await ResidencyService.uploadResidencyDocuments(
        parseInt(account_id),
        files,
        document_types
      );

      this.logger.info('Residency documents uploaded successfully', {
        accountId: account_id,
        documentsCount: result.data.uploadedDocuments.length,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to upload residency documents', {
        accountId: req.body.account_id,
        error: error.message,
        ip: req.ip
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Upload residency documents during registration (unauthenticated)
  async uploadDocumentsForRegistration(req, res) {
    try {
      logger.info('Registration document upload request received', {
        body: req.body,
        files: req.files ? Object.keys(req.files) : 'no files',
        ip: req.ip
      });

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Validation failed for registration document upload', {
          errors: errors.array(),
          body: req.body
        });
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { account_id, document_types } = req.body;
      const files = req.files;

      // Convert account_id to integer (FormData sends strings)
      const accountIdInt = parseInt(account_id);
      if (isNaN(accountIdInt) || accountIdInt <= 0) {
        logger.error('Invalid account_id provided', { account_id });
        return ApiResponse.error(res, 'Valid account ID is required', 400);
      }

      // Validate account exists and is in appropriate status for registration uploads
      const ClientAccount = require('../models/ClientAccount');
      const account = await ClientAccount.findById(accountIdInt);

      if (!account) {
        logger.error('Account not found for registration document upload', { accountId: accountIdInt });
        return ApiResponse.error(res, 'Account not found', 404);
      }

      logger.info('Account found for registration document upload', {
        accountId: accountIdInt,
        status: account.status,
        username: account.username
      });

      // Only allow uploads for accounts in registration process
      const allowedStatuses = ['pending_verification', 'pending_residency_verification', 'residency_rejected'];
      if (!allowedStatuses.includes(account.status)) {
        logger.error('Account not eligible for registration document upload', {
          accountId: accountIdInt,
          currentStatus: account.status,
          allowedStatuses
        });
        return ApiResponse.error(res, `Account is not eligible for registration document upload. Current status: ${account.status}`, 403);
      }

      // Validate uploaded files
      const fileValidationErrors = validateResidencyDocuments(files);
      if (fileValidationErrors.length > 0) {
        logger.error('File validation failed for registration document upload', {
          accountId: accountIdInt,
          errors: fileValidationErrors,
          files: files ? Object.keys(files) : 'no files'
        });
        return ApiResponse.error(res, 'File validation failed', 400, fileValidationErrors);
      }

      logger.info('Starting residency document upload', {
        accountId: accountIdInt,
        fileTypes: files ? Object.keys(files) : [],
        documentTypes: document_types
      });

      const result = await ResidencyService.uploadResidencyDocuments(
        accountIdInt,
        files,
        document_types
      );

      this.logger.info('Registration residency documents uploaded successfully', {
        accountId: account_id,
        documentsCount: result.data.uploadedDocuments.length,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to upload registration residency documents', {
        accountId: req.body.account_id,
        error: error.message,
        ip: req.ip
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get residency documents for an account
  async getAccountDocuments(req, res) {
    try {
      const { accountId } = req.params;
      const requestingUser = req.user;

      console.log('getAccountDocuments called with accountId:', accountId);

      // Parse composite ID to get actual account ID
      let actualAccountId;
      try {
        actualAccountId = this.parseAccountId(accountId);
        console.log('Parsed account ID:', actualAccountId);
      } catch (error) {
        return ApiResponse.error(res, error.message, 400);
      }

      // Access control: clients can only view their own documents, admins can view any
      if (requestingUser.type === 'client' && requestingUser.id !== actualAccountId) {
        return ApiResponse.error(res, 'Access denied. You can only view your own documents.', 403);
      }

      const result = await ResidencyService.getAccountResidencyDocuments(actualAccountId);

      this.logger.info('Residency documents retrieved', {
        accountId,
        requestedBy: requestingUser.id,
        requestedByType: requestingUser.type,
        documentsCount: result.data.length
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to get account residency documents', {
        accountId: req.params.accountId,
        requestedBy: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get pending residency verifications (Admin only)
  async getPendingVerifications(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await ResidencyService.getPendingVerifications(page, limit);

      return ApiResponse.success(res, result.data, result.message, result.pagination);
    } catch (error) {
      this.logger.error('Failed to get pending residency verifications', {
        error: error.message,
        adminId: req.user?.id
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Approve residency verification (Admin only)
  async approveVerification(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { account_id, document_ids } = req.body;
      const adminId = req.user.id;

      console.log('approveVerification called with account_id:', account_id);

      // Parse composite ID to get actual account ID
      let actualAccountId;
      try {
        actualAccountId = this.parseAccountId(account_id);
        console.log('Parsed account ID for approval:', actualAccountId);
      } catch (error) {
        return ApiResponse.error(res, error.message, 400);
      }

      const result = await ResidencyService.approveResidencyVerification(
        actualAccountId,
        adminId,
        document_ids || []
      );

      // Log audit activity for residency approval
      try {
        await ComprehensiveActivityLogService.logAdminActivity(
          adminId,
          'residency_approval',
          'client_profiles',
          actualAccountId,
          null, // old values
          {
            residency_verified: true,
            verified_by: adminId,
            verification_timestamp: new Date().toISOString(),
            document_ids: document_ids || []
          },
          req.clientIP || req.ip || 'unknown',
          req.get('User-Agent') || 'unknown'
        );
      } catch (auditError) {
        console.error('Failed to log residency approval audit:', auditError.message);
        // Don't fail the approval if audit logging fails
      }

      this.logger.info('Residency verification approved by admin', {
        accountId: account_id,
        adminId,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to approve residency verification', {
        accountId: req.body.account_id,
        adminId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Reject residency verification (Admin only)
  async rejectVerification(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { account_id, document_ids, rejection_reason } = req.body;
      const adminId = req.user.id;

      console.log('rejectVerification called with account_id:', account_id);

      if (!rejection_reason || rejection_reason.trim().length < 10) {
        return ApiResponse.error(res, 'Rejection reason is required and must be at least 10 characters', 400);
      }

      // Parse composite ID to get actual account ID
      let actualAccountId;
      try {
        actualAccountId = this.parseAccountId(account_id);
        console.log('Parsed account ID for rejection:', actualAccountId);
      } catch (error) {
        return ApiResponse.error(res, error.message, 400);
      }

      const result = await ResidencyService.rejectResidencyVerification(
        actualAccountId,
        adminId,
        rejection_reason.trim(),
        document_ids || []
      );

      this.logger.info('Residency verification rejected by admin', {
        accountId: account_id,
        adminId,
        rejectionReason: rejection_reason.trim(),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to reject residency verification', {
        accountId: req.body.account_id,
        adminId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Delete residency document
  async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;
      const accountId = req.user.id; // Assuming user is authenticated

      if (!documentId || isNaN(parseInt(documentId))) {
        return ApiResponse.error(res, 'Valid document ID is required', 400);
      }

      const result = await ResidencyService.deleteResidencyDocument(
        parseInt(documentId),
        accountId
      );

      this.logger.info('Residency document deleted', {
        documentId,
        accountId,
        ip: req.ip
      });

      return ApiResponse.success(res, null, result.message);
    } catch (error) {
      this.logger.error('Failed to delete residency document', {
        documentId: req.params.documentId,
        accountId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get document file (with proper authorization)
  async getDocumentFile(req, res) {
    try {
      const { documentId } = req.params;
      const requestingUser = req.user;

      if (!documentId || isNaN(parseInt(documentId))) {
        return ApiResponse.error(res, 'Valid document ID is required', 400);
      }

      const result = await ResidencyService.getDocumentFile(parseInt(documentId), requestingUser);

      // Set appropriate headers for file download
      res.setHeader('Content-Type', result.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);

      // Send the file
      res.sendFile(result.filePath);

    } catch (error) {
      this.logger.error('Failed to get document file', {
        documentId: req.params.documentId,
        userId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, error.message.includes('Access denied') ? 403 : 500);
    }
  }

  // Get residency verification status for current user
  async getVerificationStatus(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.type;

      console.log('🔍 DEBUG - getVerificationStatus called for user:', userId, 'type:', userType);

      // Only clients can check residency verification status
      if (userType !== 'client') {
        return ApiResponse.error(res, 'Only clients can check residency verification status', 403);
      }

      const result = await ResidencyService.getResidencyVerificationStatus(userId);

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.error(res, result.message, 400);
      }
    } catch (error) {
      console.error('Error in getVerificationStatus:', error);
      return ApiResponse.error(res, 'Internal server error', 500);
    }
  }

  // Update individual document verification status (Admin only)
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

      const result = await ResidencyService.updateDocumentVerificationStatus(
        parseInt(documentId),
        verification_status,
        adminId
      );

      this.logger.info('Document verification status updated', {
        documentId,
        status: verification_status,
        adminId,
        ip: req.ip
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to update document verification status', {
        documentId: req.params.documentId,
        adminId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get rejected documents for current client
  async getRejectedDocuments(req, res) {
    try {
      const clientId = req.user.id;

      const result = await ResidencyService.getRejectedDocumentsForClient(clientId);

      this.logger.info('Rejected documents retrieved', {
        clientId,
        documentsCount: result.data.length
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to get rejected documents', {
        clientId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Reupload a rejected document
  async reuploadDocument(req, res) {
    try {
      const { documentId } = req.params;
      const clientId = req.user.id;
      const files = req.files;

      if (!documentId || isNaN(parseInt(documentId))) {
        return ApiResponse.error(res, 'Valid document ID is required', 400);
      }

      if (!files || Object.keys(files).length === 0) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      // Get the first file from any field
      const fileArray = Object.values(files)[0];
      if (!fileArray || fileArray.length === 0) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const file = fileArray[0];

      const result = await ResidencyService.reuploadRejectedDocument(
        parseInt(documentId),
        clientId,
        file
      );

      this.logger.info('Document reuploaded successfully', {
        documentId,
        clientId,
        fileName: file.originalname,
        ip: req.ip
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to reupload document', {
        documentId: req.params.documentId,
        clientId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }
}

module.exports = new ResidencyController();
