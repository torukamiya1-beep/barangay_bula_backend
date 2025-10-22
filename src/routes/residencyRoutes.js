const express = require('express');
const router = express.Router();
const residencyController = require('../controllers/residencyController');
const { uploadResidencyDocuments } = require('../middleware/residencyUpload');
const { authenticateClient, protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   POST /api/residency/upload
 * @desc    Upload residency documents for verification
 * @access  Private (Client)
 * @body    { account_id, document_types? }
 * @files   Multiple files with field names: utility_bill, barangay_certificate, valid_id, lease_contract, other
 */
router.post('/upload',
  authenticateClient,
  uploadResidencyDocuments,
  residencyController.constructor.uploadValidation(),
  asyncHandler(residencyController.uploadDocuments)
);

/**
 * @route   POST /api/residency/upload-registration
 * @desc    Upload residency documents during registration process (unauthenticated)
 * @access  Public (but validates account_id and status)
 * @body    { account_id, document_types? }
 * @files   Multiple files with field names: utility_bill, barangay_certificate, valid_id, lease_contract, other
 */
router.post('/upload-registration',
  uploadResidencyDocuments,
  residencyController.constructor.uploadValidation(),
  asyncHandler(residencyController.uploadDocumentsForRegistration)
);

/**
 * @route   GET /api/residency/documents/:accountId
 * @desc    Get residency documents for an account
 * @access  Private (Client - own documents, Admin - any documents)
 * @params  accountId
 */
router.get('/documents/:accountId',
  protect, // Allow both client and admin access
  asyncHandler(residencyController.getAccountDocuments)
);

/**
 * @route   GET /api/residency/verification-status
 * @desc    Get residency verification status for current client
 * @access  Private (Client only)
 */
router.get('/verification-status',
  protect,
  authorize('client'),
  asyncHandler(residencyController.getVerificationStatus)
);

/**
 * @route   GET /api/residency/pending
 * @desc    Get pending residency verifications for admin review
 * @access  Private (Admin only)
 * @query   page?, limit?
 */
router.get('/pending',
  protect,
  authorize('admin', 'employee'),
  asyncHandler(residencyController.getPendingVerifications)
);

/**
 * @route   POST /api/residency/approve
 * @desc    Approve residency verification
 * @access  Private (Admin only)
 * @body    { account_id, document_ids? }
 */
router.post('/approve',
  protect,
  authorize('admin', 'employee'),
  residencyController.constructor.verificationValidation(),
  asyncHandler(residencyController.approveVerification)
);

/**
 * @route   POST /api/residency/reject
 * @desc    Reject residency verification
 * @access  Private (Admin only)
 * @body    { account_id, document_ids?, rejection_reason }
 */
router.post('/reject',
  protect,
  authorize('admin', 'employee'),
  residencyController.constructor.verificationValidation(),
  asyncHandler(residencyController.rejectVerification)
);

/**
 * @route   DELETE /api/residency/documents/:documentId
 * @desc    Delete a residency document
 * @access  Private (Client - own documents only)
 * @params  documentId
 */
router.delete('/documents/:documentId',
  authenticateClient,
  asyncHandler(residencyController.deleteDocument)
);

/**
 * @route   GET /api/residency/documents/:documentId/file
 * @desc    Get document file (for viewing/downloading)
 * @access  Private (Client - own documents, Admin - any documents)
 * @params  documentId
 */
router.get('/documents/:documentId/file',
  protect, // Allow both client and admin access
  asyncHandler(residencyController.getDocumentFile)
);

/**
 * @route   PATCH /api/residency/documents/:documentId/status
 * @desc    Update individual document verification status
 * @access  Private (Admin only)
 * @params  documentId
 * @body    { verification_status: 'approved' | 'rejected' }
 */
router.patch('/documents/:documentId/status',
  protect,
  authorize('admin', 'employee'),
  asyncHandler(residencyController.updateDocumentStatus)
);

/**
 * @route   GET /api/residency/documents/rejected/list
 * @desc    Get rejected documents for current client
 * @access  Private (Client only)
 */
router.get('/documents/rejected/list',
  protect,
  authorize('client'),
  asyncHandler(residencyController.getRejectedDocuments)
);

/**
 * @route   POST /api/residency/documents/:documentId/reupload
 * @desc    Reupload a rejected document
 * @access  Private (Client only)
 * @params  documentId
 * @files   Single file
 */
router.post('/documents/:documentId/reupload',
  authenticateClient,
  uploadResidencyDocuments,
  asyncHandler(residencyController.reuploadDocument)
);

module.exports = router;
