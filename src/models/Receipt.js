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
    let whereConditions = ['client_id = ?'];
    let queryParams = [clientId];

    // Add status filter
    if (status) {
      whereConditions.push('payment_status = ?');
      queryParams.push(status);
    }

    // Add date range filter
    if (startDate) {
      whereConditions.push('receipt_date >= ?');
      queryParams.push(startDate);
    }

    if (endDate) {
      whereConditions.push('receipt_date <= ?');
      queryParams.push(endDate);
    }

    const whereClause = whereConditions.join(' AND ');
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;

    // Get receipts
    const receiptsQuery = `
      SELECT * FROM receipts 
      WHERE ${whereClause} 
      ${orderClause}
      LIMIT ? OFFSET ?
    `;
    queryParams.push(limit, offset);

    const receipts = await executeQuery(receiptsQuery, queryParams);

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM receipts WHERE ${whereClause}`;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await executeQuery(countQuery, countParams);
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
