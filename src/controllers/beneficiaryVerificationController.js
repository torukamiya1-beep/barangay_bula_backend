const BeneficiaryVerificationService = require('../services/beneficiaryVerificationService');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');

class BeneficiaryVerificationController {
  constructor() {
    this.logger = logger;
  }

  // Update beneficiary verification status (Admin only)
  async updateVerificationStatus(req, res) {
    try {
      const { beneficiaryId } = req.params;
      const { verification_status } = req.body;
      const adminId = req.user.id;

      if (!beneficiaryId || isNaN(parseInt(beneficiaryId))) {
        return ApiResponse.error(res, 'Valid beneficiary ID is required', 400);
      }

      if (!verification_status || !['approved', 'rejected'].includes(verification_status)) {
        return ApiResponse.error(res, 'Valid verification status is required (approved or rejected)', 400);
      }

      const result = await BeneficiaryVerificationService.updateVerificationStatus(
        parseInt(beneficiaryId),
        verification_status,
        adminId
      );

      this.logger.info('Beneficiary verification status updated', {
        beneficiaryId,
        status: verification_status,
        adminId,
        ip: req.ip
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      this.logger.error('Failed to update beneficiary verification status', {
        beneficiaryId: req.params.beneficiaryId,
        adminId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get rejected beneficiary verifications for current client
  async getRejectedVerifications(req, res) {
    try {
      console.log('🔍 getRejectedVerifications called');
      console.log('🔍 req.user:', req.user);
      
      const clientId = req.user.id;
      console.log('🔍 clientId:', clientId);

      const verifications = await BeneficiaryVerificationService.getRejectedBeneficiaryVerifications(clientId);
      console.log('🔍 verifications retrieved:', verifications ? verifications.length : 'null', typeof verifications);

      logger.info('Rejected beneficiary verifications retrieved', {
        clientId,
        count: verifications.length
      });

      return ApiResponse.success(res, verifications, 'Rejected verifications retrieved successfully');
    } catch (error) {
      console.error('❌ ERROR in getRejectedVerifications:');
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error:', error);
      
      logger.error('Failed to get rejected beneficiary verifications', {
        clientId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Reupload a rejected beneficiary verification document (Client only)
  async reuploadDocument(req, res) {
    try {
      const { beneficiaryId } = req.params;
      const clientId = req.user.id;

      if (!beneficiaryId || isNaN(parseInt(beneficiaryId))) {
        return ApiResponse.error(res, 'Valid beneficiary ID is required', 400);
      }

      if (!req.file) {
        return ApiResponse.error(res, 'No file uploaded', 400);
      }

      const result = await BeneficiaryVerificationService.reuploadDocument(
        parseInt(beneficiaryId),
        req.file,
        clientId
      );

      logger.info('Beneficiary verification document reuploaded', {
        beneficiaryId,
        clientId,
        filename: req.file.filename
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Failed to reupload beneficiary verification document', {
        beneficiaryId: req.params.beneficiaryId,
        clientId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }
}

module.exports = new BeneficiaryVerificationController();
