const { executeQuery } = require('../config/database');

class BarangayClearanceApplication {
  constructor(data) {
    this.id = data.id;
    this.request_id = data.request_id;
    this.has_pending_cases = data.has_pending_cases;
    this.pending_cases_details = data.pending_cases_details;
    this.voter_registration_number = data.voter_registration_number;
    this.precinct_number = data.precinct_number;
    this.emergency_contact_name = data.emergency_contact_name;
    this.emergency_contact_relationship = data.emergency_contact_relationship;
    this.emergency_contact_phone = data.emergency_contact_phone;
    this.emergency_contact_address = data.emergency_contact_address;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Find by request ID
  static async findByRequestId(requestId) {
    const query = 'SELECT * FROM barangay_clearance_applications WHERE request_id = ?';
    const results = await executeQuery(query, [requestId]);
    return results.length > 0 ? new BarangayClearanceApplication(results[0]) : null;
  }

  // Create new barangay clearance application
  static async create(applicationData) {
    const {
      request_id,
      has_pending_cases = false,
      pending_cases_details,
      voter_registration_status
    } = applicationData;

    const query = `
      INSERT INTO barangay_clearance_applications (
        request_id, has_pending_cases, pending_cases_details, voter_registration_status
      ) VALUES (?, ?, ?, ?)
    `;

    const params = [
      request_id, has_pending_cases, pending_cases_details, voter_registration_status !== undefined ? voter_registration_status : null
    ];

    try {
      const result = await executeQuery(query, params);
      return await BarangayClearanceApplication.findByRequestId(request_id);
    } catch (error) {
      console.error('Error creating barangay clearance application:', error);
      throw error;
    }
  }

  // Update application
  async update(updateData) {
    const {
      has_pending_cases,
      pending_cases_details,
      voter_registration_number,
      precinct_number,
      emergency_contact_name,
      emergency_contact_relationship,
      emergency_contact_phone,
      emergency_contact_address
    } = updateData;

    const query = `
      UPDATE barangay_clearance_applications 
      SET 
        has_pending_cases = ?, 
        pending_cases_details = ?, 
        voter_registration_number = ?, 
        precinct_number = ?, 
        emergency_contact_name = ?,
        emergency_contact_relationship = ?, 
        emergency_contact_phone = ?, 
        emergency_contact_address = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `;

    const params = [
      has_pending_cases, pending_cases_details, voter_registration_number,
      precinct_number, emergency_contact_name, emergency_contact_relationship,
      emergency_contact_phone, emergency_contact_address, this.request_id
    ];

    await executeQuery(query, params);

    // Update instance properties
    Object.assign(this, updateData);
    return this;
  }

  // Delete application
  async delete() {
    const query = 'DELETE FROM barangay_clearance_applications WHERE request_id = ?';
    await executeQuery(query, [this.request_id]);
    return true;
  }

  // Get application with request details
  async getWithRequestDetails() {
    const query = `
      SELECT 
        bca.*,
        dr.request_number,
        dr.status_id,
        rs.status_name,
        dr.created_at as request_created_at,
        ca.username as client_username,
        cp.first_name, cp.middle_name, cp.last_name,
        cp.email, cp.phone_number
      FROM barangay_clearance_applications bca
      JOIN document_requests dr ON bca.request_id = dr.id
      JOIN request_status rs ON dr.status_id = rs.id
      JOIN client_accounts ca ON dr.client_id = ca.id
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      WHERE bca.request_id = ?
    `;

    const results = await executeQuery(query, [this.request_id]);
    return results.length > 0 ? results[0] : null;
  }

  // Convert to JSON
  toJSON() {
    return { ...this };
  }
}

module.exports = BarangayClearanceApplication;
