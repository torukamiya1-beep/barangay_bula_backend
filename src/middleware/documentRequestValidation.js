const { body, param, query } = require('express-validator');
const FamilyValidationService = require('../services/familyValidationService');
const RequestFrequencyService = require('../services/requestFrequencyService');

// Custom validation for purpose details based on category
const validatePurposeDetails = async (value, { req }) => {
  const { purpose_category_id } = req.body;

  if (!purpose_category_id) {
    return true; // Let the purpose_category_id validation handle this
  }

  // If category is "Other" (id=10), purpose_details is required
  if (parseInt(purpose_category_id) === 10) {
    if (!value || value.trim().length < 10) {
      throw new Error('Purpose details are required and must be at least 10 characters when "Other" category is selected');
    }
  }

  return true;
};

// Validation for submitting document request
const validateSubmitRequest = [
  body('document_type_id')
    .isInt({ min: 1 })
    .withMessage('Valid document type ID is required'),
  
  body('purpose_category_id')
    .isInt({ min: 1 })
    .withMessage('Valid purpose category ID is required'),
  
  body('purpose_details')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Purpose details must not exceed 500 characters')
    .custom(validatePurposeDetails),
  
  body('payment_method_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Valid payment method ID is required'),
  
  body('delivery_method')
    .optional()
    .isIn(['pickup', 'delivery'])
    .withMessage('Delivery method must be either pickup or delivery'),
  
  body('delivery_address')
    .if(body('delivery_method').equals('delivery'))
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Delivery address is required when delivery method is selected'),
  
  body('priority')
    .optional()
    .isIn(['normal', 'urgent'])
    .withMessage('Priority must be either normal or urgent'),

  // Barangay Clearance specific validations
  body('has_pending_cases')
    .optional()
    .isBoolean()
    .withMessage('Has pending cases must be a boolean'),
  
  body('pending_cases_details')
    .if(body('has_pending_cases').equals(true))
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Pending cases details are required when has_pending_cases is true'),
  
  body('voter_registration_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Voter registration number must not exceed 50 characters'),

  body('precinct_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Precinct number must not exceed 20 characters'),
  
  body('emergency_contact_name')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Emergency contact name must be between 2 and 200 characters'),

  body('emergency_contact_relationship')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Emergency contact relationship must be between 2 and 50 characters'),

  body('emergency_contact_phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^09\d{9}$/)
    .withMessage('Emergency contact phone must be a valid Philippine phone number (09XXXXXXXXX - 11 digits starting with 09)'),

  body('emergency_contact_address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Emergency contact address must be between 10 and 500 characters'),

  // Cedula specific validations
  body('occupation')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Occupation must be between 2 and 100 characters'),

  body('employer_name')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Employer name must not exceed 200 characters'),

  body('employer_address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Employer address must not exceed 500 characters'),
  
  body('monthly_income')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Monthly income must be a positive number'),

  body('annual_income')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Annual income must be a positive number'),
  
  body('business_name')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Business name must not exceed 200 characters'),

  body('business_address')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Business address must not exceed 500 characters'),

  body('business_type')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Business type must not exceed 100 characters'),
  
  body('business_income')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Business income must be a positive number'),
  
  body('has_real_property')
    .optional({ nullable: true, checkFalsy: true })
    .isBoolean()
    .withMessage('Has real property must be a boolean'),

  body('property_assessed_value')
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('Property assessed value must be a positive number'),

  body('property_location')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Property location must not exceed 500 characters'),
  
  body('tin_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[0-9]{3}-[0-9]{3}-[0-9]{3}-[0-9]{3}$/)
    .withMessage('TIN number must be in format XXX-XXX-XXX-XXX'),
  
  body('previous_ctc_number')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 })
    .withMessage('Previous CTC number must not exceed 50 characters'),

  body('previous_ctc_date_issued')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Previous CTC date issued must be a valid date'),

  body('previous_ctc_place_issued')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Previous CTC place issued must not exceed 100 characters')
];

// Validation for request ID parameter
const validateRequestId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid request ID is required')
];

// Validation for cancel request
const validateCancelRequest = [
  ...validateRequestId,
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason must not exceed 500 characters')
];

// Validation for get requests query parameters
const validateGetRequests = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('status')
    .optional()
    .isIn(['pending', 'under_review', 'additional_info_required', 'approved', 'processing', 'ready_for_pickup', 'completed', 'cancelled', 'rejected'])
    .withMessage('Invalid status value'),
  
  query('document_type')
    .optional()
    .isIn(['Cedula', 'Barangay Clearance'])
    .withMessage('Invalid document type'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search term must not exceed 100 characters'),
  
  query('sort_by')
    .optional()
    .isIn(['created_at', 'status_name', 'document_type', 'total_fee'])
    .withMessage('Invalid sort field'),
  
  query('sort_order')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Sort order must be ASC or DESC')
];

// Validation for calculate Cedula tax
const validateCalculateCedulaTax = [
  body('annual_income')
    .isFloat({ min: 0 })
    .withMessage('Annual income must be a positive number'),
  
  body('property_assessed_value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Property assessed value must be a positive number')
];

// Validation for get processing fee
const validateGetProcessingFee = [
  query('payment_method_id')
    .isInt({ min: 1 })
    .withMessage('Valid payment method ID is required'),
  
  query('base_amount')
    .isFloat({ min: 0 })
    .withMessage('Base amount must be a positive number')
];

// Custom validation for family relationships in third-party requests
const validateFamilyRelationship = (req, res, next) => {
  const { is_third_party_request, beneficiary } = req.body;

  if (is_third_party_request && beneficiary) {
    const validation = FamilyValidationService.validateThirdPartyRequest(beneficiary);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        errors: [{ msg: validation.message, param: 'beneficiary.relationship_to_requestor' }]
      });
    }
  }

  next();
};

// Custom validation for request frequency limits
const validateRequestFrequency = async (req, res, next) => {
  try {
    const { document_type_id, is_third_party_request, beneficiary } = req.body;
    const clientId = req.user.id;

    // Get document type name
    const { executeQuery } = require('../config/database');
    const docTypeQuery = 'SELECT type_name FROM document_types WHERE id = ?';
    const docTypeResults = await executeQuery(docTypeQuery, [document_type_id]);

    if (docTypeResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document type.',
        errors: [{ msg: 'Invalid document type', param: 'document_type_id' }]
      });
    }

    const documentTypeName = docTypeResults[0].type_name;

    // Use enhanced frequency checking that considers third-party requests
    const frequencyCheck = await RequestFrequencyService.canMakeRequestEnhanced(
      clientId,
      documentTypeName,
      is_third_party_request || false,
      beneficiary || null
    );

    if (!frequencyCheck.canRequest) {
      return res.status(429).json({
        success: false,
        message: frequencyCheck.message,
        canRequest: false,
        nextAllowedDate: frequencyCheck.nextAllowedDate,
        lastRequestDate: frequencyCheck.lastRequestDate,
        limitDescription: frequencyCheck.limitDescription,
        errors: [{ msg: frequencyCheck.message, param: 'document_type_id' }]
      });
    }

    next();
  } catch (error) {
    console.error('Request frequency validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating request frequency.',
      errors: [{ msg: 'Internal server error', param: 'server' }]
    });
  }
};

module.exports = {
  validateSubmitRequest,
  validateRequestId,
  validateCancelRequest,
  validateGetRequests,
  validateCalculateCedulaTax,
  validateGetProcessingFee,
  validateFamilyRelationship,
  validateRequestFrequency
};
