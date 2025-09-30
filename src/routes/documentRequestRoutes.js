const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const documentRequestController = require('../controllers/documentRequestController');
const { authenticateClient, protect } = require('../middleware/auth');
const { uploadDocuments } = require('../middleware/fileUpload');
const {
  validateSubmitRequest,
  validateRequestId,
  validateCancelRequest,
  validateGetRequests,
  validateCalculateCedulaTax,
  validateGetProcessingFee,
  validateFamilyRelationship,
  validateRequestFrequency
} = require('../middleware/documentRequestValidation');

// Rate limiting for document request submission
// Adjusted to allow legitimate family requests while preventing abuse
const submitRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased to allow family member requests (account owner + family members)
  message: {
    success: false,
    message: 'Too many document requests submitted. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for different document types to allow cedula + barangay clearance
  skip: (req) => {
    // Allow bypass for legitimate use cases - this will be handled by frequency validation instead
    return false; // Keep rate limiting but with higher limits
  }
});

// Rate limiting for general API calls
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each client to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply general rate limiting to all routes
router.use(generalLimiter);

// Apply client authentication to all routes
router.use(authenticateClient);

// GET /api/client/document-requests/document-types - Get available document types
router.get('/document-types', documentRequestController.getDocumentTypes);

// GET /api/client/document-requests/purpose-categories - Get purpose categories
router.get('/purpose-categories', documentRequestController.getPurposeCategories);

// GET /api/client/document-requests/payment-methods - Get payment methods
router.get('/payment-methods', documentRequestController.getPaymentMethods);

// POST /api/client/document-requests/calculate-cedula-tax - Calculate Cedula tax
router.post('/calculate-cedula-tax', 
  validateCalculateCedulaTax,
  documentRequestController.calculateCedulaTax
);

// GET /api/client/document-requests/processing-fee - Get processing fee for payment method
router.get('/processing-fee',
  validateGetProcessingFee,
  documentRequestController.getProcessingFee
);

// GET /api/client/document-requests/frequency-check/:documentTypeId - Check request frequency limits
router.get('/frequency-check/:documentTypeId',
  authenticateClient,
  documentRequestController.checkRequestFrequency
);

// POST /api/client/document-requests - Submit new document request
router.post('/',
  submitRequestLimiter,
  validateSubmitRequest,
  validateFamilyRelationship,
  validateRequestFrequency,
  documentRequestController.submitRequest
);

// GET /api/client/document-requests - Get client's document requests
router.get('/',
  validateGetRequests,
  documentRequestController.getClientRequests
);

// GET /api/client/document-requests/:id - Get specific request details
router.get('/:id',
  validateRequestId,
  documentRequestController.getRequestDetails
);

// PUT /api/client/document-requests/:id/cancel - Cancel a request
router.put('/:id/cancel',
  validateCancelRequest,
  documentRequestController.cancelRequest
);

// GET /api/client/document-requests/:id/history - Get request status history
router.get('/:id/history',
  validateRequestId,
  documentRequestController.getRequestHistory
);

// POST /api/client/document-requests/:id/documents - Upload supporting documents
router.post('/:id/documents',
  validateRequestId,
  uploadDocuments,
  documentRequestController.uploadDocuments
);

// GET /api/client/document-requests/:id/documents - Get uploaded documents
router.get('/:id/documents',
  validateRequestId,
  documentRequestController.getDocuments
);

// DELETE /api/client/document-requests/:id/documents/:documentId - Delete uploaded document
router.delete('/:id/documents/:documentId',
  validateRequestId,
  documentRequestController.deleteDocument
);

// PUT /api/client/document-requests/:id/beneficiary - Update beneficiary information
router.put('/:id/beneficiary',
  validateRequestId,
  documentRequestController.updateBeneficiary
);

// PUT /api/client/document-requests/:id/authorized-pickup - Add/update authorized pickup person
router.put('/:id/authorized-pickup',
  validateRequestId,
  documentRequestController.updateAuthorizedPickup
);

// DELETE /api/client/document-requests/:id/authorized-pickup - Remove authorized pickup person
router.delete('/:id/authorized-pickup',
  validateRequestId,
  documentRequestController.removeAuthorizedPickup
);

// GET /api/client/document-requests/:id/authorization-status - Get authorization status
router.get('/:id/authorization-status',
  validateRequestId,
  documentRequestController.getAuthorizationStatus
);

// GET /api/client/document-requests/:id/verification-image/:type/:filename - Serve verification images
router.get('/:id/verification-image/:type/:filename',
  protect,
  validateRequestId,
  documentRequestController.serveVerificationImage
);

// Test endpoint without authentication for debugging
const testRouter = express.Router();
testRouter.get('/test-image/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const fs = require('fs');
  const path = require('path');

  console.log('Test image endpoint called:', { type, filename });

  let filePath;
  switch (type) {
    case 'beneficiary':
      filePath = path.join(__dirname, '../../uploads', 'verification', 'beneficiaries', filename);
      break;
    case 'pickup-auth':
      filePath = path.join(__dirname, '../../uploads', 'verification', 'pickup_authorization', filename);
      break;
    case 'pickup-id':
      filePath = path.join(__dirname, '../../uploads', 'verification', 'pickup_ids', filename);
      break;
    default:
      return res.status(400).json({ error: 'Invalid type' });
  }

  console.log('Test file path:', filePath);
  console.log('Test file exists:', fs.existsSync(filePath));

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png'
  };
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  res.setHeader('Content-Type', mimeType);
  res.sendFile(filePath);
});

module.exports = router;
module.exports.testRouter = testRouter;

module.exports = router;
