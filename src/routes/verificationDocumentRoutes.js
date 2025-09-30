const express = require('express');
const multer = require('multer');
const path = require('path');
const verificationDocumentController = require('../controllers/verificationDocumentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('📁 Multer destination called for file:', file.originalname);
    // Temporary upload directory - files will be moved by the service
    cb(null, 'uploads/temp');
  },
  filename: function (req, file, cb) {
    // Generate temporary filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'temp-' + uniqueSuffix + path.extname(file.originalname);
    console.log('📄 Multer filename generated:', filename);
    cb(null, filename);
  }
});

// File filter for verification documents
const fileFilter = (req, file, cb) => {
  // Allow images and documents
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF) and documents (PDF, Word) are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Image-only filter for ID verification
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF) are allowed.'), false);
  }
};

const imageUpload = multer({ 
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Routes for beneficiary verification documents
router.post('/beneficiary/:beneficiaryId/verification-image',
  protect,
  imageUpload.single('verification_image'),
  verificationDocumentController.uploadBeneficiaryVerification
);

router.get('/beneficiary/:beneficiaryId/verification-status',
  protect,
  verificationDocumentController.getBeneficiaryVerificationStatus
);

router.put('/beneficiary/:beneficiaryId/verification-status',
  protect,
  authorize('admin', 'employee'),
  verificationDocumentController.updateBeneficiaryVerificationStatus
);

// Routes for pickup person documents
router.post('/pickup-person/:pickupPersonId/id-image',
  protect,
  imageUpload.single('id_image'),
  verificationDocumentController.uploadPickupPersonId
);

router.post('/pickup-person/:pickupPersonId/authorization-document',
  protect,
  upload.single('authorization_document'),
  verificationDocumentController.uploadPickupAuthorization
);

router.get('/pickup-person/:pickupPersonId/documents-status',
  protect,
  verificationDocumentController.getPickupPersonDocumentsStatus
);

// Admin-only routes for viewing documents
router.get('/serve/:type/:id/:filename',
  protect,
  authorize('admin', 'employee'),
  verificationDocumentController.serveVerificationDocument
);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message
    });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

module.exports = router;
