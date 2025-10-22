const express = require('express');
const router = express.Router();
const beneficiaryVerificationController = require('../controllers/beneficiaryVerificationController');
const { protect, authorize, authenticateClient } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup upload directory
const uploadsDir = path.join(__dirname, '../../uploads/beneficiary_verifications');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for beneficiary verifications
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `beneficiary_${req.params.beneficiaryId}_${timestamp}${ext}`);
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
 * @route   PATCH /api/beneficiary-verification/:beneficiaryId/status
 * @desc    Update beneficiary verification status (approve/reject)
 * @access  Private (Admin/Employee only)
 * @params  beneficiaryId
 * @body    { verification_status: 'approved' | 'rejected' }
 */
router.patch('/:beneficiaryId/status',
  protect,
  authorize('admin', 'employee'),
  asyncHandler(beneficiaryVerificationController.updateVerificationStatus)
);

/**
 * @route   GET /api/beneficiary-verification/rejected/list
 * @desc    Get rejected beneficiary verifications for current client
 * @access  Private (Client only)
 */
router.get('/rejected/list',
  authenticateClient,
  asyncHandler(beneficiaryVerificationController.getRejectedVerifications)
);

/**
 * @route   POST /api/beneficiary-verification/:beneficiaryId/reupload
 * @desc    Reupload a rejected beneficiary verification document
 * @access  Private (Client only)
 */
router.post('/:beneficiaryId/reupload',
  authenticateClient,
  upload.single('document'),
  asyncHandler(beneficiaryVerificationController.reuploadDocument)
);

module.exports = router;
