const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create gcash_proofs directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const gcashProofsDir = path.join(uploadsDir, 'gcash_proofs');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
  }

  if (!fs.existsSync(gcashProofsDir)) {
    fs.mkdirSync(gcashProofsDir, { recursive: true });
    console.log('Created gcash_proofs directory:', gcashProofsDir);
  }
} catch (error) {
  console.error('Error setting up GCash proof upload directory:', error);
  throw new Error(`Failed to setup upload directory: ${error.message}`);
}

// Configure multer storage for GCash payment proofs
const gcashProofStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, gcashProofsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: gcash-proof-{timestamp}-{random}.{ext}
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const filename = `gcash-proof-${timestamp}-${randomString}${ext}`;
    cb(null, filename);
  }
});

// File filter for GCash payment proofs
const gcashProofFileFilter = (req, file, cb) => {
  // Allowed file types for payment proofs (images only)
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp'
  ];
  
  // Allowed file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and WebP image files are allowed for payment proofs.'), false);
  }
};

// Create multer instance for GCash payment proofs
const createGCashProofUpload = () => {
  const fileSizeLimit = 10 * 1024 * 1024; // 10MB max for payment proof screenshots
  
  return multer({
    storage: gcashProofStorage,
    fileFilter: gcashProofFileFilter,
    limits: {
      fileSize: fileSizeLimit,
      files: 1 // Only 1 payment proof per upload
    }
  });
};

// Middleware for handling GCash payment proof upload
const uploadGCashProof = (req, res, next) => {
  try {
    const upload = createGCashProofUpload();
    const uploadMiddleware = upload.single('payment_proof');
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error during GCash proof upload:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 10MB.',
            code: 'FILE_TOO_LARGE'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Only one payment proof file allowed.',
            code: 'TOO_MANY_FILES'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
      } else if (err) {
        console.error('Error during GCash proof upload:', err);
        return res.status(400).json({
          success: false,
          error: err.message,
          code: 'INVALID_FILE'
        });
      }

      // Validate that file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No payment proof file uploaded',
          code: 'NO_FILE'
        });
      }

      next();
    });
  } catch (error) {
    console.error('Error creating GCash proof upload middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to setup file upload middleware',
      details: error.message,
      code: 'MIDDLEWARE_SETUP_ERROR'
    });
  }
};

// Helper function to clean up uploaded file in case of error
const cleanupGCashProof = (file) => {
  if (!file) return;
  
  if (file.path && fs.existsSync(file.path)) {
    try {
      fs.unlinkSync(file.path);
      console.log('Cleaned up file:', file.path);
    } catch (error) {
      console.error('Error cleaning up file:', file.path, error);
    }
  }
};

// Helper function to delete GCash proof file
const deleteGCashProof = (filename) => {
  if (!filename) return;
  
  const filePath = path.join(gcashProofsDir, filename);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log('Deleted GCash proof file:', filePath);
    } catch (error) {
      console.error('Error deleting GCash proof file:', filePath, error);
    }
  }
};

module.exports = {
  uploadGCashProof,
  cleanupGCashProof,
  deleteGCashProof,
  gcashProofsDir
};
