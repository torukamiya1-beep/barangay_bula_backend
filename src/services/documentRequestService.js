const DocumentRequest = require('../models/DocumentRequest');
const BarangayClearanceApplication = require('../models/BarangayClearanceApplication');
const CedulaApplication = require('../models/CedulaApplication');
const ClientProfile = require('../models/ClientProfile');
const { executeQuery, executeTransaction, executeTransactionCallback } = require('../config/database');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

class DocumentRequestService {
  // Get document types
  static async getDocumentTypes() {
    try {
      const query = `
        SELECT id, type_name, description, base_fee, is_active 
        FROM document_types 
        WHERE is_active = 1 
        ORDER BY type_name
      `;
      
      const results = await executeQuery(query);
      
      logger.info('Document types retrieved successfully', {
        count: results.length
      });
      
      return {
        success: true,
        data: results,
        message: 'Document types retrieved successfully'
      };
    } catch (error) {
      logger.error('Error retrieving document types', { error: error.message });
      throw new Error('Failed to retrieve document types');
    }
  }

  // Get purpose categories
  static async getPurposeCategories() {
    try {
      const query = `
        SELECT id, category_name, description, is_active 
        FROM purpose_categories 
        WHERE is_active = 1 
        ORDER BY category_name
      `;
      
      const results = await executeQuery(query);
      
      logger.info('Purpose categories retrieved successfully', {
        count: results.length
      });
      
      return {
        success: true,
        data: results,
        message: 'Purpose categories retrieved successfully'
      };
    } catch (error) {
      logger.error('Error retrieving purpose categories', { error: error.message });
      throw new Error('Failed to retrieve purpose categories');
    }
  }

  // Get payment methods
  static async getPaymentMethods() {
    try {
      const query = `
        SELECT id, method_name, method_code, description, is_online, is_active,
               processing_fee_percentage, processing_fee_fixed
        FROM payment_methods 
        WHERE is_active = 1 
        ORDER BY is_online DESC, method_name
      `;
      
      const results = await executeQuery(query);
      
      logger.info('Payment methods retrieved successfully', {
        count: results.length
      });
      
      return {
        success: true,
        data: results,
        message: 'Payment methods retrieved successfully'
      };
    } catch (error) {
      logger.error('Error retrieving payment methods', { error: error.message });
      throw new Error('Failed to retrieve payment methods');
    }
  }

  // Submit document request
  static async submitRequest(requestData, clientId) {
    console.log('Service: submitRequest called with:', { requestData, clientId });
    console.log('Service: Fixed undefined parameters issue');

    // Sanitize request data to prevent undefined values
    const sanitizedData = this.sanitizeRequestData(requestData);
    console.log('Service: Sanitized request data:', sanitizedData);

    const transaction = async (connection) => {
      try {
        const {
          document_type_id,
          purpose_category_id,
          purpose_details,
          payment_method_id,
          delivery_method = 'pickup',
          delivery_address,
          priority = 'normal',
          // Document-specific data
          ...specificData
        } = sanitizedData;

        // Get document type information
        console.log('Service: Getting document type for ID:', document_type_id);
        const docTypeQuery = 'SELECT type_name FROM document_types WHERE id = ?';
        const docTypeResults = await connection.execute(docTypeQuery, [document_type_id]);
        console.log('Service: Document type query result:', docTypeResults[0]);

        if (docTypeResults[0].length === 0) {
          throw new Error('Invalid document type');
        }

        const documentType = docTypeResults[0][0];
        console.log('Service: Document type found:', documentType);

        // Frontend will send the exact total_document_fee - no backend calculation needed
        let total_document_fee = parseFloat(specificData.total_document_fee || 0);
        console.log('Service: Total document fee from frontend:', total_document_fee);

        // Validate that frontend sent total_document_fee
        if (!total_document_fee || total_document_fee <= 0) {
          throw new Error('total_document_fee is required and must be greater than 0');
        }

        // For Cedula, verify that frontend calculation matches backend (Legal Compliance)
        if (documentType.type_name === 'Cedula' && specificData.annual_income) {
          const taxCalculation = CedulaApplication.calculateTax(
            parseFloat(specificData.annual_income || 0),
            parseFloat(specificData.property_assessed_value || 0),
            parseFloat(specificData.personal_property_value || 0),
            parseFloat(specificData.business_gross_receipts || 0)
          );

          // Calculate expected total fee including PayMongo minimum requirement
          const processingFee = 5.00; // Standard processing fee
          const finalFeeCalculation = CedulaApplication.calculateFinalFee(taxCalculation.total_tax, processingFee);
          const expectedTotalFee = finalFeeCalculation.total_document_fee;

          // Verify frontend sent correct amount (allow small rounding differences)
          if (Math.abs(total_document_fee - expectedTotalFee) > 0.01) {
            console.warn(`Cedula fee mismatch: Frontend=${total_document_fee}, Expected=${expectedTotalFee}`);
            console.warn(`Breakdown: ${finalFeeCalculation.breakdown}`);
            // Use backend calculation for security
            total_document_fee = expectedTotalFee;
          }

          console.log(`Cedula fee verification: Frontend=${total_document_fee}, Backend=${expectedTotalFee}`);
          console.log(`Fee breakdown: ${finalFeeCalculation.breakdown}`);
        }

        // Extract third-party request data
        const {
          is_third_party_request = false,
          requestor_notes,
          beneficiary,
          authorized_pickup,
          ...otherData
        } = specificData;

        // Create main document request
        const requestParams = {
          client_id: clientId,
          document_type_id,
          purpose_category_id,
          purpose_details,
          is_third_party_request,
          requestor_notes,
          beneficiary,
          authorized_pickup,
          total_document_fee,
          payment_method_id,
          delivery_method,
          delivery_address: delivery_address || null,
          priority
        };

        // Use the DocumentRequest model's create method which includes notification logic
        console.log('Service: Creating document request with params:', requestParams);
        const DocumentRequest = require('../models/DocumentRequest');
        const docRequest = await DocumentRequest.create(requestParams);

        // Create document-specific application
        if (documentType.type_name === 'Barangay Clearance') {
          console.log('Service: Creating Barangay Clearance application (Legal Compliance)');
          await DocumentRequestService.createBarangayClearanceApplicationInTransaction(connection, {
            request_id: docRequest.id,
            has_pending_cases: specificData.has_pending_cases || false,
            pending_cases_details: specificData.pending_cases_details || null,
            voter_registration_status: specificData.voter_registration_status !== undefined ? specificData.voter_registration_status : null
          });
        } else if (documentType.type_name === 'Cedula') {
          console.log('Service: Creating Cedula application (Legal Compliance)');
          await DocumentRequestService.createCedulaApplicationInTransaction(connection, {
            request_id: docRequest.id,
            occupation: specificData.occupation || specificData.income_source || 'Not specified',
            employer_name: specificData.employer_name || null,
            employer_address: specificData.employer_address || null,
            monthly_income: specificData.monthly_income || 0,
            annual_income: specificData.annual_income || 0,
            business_name: specificData.business_name || null,
            business_address: specificData.business_address || null,
            business_type: specificData.business_type || specificData.business_nature || null,
            business_income: specificData.business_income || 0,
            business_gross_receipts: specificData.business_gross_receipts || 0,
            has_real_property: specificData.has_real_property || false,
            has_personal_property: specificData.has_personal_property || false,
            personal_property_value: specificData.personal_property_value || 0,
            property_assessed_value: specificData.property_assessed_value || specificData.property_value || 0,
            property_location: specificData.property_location || null,
            tin_number: specificData.tin_number || null,
            previous_ctc_number: specificData.previous_ctc_number || null,
            previous_ctc_date_issued: specificData.previous_ctc_date_issued || null,
            previous_ctc_place_issued: specificData.previous_ctc_place_issued || null,
            computed_tax: total_document_fee
          });
        }

        // Create beneficiary record if this is a third-party request
        if (is_third_party_request && beneficiary) {
          console.log('Service: Creating beneficiary record');
          await DocumentRequestService.createBeneficiaryInTransaction(connection, {
            request_id: docRequest.id,
            ...beneficiary
          });
        }

        // Note: Authorized pickup person is already created by DocumentRequest.create() method
        // No need to create it again here to avoid duplicates

        logger.info('Document request submitted successfully', {
          requestId: docRequest.id,
          requestNumber: docRequest.request_number,
          clientId,
          documentType: documentType.type_name,
          hasThirdParty: !!is_third_party_request,
          hasBeneficiary: !!beneficiary,
          hasAuthorizedPickup: !!authorized_pickup,
          note: 'Authorized pickup person created by DocumentRequest.create() method'
        });

        // Notification is handled by the DocumentRequest model's create method

        return docRequest;

      } catch (error) {
        logger.error('Error in document request submission transaction', {
          error: error.message,
          clientId
        });
        throw error;
      }
    };

    try {
      const docRequest = await executeTransactionCallback(transaction);
      
      return {
        success: true,
        data: docRequest,
        message: 'Document request submitted successfully'
      };
    } catch (error) {
      logger.error('Error submitting document request', {
        error: error.message,
        clientId
      });
      throw new Error('Failed to submit document request');
    }
  }

  // Helper method to sanitize request data
  static sanitizeRequestData(data) {
    if (data === null || data === undefined) {
      return null;
    }

    if (typeof data !== 'object') {
      return data === undefined ? null : data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeRequestData(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (value === undefined) {
        sanitized[key] = null;
      } else if (value === '') {
        sanitized[key] = null;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeRequestData(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  // Helper method to create document request within transaction
  static async createDocumentRequestInTransaction(connection, requestData) {
    console.log('Service: createDocumentRequestInTransaction called with:', requestData);
    const {
      client_id, document_type_id, purpose_category_id, purpose_details,
      is_third_party_request, requestor_notes, beneficiary, authorized_pickup,
      total_document_fee, payment_method_id,
      delivery_method, delivery_address, priority
    } = requestData;

    // Generate request number
    console.log('Service: Generating request number...');
    const documentTypeQuery = 'SELECT type_name FROM document_types WHERE id = ?';
    const docTypeResults = await connection.execute(documentTypeQuery, [document_type_id]);
    const documentTypeName = docTypeResults[0][0].type_name;
    const docTypeCode = documentTypeName === 'Cedula' ? 'CED' : 'BC';
    console.log('Service: Document type:', documentTypeName, 'Code:', docTypeCode);

    const requestNumberQuery = 'SELECT GenerateRequestNumber(?) as request_number';
    const requestNumberResults = await connection.execute(requestNumberQuery, [docTypeCode]);
    const request_number = requestNumberResults[0][0].request_number;
    console.log('Service: Generated request number:', request_number);

    const query = `
      INSERT INTO document_requests (
        request_number, client_id, is_third_party_request, document_type_id, purpose_category_id,
        purpose_details, requestor_notes, status_id, priority, total_document_fee,
        payment_method_id, delivery_method, delivery_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
    `;

    const params = [
      request_number,
      client_id,
      is_third_party_request || false,
      document_type_id,
      purpose_category_id,
      purpose_details,
      requestor_notes || null,
      priority || 'normal',
      total_document_fee || 0,
      payment_method_id || null,
      delivery_method || 'pickup',
      delivery_address || null
    ];

    console.log('Service: Executing INSERT query with params:', params);
    console.log('Service: Checking for undefined values:', {
      request_number: typeof request_number,
      client_id: typeof client_id,
      document_type_id: typeof document_type_id,
      purpose_category_id: typeof purpose_category_id,
      purpose_details: typeof purpose_details,
      priority: typeof priority,
      total_document_fee: typeof total_document_fee,
      payment_method_id: typeof payment_method_id,
      delivery_method: typeof delivery_method,
      delivery_address: typeof delivery_address
    });

    const result = await connection.execute(query, params);
    console.log('Service: INSERT result:', result[0]);

    const requestId = result[0].insertId;

    // Notification is automatically handled by the DocumentRequest model's create method
    console.log(`📢 DocumentRequestService: Notification will be handled by DocumentRequest model for request ID ${docRequest.id}`);

    // Return the created request data
    return {
      id: requestId,
      request_number,
      client_id,
      document_type_id,
      purpose_category_id,
      purpose_details,
      status_id: 1,
      priority,
      total_document_fee,
      payment_method_id,
      delivery_method,
      delivery_address
    };
  }

  // Helper method to create barangay clearance application within transaction
  // Updated for Legal Compliance - Data Privacy Act compliant
  static async createBarangayClearanceApplicationInTransaction(connection, applicationData) {
    console.log('Service: createBarangayClearanceApplicationInTransaction called with:', applicationData);
    const {
      request_id, has_pending_cases, pending_cases_details, voter_registration_status
    } = applicationData;

    const query = `
      INSERT INTO barangay_clearance_applications (
        request_id, has_pending_cases, pending_cases_details, voter_registration_status
      ) VALUES (?, ?, ?, ?)
    `;

    const params = [
      request_id,
      has_pending_cases || false,
      pending_cases_details || null,
      voter_registration_status !== undefined ? voter_registration_status : null
    ];

    console.log('Service: Executing Barangay Clearance INSERT with params:', params);
    await connection.execute(query, params);
    console.log('Service: Barangay Clearance application created successfully (Essential Data + Voter Status)');
  }

  // Helper method to create cedula application within transaction
  // Updated for Legal Compliance - Complete tax declaration
  static async createCedulaApplicationInTransaction(connection, applicationData) {
    console.log('Service: createCedulaApplicationInTransaction called with:', applicationData);

    const {
      request_id, occupation, employer_name, employer_address,
      monthly_income, annual_income, business_name, business_address,
      business_type, business_income, business_gross_receipts, has_real_property,
      has_personal_property, personal_property_value, property_assessed_value,
      property_location, tin_number, previous_ctc_number, previous_ctc_date_issued,
      previous_ctc_place_issued, computed_tax
    } = applicationData;

    const query = `
      INSERT INTO cedula_applications (
        request_id, occupation, employer_name, employer_address,
        monthly_income, annual_income, business_name, business_address,
        business_type, business_income, business_gross_receipts, has_real_property,
        has_personal_property, personal_property_value, property_assessed_value,
        property_location, tin_number, previous_ctc_number, previous_ctc_date_issued,
        previous_ctc_place_issued, computed_tax
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      request_id, occupation || null, employer_name || null, employer_address || null,
      monthly_income || 0, annual_income || 0, business_name || null, business_address || null,
      business_type || null, business_income || 0, business_gross_receipts || 0, has_real_property || false,
      has_personal_property || false, personal_property_value || 0, property_assessed_value || 0,
      property_location || null, tin_number || null, previous_ctc_number || null, previous_ctc_date_issued || null,
      previous_ctc_place_issued || null, computed_tax || 0
    ];

    console.log('Service: Executing Cedula INSERT with params:', params);

    try {
      await connection.execute(query, params);
      console.log('Service: Cedula application created successfully (Legally Complete)');
    } catch (error) {
      console.error('Service: Error creating Cedula application:', error);
      throw error;
    }
  }

  // Get client's requests
  static async getClientRequests(clientId, filters = {}) {
    try {
      const result = await DocumentRequest.getClientRequests(clientId, filters);
      
      logger.info('Client requests retrieved successfully', {
        clientId,
        count: result.requests.length,
        page: result.pagination.page
      });
      
      return {
        success: true,
        data: result.requests,
        pagination: result.pagination,
        message: 'Requests retrieved successfully'
      };
    } catch (error) {
      logger.error('Error retrieving client requests', {
        error: error.message,
        clientId
      });
      throw new Error('Failed to retrieve requests');
    }
  }

  // Get request details
  static async getRequestDetails(requestId, clientId = null) {
    try {
      const request = await DocumentRequest.getRequestDetails(requestId, clientId);
      
      if (!request) {
        throw new Error('Request not found');
      }
      
      logger.info('Request details retrieved successfully', {
        requestId,
        clientId
      });
      
      return {
        success: true,
        data: request,
        message: 'Request details retrieved successfully'
      };
    } catch (error) {
      logger.error('Error retrieving request details', {
        error: error.message,
        requestId,
        clientId
      });
      throw error;
    }
  }

  // Cancel request
  static async cancelRequest(requestId, clientId, reason = null) {
    try {
      console.log('🔍 DocumentRequestService.cancelRequest called with:', { requestId, clientId, reason });

      const request = await DocumentRequest.findById(requestId);

      console.log('📋 Request found:', {
        id: request?.id,
        status_id: request?.status_id,
        status: request?.status,
        client_id: request?.client_id,
        fullRequest: request
      });

      if (!request) {
        throw new Error('Request not found');
      }

      // Verify ownership if clientId is provided
      if (clientId && request.client_id !== clientId) {
        throw new Error('Unauthorized to cancel this request');
      }

      // Check if request can be cancelled using status names (consistent with frontend)
      const cancellableStatuses = [
        'pending',
        'under_review',
        'additional_info_required',
        'approved',
        'processing',
        'payment_pending',
        'payment_failed'
      ];

      // If status name is not available, fall back to status ID mapping
      let currentStatus = request.status;
      if (!currentStatus && request.status_id) {
        const statusMapping = {
          1: 'pending',
          2: 'under_review',
          3: 'additional_info_required',
          4: 'approved',
          5: 'processing',
          6: 'ready_for_pickup',
          7: 'completed',
          8: 'cancelled',
          9: 'rejected',
          10: 'payment_pending',
          11: 'payment_confirmed',
          12: 'payment_failed',
          13: 'pickup_scheduled'
        };
        currentStatus = statusMapping[request.status_id];
        console.log('🔄 Status name not found, mapped from ID:', request.status_id, '→', currentStatus);
      }

      logger.info('Checking cancellation eligibility', {
        requestId,
        currentStatus: currentStatus,
        currentStatusId: request.status_id,
        cancellableStatuses,
        canCancel: cancellableStatuses.includes(currentStatus)
      });

      if (!cancellableStatuses.includes(currentStatus)) {
        const errorMessage = `Request cannot be cancelled at this stage. Current status: ${currentStatus}. Cancellable statuses: ${cancellableStatuses.join(', ')}`;
        logger.warn('Cancellation rejected', {
          requestId,
          currentStatus: currentStatus,
          currentStatusId: request.status_id,
          cancellableStatuses
        });
        throw new Error(errorMessage);
      }

      const oldStatusId = request.status_id;
      const newStatusId = 8; // cancelled status

      // Update status to cancelled (status_id = 8)
      // For client-initiated cancellations, use system admin ID (32) since changed_by must reference admin_employee_accounts
      const systemAdminId = 32; // Default system admin for client-initiated actions
      await request.updateStatus(newStatusId, systemAdminId, reason || 'Cancelled by client');

      // Send notification to admins about the cancellation
      try {
        console.log('🔔 DocumentRequestService: Sending cancellation notification for request', requestId);
        await notificationService.notifyRequestCancellation(requestId, clientId, oldStatusId, newStatusId, reason);
        console.log('✅ DocumentRequestService: Cancellation notification sent successfully');
      } catch (notificationError) {
        logger.error('❌ DocumentRequestService: Failed to send cancellation notification:', notificationError);
        // Don't fail the cancellation if notification fails
      }

      logger.info('Request cancelled successfully', {
        requestId,
        clientId,
        reason,
        oldStatusId,
        newStatusId
      });

      return {
        success: true,
        data: { id: requestId, status: 'cancelled' },
        message: 'Request cancelled successfully'
      };
    } catch (error) {
      logger.error('Error cancelling request', {
        error: error.message,
        requestId,
        clientId
      });
      throw error;
    }
  }

  // Get request status history
  static async getRequestHistory(requestId, clientId = null) {
    try {
      // Verify request exists and ownership if clientId provided
      if (clientId) {
        const request = await DocumentRequest.findById(requestId);
        if (!request || request.client_id !== clientId) {
          throw new Error('Request not found');
        }
      }

      const history = await DocumentRequest.getStatusHistory(requestId);
      
      logger.info('Request history retrieved successfully', {
        requestId,
        clientId,
        historyCount: history.length
      });
      
      return {
        success: true,
        data: history,
        message: 'Request history retrieved successfully'
      };
    } catch (error) {
      logger.error('Error retrieving request history', {
        error: error.message,
        requestId,
        clientId
      });
      throw error;
    }
  }

  // Helper method to create beneficiary within transaction
  static async createBeneficiaryInTransaction(connection, beneficiaryData) {
    console.log('Service: createBeneficiaryInTransaction called with:', beneficiaryData);

    const {
      request_id, first_name, middle_name, last_name, suffix,
      birth_date, gender, civil_status_id, nationality, email, phone_number,
      house_number, street, subdivision, barangay, city_municipality, province,
      region, region_code, province_code, city_code, barangay_code,
      postal_code, years_of_residency, months_of_residency, relationship_to_requestor
    } = beneficiaryData;

    const query = `
      INSERT INTO document_beneficiaries (
        request_id, first_name, middle_name, last_name, suffix,
        birth_date, gender, civil_status_id, nationality, email, phone_number,
        house_number, street, subdivision, barangay, city_municipality, province,
        region, region_code, province_code, city_code, barangay_code,
        postal_code, years_of_residency, months_of_residency, relationship_to_requestor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      request_id, first_name, middle_name || null, last_name, suffix || null,
      birth_date, gender, civil_status_id, nationality, email || null, phone_number || null,
      house_number || null, street || null, subdivision || null, barangay, city_municipality, province,
      region || null, region_code || null, province_code || null, city_code || null, barangay_code || null,
      postal_code || null, years_of_residency || null, months_of_residency || null, relationship_to_requestor
    ];

    console.log('Service: Executing beneficiary INSERT with params:', params);
    await connection.execute(query, params);
    console.log('Service: Beneficiary created successfully');
  }

  // Helper method to create authorized pickup person within transaction
  static async createAuthorizedPickupInTransaction(connection, pickupData) {
    console.log('Service: createAuthorizedPickupInTransaction called with:', pickupData);

    const {
      request_id, first_name, middle_name, last_name, suffix,
      phone_number, email, relationship_to_beneficiary
    } = pickupData;

    const query = `
      INSERT INTO authorized_pickup_persons (
        request_id, first_name, middle_name, last_name, suffix,
        phone_number, email, relationship_to_beneficiary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      request_id, first_name, middle_name || null, last_name, suffix || null,
      phone_number || null, email || null, relationship_to_beneficiary
    ];

    console.log('Service: Executing authorized pickup INSERT with params:', params);
    const result = await connection.execute(query, params);
    console.log('Service: Authorized pickup person created successfully with ID:', result[0].insertId);

    return result[0].insertId;
  }
}

module.exports = DocumentRequestService;