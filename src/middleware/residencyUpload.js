const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { executeQuery } = require('../config/database');

// Create residency documents directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const residencyDir = path.join(uploadsDir, 'residency');

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
  }

  if (!fs.existsSync(residencyDir)) {
    fs.mkdirSync(residencyDir, { recursive: true });
    console.log('Created residency directory:', residencyDir);
  }

  // Test write permissions (commented out for now)
  // try {
  //   const testFile = path.join(residencyDir, 'test_write.tmp');
  //   fs.writeFileSync(testFile, 'test');
  //   fs.unlinkSync(testFile);
  //   console.log('Residency directory write permissions verified');
  // } catch (permError) {
  //   console.warn('Warning: Could not verify write permissions:', permError.message);
  // }
} catch (error) {
  console.error('Error setting up residency upload directory:', error);
  throw new Error(`Failed to setup upload directory: ${error.message}`);
}

// Configure multer storage for residency documents
const residencyStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, residencyDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp_accountId_documentType_originalname
    const timestamp = Date.now();
    const accountId = req.body.account_id || req.user?.id || 'unknown';
    const documentType = req.body.document_type || 'document';
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');

    // Store only the filename, not the full path
    const filename = `${timestamp}_${accountId}_${documentType}_${baseName}${ext}`;
    cb(null, filename);
  }
});

// File filter for residency documents
const residencyFileFilter = (req, file, cb) => {
  // Allowed file types for residency documents
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'application/pdf',
    'image/webp'
  ];
  
  // Allowed file extensions
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, PDF, and WebP files are allowed for residency documents.'), false);
  }
};

// Get file size limit from database or use default
const getResidencyFileSizeLimit = async () => {
  try {
    const query = 'SELECT setting_value FROM system_settings WHERE setting_key = "max_file_size_mb"';
    const results = await executeQuery(query);
    
    if (results.length > 0) {
      const maxSizeMB = parseInt(results[0].setting_value) || 5;
      return maxSizeMB * 1024 * 1024; // Convert MB to bytes
    }
  } catch (error) {
    console.warn('Could not fetch file size limit from database, using default:', error.message);
  }
  
  return 5 * 1024 * 1024; // Default 5MB
};

// Create multer instance for residency documents
const createResidencyUpload = async () => {
  const fileSizeLimit = await getResidencyFileSizeLimit();
  
  return multer({
    storage: residencyStorage,
    fileFilter: residencyFileFilter,
    limits: {
      fileSize: fileSizeLimit,
      files: 5 // Maximum 5 residency documents per upload
    }
  });
};

// Middleware for handling residency document uploads
const uploadResidencyDocuments = async (req, res, next) => {
  try {
    // console.log('Setting up residency document upload middleware');
    const upload = await createResidencyUpload();
    const uploadMiddleware = upload.fields([
      { name: 'utility_bill', maxCount: 2 },
      { name: 'barangay_certificate', maxCount: 1 },
      { name: 'valid_id', maxCount: 2 },
      { name: 'lease_contract', maxCount: 1 },
      { name: 'other', maxCount: 2 }
    ]);

    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error('Multer error during file upload:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 5MB per file.',
            code: 'FILE_TOO_LARGE'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Too many files. Maximum 5 residency documents allowed per upload.',
            code: 'TOO_MANY_FILES'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            error: 'Unexpected file field. Please use valid document type fields.',
            code: 'UNEXPECTED_FILE'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`,
          code: 'UPLOAD_ERROR'
        });
      } else if (err) {
        console.error('General error during file upload:', err);
        return res.status(500).json({
          success: false,
          error: `Server error during file upload: ${err.message}`,
          code: 'SERVER_ERROR'
        });
      }

      // console.log('File upload middleware completed successfully');
      // console.log('Uploaded files:', req.files ? Object.keys(req.files) : 'none');
      // console.log('Request body:', req.body);
      next();
    });
  } catch (error) {
    console.error('Error creating residency upload middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to setup file upload middleware',
      details: error.message,
      code: 'MIDDLEWARE_SETUP_ERROR'
    });
  }
};

// Middleware for single residency document upload
const uploadSingleResidencyDocument = async (req, res, next) => {
  try {
    const upload = await createResidencyUpload();
    const uploadMiddleware = upload.single('residency_document');
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 5MB.'
          });
        }
        return res.status(400).json({
          success: false,
          error: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: err.message
        });
      }
      
      next();
    });
  } catch (error) {
    console.error('Error creating single residency upload middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during file upload setup'
    });
  }
};

// Helper function to validate uploaded files
const validateResidencyDocuments = (files) => {
  const errors = [];
  const validDocumentTypes = ['utility_bill', 'barangay_certificate', 'valid_id', 'lease_contract', 'other'];
  
  if (!files || Object.keys(files).length === 0) {
    errors.push('At least one residency document is required');
    return errors;
  }
  
  // Check if at least one valid document type is uploaded
  const uploadedTypes = Object.keys(files);
  const hasValidType = uploadedTypes.some(type => validDocumentTypes.includes(type));
  
  if (!hasValidType) {
    errors.push('Please upload at least one valid residency document type');
  }
  
  // Validate each uploaded file
  Object.keys(files).forEach(fieldName => {
    if (!validDocumentTypes.includes(fieldName)) {
      errors.push(`Invalid document type: ${fieldName}`);
      return;
    }
    
    files[fieldName].forEach((file, index) => {
      if (!file.filename || !file.path) {
        errors.push(`File upload failed for ${fieldName}[${index}]`);
      }
      
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`File ${file.originalname} is too large. Maximum size is 5MB`);
      }
    });
  });
  
  return errors;
};

// Helper function to clean up uploaded files in case of error
const cleanupUploadedFiles = (files) => {
  if (!files) return;
  
  Object.keys(files).forEach(fieldName => {
    files[fieldName].forEach(file => {
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error('Error cleaning up file:', file.path, error);
        }
      }
    });
  });
};

module.exports = {
  uploadResidencyDocuments,
  uploadSingleResidencyDocument,
  validateResidencyDocuments,
  cleanupUploadedFiles,
  residencyDir
};
