const { executeQuery, executeTransactionCallback } = require('../config/database');
const DocumentRequest = require('../models/DocumentRequest');
const logger = require('../utils/logger');
const notificationService = require('./notificationService');

class AdminDocumentService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_id = 1 THEN 1 END) as pending_requests,
          COUNT(CASE WHEN status_id = 2 THEN 1 END) as under_review_requests,
          COUNT(CASE WHEN status_id = 4 THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status_id = 5 THEN 1 END) as processing_requests,
          COUNT(CASE WHEN status_id = 6 THEN 1 END) as ready_for_pickup_requests,
          COUNT(CASE WHEN status_id = 7 THEN 1 END) as completed_requests,
          COUNT(CASE WHEN status_id = 9 THEN 1 END) as rejected_requests,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_requests,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as week_requests,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as month_requests,
          SUM(COALESCE(total_document_fee, 0)) as total_revenue,
          SUM(CASE WHEN payment_status = 'paid' THEN COALESCE(total_document_fee, 0) ELSE 0 END) as paid_revenue,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_requests
        FROM document_requests
      `;

      const [stats] = await executeQuery(statsQuery);

      // Get document type breakdown
      const typeBreakdownQuery = `
        SELECT 
          dt.type_name,
          COUNT(dr.id) as count,
          SUM(COALESCE(dr.total_document_fee, 0)) as revenue
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        GROUP BY dt.id, dt.type_name
        ORDER BY count DESC
      `;

      const typeBreakdown = await executeQuery(typeBreakdownQuery);

      // Get status breakdown with names
      const statusBreakdownQuery = `
        SELECT 
          rs.status_name,
          rs.description,
          COUNT(dr.id) as count
        FROM request_status rs
        LEFT JOIN document_requests dr ON rs.id = dr.status_id
        GROUP BY rs.id, rs.status_name, rs.description
        ORDER BY rs.id
      `;

      const statusBreakdown = await executeQuery(statusBreakdownQuery);

      // Get recent activity count
      const recentActivityQuery = `
        SELECT COUNT(*) as recent_activity_count
        FROM request_status_history
        WHERE changed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `;

      const [recentActivity] = await executeQuery(recentActivityQuery);

      return {
        overview: {
          total_requests: stats.total_requests || 0,
          pending_requests: stats.pending_requests || 0,
          under_review_requests: stats.under_review_requests || 0,
          approved_requests: stats.approved_requests || 0,
          processing_requests: stats.processing_requests || 0,
          ready_for_pickup_requests: stats.ready_for_pickup_requests || 0,
          completed_requests: stats.completed_requests || 0,
          rejected_requests: stats.rejected_requests || 0,
          urgent_requests: stats.urgent_requests || 0
        },
        time_based: {
          today_requests: stats.today_requests || 0,
          week_requests: stats.week_requests || 0,
          month_requests: stats.month_requests || 0
        },
        revenue: {
          total_revenue: parseFloat(stats.total_revenue || 0),
          paid_revenue: parseFloat(stats.paid_revenue || 0),
          pending_revenue: parseFloat((stats.total_revenue || 0) - (stats.paid_revenue || 0))
        },
        document_types: typeBreakdown.map(type => ({
          type_name: type.type_name,
          count: type.count || 0,
          revenue: parseFloat(type.revenue || 0)
        })),
        status_breakdown: statusBreakdown.map(status => ({
          status_name: status.status_name,
          description: status.description,
          count: status.count || 0
        })),
        recent_activity_count: recentActivity.recent_activity_count || 0
      };
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      throw error;
    }
  }

  /**
   * Get recent activity for dashboard
   */
  static async getRecentActivity(limit = 10) {
    try {
      const query = `
        SELECT 
          rsh.id,
          rsh.request_id,
          dr.request_number,
          dt.type_name as document_type,
          old_rs.status_name as old_status,
          new_rs.status_name as new_status,
          rsh.change_reason,
          rsh.changed_at,
          COALESCE(
            CONCAT(aep.first_name, ' ', aep.last_name),
            'System'
          ) as changed_by_name,
          CONCAT(cp.first_name, ' ', cp.last_name) as client_name
        FROM request_status_history rsh
        JOIN document_requests dr ON rsh.request_id = dr.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        LEFT JOIN request_status old_rs ON rsh.old_status_id = old_rs.id
        JOIN request_status new_rs ON rsh.new_status_id = new_rs.id
        LEFT JOIN admin_employee_accounts aea ON rsh.changed_by = aea.id
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        LEFT JOIN client_accounts ca ON dr.client_id = ca.id
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ORDER BY rsh.changed_at DESC
        LIMIT ?
      `;

      const activities = await executeQuery(query, [limit]);

      return activities.map(activity => ({
        id: activity.id,
        request_id: activity.request_id,
        request_number: activity.request_number,
        document_type: activity.document_type,
        old_status: activity.old_status,
        new_status: activity.new_status,
        change_reason: activity.change_reason,
        changed_at: activity.changed_at,
        changed_by_name: activity.changed_by_name,
        client_name: activity.client_name,
        activity_description: this.generateActivityDescription(activity)
      }));
    } catch (error) {
      logger.error('Get recent activity error:', error);
      throw error;
    }
  }

  /**
   * Generate human-readable activity description
   */
  static generateActivityDescription(activity) {
    const { old_status, new_status, changed_by_name, client_name, document_type } = activity;
    
    if (!old_status) {
      return `${client_name}'s ${document_type} request was submitted`;
    }
    
    return `${changed_by_name} changed ${client_name}'s ${document_type} request from ${old_status} to ${new_status}`;
  }

  /**
   * Get all document requests with filtering and pagination
   */
  static async getAllRequests(filters = {}, options = {}) {
    try {
      const {
        status,
        document_type,
        priority,
        search,
        date_from,
        date_to
      } = filters;

      const {
        page = 1,
        limit = 20,
        sort_by = 'requested_at',
        sort_order = 'desc'
      } = options;

      let whereConditions = [];
      let queryParams = [];

      // Build WHERE conditions
      if (status) {
        // Check if status is a number (status_id) or string (status_name)
        const numericStatus = Number(status);
        if (!isNaN(numericStatus) && Number.isInteger(numericStatus)) {
          // Status is a numeric ID
          whereConditions.push('dr.status_id = ?');
          queryParams.push(numericStatus);
        } else {
          // Status is a name, filter by status name
          whereConditions.push('rs.status_name = ?');
          queryParams.push(status);
        }
      }

      if (document_type) {
        whereConditions.push('dt.type_name = ?');
        queryParams.push(document_type);
      }

      if (priority) {
        whereConditions.push('dr.priority = ?');
        queryParams.push(priority);
      }

      if (search) {
        whereConditions.push(`(
          dr.request_number LIKE ? OR
          CONCAT(cp.first_name, ' ', cp.last_name) LIKE ? OR
          CONCAT(db.first_name, ' ', db.last_name) LIKE ? OR
          dr.purpose_details LIKE ?
        )`);
        const searchTerm = `%${search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (date_from) {
        whereConditions.push('DATE(dr.requested_at) >= ?');
        queryParams.push(date_from);
      }

      if (date_to) {
        whereConditions.push('DATE(dr.requested_at) <= ?');
        queryParams.push(date_to);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Validate sort column
      const validSortColumns = [
        'created_at', 'request_number', 'client_name',
        'document_type', 'status_name', 'priority', 'total_fee'
      ];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
      const sortOrder = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

      // Main query
      const query = `
        SELECT DISTINCT
          dr.id,
          dr.request_number,
          dr.client_id,
          dr.is_third_party_request,
          CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
          cp.email as client_email,
          cp.phone_number as client_phone,
          cp.birth_date as client_birth_date,
          cp.gender as client_gender,
          cp.civil_status_id as client_civil_status_id,
          cs.status_name as client_civil_status,
          cp.nationality as client_nationality,
          cp.years_of_residency as client_years_of_residency,
          cp.months_of_residency as client_months_of_residency,
          dt.type_name as document_type,
          pc.category_name as purpose_category,
          dr.purpose_details,
          rs.status_name,
          rs.description as status_description,
          dr.priority,
          dr.total_document_fee,
          dr.total_document_fee as total_fee, -- For backward compatibility
          dr.payment_status,
          pm.method_name as payment_method,
          dr.delivery_method,
          dr.created_at as requested_at,
          dr.processed_at,
          dr.approved_at,
          COALESCE(
            CONCAT(processed_aep.first_name, ' ', processed_aep.last_name),
            NULL
          ) as processed_by_name,
          COALESCE(
            CONCAT(approved_aep.first_name, ' ', approved_aep.last_name),
            NULL
          ) as approved_by_name,
          -- Beneficiary information for third-party requests
          CASE
            WHEN dr.is_third_party_request = TRUE THEN
              CONCAT(db.first_name, ' ',
                     COALESCE(CONCAT(db.middle_name, ' '), ''),
                     db.last_name,
                     COALESCE(CONCAT(' ', db.suffix), ''))
            ELSE NULL
          END as beneficiary_name,
          db.id as beneficiary_id,
          db.relationship_to_requestor as beneficiary_relationship,
          db.verification_status as beneficiary_verification_status,
          db.verification_image_path as beneficiary_verification_image,
          -- Authorized pickup information
          CASE
            WHEN app.id IS NOT NULL THEN
              CONCAT(app.first_name, ' ',
                     COALESCE(CONCAT(app.middle_name, ' '), ''),
                     app.last_name,
                     COALESCE(CONCAT(' ', app.suffix), ''))
            ELSE NULL
          END as pickup_person_name,
          app.relationship_to_beneficiary as pickup_relationship,
          app.is_verified as pickup_verified,
          app.id_image_path as pickup_id_image,
          app.authorization_letter_path as pickup_authorization_letter
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
        JOIN request_status rs ON dr.status_id = rs.id
        LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
        LEFT JOIN client_accounts ca ON dr.client_id = ca.id
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        LEFT JOIN civil_status cs ON cp.civil_status_id = cs.id
        LEFT JOIN admin_employee_accounts processed_aea ON dr.processed_by = processed_aea.id
        LEFT JOIN admin_employee_profiles processed_aep ON processed_aea.id = processed_aep.account_id
        LEFT JOIN admin_employee_accounts approved_aea ON dr.approved_by = approved_aea.id
        LEFT JOIN admin_employee_profiles approved_aep ON approved_aea.id = approved_aep.account_id
        LEFT JOIN document_beneficiaries db ON dr.id = db.request_id
        LEFT JOIN authorized_pickup_persons app ON dr.id = app.request_id
        ${whereClause}
        ORDER BY ${sortColumn === 'client_name' ? 'CONCAT(cp.first_name, " ", cp.last_name)' :
                   sortColumn === 'document_type' ? 'dt.type_name' :
                   sortColumn === 'status_name' ? 'rs.status_name' :
                   sortColumn === 'total_fee' ? 'dr.total_document_fee' :
                   sortColumn === 'created_at' ? 'dr.created_at' :
                   `dr.${sortColumn}`} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      // Count query for pagination
      const countQuery = `
        SELECT COUNT(DISTINCT dr.id) as total
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
        JOIN request_status rs ON dr.status_id = rs.id
        LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
        LEFT JOIN client_accounts ca ON dr.client_id = ca.id
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        LEFT JOIN civil_status cs ON cp.civil_status_id = cs.id
        LEFT JOIN document_beneficiaries db ON dr.id = db.request_id
        LEFT JOIN authorized_pickup_persons app ON dr.id = app.request_id
        ${whereClause}
      `;

      const offset = (page - 1) * limit;

      const requests = await executeQuery(query, [...queryParams, limit, offset]);
      const [countResult] = await executeQuery(countQuery, queryParams);

      const total = countResult.total;
      const totalPages = Math.ceil(total / limit);

      return {
        requests: requests.map(request => ({
          ...request,
          total_document_fee: parseFloat(request.total_document_fee || 0),
          total_fee: parseFloat(request.total_document_fee || 0) // For backward compatibility
        })),
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total_records: total,
          per_page: limit,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      };
    } catch (error) {
      logger.error('Get all requests error:', error);
      throw error;
    }
  }

  /**
   * Get specific document request details
   */
  static async getRequestDetails(requestId) {
    try {
      const query = `
        SELECT
          dr.*,
          dt.type_name as document_type,
          dt.description as document_type_description,
          pc.category_name as purpose_category,
          rs.status_name,
          rs.description as status_description,
          pm.method_name as payment_method,
          pm.is_online as is_online_payment,
          CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
          cp.first_name as client_first_name,
          cp.middle_name as client_middle_name,
          cp.last_name as client_last_name,
          cp.suffix as client_suffix,
          cp.birth_date as client_birth_date,
          cp.gender as client_gender,
          cp.civil_status_id as client_civil_status_id,
          cp.nationality as client_nationality,
          cp.email as client_email,
          cp.phone_number as client_phone,
          cp.house_number as client_house_number,
          cp.street as client_street,
          cp.subdivision as client_subdivision,
          cp.barangay as client_barangay,
          cp.city_municipality as client_city_municipality,
          cp.province as client_province,
          cp.postal_code as client_postal_code,
          cp.years_of_residency as client_years_of_residency,
          cp.months_of_residency as client_months_of_residency,
          CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', cp.house_number, cp.street), ''),
            NULLIF(cp.subdivision, ''),
            cp.barangay,
            cp.city_municipality,
            cp.province
          ) as client_address,
          COALESCE(
            CONCAT(processed_aep.first_name, ' ', processed_aep.last_name),
            NULL
          ) as processed_by_name,
          COALESCE(
            CONCAT(approved_aep.first_name, ' ', approved_aep.last_name),
            NULL
          ) as approved_by_name,
          -- Beneficiary information
          db.id as beneficiary_id,
          CASE
            WHEN dr.is_third_party_request = TRUE THEN
              CONCAT(db.first_name, ' ',
                     COALESCE(CONCAT(db.middle_name, ' '), ''),
                     db.last_name,
                     COALESCE(CONCAT(' ', db.suffix), ''))
            ELSE NULL
          END as beneficiary_name,
          db.first_name as beneficiary_first_name,
          db.middle_name as beneficiary_middle_name,
          db.last_name as beneficiary_last_name,
          db.suffix as beneficiary_suffix,
          db.birth_date as beneficiary_birth_date,
          db.gender as beneficiary_gender,
          db.civil_status_id as beneficiary_civil_status_id,
          db.nationality as beneficiary_nationality,
          db.email as beneficiary_email,
          db.phone_number as beneficiary_phone_number,
          db.house_number as beneficiary_house_number,
          db.street as beneficiary_street,
          db.subdivision as beneficiary_subdivision,
          db.barangay as beneficiary_barangay,
          db.city_municipality as beneficiary_city_municipality,
          db.province as beneficiary_province,
          db.postal_code as beneficiary_postal_code,
          db.years_of_residency as beneficiary_years_of_residency,
          db.months_of_residency as beneficiary_months_of_residency,
          db.relationship_to_requestor as beneficiary_relationship_to_requestor,
          CONCAT_WS(', ',
            NULLIF(CONCAT_WS(' ', db.house_number, db.street), ''),
            NULLIF(db.subdivision, ''),
            db.barangay,
            db.city_municipality,
            db.province
          ) as beneficiary_address,
          db.verification_status as beneficiary_verification_status,
          db.verification_image_path as beneficiary_verification_image_path,
          db.verification_image_name as beneficiary_verification_image_name,
          db.verification_image_size as beneficiary_verification_image_size,
          db.verification_image_mime_type as beneficiary_verification_image_mime_type,
          db.verified_by as beneficiary_verified_by,
          db.verified_at as beneficiary_verified_at,
          db.verification_notes as beneficiary_verification_notes,
          -- Authorized pickup information
          app.id as authorized_pickup_id,
          CASE
            WHEN app.id IS NOT NULL THEN
              CONCAT(app.first_name, ' ',
                     COALESCE(CONCAT(app.middle_name, ' '), ''),
                     app.last_name,
                     COALESCE(CONCAT(' ', app.suffix), ''))
            ELSE NULL
          END as authorized_pickup_name,
          app.first_name as authorized_pickup_first_name,
          app.middle_name as authorized_pickup_middle_name,
          app.last_name as authorized_pickup_last_name,
          app.suffix as authorized_pickup_suffix,
          app.phone_number as authorized_pickup_phone,
          app.email as authorized_pickup_email,
          app.id_type as authorized_pickup_id_type,
          app.id_number as authorized_pickup_id_number,
          app.id_expiry_date as authorized_pickup_id_expiry,
          app.authorization_letter_path as authorized_pickup_authorization_letter,
          app.relationship_to_beneficiary as authorized_pickup_relationship,
          app.is_verified as authorized_pickup_verified,
          app.verified_by as authorized_pickup_verified_by,
          app.verified_at as authorized_pickup_verified_at,
          app.verification_notes as authorized_pickup_verification_notes,
          app.id_image_path as authorized_pickup_id_image
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
        JOIN request_status rs ON dr.status_id = rs.id
        LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
        LEFT JOIN client_accounts ca ON dr.client_id = ca.id
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        LEFT JOIN admin_employee_accounts processed_aea ON dr.processed_by = processed_aea.id
        LEFT JOIN admin_employee_profiles processed_aep ON processed_aea.id = processed_aep.account_id
        LEFT JOIN admin_employee_accounts approved_aea ON dr.approved_by = approved_aea.id
        LEFT JOIN admin_employee_profiles approved_aep ON approved_aea.id = approved_aep.account_id
        LEFT JOIN document_beneficiaries db ON dr.id = db.request_id
        LEFT JOIN authorized_pickup_persons app ON dr.id = app.request_id
        WHERE dr.id = ?
      `;

      const [request] = await executeQuery(query, [requestId]);

      if (!request) {
        return null;
      }

      // Get document-specific details
      let specificDetails = null;
      if (request.document_type === 'Barangay Clearance') {
        const bcQuery = `
          SELECT * FROM barangay_clearance_applications
          WHERE request_id = ?
        `;
        const [bcDetails] = await executeQuery(bcQuery, [requestId]);
        specificDetails = bcDetails;
      } else if (request.document_type === 'Cedula') {
        const cedulaQuery = `
          SELECT * FROM cedula_applications
          WHERE request_id = ?
        `;
        const [cedulaDetails] = await executeQuery(cedulaQuery, [requestId]);
        specificDetails = cedulaDetails;
      }

      // Get status history
      const history = await this.getRequestHistory(requestId);

      // Get uploaded documents
      const documentsQuery = `
        SELECT
          id,
          document_name,
          document_type,
          file_size,
          mime_type,
          uploaded_by,
          is_verified,
          verified_by,
          verified_at,
          created_at
        FROM supporting_documents
        WHERE request_id = ?
        ORDER BY created_at ASC
      `;
      const uploadedDocuments = await executeQuery(documentsQuery, [requestId]);

      // Prepare beneficiary object if it's a third-party request
      let beneficiary = null;
      if (request.is_third_party_request && request.beneficiary_id) {
        beneficiary = {
          id: request.beneficiary_id,
          full_name: request.beneficiary_name,
          first_name: request.beneficiary_first_name,
          middle_name: request.beneficiary_middle_name,
          last_name: request.beneficiary_last_name,
          suffix: request.beneficiary_suffix,
          birth_date: request.beneficiary_birth_date,
          gender: request.beneficiary_gender,
          civil_status_id: request.beneficiary_civil_status_id,
          nationality: request.beneficiary_nationality,
          email: request.beneficiary_email,
          phone_number: request.beneficiary_phone_number,
          house_number: request.beneficiary_house_number,
          street: request.beneficiary_street,
          subdivision: request.beneficiary_subdivision,
          barangay: request.beneficiary_barangay,
          city_municipality: request.beneficiary_city_municipality,
          province: request.beneficiary_province,
          postal_code: request.beneficiary_postal_code,
          years_of_residency: request.beneficiary_years_of_residency,
          months_of_residency: request.beneficiary_months_of_residency,
          relationship_to_requestor: request.beneficiary_relationship_to_requestor,
          address: request.beneficiary_address,
          verification_status: request.beneficiary_verification_status,
          verification_image_path: request.beneficiary_verification_image_path,
          verification_image_name: request.beneficiary_verification_image_name,
          verification_image_size: request.beneficiary_verification_image_size,
          verification_image_mime_type: request.beneficiary_verification_image_mime_type,
          verified_by: request.beneficiary_verified_by,
          verified_at: request.beneficiary_verified_at,
          verification_notes: request.beneficiary_verification_notes
        };
      }

      // Prepare authorized pickup object if exists
      let authorized_pickup = null;
      if (request.authorized_pickup_id) {
        authorized_pickup = {
          id: request.authorized_pickup_id,
          full_name: request.authorized_pickup_name,
          first_name: request.authorized_pickup_first_name,
          middle_name: request.authorized_pickup_middle_name,
          last_name: request.authorized_pickup_last_name,
          suffix: request.authorized_pickup_suffix,
          phone_number: request.authorized_pickup_phone,
          email: request.authorized_pickup_email,
          id_type: request.authorized_pickup_id_type,
          id_number: request.authorized_pickup_id_number,
          id_expiry_date: request.authorized_pickup_id_expiry,
          authorization_letter_path: request.authorized_pickup_authorization_letter,
          relationship_to_beneficiary: request.authorized_pickup_relationship,
          is_verified: request.authorized_pickup_verified,
          verified_by: request.authorized_pickup_verified_by,
          verified_at: request.authorized_pickup_verified_at,
          verification_notes: request.authorized_pickup_verification_notes,
          id_image_path: request.authorized_pickup_id_image
        };
      }

      return {
        ...request,
        total_document_fee: parseFloat(request.total_document_fee || 0),
        total_fee: parseFloat(request.total_document_fee || 0), // For backward compatibility
        specific_details: specificDetails,
        status_history: history,
        uploaded_documents: uploadedDocuments,
        beneficiary: beneficiary,
        authorized_pickup: authorized_pickup
      };
    } catch (error) {
      logger.error('Get request details error:', error);
      throw error;
    }
  }

  /**
   * Get request status history
   */
  static async getRequestHistory(requestId) {
    try {
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
        ORDER BY rsh.changed_at ASC
      `;

      return await executeQuery(query, [requestId]);
    } catch (error) {
      logger.error('Get request history error:', error);
      throw error;
    }
  }

  /**
   * Update request status
   */
  static async updateRequestStatus(requestId, statusId, adminId, reason = null) {
    try {
      return await executeTransactionCallback(async (connection) => {
        // Get current request
        const getCurrentQuery = 'SELECT * FROM document_requests WHERE id = ?';
        const [results] = await connection.execute(getCurrentQuery, [requestId]);
        const currentRequest = results[0];

        if (!currentRequest) {
          throw new Error('Request not found');
        }

        const oldStatusId = currentRequest.status_id;

        // Validate status transition
        await this.validateStatusTransition(oldStatusId, statusId, null, requestId);

        // Update request status
        const updateQuery = `
          UPDATE document_requests
          SET status_id = ?,
              ${statusId === 4 ? 'approved_by = ?, approved_at = NOW(),' : ''}
              ${statusId === 5 ? 'processed_by = ?, processed_at = NOW(),' : ''}
              updated_at = NOW()
          WHERE id = ?
        `;

        const updateParams = [statusId];
        if (statusId === 4 || statusId === 5) {
          updateParams.push(adminId);
        }
        updateParams.push(requestId);

        await connection.execute(updateQuery, updateParams);

        // Add to status history
        const historyQuery = `
          INSERT INTO request_status_history
          (request_id, old_status_id, new_status_id, changed_by, change_reason)
          VALUES (?, ?, ?, ?, ?)
        `;

        await connection.execute(historyQuery, [
          requestId, oldStatusId, statusId, adminId, reason
        ]);

        logger.info('Request status updated', {
          requestId,
          oldStatusId,
          newStatusId: statusId,
          adminId,
          reason
        });

        // Send real-time notification for status change
        try {
          await notificationService.notifyStatusChange(requestId, oldStatusId, statusId, adminId);
        } catch (notificationError) {
          logger.error('Failed to send status change notification:', notificationError);
          // Don't fail the transaction if notification fails
        }

        return {
          success: true,
          old_status_id: oldStatusId,
          new_status_id: statusId
        };
      });
    } catch (error) {
      logger.error('Update request status error:', error);
      throw error;
    }
  }

  /**
   * Validate status transition with payment-aware logic
   */
  static async validateStatusTransition(oldStatusId, newStatusId, paymentStatus = null, requestId = null) {
    console.log(`🔍 Validating transition: ${oldStatusId} → ${newStatusId} (payment: ${paymentStatus})`);

    // Enhanced cash payment detection with more robust logic
    let isCashPayment = false;
    if (requestId) {
      try {
        const query = `
          SELECT dr.payment_method_id, pm.method_name, pm.method_code, pm.is_online
          FROM document_requests dr
          LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
          WHERE dr.id = ?
        `;
        const results = await executeQuery(query, [requestId]);
        if (results.length > 0) {
          const request = results[0];

          // Multiple ways to detect cash payment
          isCashPayment =
            // Direct payment method ID check (assuming 1 is cash)
            request.payment_method_id === 1 ||
            // Method code checks
            (request.method_code && (
              request.method_code.toUpperCase() === 'CASH' ||
              request.method_code.toUpperCase() === 'CASH_PAYMENT'
            )) ||
            // Method name checks
            (request.method_name && (
              request.method_name.toLowerCase().includes('cash') ||
              request.method_name.toLowerCase() === 'cash payment'
            )) ||
            // Online payment flags (false means cash)
            request.is_online === false ||
            request.is_online === 0;

          console.log('🔍 Enhanced cash payment detection:', {
            requestId,
            payment_method_id: request.payment_method_id,
            method_code: request.method_code,
            method_name: request.method_name,
            is_online: request.is_online,
            isCashPayment
          });
        }
      } catch (error) {
        console.warn('Could not check payment method, assuming online payment:', error.message);
        isCashPayment = false;
      }
    }

    // Define valid transitions with enhanced payment workflow
    // This must match the frontend getAllowedStatusTransitions logic exactly
    // Using actual status IDs from database: 1=pending, 2=under_review, 4=approved, 5=processing, 6=ready_for_pickup, 7=completed, 8=cancelled, 9=rejected, 11=payment_confirmed
    const validTransitions = {
      1: [2, 4, 8, 9],     // pending -> under_review, approved, cancelled, rejected
      2: [4, 9, 8],        // under_review -> approved, rejected, cancelled
      4: isCashPayment
        ? [11, 5, 8]       // approved -> payment_confirmed, processing, cancelled (cash payments can skip online payment flow)
        : [11, 8],         // approved -> payment_confirmed, cancelled (online payments go through PayMongo webhook)
      11: [5],             // payment_confirmed -> processing (automatic after payment)
      5: [6],              // processing -> ready_for_pickup
      6: [7, 8],           // ready_for_pickup -> completed, cancelled (simplified - no pickup scheduling for now)
      9: [1, 2],           // rejected -> pending, under_review (allow resubmission)
      // Final states - no transitions allowed
      7: [],               // completed (final state)
      8: []                // cancelled (final state)
    };

    // Special validation for payment-dependent transitions
    if (oldStatusId === 4 && newStatusId === 11) {
      // approved -> payment_confirmed (allowed for both cash and online payments)
      console.log('✅ Payment transition: approved -> payment_confirmed');
    } else if (oldStatusId === 4 && newStatusId === 5) {
      // approved -> processing (allowed for cash payments, direct processing)
      console.log('✅ Cash payment transition: approved -> processing');
    } else if (oldStatusId === 11 && newStatusId === 5) {
      // payment_confirmed -> processing (automatic transition after payment)
      console.log('✅ Automatic transition: payment_confirmed -> processing');
    }

    // Cancellation validation
    const cancellableStatuses = [1, 2, 4, 11]; // Before document processing starts
    if (newStatusId === 8 && !cancellableStatuses.includes(oldStatusId)) {
      throw new Error('Request cannot be cancelled after document processing has started');
    }

    console.log(`🔍 Valid transitions for ${oldStatusId}:`, validTransitions[oldStatusId]);
    console.log(`🔍 Checking if ${newStatusId} is in allowed transitions...`);

    if (!validTransitions[oldStatusId] || !validTransitions[oldStatusId].includes(newStatusId)) {
      console.log(`❌ Invalid transition: ${oldStatusId} → ${newStatusId}`);
      throw new Error(`Invalid status transition from ${oldStatusId} to ${newStatusId}`);
    }

    console.log(`✅ Valid transition: ${oldStatusId} → ${newStatusId}`);
  }

  /**
   * Approve document request
   */
  static async approveRequest(requestId, adminId, reason = null) {
    return await this.updateRequestStatus(requestId, 4, adminId, reason || 'Request approved');
  }

  /**
   * Reject document request
   */
  static async rejectRequest(requestId, adminId, reason) {
    return await this.updateRequestStatus(requestId, 9, adminId, reason);
  }

  /**
   * Mark request as processing
   */
  static async processRequest(requestId, adminId, reason = null) {
    return await this.updateRequestStatus(requestId, 5, adminId, reason || 'Document processing started');
  }

  /**
   * Mark request as completed
   */
  static async completeRequest(requestId, adminId, reason = null) {
    return await this.updateRequestStatus(requestId, 7, adminId, reason || 'Request completed successfully');
  }

  /**
   * Mark request as ready for pickup
   */
  static async markReadyForPickup(requestId, adminId, reason = null) {
    return await this.updateRequestStatus(requestId, 6, adminId, reason || 'Document ready for pickup');
  }

  // Removed requireAdditionalInfo method - additional_info_required status is no longer used

  /**
   * Verify in-person payment
   */
  static async verifyInPersonPayment(requestId, adminId, paymentData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { amount_received, payment_method_id, receipt_number, notes, proof_image_path } = paymentData;

      // Get request details
      const [request] = await connection.execute(
        'SELECT * FROM document_requests WHERE id = ?',
        [requestId]
      );

      if (!request.length) {
        throw new Error('Request not found');
      }

      const requestData = request[0];

      // Validate payment amount
      const totalFee = parseFloat(requestData.total_document_fee || 0);
      if (parseFloat(amount_received) < totalFee) {
        throw new Error(`Insufficient payment. Required: ₱${totalFee.toFixed(2)}, Received: ₱${parseFloat(amount_received).toFixed(2)}`);
      }

      // Insert payment verification record
      await connection.execute(`
        INSERT INTO payment_verifications
        (request_id, payment_method_id, amount_received, receipt_number, verification_notes, proof_image_path, verified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [requestId, payment_method_id, amount_received, receipt_number, notes, proof_image_path, adminId]);

      // Update request payment status
      await connection.execute(`
        UPDATE document_requests
        SET payment_status = 'paid', paid_at = NOW(), updated_at = NOW()
        WHERE id = ?
      `, [requestId]);

      // Update status to payment_confirmed
      await this.updateRequestStatus(requestId, 11, adminId, 'In-person payment verified', connection);

      await connection.commit();
      return { success: true, message: 'Payment verified successfully' };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Schedule pickup appointment
   */
  static async schedulePickup(requestId, adminId, scheduleData) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const { scheduled_date, scheduled_time_start, scheduled_time_end, pickup_notes } = scheduleData;

      // Validate request is ready for pickup
      const [request] = await connection.execute(
        'SELECT status_id FROM document_requests WHERE id = ?',
        [requestId]
      );

      if (!request.length || request[0].status_id !== 6) {
        throw new Error('Request must be in ready_for_pickup status to schedule pickup');
      }

      // Insert pickup schedule
      await connection.execute(`
        INSERT INTO pickup_schedules
        (request_id, scheduled_date, scheduled_time_start, scheduled_time_end, pickup_notes, scheduled_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [requestId, scheduled_date, scheduled_time_start, scheduled_time_end, pickup_notes, adminId]);

      // Update status to pickup_scheduled
      await this.updateRequestStatus(requestId, 13, adminId, 'Pickup appointment scheduled', connection);

      await connection.commit();
      return { success: true, message: 'Pickup scheduled successfully' };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Verify in-person payment
   */
  static async verifyInPersonPayment(requestId, adminId, paymentDetails) {
    try {
      const { amount_received, payment_method_id, receipt_number, notes } = paymentDetails;

      return await executeTransaction(async (connection) => {
        // Get request details
        const requestQuery = `
          SELECT dr.*, pm.method_name, pm.is_online
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN payment_methods pm ON dr.payment_method_id = pm.id
          WHERE dr.id = ?
        `;

        const [requestResults] = await connection.execute(requestQuery, [requestId]);

        if (requestResults.length === 0) {
          throw new Error('Document request not found');
        }

        const request = requestResults[0];

        // Validate payment method is offline
        if (request.is_online) {
          throw new Error('Cannot verify in-person payment for online payment method');
        }

        // Validate request is in approved status
        if (request.status_id !== 4) {
          throw new Error('Request must be approved before payment verification');
        }

        // Generate transaction ID for in-person payment
        const transactionId = `CASH_${Date.now()}_${requestId}`;

        // Create payment transaction record
        const insertTransactionQuery = `
          INSERT INTO payment_transactions (
            request_id, payment_method_id, transaction_id,
            amount, processing_fee, net_amount, currency, status,
            payment_description, verified_by, verified_at,
            receipt_number, verification_notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, NOW())
        `;

        await connection.execute(insertTransactionQuery, [
          requestId,
          payment_method_id,
          transactionId,
          amount_received,
          0.00, // No processing fee for cash
          amount_received,
          'PHP',
          'succeeded',
          `In-person payment verification for ${request.method_name}`,
          adminId,
          receipt_number || null,
          notes || null
        ]);

        // Update document request payment status
        const updateRequestQuery = `
          UPDATE document_requests
          SET payment_status = 'paid', paid_at = NOW(), payment_reference = ?, updated_at = NOW()
          WHERE id = ?
        `;

        await connection.execute(updateRequestQuery, [transactionId, requestId]);

        // Add status history entry
        const historyQuery = `
          INSERT INTO request_status_history
          (request_id, old_status_id, new_status_id, changed_by, change_reason)
          VALUES (?, ?, ?, ?, ?)
        `;

        await connection.execute(historyQuery, [
          requestId, 4, 4, adminId, `In-person payment verified: ₱${amount_received}`
        ]);

        logger.info('In-person payment verified', {
          requestId,
          transactionId,
          amount: amount_received,
          verifiedBy: adminId,
          receiptNumber: receipt_number
        });

        return {
          success: true,
          transaction_id: transactionId,
          amount_verified: amount_received,
          payment_status: 'paid'
        };
      });
    } catch (error) {
      logger.error('Verify in-person payment error:', error);
      throw error;
    }
  }

  /**
   * Get all available status options
   */
  static async getStatusOptions() {
    try {
      const query = `
        SELECT id, status_name, description
        FROM request_status
        WHERE status_name != 'additional_info_required'
        ORDER BY id
      `;

      return await executeQuery(query);
    } catch (error) {
      logger.error('Get status options error:', error);
      throw error;
    }
  }

  /**
   * Get all available document types
   */
  static async getDocumentTypes() {
    try {
      const query = `
        SELECT id, type_name, description, is_active
        FROM document_types
        WHERE is_active = 1
        ORDER BY type_name
      `;

      return await executeQuery(query);
    } catch (error) {
      logger.error('Get document types error:', error);
      throw error;
    }
  }

  /**
   * Bulk update multiple requests
   */
  static async bulkUpdateRequests(requestIds, statusId, adminId, reason = null) {
    try {
      return await executeTransactionCallback(async (connection) => {
        const results = [];
        const errors = [];

        for (const requestId of requestIds) {
          try {
            // Get current request
            const getCurrentQuery = 'SELECT * FROM document_requests WHERE id = ?';
            const [results] = await connection.execute(getCurrentQuery, [requestId]);
            const currentRequest = results[0];

            if (!currentRequest) {
              errors.push({ requestId, error: 'Request not found' });
              continue;
            }

            const oldStatusId = currentRequest.status_id;

            // Validate status transition
            try {
              await this.validateStatusTransition(oldStatusId, statusId, null, requestId);
            } catch (validationError) {
              errors.push({ requestId, error: validationError.message });
              continue;
            }

            // Update request status
            const updateQuery = `
              UPDATE document_requests
              SET status_id = ?,
                  ${statusId === 4 ? 'approved_by = ?, approved_at = NOW(),' : ''}
                  ${statusId === 5 ? 'processed_by = ?, processed_at = NOW(),' : ''}
                  updated_at = NOW()
              WHERE id = ?
            `;

            const updateParams = [statusId];
            if (statusId === 4 || statusId === 5) {
              updateParams.push(adminId);
            }
            updateParams.push(requestId);

            await connection.execute(updateQuery, updateParams);

            // Add to status history
            const historyQuery = `
              INSERT INTO request_status_history
              (request_id, old_status_id, new_status_id, changed_by, change_reason)
              VALUES (?, ?, ?, ?, ?)
            `;

            await connection.execute(historyQuery, [
              requestId, oldStatusId, statusId, adminId, reason
            ]);

            results.push({
              requestId,
              success: true,
              old_status_id: oldStatusId,
              new_status_id: statusId
            });

          } catch (error) {
            errors.push({ requestId, error: error.message });
          }
        }

        logger.info('Bulk update completed', {
          totalRequests: requestIds.length,
          successful: results.length,
          failed: errors.length,
          adminId
        });

        return {
          successful: results,
          failed: errors,
          summary: {
            total: requestIds.length,
            successful: results.length,
            failed: errors.length
          }
        };
      });
    } catch (error) {
      logger.error('Bulk update requests error:', error);
      throw error;
    }
  }

  /**
   * Export requests data as CSV
   */
  static async exportRequests(filters = {}) {
    try {
      const {
        status,
        document_type,
        date_from,
        date_to
      } = filters;

      let whereConditions = [];
      let queryParams = [];

      // Build WHERE conditions
      if (status) {
        // Check if status is a number (status_id) or string (status_name)
        const numericStatus = Number(status);
        if (!isNaN(numericStatus) && Number.isInteger(numericStatus)) {
          // Status is a numeric ID
          whereConditions.push('dr.status_id = ?');
          queryParams.push(numericStatus);
        } else {
          // Status is a name, filter by status name
          whereConditions.push('rs.status_name = ?');
          queryParams.push(status);
        }
      }

      if (document_type) {
        whereConditions.push('dr.document_type_id = ?');
        queryParams.push(document_type);
      }

      if (date_from) {
        whereConditions.push('DATE(dr.requested_at) >= ?');
        queryParams.push(date_from);
      }

      if (date_to) {
        whereConditions.push('DATE(dr.requested_at) <= ?');
        queryParams.push(date_to);
      }

      const whereClause = whereConditions.length > 0 ?
        `WHERE ${whereConditions.join(' AND ')}` : '';

      const query = `
        SELECT
          dr.request_number,
          CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
          cp.email as client_email,
          cp.phone_number as client_phone,
          dt.type_name as document_type,
          pc.category_name as purpose_category,
          dr.purpose_details,
          rs.status_name,
          dr.priority,
          dr.total_document_fee,
          dr.total_document_fee as total_fee, -- For backward compatibility
          dr.payment_status,
          pm.method_name as payment_method,
          dr.delivery_method,
          dr.created_at as requested_at,
          dr.processed_at,
          dr.approved_at
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
        JOIN request_status rs ON dr.status_id = rs.id
        LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
        LEFT JOIN client_accounts ca ON dr.client_id = ca.id
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ${whereClause}
        ORDER BY dr.requested_at DESC
      `;

      const requests = await executeQuery(query, queryParams);

      // Convert to CSV
      if (requests.length === 0) {
        return 'No data available for export';
      }

      const headers = Object.keys(requests[0]);
      const csvHeaders = headers.join(',');

      const csvRows = requests.map(request => {
        return headers.map(header => {
          const value = request[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',');
      });

      return [csvHeaders, ...csvRows].join('\n');
    } catch (error) {
      logger.error('Export requests error:', error);
      throw error;
    }
  }

  /**
   * Get analytics data for reporting
   */
  static async getAnalyticsData(period = 'month') {
    try {
      let dateCondition = '';
      let groupBy = '';

      switch (period) {
        case 'day':
          dateCondition = 'DATE(dr.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
          groupBy = 'DATE(dr.created_at)';
          break;
        case 'week':
          dateCondition = 'YEARWEEK(dr.created_at) >= YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 12 WEEK))';
          groupBy = 'YEARWEEK(dr.created_at)';
          break;
        case 'month':
        default:
          dateCondition = 'DATE(dr.created_at) >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)';
          groupBy = 'DATE_FORMAT(dr.created_at, "%Y-%m")';
          break;
      }

      // Request trends over time
      const trendsQuery = `
        SELECT
          ${groupBy} as period,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN dr.status_id = 7 THEN 1 END) as completed_requests,
          COUNT(CASE WHEN dr.status_id = 9 THEN 1 END) as rejected_requests,
          SUM(COALESCE(dr.total_document_fee, 0)) as total_revenue
        FROM document_requests dr
        WHERE ${dateCondition}
        GROUP BY ${groupBy}
        ORDER BY period ASC
      `;

      // Document type distribution
      const documentTypesQuery = `
        SELECT
          dt.type_name,
          COUNT(*) as request_count,
          SUM(COALESCE(dr.total_document_fee, 0)) as revenue
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE DATE(dr.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY dt.type_name
        ORDER BY request_count DESC
      `;

      // Status distribution
      const statusDistributionQuery = `
        SELECT
          rs.status_name,
          COUNT(*) as count,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM document_requests WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))), 2) as percentage
        FROM document_requests dr
        JOIN request_status rs ON dr.status_id = rs.id
        WHERE DATE(dr.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY rs.status_name
        ORDER BY count DESC
      `;

      // Top clients by request count
      const topClientsQuery = `
        SELECT
          CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
          cp.email,
          COUNT(*) as request_count,
          SUM(COALESCE(dr.total_document_fee, 0)) as total_spent
        FROM document_requests dr
        JOIN client_accounts ca ON dr.client_id = ca.id
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE DATE(dr.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY dr.client_id
        ORDER BY request_count DESC
        LIMIT 10
      `;

      const [trends, documentTypes, statusDistribution, topClients] = await Promise.all([
        executeQuery(trendsQuery),
        executeQuery(documentTypesQuery),
        executeQuery(statusDistributionQuery),
        executeQuery(topClientsQuery)
      ]);

      return {
        trends,
        documentTypes,
        statusDistribution,
        topClients
      };
    } catch (error) {
      logger.error('Get analytics data error:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive report
   */
  static async generateReport(reportType, filters = {}) {
    try {
      const { date_from, date_to, format = 'csv' } = filters;

      let reportData = {};
      let filename = '';

      switch (reportType) {
        case 'daily':
          reportData = await this.getDailyReport(date_from || new Date().toISOString().split('T')[0]);
          filename = `daily_report_${date_from || new Date().toISOString().split('T')[0]}`;
          break;
        case 'weekly':
          reportData = await this.getWeeklyReport(date_from, date_to);
          filename = `weekly_report_${date_from}_to_${date_to}`;
          break;
        case 'monthly':
          reportData = await this.getMonthlyReport(date_from || new Date().toISOString().slice(0, 7));
          filename = `monthly_report_${date_from || new Date().toISOString().slice(0, 7)}`;
          break;
        case 'custom':
          reportData = await this.getCustomReport(filters);
          filename = `custom_report_${date_from}_to_${date_to}`;
          break;
        default:
          throw new Error('Invalid report type');
      }

      if (format === 'csv') {
        return this.convertToCSV(reportData, filename);
      } else {
        return { data: reportData, filename };
      }
    } catch (error) {
      logger.error('Generate report error:', error);
      throw error;
    }
  }

  /**
   * Get daily report data
   */
  static async getDailyReport(date) {
    try {
      const query = `
        SELECT
          dr.request_number,
          CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
          dt.type_name as document_type,
          rs.status_name,
          COALESCE(dr.total_document_fee, 0) as total_fee,
          dr.payment_status,
          TIME(dr.created_at) as request_time,
          CASE
            WHEN dr.approved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, dr.created_at, dr.approved_at)
            ELSE NULL
          END as processing_hours
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN request_status rs ON dr.status_id = rs.id
        JOIN client_accounts ca ON dr.client_id = ca.id
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE DATE(dr.created_at) = ?
        ORDER BY dr.requested_at DESC
      `;

      const requests = await executeQuery(query, [date]);

      // Summary statistics
      const summaryQuery = `
        SELECT
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_id = 7 THEN 1 END) as completed_requests,
          COUNT(CASE WHEN status_id = 9 THEN 1 END) as rejected_requests,
          SUM(COALESCE(total_document_fee, 0)) as total_revenue,
          AVG(CASE WHEN approved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, approved_at) END) as avg_processing_hours
        FROM document_requests
        WHERE DATE(created_at) = ?
      `;

      const [summary] = await executeQuery(summaryQuery, [date]);

      return {
        date,
        summary,
        requests
      };
    } catch (error) {
      logger.error('Get daily report error:', error);
      throw error;
    }
  }

  /**
   * Get monthly report data
   */
  static async getMonthlyReport(yearMonth) {
    try {
      const query = `
        SELECT
          DATE(dr.created_at) as request_date,
          COUNT(*) as daily_requests,
          COUNT(CASE WHEN dr.status_id = 7 THEN 1 END) as daily_completed,
          SUM(COALESCE(dr.total_document_fee, 0)) as daily_revenue
        FROM document_requests dr
        WHERE DATE_FORMAT(dr.created_at, '%Y-%m') = ?
        GROUP BY DATE(dr.created_at)
        ORDER BY request_date ASC
      `;

      const dailyData = await executeQuery(query, [yearMonth]);

      // Monthly summary
      const summaryQuery = `
        SELECT
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status_id = 7 THEN 1 END) as completed_requests,
          COUNT(CASE WHEN status_id = 9 THEN 1 END) as rejected_requests,
          SUM(COALESCE(total_document_fee, 0)) as total_revenue,
          AVG(CASE WHEN approved_at IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, approved_at) END) as avg_processing_hours
        FROM document_requests
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?
      `;

      const [summary] = await executeQuery(summaryQuery, [yearMonth]);

      return {
        period: yearMonth,
        summary,
        dailyData
      };
    } catch (error) {
      logger.error('Get monthly report error:', error);
      throw error;
    }
  }

  /**
   * Convert report data to CSV format
   */
  static convertToCSV(reportData, filename) {
    try {
      let csvContent = '';

      if (reportData.summary) {
        csvContent += 'SUMMARY REPORT\n';
        csvContent += `Report Period: ${reportData.date || reportData.period}\n`;
        csvContent += `Total Requests: ${reportData.summary.total_requests}\n`;
        csvContent += `Completed Requests: ${reportData.summary.completed_requests}\n`;
        csvContent += `Rejected Requests: ${reportData.summary.rejected_requests}\n`;
        csvContent += `Total Revenue: ₱${parseFloat(reportData.summary.total_revenue || 0).toFixed(2)}\n`;
        csvContent += `Average Processing Hours: ${parseFloat(reportData.summary.avg_processing_hours || 0).toFixed(2)}\n\n`;
      }

      if (reportData.requests && reportData.requests.length > 0) {
        csvContent += 'DETAILED REQUESTS\n';
        const headers = Object.keys(reportData.requests[0]);
        csvContent += headers.join(',') + '\n';

        reportData.requests.forEach(request => {
          const row = headers.map(header => {
            const value = request[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value || '';
          });
          csvContent += row.join(',') + '\n';
        });
      }

      if (reportData.dailyData && reportData.dailyData.length > 0) {
        csvContent += '\nDAILY BREAKDOWN\n';
        const headers = Object.keys(reportData.dailyData[0]);
        csvContent += headers.join(',') + '\n';

        reportData.dailyData.forEach(day => {
          const row = headers.map(header => day[header] || '');
          csvContent += row.join(',') + '\n';
        });
      }

      return csvContent;
    } catch (error) {
      logger.error('Convert to CSV error:', error);
      throw error;
    }
  }
}

module.exports = AdminDocumentService;
