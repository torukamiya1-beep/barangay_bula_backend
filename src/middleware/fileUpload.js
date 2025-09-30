const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { executeQuery } = require('../config/database');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
const documentsDir = path.join(uploadsDir, 'documents');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(documentsDir)) {
  fs.mkdirSync(documentsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, documentsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp_requestId_fieldname_originalname
    const timestamp = Date.now();
    const requestId = req.params.id || 'temp';
    const fieldName = file.fieldname;
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    
    const filename = `${timestamp}_${requestId}_${fieldName}_${baseName}${ext}`;
    cb(null, filename);
  }
});

// File filter function
const fileFilter = async (req, file, cb) => {
  try {
    // Get allowed file types from database
    const settingsQuery = 'SELECT setting_value FROM system_settings WHERE setting_key = "allowed_file_types"';
    const results = await executeQuery(settingsQuery);
    
    let allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    
    if (results.length > 0) {
      try {
        const dbTypes = JSON.parse(results[0].setting_value);
        allowedTypes = dbTypes.map(type => {
          switch(type.toLowerCase()) {
            case 'jpg':
            case 'jpeg':
              return 'image/jpeg';
            case 'png':
              return 'image/png';
            case 'pdf':
              return 'application/pdf';
            case 'doc':
              return 'application/msword';
            case 'docx':
              return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            default:
              return type;
          }
        });
      } catch (parseError) {
        console.error('Error parsing allowed file types from database:', parseError);
      }
    }

    // Check if file type is allowed
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  } catch (error) {
    console.error('Error in file filter:', error);
    cb(error, false);
  }
};

// Get file size limit from database
const getFileSizeLimit = async () => {
  try {
    const query = 'SELECT setting_value FROM system_settings WHERE setting_key = "max_file_upload_size"';
    const results = await executeQuery(query);
    
    if (results.length > 0) {
      return parseInt(results[0].setting_value);
    }
    
    return 5 * 1024 * 1024; // Default 5MB
  } catch (error) {
    console.error('Error getting file size limit:', error);
    return 5 * 1024 * 1024; // Default 5MB
  }
};

// Create multer instance
const createUpload = async () => {
  const fileSizeLimit = await getFileSizeLimit();
  
  return multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: fileSizeLimit,
      files: 10 // Maximum 10 files per request
    }
  });
};

// Middleware for handling multiple document uploads
const uploadDocuments = async (req, res, next) => {
  try {
    const upload = await createUpload();
    const uploadMiddleware = upload.fields([
      { name: 'government_id', maxCount: 1 },
      { name: 'proof_of_residency', maxCount: 1 },
      { name: 'cedula', maxCount: 1 },
      { name: 'documents', maxCount: 10 } // Generic documents field
    ]);
    
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: 'File too large. Maximum size is 5MB.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            error: 'Too many files. Maximum 10 files allowed.'
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
    console.error('Error creating upload middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during file upload setup'
    });
  }
};

// Utility function to delete uploaded file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Utility function to get file info
const getFileInfo = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype
  };
};

module.exports = {
  uploadDocuments,
  deleteFile,
  getFileInfo,
  documentsDir
};
