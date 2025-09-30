const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class RequestFrequencyService {
  
  // Document frequency limits based on Philippine government practice
  // Barangay Clearance: Valid for 6 months to 1 year
  // Cedula: Valid for 1 year
  static FREQUENCY_LIMITS = {
    'Barangay Clearance': {
      days: 180, // 6 months
      description: '6 months'
    },
    'Cedula': {
      days: 365, // 1 year  
      description: '1 year'
    },
    // Default for other document types
    'default': {
      days: 90, // 3 months
      description: '3 months'
    }
  };

  // Request statuses that count toward frequency limit
  static LIMITING_STATUSES = [
    'pending',
    'under_review', 
    'additional_info_required',
    'approved',
    'processing',
    'ready_for_pickup',
    'completed'
    // Note: 'cancelled' and 'rejected' do NOT count toward limit
  ];

  /**
   * Check if client can make a new request for a specific document type
   * @param {number} clientId - The client ID
   * @param {string} documentTypeName - The document type name
   * @param {Object} beneficiaryInfo - Optional beneficiary information for third-party requests
   * @returns {Object} - Validation result with success flag and details
   */
  static async canMakeRequest(clientId, documentTypeName, beneficiaryInfo = null) {
    try {
      const limit = this.FREQUENCY_LIMITS[documentTypeName] || this.FREQUENCY_LIMITS.default;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - limit.days);

      // For third-party requests, we need to check frequency based on the beneficiary
      // For self requests, we check based on the client
      let query, params;

      if (beneficiaryInfo && beneficiaryInfo.first_name && beneficiaryInfo.last_name && beneficiaryInfo.birth_date) {
        // Third-party request: Check frequency based on beneficiary identity
        query = `
          SELECT
            dr.id,
            dr.request_number,
            dr.requested_at,
            rs.status_name,
            dt.type_name,
            db.first_name,
            db.last_name,
            db.birth_date
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN request_status rs ON dr.status_id = rs.id
          LEFT JOIN document_beneficiaries db ON dr.id = db.request_id
          WHERE dt.type_name = ?
            AND dr.requested_at >= ?
            AND rs.status_name IN (${this.LIMITING_STATUSES.map(() => '?').join(', ')})
            AND (
              (dr.is_third_party_request = TRUE AND db.first_name = ? AND db.last_name = ? AND db.birth_date = ?)
              OR (dr.is_third_party_request = FALSE AND dr.client_id = ?)
            )
          ORDER BY dr.requested_at DESC
          LIMIT 1
        `;

        params = [
          documentTypeName,
          cutoffDate,
          ...this.LIMITING_STATUSES,
          beneficiaryInfo.first_name,
          beneficiaryInfo.last_name,
          beneficiaryInfo.birth_date,
          clientId
        ];
      } else {
        // Self request: Check frequency based on client ID for self requests only
        query = `
          SELECT
            dr.id,
            dr.request_number,
            dr.requested_at,
            rs.status_name,
            dt.type_name
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN request_status rs ON dr.status_id = rs.id
          WHERE dr.client_id = ?
            AND dt.type_name = ?
            AND dr.requested_at >= ?
            AND dr.is_third_party_request = FALSE
            AND rs.status_name IN (${this.LIMITING_STATUSES.map(() => '?').join(', ')})
          ORDER BY dr.requested_at DESC
          LIMIT 1
        `;

        params = [clientId, documentTypeName, cutoffDate, ...this.LIMITING_STATUSES];
      }

      const results = await executeQuery(query, params);

      if (results.length > 0) {
        const lastRequest = results[0];
        const nextAllowedDate = new Date(lastRequest.requested_at);
        nextAllowedDate.setDate(nextAllowedDate.getDate() + limit.days);

        const beneficiaryName = beneficiaryInfo
          ? `${beneficiaryInfo.first_name} ${beneficiaryInfo.last_name}`
          : 'you';

        return {
          success: false,
          canRequest: false,
          message: `A ${documentTypeName} was already requested for ${beneficiaryName} on ${new Date(lastRequest.requested_at).toLocaleDateString()}. Next request allowed on ${nextAllowedDate.toLocaleDateString()}.`,
          lastRequestDate: lastRequest.requested_at,
          nextAllowedDate: nextAllowedDate,
          limitDescription: limit.description,
          lastRequestNumber: lastRequest.request_number,
          lastRequestStatus: lastRequest.status_name
        };
      }

      return {
        success: true,
        canRequest: true,
        message: 'Request allowed.',
        limitDescription: limit.description
      };

    } catch (error) {
      logger.error('Request frequency validation error:', error);
      return {
        success: false,
        canRequest: false,
        message: 'Error checking request frequency. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Get frequency limit information for a document type
   * @param {string} documentTypeName - The document type name
   * @returns {Object} - Limit information
   */
  static getFrequencyLimit(documentTypeName) {
    return this.FREQUENCY_LIMITS[documentTypeName] || this.FREQUENCY_LIMITS.default;
  }

  /**
   * Enhanced frequency check that considers third-party requests
   * @param {number} clientId - The client ID (account owner)
   * @param {string} documentTypeName - The document type name
   * @param {boolean} isThirdPartyRequest - Whether this is a third-party request
   * @param {Object} beneficiaryData - Beneficiary information for third-party requests
   * @returns {Object} - Validation result with success flag and details
   */
  static async canMakeRequestEnhanced(clientId, documentTypeName, isThirdPartyRequest = false, beneficiaryData = null) {
    try {
      if (isThirdPartyRequest && beneficiaryData) {
        // For third-party requests, check frequency based on beneficiary
        const beneficiaryInfo = {
          first_name: beneficiaryData.first_name,
          last_name: beneficiaryData.last_name,
          birth_date: beneficiaryData.birth_date
        };
        return await this.canMakeRequest(clientId, documentTypeName, beneficiaryInfo);
      } else {
        // For self requests, check frequency based on client ID
        return await this.canMakeRequest(clientId, documentTypeName);
      }
    } catch (error) {
      logger.error('Enhanced request frequency validation error:', error);
      return {
        success: false,
        canRequest: false,
        message: 'Error checking request frequency. Please try again.',
        error: error.message
      };
    }
  }

  /**
   * Check frequency limits for multiple document types
   * @param {number} clientId - The client ID
   * @param {Array} documentTypeNames - Array of document type names
   * @param {Object} options - Additional options for enhanced checking
   * @returns {Object} - Results for each document type
   */
  static async checkMultipleDocumentTypes(clientId, documentTypeNames, options = {}) {
    try {
      const results = {};
      const { isThirdPartyRequest = false, beneficiaryData = null } = options;

      for (const documentType of documentTypeNames) {
        if (isThirdPartyRequest && beneficiaryData) {
          results[documentType] = await this.canMakeRequestEnhanced(clientId, documentType, isThirdPartyRequest, beneficiaryData);
        } else {
          results[documentType] = await this.canMakeRequest(clientId, documentType);
        }
      }

      return {
        success: true,
        results
      };

    } catch (error) {
      logger.error('Multiple document type frequency check error:', error);
      return {
        success: false,
        message: 'Error checking request frequencies.',
        error: error.message
      };
    }
  }

  /**
   * Get client's recent request history for frequency analysis
   * @param {number} clientId - The client ID
   * @param {number} days - Number of days to look back (default 365)
   * @returns {Object} - Request history data
   */
  static async getClientRequestHistory(clientId, days = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const query = `
        SELECT 
          dr.id,
          dr.request_number,
          dr.requested_at,
          dt.type_name,
          rs.status_name,
          COUNT(*) OVER (PARTITION BY dt.type_name) as type_count
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN request_status rs ON dr.status_id = rs.id
        WHERE dr.client_id = ? 
          AND dr.requested_at >= ?
        ORDER BY dr.requested_at DESC
      `;

      const results = await executeQuery(query, [clientId, cutoffDate]);

      return {
        success: true,
        history: results,
        totalRequests: results.length
      };

    } catch (error) {
      logger.error('Request history retrieval error:', error);
      return {
        success: false,
        message: 'Error retrieving request history.',
        error: error.message
      };
    }
  }
}

module.exports = RequestFrequencyService;
