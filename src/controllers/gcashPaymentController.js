const gcashPaymentService = require('../services/gcashPaymentService');
const logger = require('../utils/logger');
const { cleanupGCashProof } = require('../middleware/gcashProofUpload');

/**
 * GCash Payment Controller
 * Handles HTTP requests for GCash payment operations
 */

/**
 * Upload payment proof
 * POST /api/gcash-payments/upload-proof/:requestId
 */
exports.uploadPaymentProof = async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const clientId = req.user.id; // From authentication middleware
    const referenceNumber = req.body.reference_number || null;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No payment proof file uploaded'
      });
    }

    const result = await gcashPaymentService.uploadPaymentProof(
      requestId,
      req.file,
      clientId,
      referenceNumber
    );

    res.json(result);
  } catch (error) {
    logger.error('Error in uploadPaymentProof controller:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file) {
      cleanupGCashProof(req.file);
    }

    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload payment proof'
    });
  }
};

/**
 * Verify (approve) payment proof
 * POST /api/gcash-payments/verify/:requestId
 */
exports.verifyPaymentProof = async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const adminId = req.user.id; // From admin authentication middleware

    const result = await gcashPaymentService.verifyPaymentProof(requestId, adminId);

    res.json(result);
  } catch (error) {
    logger.error('Error in verifyPaymentProof controller:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to verify payment proof'
    });
  }
};

/**
 * Reject payment proof - UPDATED: No reason required
 * POST /api/gcash-payments/reject/:requestId
 */
exports.rejectPaymentProof = async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const adminId = req.user.id; // From admin authentication middleware

    const result = await gcashPaymentService.rejectPaymentProof(
      requestId,
      adminId
    );

    res.json(result);
  } catch (error) {
    logger.error('Error in rejectPaymentProof controller:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to reject payment proof'
    });
  }
};

/**
 * Reupload payment proof after rejection
 * POST /api/gcash-payments/reupload-proof/:requestId
 */
exports.reuploadPaymentProof = async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const clientId = req.user.id; // From authentication middleware
    const referenceNumber = req.body.reference_number || null;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No payment proof file uploaded'
      });
    }

    const result = await gcashPaymentService.reuploadPaymentProof(
      requestId,
      req.file,
      clientId,
      referenceNumber
    );

    res.json(result);
  } catch (error) {
    logger.error('Error in reuploadPaymentProof controller:', error);
    
    // Clean up uploaded file if error occurs
    if (req.file) {
      cleanupGCashProof(req.file);
    }

    res.status(400).json({
      success: false,
      error: error.message || 'Failed to reupload payment proof'
    });
  }
};

/**
 * Get payment proof image
 * GET /api/gcash-payments/proof-image/:requestId
 */
exports.getPaymentProofImage = async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const userId = req.user.id;
    const userType = req.user.role === 'admin' ? 'admin' : 'client';

    const result = await gcashPaymentService.getPaymentProofImage(
      requestId,
      userId,
      userType
    );

    // Set appropriate headers and send file
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${result.filename}"`);
    res.sendFile(result.filePath);
  } catch (error) {
    logger.error('Error in getPaymentProofImage controller:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Payment proof not found'
    });
  }
};

/**
 * Get pending payment proofs (Admin only)
 * GET /api/gcash-payments/pending-proofs
 */
exports.getPendingProofs = async (req, res) => {
  try {
    const proofs = await gcashPaymentService.getPendingProofs();

    res.json({
      success: true,
      data: proofs,
      count: proofs.length
    });
  } catch (error) {
    logger.error('Error in getPendingProofs controller:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending payment proofs'
    });
  }
};
