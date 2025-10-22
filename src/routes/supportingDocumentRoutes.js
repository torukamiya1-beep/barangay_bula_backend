const express = require('express');
const router = express.Router();
const supportingDocumentController = require('../controllers/supportingDocumentController');
const { protect, authorize, authenticateClient } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup upload directory (same as original uploads)
const uploadsDir = path.join(__dirname, '../../uploads/documents');
console.log('🔧 Supporting document reupload directory configured:', uploadsDir);

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created upload directory:', uploadsDir);
} else {
  console.log('✅ Upload directory already exists:', uploadsDir);
}

// Configure multer for supporting documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📂 Multer destination called, saving to:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    // Match the original upload naming pattern
    const filename = `${timestamp}_reupload_${req.params.documentId}_${baseName}${ext}`;
    console.log('📝 Generated filename:', filename);
    cb(null, filename);
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
 * @route   PATCH /api/supporting-documents/:documentId/status
 * @desc    Update supporting document verification status (approve/reject)
 * @access  Private (Admin/Employee only)
 * @params  documentId
 * @body    { verification_status: 'approved' | 'rejected' }
 */
router.patch('/:documentId/status',
  protect,
  authorize('admin', 'employee'),
  asyncHandler(supportingDocumentController.updateDocumentStatus)
);

/**
 * @route   GET /api/supporting-documents/rejected/list
 * @desc    Get rejected supporting documents for current client
 * @access  Private (Client only)
 */
router.get('/rejected/list',
  authenticateClient,
  asyncHandler(supportingDocumentController.getRejectedDocuments)
);

/**
 * @route   POST /api/supporting-documents/:documentId/reupload
 * @desc    Reupload a rejected supporting document
 * @access  Private (Client only)
 */
router.post('/:documentId/reupload',
  authenticateClient,
  upload.single('document'),
  asyncHandler(supportingDocumentController.reuploadDocument)
);

module.exports = router;
