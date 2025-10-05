const { validationResult } = require('express-validator');
const DocumentRequestService = require('../services/documentRequestService');
const RequestFrequencyService = require('../services/requestFrequencyService');
const SupportingDocument = require('../models/SupportingDocument');
const DocumentBeneficiary = require('../models/DocumentBeneficiary');
const AuthorizedPickupPerson = require('../models/AuthorizedPickupPerson');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { getFileInfo, deleteFile } = require('../middleware/fileUpload');
const { executeQuery } = require('../config/database');
const {
  ACTIVITY_TYPES,
  logDocumentRequest,
  logDocumentStatusChange
} = require('../middleware/enhancedActivityLogger');

class DocumentRequestController {
  // Get document types
  async getDocumentTypes(req, res) {
    try {
      const result = await DocumentRequestService.getDocumentTypes();
      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller error - getDocumentTypes', {
        error: error.message,
        stack: error.stack
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Get purpose categories
  async getPurposeCategories(req, res) {
    try {
      const result = await DocumentRequestService.getPurposeCategories();
      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller error - getPurposeCategories', {
        error: error.message,
        stack: error.stack
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Get payment methods
  async getPaymentMethods(req, res) {
    try {
      const result = await DocumentRequestService.getPaymentMethods();
      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller error - getPaymentMethods', {
        error: error.message,
        stack: error.stack
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Submit document request
  async submitRequest(req, res) {
    try {
      console.log('🎯 DocumentRequestController.submitRequest called');
      console.log('👤 Client ID:', req.user?.id);
      console.log('📋 Request data:', JSON.stringify(req.body, null, 2));

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return ApiResponse.validationError(res, errors.array());
      }

      const clientId = req.user.id;
      const requestData = req.body;

      // Log specific data for debugging
      console.log('🔍 Request details:', {
        document_type_id: requestData.document_type_id,
        purpose_category_id: requestData.purpose_category_id,
        is_third_party_request: requestData.is_third_party_request,
        has_beneficiary: !!requestData.beneficiary,
        has_authorized_pickup: !!requestData.authorized_pickup,
        beneficiary_keys: requestData.beneficiary ? Object.keys(requestData.beneficiary) : [],
        authorized_pickup_keys: requestData.authorized_pickup ? Object.keys(requestData.authorized_pickup) : []
      });

      console.log('🔄 Calling DocumentRequestService.submitRequest...');
      const result = await DocumentRequestService.submitRequest(requestData, clientId);
      console.log('✅ DocumentRequestService.submitRequest completed:', result);

      // Log document request submission activity
      if (result.data && result.data.id) {
        try {
          await logDocumentRequest(req, clientId, 'client', result.data.id,
            requestData.document_type_name || 'Unknown Document Type',
            result.data.request_number,
            {
              document_type_id: requestData.document_type_id,
              purpose_category_id: requestData.purpose_category_id,
              purpose_details: requestData.purpose_details,
              payment_method_id: requestData.payment_method_id,
              delivery_method: requestData.delivery_method || 'pickup',
              priority: requestData.priority || 'normal'
            }
          );
        } catch (logError) {
          console.error('⚠️ Failed to log document request activity:', logError.message);
          // Don't fail the request if logging fails
        }
      }

      return ApiResponse.created(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller error - submitRequest', {
        error: error.message,
        stack: error.stack,
        clientId: req.user?.id,
        requestData: req.body,
        errorDetails: {
          name: error.name,
          code: error.code,
          errno: error.errno,
          sqlMessage: error.sqlMessage,
          sql: error.sql
        }
      });

      // More specific error handling
      if (error.message.includes('Invalid document type')) {
        return ApiResponse.badRequest(res, error.message);
      }

      if (error.message.includes('validation failed')) {
        return ApiResponse.badRequest(res, error.message);
      }

      if (error.message.includes('duplicate')) {
        return ApiResponse.badRequest(res, 'A similar request was already submitted recently');
      }

      // Database errors
      if (error.code === 'ER_DUP_ENTRY') {
        return ApiResponse.badRequest(res, 'Duplicate entry detected');
      }

      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return ApiResponse.badRequest(res, 'Invalid reference data provided');
      }

      if (error.code === 'ER_BAD_NULL_ERROR') {
        return ApiResponse.badRequest(res, 'Required field is missing');
      }

      // Return detailed error message for debugging in production
      return ApiResponse.serverError(res, `Failed to submit document request: ${error.message}`);
    }
  }

  // Get client's requests
  async getClientRequests(req, res) {
    try {
      const clientId = req.user.id;
      const filters = {
        status: req.query.status,
        document_type: req.query.document_type,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        search: req.query.search,
        sort_by: req.query.sort_by || 'created_at',
        sort_order: req.query.sort_order || 'DESC'
      };

      // Validate pagination limits
      if (filters.limit > 50) {
        filters.limit = 50;
      }

      const result = await DocumentRequestService.getClientRequests(clientId, filters);
      
      return ApiResponse.success(res, {
        requests: result.data,
        pagination: result.pagination
      }, result.message);
    } catch (error) {
      logger.error('Controller error - getClientRequests', {
        error: error.message,
        stack: error.stack,
        clientId: req.user?.id,
        filters: req.query
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Get request details
  async getRequestDetails(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;

      if (!requestId || isNaN(requestId)) {
        return ApiResponse.badRequest(res, 'Invalid request ID');
      }

      const result = await DocumentRequestService.getRequestDetails(requestId, clientId);
      
      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller error - getRequestDetails', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id
      });

      if (error.message === 'Request not found') {
        return ApiResponse.notFound(res, error.message);
      }

      return ApiResponse.serverError(res, error.message);
    }
  }

  // Cancel request
  async cancelRequest(req, res) {
    try {
      console.log('🔔 DocumentRequestController.cancelRequest called');
      console.log('📋 Request params:', req.params);
      console.log('📋 Request body:', req.body);
      console.log('📋 User:', req.user);

      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;
      const { reason } = req.body;

      if (!requestId || isNaN(requestId)) {
        return ApiResponse.badRequest(res, 'Invalid request ID');
      }

      const result = await DocumentRequestService.cancelRequest(requestId, clientId, reason);
      
      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      console.error('❌ DocumentRequestController error:', error);
      logger.error('Controller error - cancelRequest', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id,
        reason: req.body?.reason
      });

      if (error.message === 'Request not found') {
        return ApiResponse.notFound(res, error.message);
      }

      if (error.message.includes('Unauthorized') || error.message.includes('cannot be cancelled')) {
        return ApiResponse.badRequest(res, error.message);
      }

      return ApiResponse.serverError(res, error.message);
    }
  }

  // Get request history
  async getRequestHistory(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;

      if (!requestId || isNaN(requestId)) {
        return ApiResponse.badRequest(res, 'Invalid request ID');
      }

      const result = await DocumentRequestService.getRequestHistory(requestId, clientId);
      
      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Controller error - getRequestHistory', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id
      });

      if (error.message === 'Request not found') {
        return ApiResponse.notFound(res, error.message);
      }

      return ApiResponse.serverError(res, error.message);
    }
  }

  // Calculate Cedula tax (utility endpoint)
  async calculateCedulaTax(req, res) {
    try {
      const { annual_income, property_assessed_value } = req.body;

      if (!annual_income || isNaN(annual_income) || annual_income < 0) {
        return ApiResponse.badRequest(res, 'Valid annual income is required');
      }

      const propertyValue = parseFloat(property_assessed_value || 0);
      
      // Import CedulaApplication for tax calculation
      const CedulaApplication = require('../models/CedulaApplication');
      const taxCalculation = CedulaApplication.calculateTax(
        parseFloat(annual_income),
        propertyValue
      );

      logger.info('Cedula tax calculated', {
        annual_income,
        property_assessed_value: propertyValue,
        calculated_tax: taxCalculation.total_tax,
        clientId: req.user?.id
      });

      return ApiResponse.success(res, taxCalculation, 'Tax calculated successfully');
    } catch (error) {
      logger.error('Controller error - calculateCedulaTax', {
        error: error.message,
        stack: error.stack,
        requestData: req.body,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Get processing fee for payment method
  async getProcessingFee(req, res) {
    try {
      const { payment_method_id, base_amount } = req.query;

      if (!payment_method_id || !base_amount || isNaN(base_amount)) {
        return ApiResponse.badRequest(res, 'Payment method ID and base amount are required');
      }

      const amount = parseFloat(base_amount);
      
      const query = `
        SELECT processing_fee_percentage, processing_fee_fixed, method_name
        FROM payment_methods 
        WHERE id = ? AND is_active = 1
      `;
      
      const { executeQuery } = require('../config/database');
      const results = await executeQuery(query, [payment_method_id]);
      
      if (results.length === 0) {
        return ApiResponse.notFound(res, 'Payment method not found');
      }

      const paymentMethod = results[0];
      const processing_fee = parseFloat(paymentMethod.processing_fee_fixed || 0) + 
                           (amount * parseFloat(paymentMethod.processing_fee_percentage || 0) / 100);

      const response = {
        payment_method: paymentMethod.method_name,
        base_amount: amount,
        processing_fee: parseFloat(processing_fee.toFixed(2)),
        total_amount: parseFloat((amount + processing_fee).toFixed(2))
      };

      return ApiResponse.success(res, response, 'Processing fee calculated successfully');
    } catch (error) {
      logger.error('Controller error - getProcessingFee', {
        error: error.message,
        stack: error.stack,
        query: req.query
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Upload supporting documents
  async uploadDocuments(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;

      console.log('🔍 uploadDocuments called:', {
        requestId,
        clientId,
        files: req.files ? Object.keys(req.files) : 'no files',
        body: req.body
      });

      if (!requestId || isNaN(requestId)) {
        return ApiResponse.badRequest(res, 'Invalid request ID');
      }

      // Verify request belongs to client
      const request = await DocumentRequestService.getRequestDetails(requestId, clientId);
      if (!request.data) {
        return ApiResponse.notFound(res, 'Request not found');
      }

      // Check if files were uploaded
      if (!req.files || Object.keys(req.files).length === 0) {
        console.log('❌ No files uploaded - req.files:', req.files);
        return ApiResponse.badRequest(res, 'No files uploaded');
      }

      const uploadedDocuments = [];
      const errors = [];

      // Process each uploaded file
      for (const [fieldName, files] of Object.entries(req.files)) {
        for (const file of files) {
          try {
            const fileInfo = getFileInfo(file);

            const documentData = {
              request_id: requestId,
              document_name: fileInfo.originalName,
              document_type: fieldName,
              file_path: fileInfo.path,
              file_size: fileInfo.size,
              mime_type: fileInfo.mimetype,
              uploaded_by: clientId
            };

            const document = await SupportingDocument.create(documentData);
            uploadedDocuments.push(document.toJSON());

            logger.info('Document uploaded successfully', {
              requestId,
              clientId,
              documentId: document.id,
              fileName: fileInfo.originalName,
              fileSize: fileInfo.size
            });

          } catch (error) {
            logger.error('Error saving document record', {
              error: error.message,
              file: file.originalname,
              requestId,
              clientId
            });

            // Clean up uploaded file if database save failed
            deleteFile(file.path);
            errors.push(`Failed to save ${file.originalname}: ${error.message}`);
          }
        }
      }

      if (errors.length > 0 && uploadedDocuments.length === 0) {
        return ApiResponse.serverError(res, 'Failed to upload any documents', { errors });
      }

      const response = {
        uploaded_documents: uploadedDocuments,
        total_uploaded: uploadedDocuments.length,
        errors: errors.length > 0 ? errors : undefined
      };

      return ApiResponse.success(res, response, 'Documents uploaded successfully');

    } catch (error) {
      logger.error('Controller error - uploadDocuments', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Get uploaded documents for a request
  async getDocuments(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;

      if (!requestId || isNaN(requestId)) {
        return ApiResponse.badRequest(res, 'Invalid request ID');
      }

      // Verify request belongs to client
      const request = await DocumentRequestService.getRequestDetails(requestId, clientId);
      if (!request.data) {
        return ApiResponse.notFound(res, 'Request not found');
      }

      const documents = await SupportingDocument.getByRequestId(requestId);
      const documentsJson = documents.map(doc => doc.toJSON());

      return ApiResponse.success(res, documentsJson, 'Documents retrieved successfully');

    } catch (error) {
      logger.error('Controller error - getDocuments', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Delete uploaded document
  async deleteDocument(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const documentId = parseInt(req.params.documentId);
      const clientId = req.user.id;

      if (!requestId || isNaN(requestId) || !documentId || isNaN(documentId)) {
        return ApiResponse.badRequest(res, 'Invalid request ID or document ID');
      }

      // Verify request belongs to client
      const request = await DocumentRequestService.getRequestDetails(requestId, clientId);
      if (!request.data) {
        return ApiResponse.notFound(res, 'Request not found');
      }

      // Get document and verify it belongs to the request
      const document = await SupportingDocument.findById(documentId);
      if (!document) {
        return ApiResponse.notFound(res, 'Document not found');
      }

      if (document.request_id !== requestId) {
        return ApiResponse.badRequest(res, 'Document does not belong to this request');
      }

      // Delete the document
      await document.delete();

      logger.info('Document deleted successfully', {
        requestId,
        documentId,
        clientId,
        fileName: document.document_name
      });

      return ApiResponse.success(res, null, 'Document deleted successfully');

    } catch (error) {
      logger.error('Controller error - deleteDocument', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        documentId: req.params.documentId,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Update beneficiary information
  async updateBeneficiary(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.badRequest(res, 'Validation failed', errors.array());
      }

      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;
      const updateData = req.body;

      // Verify request belongs to client
      const request = await DocumentRequestService.getRequestDetails(requestId, clientId);
      if (!request) {
        return ApiResponse.notFound(res, 'Request not found');
      }

      // Check if request can be modified (not yet approved)
      if (['approved', 'processing', 'ready_for_pickup', 'completed'].includes(request.status)) {
        return ApiResponse.badRequest(res, 'Cannot modify beneficiary information after request approval');
      }

      // Find existing beneficiary
      const beneficiary = await DocumentBeneficiary.findByRequestId(requestId);
      if (!beneficiary) {
        return ApiResponse.notFound(res, 'Beneficiary information not found');
      }

      // Validate update data
      const validationErrors = DocumentBeneficiary.validateData({ ...beneficiary, ...updateData });
      if (validationErrors.length > 0) {
        return ApiResponse.badRequest(res, 'Validation failed', validationErrors);
      }

      // Update beneficiary
      await beneficiary.update(updateData);

      logger.info('Beneficiary updated successfully', {
        requestId,
        clientId,
        beneficiaryId: beneficiary.id
      });

      return ApiResponse.success(res, beneficiary.toJSON(), 'Beneficiary information updated successfully');
    } catch (error) {
      logger.error('Controller error - updateBeneficiary', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Add or update authorized pickup person
  async updateAuthorizedPickup(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.badRequest(res, 'Validation failed', errors.array());
      }

      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;
      const pickupData = req.body;

      // Verify request belongs to client
      const request = await DocumentRequestService.getRequestDetails(requestId, clientId);
      if (!request) {
        return ApiResponse.notFound(res, 'Request not found');
      }

      // Check if request can be modified
      if (['processing', 'ready_for_pickup', 'completed'].includes(request.status)) {
        return ApiResponse.badRequest(res, 'Cannot modify pickup information after processing begins');
      }

      // Validate pickup data
      const validationErrors = AuthorizedPickupPerson.validateData({ request_id: requestId, ...pickupData });
      if (validationErrors.length > 0) {
        return ApiResponse.badRequest(res, 'Validation failed', validationErrors);
      }

      // Check if authorized pickup person already exists
      let authorizedPickup = await AuthorizedPickupPerson.findByRequestId(requestId);

      if (authorizedPickup) {
        // Update existing
        await authorizedPickup.update(pickupData);
      } else {
        // Create new
        authorizedPickup = await AuthorizedPickupPerson.create({
          request_id: requestId,
          ...pickupData
        });
      }

      logger.info('Authorized pickup person updated successfully', {
        requestId,
        clientId,
        pickupPersonId: authorizedPickup.id
      });

      return ApiResponse.success(res, authorizedPickup.toJSON(), 'Authorized pickup person updated successfully');
    } catch (error) {
      logger.error('Controller error - updateAuthorizedPickup', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Remove authorized pickup person
  async removeAuthorizedPickup(req, res) {
    try {
      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;

      // Verify request belongs to client
      const request = await DocumentRequestService.getRequestDetails(requestId, clientId);
      if (!request) {
        return ApiResponse.notFound(res, 'Request not found');
      }

      // Check if request can be modified
      if (['processing', 'ready_for_pickup', 'completed'].includes(request.status)) {
        return ApiResponse.badRequest(res, 'Cannot modify pickup information after processing begins');
      }

      // Find and delete authorized pickup person
      const authorizedPickup = await AuthorizedPickupPerson.findByRequestId(requestId);
      if (!authorizedPickup) {
        return ApiResponse.notFound(res, 'Authorized pickup person not found');
      }

      await authorizedPickup.delete();

      logger.info('Authorized pickup person removed successfully', {
        requestId,
        clientId,
        pickupPersonId: authorizedPickup.id
      });

      return ApiResponse.success(res, null, 'Authorized pickup person removed successfully');
    } catch (error) {
      logger.error('Controller error - removeAuthorizedPickup', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Get authorization status
  async getAuthorizationStatus(req, res) {
    try {
      console.log('🔍 getAuthorizationStatus called');
      console.log('📋 Request ID:', req.params.id);
      console.log('👤 Client ID:', req.user?.id);

      const requestId = parseInt(req.params.id);
      const clientId = req.user.id;

      // Verify request belongs to client
      const request = await DocumentRequestService.getRequestDetails(requestId, clientId);
      if (!request) {
        return ApiResponse.notFound(res, 'Request not found');
      }

      // Get authorized pickup person
      console.log('🔍 Looking for authorized pickup person for request:', requestId);
      const authorizedPickup = await AuthorizedPickupPerson.findByRequestId(requestId);
      console.log('📋 Found authorized pickup:', authorizedPickup ? 'YES' : 'NO');

      if (!authorizedPickup) {
        console.log('❌ No authorized pickup person found');
        return ApiResponse.success(res, {
          has_authorized_pickup: false,
          verification_status: null,
          documents_uploaded: [],
          admin_notes: null
        }, 'No authorized pickup person found');
      }

      console.log('✅ Authorized pickup person found:', {
        id: authorizedPickup.id,
        name: authorizedPickup.getFullName()
      });

      // TODO: Get uploaded authorization documents when that table is implemented
      const documentsUploaded = []; // Placeholder

      const statusData = {
        has_authorized_pickup: true,
        pickup_person: {
          id: authorizedPickup.id, // Add the ID that frontend needs
          name: authorizedPickup.getFullName(),
          relationship: authorizedPickup.relationship_to_beneficiary,
          id_type: authorizedPickup.id_type,
          id_number: authorizedPickup.id_number
        },
        verification_status: authorizedPickup.getVerificationStatus(),
        documents_uploaded: documentsUploaded,
        admin_notes: authorizedPickup.verification_notes
      };

      console.log('📤 Returning authorization status:', statusData);

      return ApiResponse.success(res, statusData, 'Authorization status retrieved successfully');
    } catch (error) {
      logger.error('Controller error - getAuthorizationStatus', {
        error: error.message,
        stack: error.stack,
        requestId: req.params.id,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Check request frequency limits for a document type
  async checkRequestFrequency(req, res) {
    try {
      const { documentTypeId } = req.params;
      const clientId = req.user.id;

      // Get optional query parameters for third-party request checking
      const { is_third_party_request, beneficiary_first_name, beneficiary_last_name, beneficiary_birth_date } = req.query;

      // Get document type name
      const { executeQuery } = require('../config/database');
      const docTypeQuery = 'SELECT type_name FROM document_types WHERE id = ?';
      const docTypeResults = await executeQuery(docTypeQuery, [documentTypeId]);

      if (docTypeResults.length === 0) {
        return ApiResponse.badRequest(res, 'Invalid document type.');
      }

      const documentTypeName = docTypeResults[0].type_name;

      // Prepare beneficiary data if provided
      let beneficiaryData = null;
      const isThirdParty = is_third_party_request === 'true';

      if (isThirdParty && beneficiary_first_name && beneficiary_last_name && beneficiary_birth_date) {
        beneficiaryData = {
          first_name: beneficiary_first_name,
          last_name: beneficiary_last_name,
          birth_date: beneficiary_birth_date
        };
      }

      // Use enhanced frequency checking
      const frequencyCheck = await RequestFrequencyService.canMakeRequestEnhanced(
        clientId,
        documentTypeName,
        isThirdParty,
        beneficiaryData
      );

      const responseData = {
        documentType: documentTypeName,
        canRequest: frequencyCheck.canRequest,
        limitDescription: frequencyCheck.limitDescription,
        message: frequencyCheck.message,
        isThirdPartyRequest: isThirdParty
      };

      if (!frequencyCheck.canRequest) {
        responseData.lastRequestDate = frequencyCheck.lastRequestDate;
        responseData.nextAllowedDate = frequencyCheck.nextAllowedDate;
        responseData.lastRequestNumber = frequencyCheck.lastRequestNumber;
        responseData.lastRequestStatus = frequencyCheck.lastRequestStatus;
      }

      return ApiResponse.success(res, responseData, 'Frequency check completed');
    } catch (error) {
      logger.error('Controller error - checkRequestFrequency', {
        error: error.message,
        stack: error.stack,
        documentTypeId: req.params.documentTypeId,
        clientId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  // Serve verification images for client's own requests
  async serveVerificationImage(req, res) {
    try {
      const { id, type, filename } = req.params;
      const fs = require('fs');
      const path = require('path');

      // Debug logging
      console.log('serveVerificationImage called:', {
        id,
        type,
        filename,
        userId: req.user?.id,
        userRole: req.user?.role
      });

      // Check authentication
      if (!req.user) {
        console.log('❌ No authenticated user found');
        return res.status(401).json({
          success: false,
          message: 'Access denied. Authentication required.'
        });
      }

      // Validate input parameters
      if (!id || !type || !filename) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters',
          required: ['id', 'type', 'filename']
        });
      }

      // Sanitize filename to prevent path traversal attacks
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
      if (sanitizedFilename !== filename) {
        return res.status(400).json({
          success: false,
          error: 'Invalid filename format',
          filename: filename
        });
      }

      // Verify the request belongs to the authenticated user (for clients)
      if (req.user.role === 'client') {
        const requestQuery = 'SELECT client_id FROM document_requests WHERE id = ?';
        const requestResult = await executeQuery(requestQuery, [id]);

        if (requestResult.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Request not found'
          });
        }

        if (requestResult[0].client_id !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You can only view images for your own requests.'
          });
        }
      }

      // Construct file path based on type using explicit base directory
      const baseDir = path.join(__dirname, '../../uploads', 'verification');
      let filePath;

      switch (type) {
        case 'beneficiary':
          filePath = path.join(baseDir, 'beneficiaries', sanitizedFilename);
          break;
        case 'pickup-id':
          filePath = path.join(baseDir, 'pickup_ids', sanitizedFilename);
          break;
        case 'pickup-auth':
          filePath = path.join(baseDir, 'pickup_authorization', sanitizedFilename);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid image type',
            type: type,
            allowedTypes: ['beneficiary', 'pickup-id', 'pickup-auth']
          });
      }

      // Normalize path to handle Windows backslashes
      filePath = path.normalize(filePath);

      console.log('🔍 Backend debug - Image serving:', {
        requestId: id,
        imageType: type,
        filename: sanitizedFilename,
        baseDir: baseDir,
        resolvedPath: filePath,
        pathExists: fs.existsSync(filePath)
      });

      // Check if file exists before attempting to serve
      if (!fs.existsSync(filePath)) {
        console.log('❌ File not found at path:', filePath);
        return res.status(404).json({
          success: false,
          error: 'Image not found',
          file: sanitizedFilename,
          type: type,
          requestId: id,
          resolvedPath: filePath
        });
      }

      console.log('✅ File exists, attempting to serve:', filePath);

      // Get MIME type dynamically based on file extension
      const ext = sanitizedFilename.toLowerCase().split('.').pop();
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'pdf': 'application/pdf'
      };
      const mimeType = mimeTypes[ext] || 'application/octet-stream';

      console.log('📄 Setting Content-Type:', mimeType, 'for file:', sanitizedFilename);

      // Set proper headers for image serving
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'private, no-cache');
      res.setHeader('Access-Control-Allow-Origin', req.get('Origin') || '*');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Send file with proper error handling
      res.sendFile(filePath, (sendError) => {
        if (sendError) {
          console.error('❌ Error sending file:', {
            filename: sanitizedFilename,
            path: filePath,
            error: sendError.message,
            code: sendError.code
          });

          if (!res.headersSent) {
            return res.status(500).json({
              success: false,
              error: 'Failed to serve image',
              details: sendError.message,
              filename: sanitizedFilename
            });
          }
        } else {
          console.log('✅ File sent successfully:', {
            filename: sanitizedFilename,
            type: type,
            mimeType: mimeType,
            path: filePath
          });
        }
      });

    } catch (error) {
      console.error('❌ Error in serveVerificationImage:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Helper method to get MIME type
  getMimeType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new DocumentRequestController();
