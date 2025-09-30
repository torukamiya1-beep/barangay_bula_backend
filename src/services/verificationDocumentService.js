const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class VerificationDocumentService {
  
  // Allowed file types for verification documents
  static ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  static ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  static MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  
  // Upload directories
  static UPLOAD_DIRS = {
    beneficiary_verification: 'uploads/verification/beneficiaries',
    pickup_id: 'uploads/verification/pickup_ids',
    pickup_authorization: 'uploads/verification/pickup_authorization'
  };

  /**
   * Upload and store beneficiary verification image
   * @param {number} beneficiaryId - The beneficiary ID
   * @param {Object} file - The uploaded file object
   * @returns {Object} - Upload result
   */
  static async uploadBeneficiaryVerificationImage(beneficiaryId, file) {
    try {
      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // Ensure upload directory exists
      const uploadDir = this.UPLOAD_DIRS.beneficiary_verification;
      this.ensureDirectoryExists(uploadDir);

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `beneficiary_${beneficiaryId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      // Move file to upload directory
      await this.moveFile(file.path, filePath);

      // Update database
      const updateQuery = `
        UPDATE document_beneficiaries 
        SET verification_image_path = ?, 
            verification_image_name = ?, 
            verification_image_size = ?, 
            verification_image_mime_type = ?,
            verification_status = 'pending'
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [
        filePath,
        file.originalname,
        file.size,
        file.mimetype,
        beneficiaryId
      ]);

      logger.info('Beneficiary verification image uploaded', {
        beneficiaryId,
        fileName,
        fileSize: file.size
      });

      return {
        success: true,
        message: 'Verification image uploaded successfully',
        data: {
          fileName,
          filePath,
          fileSize: file.size
        }
      };

    } catch (error) {
      logger.error('Error uploading beneficiary verification image:', error);
      return {
        success: false,
        message: 'Failed to upload verification image'
      };
    }
  }

  /**
   * Upload pickup person ID image
   * @param {number} pickupPersonId - The authorized pickup person ID
   * @param {Object} file - The uploaded file object
   * @returns {Object} - Upload result
   */
  static async uploadPickupPersonIdImage(pickupPersonId, file) {
    try {
      console.log('🔍 VerificationDocumentService.uploadPickupPersonIdImage called');
      console.log('📋 Pickup Person ID:', pickupPersonId);
      console.log('📁 File:', file);

      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        console.log('❌ File validation failed:', validation.message);
        return { success: false, message: validation.message };
      }
      console.log('✅ File validation passed');

      // Ensure upload directory exists
      const uploadDir = this.UPLOAD_DIRS.pickup_id;
      console.log('📂 Upload directory:', uploadDir);
      this.ensureDirectoryExists(uploadDir);

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `pickup_id_${pickupPersonId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);
      console.log('📄 Generated file path:', filePath);

      // Move file to upload directory
      console.log('📤 Moving file from:', file.path, 'to:', filePath);
      await this.moveFile(file.path, filePath);
      console.log('✅ File moved successfully');

      // Update database
      console.log('💾 Updating database with file information...');
      const updateQuery = `
        UPDATE authorized_pickup_persons
        SET id_image_path = ?,
            id_image_name = ?,
            id_image_size = ?,
            id_image_mime_type = ?
        WHERE id = ?
      `;

      const updateParams = [
        filePath,
        file.originalname,
        file.size,
        file.mimetype,
        pickupPersonId
      ];
      console.log('📋 Database update params:', updateParams);

      await executeQuery(updateQuery, updateParams);
      console.log('✅ Database updated successfully');

      logger.info('Pickup person ID image uploaded', {
        pickupPersonId,
        fileName,
        fileSize: file.size
      });

      return {
        success: true,
        message: 'ID image uploaded successfully',
        data: {
          fileName,
          filePath,
          fileSize: file.size
        }
      };

    } catch (error) {
      logger.error('Error uploading pickup person ID image:', error);
      return {
        success: false,
        message: 'Failed to upload ID image'
      };
    }
  }

  /**
   * Upload pickup authorization document
   * @param {number} pickupPersonId - The authorized pickup person ID
   * @param {Object} file - The uploaded file object
   * @returns {Object} - Upload result
   */
  static async uploadPickupAuthorizationDocument(pickupPersonId, file) {
    try {
      // Validate file (allow both images and documents)
      const validation = this.validateDocumentFile(file);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }

      // Ensure upload directory exists
      const uploadDir = this.UPLOAD_DIRS.pickup_authorization;
      this.ensureDirectoryExists(uploadDir);

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const fileName = `pickup_auth_${pickupPersonId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      // Move file to upload directory
      await this.moveFile(file.path, filePath);

      // Update database
      console.log('💾 Updating database with authorization document information...');
      const updateQuery = `
        UPDATE authorized_pickup_persons
        SET authorization_letter_path = ?
        WHERE id = ?
      `;

      const updateParams = [filePath, pickupPersonId];
      console.log('📋 Database update params:', updateParams);

      await executeQuery(updateQuery, updateParams);
      console.log('✅ Database updated successfully');

      // Also create record in authorization_documents table
      const insertQuery = `
        INSERT INTO authorization_documents 
        (authorized_pickup_person_id, document_type, document_name, file_path, file_size, mime_type)
        VALUES (?, 'authorization_letter', ?, ?, ?, ?)
      `;

      await executeQuery(insertQuery, [
        pickupPersonId,
        file.originalname,
        filePath,
        file.size,
        file.mimetype
      ]);

      logger.info('Pickup authorization document uploaded', {
        pickupPersonId,
        fileName,
        fileSize: file.size
      });

      return {
        success: true,
        message: 'Authorization document uploaded successfully',
        data: {
          fileName,
          filePath,
          fileSize: file.size
        }
      };

    } catch (error) {
      logger.error('Error uploading pickup authorization document:', error);
      return {
        success: false,
        message: 'Failed to upload authorization document'
      };
    }
  }

  /**
   * Validate image file
   * @param {Object} file - The file to validate
   * @returns {Object} - Validation result
   */
  static validateImageFile(file) {
    if (!file) {
      return { valid: false, message: 'No file provided' };
    }

    if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return { 
        valid: false, 
        message: 'Invalid file type. Only JPEG, PNG, and GIF images are allowed.' 
      };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        message: 'File size too large. Maximum size is 5MB.' 
      };
    }

    return { valid: true };
  }

  /**
   * Validate document file (images and documents)
   * @param {Object} file - The file to validate
   * @returns {Object} - Validation result
   */
  static validateDocumentFile(file) {
    if (!file) {
      return { valid: false, message: 'No file provided' };
    }

    const allowedTypes = [...this.ALLOWED_IMAGE_TYPES, ...this.ALLOWED_DOCUMENT_TYPES];
    if (!allowedTypes.includes(file.mimetype)) {
      return { 
        valid: false, 
        message: 'Invalid file type. Only images (JPEG, PNG, GIF) and documents (PDF, Word) are allowed.' 
      };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        message: 'File size too large. Maximum size is 5MB.' 
      };
    }

    return { valid: true };
  }

  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Move file from temp location to final location
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   */
  static async moveFile(sourcePath, destPath) {
    return new Promise((resolve, reject) => {
      fs.rename(sourcePath, destPath, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get verification document by beneficiary ID
   * @param {number} beneficiaryId - The beneficiary ID
   * @returns {Object} - Document information
   */
  static async getBeneficiaryVerificationDocument(beneficiaryId) {
    try {
      const query = `
        SELECT verification_image_path, verification_image_name, 
               verification_image_size, verification_image_mime_type,
               verification_status, verified_by, verified_at, verification_notes
        FROM document_beneficiaries 
        WHERE id = ?
      `;

      const results = await executeQuery(query, [beneficiaryId]);
      return results.length > 0 ? results[0] : null;

    } catch (error) {
      logger.error('Error getting beneficiary verification document:', error);
      throw error;
    }
  }

  /**
   * Get pickup person documents
   * @param {number} pickupPersonId - The pickup person ID
   * @returns {Object} - Document information
   */
  static async getPickupPersonDocuments(pickupPersonId) {
    try {
      const query = `
        SELECT id_image_path, id_image_name, id_image_size, id_image_mime_type,
               authorization_letter_path
        FROM authorized_pickup_persons 
        WHERE id = ?
      `;

      const results = await executeQuery(query, [pickupPersonId]);
      return results.length > 0 ? results[0] : null;

    } catch (error) {
      logger.error('Error getting pickup person documents:', error);
      throw error;
    }
  }
}

module.exports = VerificationDocumentService;
