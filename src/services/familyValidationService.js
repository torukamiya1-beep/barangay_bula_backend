const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class FamilyValidationService {
  
  // Define immediate family relationships allowed for "Someone Else" requests
  // Based on Philippine local government practice
  static ALLOWED_FAMILY_RELATIONSHIPS = [
    'spouse',
    'child', 
    'parent',
    'sibling',
    'son',
    'daughter',
    'father',
    'mother',
    'brother',
    'sister',
    'husband',
    'wife'
  ];

  /**
   * Validate if the relationship qualifies as immediate family
   * @param {string} relationship - The relationship to validate
   * @returns {boolean} - True if relationship is allowed for "Someone Else" requests
   */
  static isImmediateFamilyRelationship(relationship) {
    if (!relationship) return false;
    
    const normalizedRelationship = relationship.toLowerCase().trim();
    return this.ALLOWED_FAMILY_RELATIONSHIPS.includes(normalizedRelationship);
  }

  /**
   * Validate if a third-party request is allowed based on relationship
   * @param {Object} beneficiaryData - The beneficiary data containing relationship
   * @returns {Object} - Validation result with success flag and message
   */
  static validateThirdPartyRequest(beneficiaryData) {
    try {
      const { relationship_to_requestor } = beneficiaryData;

      if (!relationship_to_requestor) {
        return {
          success: false,
          message: 'Relationship to requestor is required for third-party requests.'
        };
      }

      if (!this.isImmediateFamilyRelationship(relationship_to_requestor)) {
        return {
          success: false,
          message: 'You can only request documents on behalf of immediate family members (spouse, children, parents, siblings).'
        };
      }

      return {
        success: true,
        message: 'Relationship validation passed.'
      };

    } catch (error) {
      logger.error('Family validation error:', error);
      return {
        success: false,
        message: 'Error validating family relationship.'
      };
    }
  }

  /**
   * Get list of allowed family relationships for frontend display
   * @returns {Array} - Array of allowed relationship objects
   */
  static getAllowedRelationships() {
    return [
      { value: 'spouse', label: 'Spouse' },
      { value: 'husband', label: 'Husband' },
      { value: 'wife', label: 'Wife' },
      { value: 'child', label: 'Child' },
      { value: 'son', label: 'Son' },
      { value: 'daughter', label: 'Daughter' },
      { value: 'parent', label: 'Parent' },
      { value: 'father', label: 'Father' },
      { value: 'mother', label: 'Mother' },
      { value: 'sibling', label: 'Sibling' },
      { value: 'brother', label: 'Brother' },
      { value: 'sister', label: 'Sister' }
    ];
  }

  /**
   * Validate authorized pickup person relationship
   * @param {Object} pickupPersonData - The pickup person data
   * @returns {Object} - Validation result
   */
  static validatePickupPersonRelationship(pickupPersonData) {
    try {
      const { relationship_to_beneficiary } = pickupPersonData;

      if (!relationship_to_beneficiary) {
        return {
          success: false,
          message: 'Relationship to beneficiary is required.'
        };
      }

      // For pickup, we can be more lenient and allow extended family/friends
      // but still validate the relationship exists
      const allowedPickupRelationships = [
        ...this.ALLOWED_FAMILY_RELATIONSHIPS,
        'relative',
        'friend',
        'colleague',
        // 'other'
      ];

      const normalizedRelationship = relationship_to_beneficiary.toLowerCase().trim();
      
      if (!allowedPickupRelationships.includes(normalizedRelationship)) {
        return {
          success: false,
          message: 'Invalid relationship type specified.'
        };
      }

      return {
        success: true,
        message: 'Pickup person relationship validation passed.'
      };

    } catch (error) {
      logger.error('Pickup person validation error:', error);
      return {
        success: false,
        message: 'Error validating pickup person relationship.'
      };
    }
  }
}

module.exports = FamilyValidationService;
