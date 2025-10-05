const { executeQuery, executeTransaction, executeTransactionCallback } = require('../config/database');
const notificationService = require('../services/notificationService');
const DocumentBeneficiary = require('./DocumentBeneficiary');
const AuthorizedPickupPerson = require('./AuthorizedPickupPerson');

class DocumentRequest {
  constructor(data) {
    this.id = data.id;
    this.request_number = data.request_number;
    this.client_id = data.client_id;
    this.is_third_party_request = data.is_third_party_request || false;
    this.document_type_id = data.document_type_id;
    this.purpose_category_id = data.purpose_category_id;
    this.purpose_details = data.purpose_details;
    this.requestor_notes = data.requestor_notes;
    this.status_id = data.status_id;
    this.status = data.status; // Add status name field
    this.priority = data.priority;
    this.processed_by = data.processed_by;
    this.approved_by = data.approved_by;
    this.processed_at = data.processed_at;
    this.approved_at = data.approved_at;
    this.total_document_fee = data.total_document_fee;
    this.payment_method_id = data.payment_method_id;
    this.payment_status = data.payment_status;
    this.payment_reference = data.payment_reference;
    this.payment_provider_reference = data.payment_provider_reference;
    this.paid_at = data.paid_at;
    this.delivery_method = data.delivery_method;
    this.delivery_address = data.delivery_address;
    // Note: delivery_fee is now included in total_document_fee
    this.requested_at = data.requested_at;
    this.target_completion_date = data.target_completion_date;
    this.completed_at = data.completed_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Find document request by ID
  static async findById(id) {
    const query = `
      SELECT dr.*, rs.status_name as status
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      WHERE dr.id = ?
    `;
    console.log('🔍 DocumentRequest.findById query:', query, 'with ID:', id);
    const results = await executeQuery(query, [id]);
    console.log('📋 DocumentRequest.findById results:', results);

    if (results.length > 0) {
      const request = new DocumentRequest(results[0]);
      console.log('✅ DocumentRequest created:', {
        id: request.id,
        status_id: request.status_id,
        status: request.status,
        client_id: request.client_id
      });
      return request;
    }

    console.log('❌ No request found with ID:', id);
    return null;
  }

  // Find document request by request number
  static async findByRequestNumber(requestNumber) {
    const query = 'SELECT * FROM document_requests WHERE request_number = ?';
    const results = await executeQuery(query, [requestNumber]);
    return results.length > 0 ? new DocumentRequest(results[0]) : null;
  }

  // Create new document request
  static async create(requestData) {
    const {
      client_id,
      document_type_id,
      purpose_category_id,
      purpose_details,
      is_third_party_request = false,
      requestor_notes,
      beneficiary,
      authorized_pickup,
      total_document_fee,
      payment_method_id,
      delivery_method = 'pickup',
      delivery_address,
      priority = 'normal'
    } = requestData;

    // Generate request number based on document type
    const documentTypeQuery = 'SELECT type_name FROM document_types WHERE id = ?';
    const docTypeResults = await executeQuery(documentTypeQuery, [document_type_id]);
    
    if (docTypeResults.length === 0) {
      throw new Error('Invalid document type');
    }

    const docTypeCode = docTypeResults[0].type_name === 'Cedula' ? 'CED' : 'BC';
    
    // Use database function to generate request number
    const requestNumberQuery = 'SELECT GenerateRequestNumber(?) as request_number';
    const requestNumberResults = await executeQuery(requestNumberQuery, [docTypeCode]);
    const request_number = requestNumberResults[0].request_number;

    // Default status is 'pending' (status_id = 1)
    const status_id = 1;

    const query = `
      INSERT INTO document_requests (
        request_number, client_id, is_third_party_request, document_type_id, purpose_category_id,
        purpose_details, requestor_notes, status_id, priority, total_document_fee,
        payment_method_id, delivery_method, delivery_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      request_number,
      client_id,
      is_third_party_request,
      document_type_id,
      purpose_category_id,
      purpose_details,
      requestor_notes || null,
      status_id,
      priority,
      total_document_fee,
      payment_method_id,
      delivery_method,
      delivery_address || null
    ];

    try {
      console.log('📝 Creating document request with params:', {
        request_number,
        client_id,
        is_third_party_request,
        document_type_id,
        purpose_category_id,
        has_beneficiary: !!beneficiary,
        has_authorized_pickup: !!authorized_pickup
      });

      const result = await executeQuery(query, params);
      const requestId = result.insertId;
      console.log('✅ Document request created with ID:', requestId);

      // Create beneficiary record if this is a third-party request
      if (is_third_party_request && beneficiary) {
        console.log('📝 Creating beneficiary record for request:', requestId);
        console.log('Beneficiary data received:', JSON.stringify(beneficiary, null, 2));

        const beneficiaryData = {
          request_id: requestId,
          ...beneficiary
        };

        // Validate beneficiary data
        const beneficiaryErrors = DocumentBeneficiary.validateData(beneficiaryData);
        if (beneficiaryErrors.length > 0) {
          console.error('❌ Beneficiary validation failed:', beneficiaryErrors);
          throw new Error(`Beneficiary validation failed: ${beneficiaryErrors.join(', ')}`);
        }

        try {
          await DocumentBeneficiary.create(beneficiaryData);
          console.log('✅ Beneficiary record created successfully');
        } catch (beneficiaryError) {
          console.error('❌ Failed to create beneficiary record:', {
            error: beneficiaryError.message,
            stack: beneficiaryError.stack,
            data: beneficiaryData
          });
          throw new Error(`Failed to create beneficiary: ${beneficiaryError.message}`);
        }
      }

      // Create authorized pickup person if provided
      if (authorized_pickup) {
        console.log('📝 Creating authorized pickup person for request:', requestId);
        console.log('Authorized pickup data received:', JSON.stringify(authorized_pickup, null, 2));

        const pickupData = {
          request_id: requestId,
          ...authorized_pickup
        };

        // Validate pickup person data
        const pickupErrors = AuthorizedPickupPerson.validateData(pickupData);
        if (pickupErrors.length > 0) {
          console.error('❌ Authorized pickup validation failed:', pickupErrors);
          throw new Error(`Authorized pickup validation failed: ${pickupErrors.join(', ')}`);
        }

        try {
          await AuthorizedPickupPerson.create(pickupData);
          console.log('✅ Authorized pickup person created successfully');
        } catch (pickupError) {
          console.error('❌ Failed to create authorized pickup person:', {
            error: pickupError.message,
            stack: pickupError.stack,
            data: pickupData
          });
          throw new Error(`Failed to create authorized pickup person: ${pickupError.message}`);
        }
      }

      console.log('📝 Fetching created request details...');
      const newRequest = await DocumentRequest.findById(requestId);

      // Send notification to admins about new request
      try {
        console.log(`🔔 DocumentRequest model: Calling notifyNewRequest for request ID ${requestId}`);
        await notificationService.notifyNewRequest(requestId);
        console.log(`✅ DocumentRequest model: Notification sent successfully for request ID ${requestId}`);
      } catch (notificationError) {
        console.error('❌ DocumentRequest model: Failed to send new request notification:', notificationError);
        // Don't fail the request creation if notification fails
      }

      return newRequest;
    } catch (error) {
      console.error('❌ Error creating document request:', {
        error: error.message,
        stack: error.stack,
        requestData: {
          request_number,
          client_id,
          document_type_id,
          purpose_category_id,
          is_third_party_request,
          has_beneficiary: !!beneficiary,
          has_authorized_pickup: !!authorized_pickup
        }
      });
      throw error;
    }
  }

  // Get client's requests with pagination and filters
  static async getClientRequests(clientId, filters = {}) {
    const {
      status,
      document_type,
      page = 1,
      limit = 10,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = filters;

    const offset = (page - 1) * limit;
    let whereConditions = ['dr.client_id = ?'];
    let params = [clientId];

    // Build WHERE conditions
    if (status) {
      whereConditions.push('rs.status_name = ?');
      params.push(status);
    }

    if (document_type) {
      whereConditions.push('dt.type_name = ?');
      params.push(document_type);
    }

    if (search) {
      whereConditions.push('(dr.request_number LIKE ? OR dr.purpose_details LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validate sort fields
    const validSortFields = ['created_at', 'status_name', 'document_type', 'total_fee'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const query = `
      SELECT
        dr.*,
        dt.type_name as document_type,
        dt.description as document_description,
        pc.category_name as purpose_category,
        rs.status_name as status,
        rs.description as status_description,
        pm.method_name as payment_method,
        pm.method_code as payment_method_code,
        pm.is_online as is_online_payment,
        dr.payment_method_id,
        dr.total_document_fee as total_fee
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
      JOIN request_status rs ON dr.status_id = rs.id
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      ${whereClause}
      ORDER BY dr.${sortField} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const results = await executeQuery(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
      JOIN request_status rs ON dr.status_id = rs.id
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;

    return {
      requests: results,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get request details with complete information
  static async getRequestDetails(requestId, clientId = null) {
    let query = `
      SELECT
        dr.*,
        dt.type_name as document_type,
        dt.description as document_description,
        dt.base_fee as document_base_fee,
        pc.category_name as purpose_category,
        rs.status_name as status,
        rs.description as status_description,
        pm.method_name as payment_method,
        pm.method_code as payment_method_code,
        pm.is_online as is_online_payment,
        dr.total_document_fee as total_fee,
        ca.username as client_username,
        cp.first_name as requestor_first_name,
        cp.middle_name as requestor_middle_name,
        cp.last_name as requestor_last_name,
        cp.suffix as requestor_suffix,
        cp.email as requestor_email,
        cp.phone_number as requestor_phone,
        cp.house_number as requestor_house_number,
        cp.street as requestor_street,
        cp.barangay as requestor_barangay,
        cp.city_municipality as requestor_city,
        cp.province as requestor_province,
        cp.birth_date as requestor_birth_date,
        cp.gender as requestor_gender,
        cp.civil_status_id as requestor_civil_status_id,
        cp.nationality as requestor_nationality,
        cp.months_of_residency as requestor_months_of_residency,
        cp.years_of_residency as requestor_years_of_residency,
        cs.status_name as requestor_civil_status
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
      JOIN request_status rs ON dr.status_id = rs.id
      JOIN client_accounts ca ON dr.client_id = ca.id
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      LEFT JOIN civil_status cs ON cp.civil_status_id = cs.id
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      WHERE dr.id = ?
    `;

    const params = [requestId];

    // If clientId is provided, ensure the request belongs to the client
    if (clientId) {
      query += ' AND dr.client_id = ?';
      params.push(clientId);
    }

    const results = await executeQuery(query, params);
    
    if (results.length === 0) {
      return null;
    }

    const request = results[0];
    
    // Debug: Log the retrieved request data
    console.log('🔍 Request data retrieved:', {
      id: request.id,
      requestor_nationality: request.requestor_nationality,
      requestor_months_of_residency: request.requestor_months_of_residency,
      requestor_years_of_residency: request.requestor_years_of_residency,
      has_requestor_data: !!request.requestor_first_name
    });

    // Get beneficiary information if this is a third-party request
    let beneficiary = null;
    if (request.is_third_party_request) {
      beneficiary = await DocumentBeneficiary.findByRequestId(requestId);
    }

    // Get authorized pickup person information
    let authorizedPickup = await AuthorizedPickupPerson.findByRequestId(requestId);

    // Get document-specific details
    let specificDetails = {};

    if (request.document_type === 'Barangay Clearance') {
      const bcQuery = `
        SELECT * FROM barangay_clearance_applications
        WHERE request_id = ?
      `;
      const bcResults = await executeQuery(bcQuery, [requestId]);
      if (bcResults.length > 0) {
        specificDetails = bcResults[0];
      }
    } else if (request.document_type === 'Cedula') {
      const cedulaQuery = `
        SELECT * FROM cedula_applications
        WHERE request_id = ?
      `;
      const cedulaResults = await executeQuery(cedulaQuery, [requestId]);
      if (cedulaResults.length > 0) {
        specificDetails = cedulaResults[0];
        // Include annual income directly in the request object for easy access
        request.annual_income = cedulaResults[0].annual_income;
      }
    }

    // Build requestor information
    const requestor = {
      name: [
        request.requestor_first_name,
        request.requestor_middle_name,
        request.requestor_last_name,
        request.requestor_suffix
      ].filter(Boolean).join(' '),
      email: request.requestor_email,
      phone: request.requestor_phone,
      address: [
        request.requestor_house_number,
        request.requestor_street,
        request.requestor_barangay,
        request.requestor_city,
        request.requestor_province
      ].filter(Boolean).join(', '),
      nationality: request.requestor_nationality,
      months_of_residency: request.requestor_months_of_residency,
      years_of_residency: request.requestor_years_of_residency
    };

    // Debug: Log the constructed requestor object
    console.log('🔍 Requestor object constructed:', {
      nationality: requestor.nationality,
      months_of_residency: requestor.months_of_residency,
      years_of_residency: requestor.years_of_residency
    });

    // Build beneficiary information (use requestor info if not third-party)
    const beneficiaryInfo = request.is_third_party_request && beneficiary
      ? beneficiary.toJSON()
      : {
          ...requestor,
          full_name: requestor.name,
          relationship_to_requestor: 'self'
        };

    // Return complete request details
    return {
      ...request,
      requestor,
      beneficiary: beneficiaryInfo,
      authorized_pickup: authorizedPickup ? authorizedPickup.toJSON() : null,
      specific_details: specificDetails
    };
  }

  // Update request status
  async updateStatus(newStatusId, changedBy, notes = null) {
    const transaction = async (connection) => {
      // Get current status
      const currentStatusQuery = 'SELECT status_id FROM document_requests WHERE id = ?';
      const currentStatusResult = await connection.execute(currentStatusQuery, [this.id]);
      const oldStatusId = currentStatusResult[0][0]?.status_id;

      // Update request status
      const updateQuery = `
        UPDATE document_requests 
        SET status_id = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      await connection.execute(updateQuery, [newStatusId, this.id]);

      // Add to status history
      const historyQuery = `
        INSERT INTO request_status_history
        (request_id, old_status_id, new_status_id, changed_by, change_reason)
        VALUES (?, ?, ?, ?, ?)
      `;
      await connection.execute(historyQuery, [this.id, oldStatusId, newStatusId, changedBy, notes]);

      this.status_id = newStatusId;
    };

    await executeTransactionCallback(transaction);
    return this;
  }

  // Update payment status
  async updatePaymentStatus(paymentStatus, paymentReference = null, paidAt = null) {
    const query = `
      UPDATE document_requests 
      SET payment_status = ?, payment_reference = ?, paid_at = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await executeQuery(query, [paymentStatus, paymentReference, paidAt, this.id]);
    
    this.payment_status = paymentStatus;
    this.payment_reference = paymentReference;
    this.paid_at = paidAt;
    
    return this;
  }

  // Get request status history
  static async getStatusHistory(requestId) {
    const query = `
      SELECT 
        rsh.*,
        old_rs.status_name as old_status_name,
        new_rs.status_name as new_status_name,
        COALESCE(
          CONCAT(aep.first_name, ' ', aep.last_name),
          'System'
        ) as changed_by_name
      FROM request_status_history rsh
      LEFT JOIN request_status old_rs ON rsh.old_status_id = old_rs.id
      JOIN request_status new_rs ON rsh.new_status_id = new_rs.id
      LEFT JOIN admin_employee_accounts aea ON rsh.changed_by = aea.id
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      WHERE rsh.request_id = ?
      ORDER BY rsh.created_at ASC
    `;

    return await executeQuery(query, [requestId]);
  }

  // Convert to JSON (exclude sensitive data if needed)
  toJSON() {
    return { ...this };
  }
}

module.exports = DocumentRequest;