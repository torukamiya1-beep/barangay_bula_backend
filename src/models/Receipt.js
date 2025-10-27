const { executeQuery } = require('../config/database');

/**
 * Receipt Model
 * Handles receipt data for completed payments
 */
class Receipt {
  constructor(data) {
    Object.assign(this, data);
  }

  /**
   * Create receipts table
   */
  static async createTable() {
    // Table creation is handled by migration file
    // This method is kept for consistency with other models
    return true;
  }

  /**
   * Find receipt by ID
   * @param {number} id - Receipt ID
   * @returns {Receipt|null} Receipt instance or null
   */
  static async findById(id) {
    const query = 'SELECT * FROM receipts WHERE id = ?';
    const results = await executeQuery(query, [id]);
    return results.length > 0 ? new Receipt(results[0]) : null;
  }

  /**
   * Find receipt by receipt number
   * @param {string} receiptNumber - Receipt number
   * @returns {Receipt|null} Receipt instance or null
   */
  static async findByReceiptNumber(receiptNumber) {
    const query = 'SELECT * FROM receipts WHERE receipt_number = ?';
    const results = await executeQuery(query, [receiptNumber]);
    return results.length > 0 ? new Receipt(results[0]) : null;
  }

  /**
   * Find receipt by request ID
   * @param {number} requestId - Document request ID
   * @returns {Receipt|null} Receipt instance or null
   */
  static async findByRequestId(requestId) {
    const query = 'SELECT * FROM receipts WHERE request_id = ? ORDER BY created_at DESC LIMIT 1';
    const results = await executeQuery(query, [requestId]);
    return results.length > 0 ? new Receipt(results[0]) : null;
  }

  /**
   * Get receipts for a client with pagination
   * @param {number} clientId - Client ID
   * @param {Object} options - Query options
   * @returns {Object} Paginated receipts
   */
  static async getClientReceipts(clientId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status = null,
      startDate = null,
      endDate = null,
      sortBy = 'receipt_date',
      sortOrder = 'DESC'
    } = options;

    const offset = (page - 1) * limit;
    
    // SOLUTION: Query both receipts table AND generate from document_requests
    // This matches what the admin endpoint does
    const combinedQuery = `
      SELECT 
        r.id,
        r.receipt_number,
        r.transaction_id,
        r.client_id,
        r.request_id,
        r.client_name,
        r.client_email,
        r.client_phone,
        r.request_number,
        r.document_type,
        r.payment_method,
        r.payment_method_code,
        r.amount,
        r.processing_fee,
        r.net_amount,
        r.currency,
        r.external_transaction_id,
        r.paymongo_payment_intent_id,
        r.payment_status,
        r.receipt_date,
        r.payment_date,
        r.description,
        r.notes,
        r.created_at,
        r.updated_at,
        'receipts' as source
      FROM receipts r
      WHERE r.client_id = ?
      
      UNION ALL
      
      SELECT 
        NULL as id,
        CONCAT('GCASH-', dr.request_number) as receipt_number,
        NULL as transaction_id,
        dr.client_id,
        dr.id as request_id,
        CONCAT(COALESCE(cp.first_name, ''), ' ', COALESCE(cp.last_name, '')) as client_name,
        COALESCE(cp.email, '') as client_email,
        COALESCE(cp.phone_number, '') as client_phone,
        dr.request_number,
        dt.type_name as document_type,
        COALESCE(pm.method_name, 'GCash Manual') as payment_method,
        COALESCE(pm.method_code, 'gcash_manual') as payment_method_code,
        dr.total_document_fee as amount,
        0 as processing_fee,
        dr.total_document_fee as net_amount,
        'PHP' as currency,
        dr.gcash_reference_number as external_transaction_id,
        NULL as paymongo_payment_intent_id,
        dr.payment_status,
        COALESCE(dr.gcash_verified_at, dr.paid_at, dr.requested_at) as receipt_date,
        COALESCE(dr.gcash_verified_at, dr.paid_at, dr.requested_at) as payment_date,
        CONCAT('GCash manual payment for ', dt.type_name) as description,
        'Payment verified by admin' as notes,
        dr.requested_at as created_at,
        dr.updated_at,
        'generated' as source
      FROM document_requests dr
      LEFT JOIN client_profiles cp ON dr.client_id = cp.account_id
      LEFT JOIN document_types dt ON dr.document_type_id = dt.id
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      WHERE dr.client_id = ?
        AND dr.payment_status = 'paid'
        AND NOT EXISTS (SELECT 1 FROM receipts r WHERE r.request_id = dr.id)
      
      ORDER BY receipt_date DESC
      LIMIT ? OFFSET ?
    `;

    const receipts = await executeQuery(combinedQuery, [clientId, clientId, limit, offset]);

    // Get total count (both sources)
    const countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM receipts WHERE client_id = ?) +
        (SELECT COUNT(*) FROM document_requests dr 
         WHERE dr.client_id = ? 
           AND dr.payment_status = 'paid'
           AND NOT EXISTS (SELECT 1 FROM receipts r WHERE r.request_id = dr.id))
        as total
    `;
    const countResult = await executeQuery(countQuery, [clientId, clientId]);
    const total = countResult[0].total;

    return {
      receipts: receipts.map(receipt => new Receipt(receipt)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get complete receipt information with related data
   * @param {number} receiptId - Receipt ID
   * @returns {Object|null} Complete receipt data
   */
  static async getCompleteReceipt(receiptId) {
    const query = `
      SELECT 
        r.*,
        pt.initiated_at as payment_initiated_at,
        pt.completed_at as payment_completed_at,
        pt.webhook_data,
        dr.status_id as request_status_id,
        rs.status_name as request_status,
        dt.type_name as document_type_full,
        dt.base_fee as document_base_fee,
        dt.description as document_description
      FROM receipts r
      JOIN payment_transactions pt ON r.transaction_id = pt.id
      JOIN document_requests dr ON r.request_id = dr.id
      JOIN request_status rs ON dr.status_id = rs.id
      JOIN document_types dt ON dr.document_type_id = dt.id
      WHERE r.id = ?
    `;

    const results = await executeQuery(query, [receiptId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new receipt
   * @param {Object} receiptData - Receipt data
   * @returns {Receipt} Created receipt
   */
  static async create(receiptData) {
    const {
      transaction_id,
      client_id,
      request_id,
      receipt_number,
      client_name,
      client_email,
      client_phone,
      request_number,
      document_type,
      payment_method,
      payment_method_code,
      amount,
      processing_fee = 0,
      net_amount,
      currency = 'PHP',
      external_transaction_id,
      paymongo_payment_intent_id,
      payment_status = 'succeeded',
      receipt_date,
      payment_date,
      description,
      notes
    } = receiptData;

    const query = `
      INSERT INTO receipts (
        transaction_id, client_id, request_id, receipt_number,
        client_name, client_email, client_phone, request_number,
        document_type, payment_method, payment_method_code,
        amount, processing_fee, net_amount, currency,
        external_transaction_id, paymongo_payment_intent_id,
        payment_status, receipt_date, payment_date,
        description, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      transaction_id, client_id, request_id, receipt_number,
      client_name, client_email, client_phone, request_number,
      document_type, payment_method, payment_method_code,
      amount, processing_fee, net_amount, currency,
      external_transaction_id, paymongo_payment_intent_id,
      payment_status, receipt_date, payment_date,
      description, notes
    ];

    const result = await executeQuery(query, params);
    return await Receipt.findById(result.insertId);
  }

  /**
   * Generate receipt number
   * @param {number} transactionId - Transaction ID
   * @returns {string} Generated receipt number
   */
  static generateReceiptNumber(transactionId) {
    const timestamp = Date.now().toString().slice(-6);
    const paddedId = transactionId.toString().padStart(6, '0');
    return `RCP-${timestamp}-${paddedId}`;
  }

  /**
   * Update receipt
   * @param {number} id - Receipt ID
   * @param {Object} updateData - Data to update
   * @returns {Receipt|null} Updated receipt
   */
  static async update(id, updateData) {
    const allowedFields = [
      'payment_status', 'notes', 'description'
    ];

    const updateFields = [];
    const updateValues = [];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateValues.push(id);

    const query = `
      UPDATE receipts 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, updateValues);
    return await Receipt.findById(id);
  }

  /**
   * Delete receipt (soft delete by updating status)
   * @param {number} id - Receipt ID
   * @returns {boolean} Success status
   */
  static async delete(id) {
    const query = 'UPDATE receipts SET payment_status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const result = await executeQuery(query, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Get receipt statistics for a client
   * @param {number} clientId - Client ID
   * @returns {Object} Receipt statistics
   */
  static async getClientStatistics(clientId) {
    const query = `
      SELECT 
        COUNT(*) as total_receipts,
        SUM(CASE WHEN payment_status = 'succeeded' THEN 1 ELSE 0 END) as successful_payments,
        SUM(CASE WHEN payment_status = 'succeeded' THEN amount ELSE 0 END) as total_amount_paid,
        AVG(CASE WHEN payment_status = 'succeeded' THEN amount ELSE NULL END) as average_payment,
        MAX(receipt_date) as last_payment_date,
        MIN(receipt_date) as first_payment_date
      FROM receipts 
      WHERE client_id = ?
    `;

    const results = await executeQuery(query, [clientId]);
    return results[0];
  }

  /**
   * Convert to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      ...this,
      amount: parseFloat(this.amount),
      processing_fee: parseFloat(this.processing_fee),
      net_amount: parseFloat(this.net_amount)
    };
  }
}

module.exports = Receipt;
