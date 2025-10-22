const VerificationDocumentService = require('../services/verificationDocumentService');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { executeQuery } = require('../config/database');
const fs = require('fs');
const path = require('path');

class VerificationDocumentController {

  /**
   * Upload beneficiary verification image
   */
  async uploadBeneficiaryVerification(req, res) {
    try {
      const { beneficiaryId } = req.params;
      const file = req.file;

      if (!file) {
        return ApiResponse.badRequest(res, 'No file uploaded');
      }

      if (!beneficiaryId) {
        return ApiResponse.badRequest(res, 'Beneficiary ID is required');
      }

      const result = await VerificationDocumentService.uploadBeneficiaryVerificationImage(
        parseInt(beneficiaryId), 
        file
      );

      if (result.success) {
        return ApiResponse.success(res, result.data, result.message);
      } else {
        return ApiResponse.badRequest(res, result.message);
      }

    } catch (error) {
      logger.error('Controller error - uploadBeneficiaryVerification', {
        error: error.message,
        stack: error.stack,
        beneficiaryId: req.params.beneficiaryId
      });
      return ApiResponse.serverError(res, 'Failed to upload verification image');
    }
  }

  /**
   * Upload pickup person ID image
   */
  async uploadPickupPersonId(req, res) {
    try {
      console.log('🔍 uploadPickupPersonId called');
      console.log('📋 Request params:', req.params);
      console.log('📁 File info:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : 'No file');

      const { pickupPersonId } = req.params;
      const file = req.file;

      if (!file) {
        console.log('❌ No file uploaded');
        return ApiResponse.badRequest(res, 'No file uploaded');
      }

      if (!pickupPersonId) {
        console.log('❌ No pickup person ID');
        return ApiResponse.badRequest(res, 'Pickup person ID is required');
      }

      console.log('🔄 Calling VerificationDocumentService.uploadPickupPersonIdImage...');
      const result = await VerificationDocumentService.uploadPickupPersonIdImage(
        parseInt(pickupPersonId),
        file
      );
      console.log('📋 Service result:', result);

      if (result.success) {
        console.log('✅ Upload successful, returning success response');
        return ApiResponse.success(res, result.data, result.message);
      } else {
        console.log('❌ Upload failed, returning error response');
        return ApiResponse.badRequest(res, result.message);
      }

    } catch (error) {
      logger.error('Controller error - uploadPickupPersonId', {
        error: error.message,
        stack: error.stack,
        pickupPersonId: req.params.pickupPersonId
      });
      return ApiResponse.serverError(res, 'Failed to upload ID image');
    }
  }

  /**
   * Upload pickup authorization document
   */
  async uploadPickupAuthorization(req, res) {
    try {
      console.log('🔍 uploadPickupAuthorization called');
      console.log('📋 Request params:', req.params);
      console.log('📁 File info:', req.file ? {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : 'No file');

      const { pickupPersonId } = req.params;
      const file = req.file;

      if (!file) {
        console.log('❌ No file uploaded');
        return ApiResponse.badRequest(res, 'No file uploaded');
      }

      if (!pickupPersonId) {
        console.log('❌ No pickup person ID');
        return ApiResponse.badRequest(res, 'Pickup person ID is required');
      }

      console.log('🔄 Calling VerificationDocumentService.uploadPickupAuthorizationDocument...');
      const result = await VerificationDocumentService.uploadPickupAuthorizationDocument(
        parseInt(pickupPersonId),
        file
      );
      console.log('📋 Service result:', result);

      if (result.success) {
        console.log('✅ Upload successful, returning success response');
        return ApiResponse.success(res, result.data, result.message);
      } else {
        console.log('❌ Upload failed, returning error response');
        return ApiResponse.badRequest(res, result.message);
      }

    } catch (error) {
      logger.error('Controller error - uploadPickupAuthorization', {
        error: error.message,
        stack: error.stack,
        pickupPersonId: req.params.pickupPersonId
      });
      return ApiResponse.serverError(res, 'Failed to upload authorization document');
    }
  }

  /**
   * Serve verification document (admin only)
   */
  async serveVerificationDocument(req, res) {
    try {
      const { type, id, filename } = req.params;

      // Verify admin or employee access (already checked by middleware, but double-check)
      if (!req.user || !['admin', 'employee'].includes(req.user.role)) {
        return ApiResponse.forbidden(res, 'Access denied. Admin or employee privileges required.');
      }

      // Extract just the filename if a full path was provided
      const actualFilename = filename.split(/[/\\]/).pop();

      logger.info('Serving verification document - params', {
        type,
        id,
        originalFilename: filename,
        extractedFilename: actualFilename
      });

      // Construct file path based on type
      let filePath;
      switch (type) {
        case 'beneficiary':
          // Try new directory first, then fall back to old directory
          filePath = path.join(VerificationDocumentService.UPLOAD_DIRS.beneficiary_verifications, actualFilename);
          if (!fs.existsSync(filePath)) {
            filePath = path.join(VerificationDocumentService.UPLOAD_DIRS.beneficiary_verification, actualFilename);
          }
          break;
        case 'pickup-id':
          filePath = path.join(VerificationDocumentService.UPLOAD_DIRS.pickup_id, actualFilename);
          break;
        case 'pickup-auth':
          filePath = path.join(VerificationDocumentService.UPLOAD_DIRS.pickup_authorization, actualFilename);
          break;
        default:
          return ApiResponse.badRequest(res, 'Invalid document type');
      }

      // Debug logging
      logger.info('Serving verification document', {
        type,
        id,
        filename,
        constructedPath: filePath,
        fileExists: fs.existsSync(filePath)
      });

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.error('Document file not found', {
          type,
          id,
          filename,
          constructedPath: filePath,
          uploadDir: type === 'pickup-id' ? VerificationDocumentService.UPLOAD_DIRS.pickup_id :
                     type === 'pickup-auth' ? VerificationDocumentService.UPLOAD_DIRS.pickup_authorization :
                     VerificationDocumentService.UPLOAD_DIRS.beneficiary_verification
        });
        return ApiResponse.notFound(res, 'Document not found');
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileExtension = path.extname(filename).toLowerCase();

      // Set appropriate content type
      let contentType = 'application/octet-stream';
      switch (fileExtension) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.pdf':
          contentType = 'application/pdf';
          break;
        case '.doc':
          contentType = 'application/msword';
          break;
        case '.docx':
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          break;
      }

      // Set headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'private, no-cache');

      // Log access for audit
      logger.info('Verification document accessed', {
        adminId: req.user.id,
        documentType: type,
        filename,
        filePath
      });

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      logger.error('Controller error - serveVerificationDocument', {
        error: error.message,
        stack: error.stack,
        params: req.params,
        adminId: req.user?.id
      });
      return ApiResponse.serverError(res, 'Failed to serve document');
    }
  }

  /**
   * Get beneficiary verification status
   */
  async getBeneficiaryVerificationStatus(req, res) {
    try {
      const { beneficiaryId } = req.params;

      const document = await VerificationDocumentService.getBeneficiaryVerificationDocument(
        parseInt(beneficiaryId)
      );

      if (!document) {
        return ApiResponse.notFound(res, 'Beneficiary not found');
      }

      // Return status without file paths for security
      const statusData = {
        hasVerificationImage: !!document.verification_image_path,
        verificationStatus: document.verification_status,
        verifiedAt: document.verified_at,
        verificationNotes: document.verification_notes
      };

      return ApiResponse.success(res, statusData, 'Verification status retrieved');

    } catch (error) {
      logger.error('Controller error - getBeneficiaryVerificationStatus', {
        error: error.message,
        stack: error.stack,
        beneficiaryId: req.params.beneficiaryId
      });
      return ApiResponse.serverError(res, 'Failed to get verification status');
    }
  }

  /**
   * Get pickup person documents status
   */
  async getPickupPersonDocumentsStatus(req, res) {
    try {
      const { pickupPersonId } = req.params;

      const documents = await VerificationDocumentService.getPickupPersonDocuments(
        parseInt(pickupPersonId)
      );

      if (!documents) {
        return ApiResponse.notFound(res, 'Pickup person not found');
      }

      // Return status without file paths for security
      const statusData = {
        hasIdImage: !!documents.id_image_path,
        hasAuthorizationLetter: !!documents.authorization_letter_path
      };

      return ApiResponse.success(res, statusData, 'Documents status retrieved');

    } catch (error) {
      logger.error('Controller error - getPickupPersonDocumentsStatus', {
        error: error.message,
        stack: error.stack,
        pickupPersonId: req.params.pickupPersonId
      });
      return ApiResponse.serverError(res, 'Failed to get documents status');
    }
  }

  /**
   * Update beneficiary verification status (admin only)
   */
  async updateBeneficiaryVerificationStatus(req, res) {
    try {
      const { beneficiaryId } = req.params;
      const { status, notes } = req.body;

      // Verify admin or employee access (already checked by middleware, but double-check)
      if (!req.user || !['admin', 'employee'].includes(req.user.role)) {
        return ApiResponse.forbidden(res, 'Access denied. Admin or employee privileges required.');
      }

      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return ApiResponse.badRequest(res, 'Invalid verification status');
      }

      const updateQuery = `
        UPDATE document_beneficiaries 
        SET verification_status = ?, 
            verified_by = ?, 
            verified_at = NOW(), 
            verification_notes = ?
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [status, req.user.id, notes || null, beneficiaryId]);

      logger.info('Beneficiary verification status updated', {
        beneficiaryId,
        status,
        adminId: req.user.id,
        notes
      });

      return ApiResponse.success(res, null, 'Verification status updated successfully');

    } catch (error) {
      logger.error('Controller error - updateBeneficiaryVerificationStatus', {
        error: error.message,
        stack: error.stack,
        beneficiaryId: req.params.beneficiaryId,
        adminId: req.user?.id
      });
      return ApiResponse.serverError(res, 'Failed to update verification status');
    }
  }
}

module.exports = new VerificationDocumentController();
