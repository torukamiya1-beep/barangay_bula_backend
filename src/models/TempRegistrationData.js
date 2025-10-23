/**
 * TempRegistrationData Model
 * Handles temporary storage of registration data until OTP verification
 */

const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class TempRegistrationData {
  /**
   * Save registration data temporarily
   * @param {number} accountId - Client account ID
   * @param {object} profileData - Profile information
   * @param {object} documentData - Document upload information (optional)
   * @returns {Promise<object>} Created temp registration data
   */
  static async save(accountId, profileData, documentData = null) {
    try {
      const query = `
        INSERT INTO temp_registration_data (account_id, profile_data, document_data)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          profile_data = VALUES(profile_data),
          document_data = VALUES(document_data),
          created_at = CURRENT_TIMESTAMP,
          expires_at = CURRENT_TIMESTAMP + INTERVAL 24 HOUR
      `;
      
      const result = await executeQuery(query, [
        accountId,
        JSON.stringify(profileData),
        documentData ? JSON.stringify(documentData) : null
      ]);
      
      logger.info('Temporary registration data saved', { accountId });
      
      return {
        id: result.insertId,
        accountId,
        profileData,
        documentData
      };
    } catch (error) {
      logger.error('Failed to save temporary registration data', {
        accountId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Get temporary registration data by account ID
   * @param {number} accountId - Client account ID
   * @returns {Promise<object|null>} Temp registration data or null
   */
  static async getByAccountId(accountId) {
    try {
      const query = `
        SELECT id, account_id, profile_data, document_data, created_at, expires_at
        FROM temp_registration_data
        WHERE account_id = ? AND expires_at > NOW()
      `;
      
      const results = await executeQuery(query, [accountId]);
      
      if (results.length === 0) {
        return null;
      }
      
      const data = results[0];
      
      return {
        id: data.id,
        accountId: data.account_id,
        profileData: JSON.parse(data.profile_data),
        documentData: data.document_data ? JSON.parse(data.document_data) : null,
        createdAt: data.created_at,
        expiresAt: data.expires_at
      };
    } catch (error) {
      logger.error('Failed to get temporary registration data', {
        accountId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Delete temporary registration data
   * @param {number} accountId - Client account ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(accountId) {
    try {
      const query = `
        DELETE FROM temp_registration_data
        WHERE account_id = ?
      `;
      
      await executeQuery(query, [accountId]);
      
      logger.info('Temporary registration data deleted', { accountId });
      
      return true;
    } catch (error) {
      logger.error('Failed to delete temporary registration data', {
        accountId,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Clean up expired temporary registration data
   * @returns {Promise<number>} Number of deleted records
   */
  static async cleanupExpired() {
    try {
      const query = `
        DELETE FROM temp_registration_data
        WHERE expires_at <= NOW()
      `;
      
      const result = await executeQuery(query);
      
      logger.info('Expired temporary registration data cleaned up', {
        deletedCount: result.affectedRows
      });
      
      return result.affectedRows;
    } catch (error) {
      logger.error('Failed to cleanup expired temporary registration data', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = TempRegistrationData;
