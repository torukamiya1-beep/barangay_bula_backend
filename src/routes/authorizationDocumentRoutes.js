const express = require('express');
const router = express.Router();
const authorizationDocumentController = require('../controllers/authorizationDocumentController');
const { protect, authorize, authenticateClient } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup upload directory
const uploadsDir = path.join(__dirname, '../../uploads/authorization_documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for authorization documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `auth_doc_${req.params.documentId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.'));
    }
  }
});

/**
 * @route   PATCH /api/authorization-documents/:documentId/status
 * @desc    Update authorization document verification status (approve/reject)
 * @access  Private (Admin/Employee only)
 * @params  documentId
 * @body    { verification_status: 'approved' | 'rejected' }
 */
router.patch('/:documentId/status',
  protect,
  authorize('admin', 'employee'),
  asyncHandler(authorizationDocumentController.updateDocumentStatus)
);

/**
 * @route   GET /api/authorization-documents/rejected/list
 * @desc    Get rejected authorization documents for current client
 * @access  Private (Client only)
 */
router.get('/rejected/list',
  authenticateClient,
  asyncHandler(authorizationDocumentController.getRejectedDocuments)
);

/**
 * @route   GET /api/authorization-documents/pickup-person/:pickupPersonId
 * @desc    Get authorization documents for a specific pickup person
 * @access  Private (Admin/Employee only)
 */
router.get('/pickup-person/:pickupPersonId',
  protect,
  authorize('admin', 'employee'),
  asyncHandler(authorizationDocumentController.getByPickupPersonId)
);

/**
 * @route   POST /api/authorization-documents/:documentId/reupload
 * @desc    Reupload a rejected authorization document
 * @access  Private (Client only)
 */
router.post('/:documentId/reupload',
  authenticateClient,
  upload.single('document'),
  asyncHandler(authorizationDocumentController.reuploadDocument)
);

module.exports = router;
