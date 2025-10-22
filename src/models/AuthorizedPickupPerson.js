const { executeQuery } = require('../config/database');

class AuthorizedPickupPerson {
  constructor(data) {
    this.id = data.id;
    this.request_id = data.request_id;
    this.first_name = data.first_name;
    this.middle_name = data.middle_name;
    this.last_name = data.last_name;
    this.suffix = data.suffix;
    this.phone_number = data.phone_number;
    this.email = data.email;
    this.id_type = data.id_type;
    this.id_number = data.id_number;
    this.id_expiry_date = data.id_expiry_date;
    this.id_image_path = data.id_image_path;
    this.id_image_name = data.id_image_name;
    this.authorization_letter_path = data.authorization_letter_path;
    this.relationship_to_beneficiary = data.relationship_to_beneficiary;
    this.is_verified = data.is_verified;
    this.verified_by = data.verified_by;
    this.verified_at = data.verified_at;
    this.verification_notes = data.verification_notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      request_id: this.request_id,
      first_name: this.first_name,
      middle_name: this.middle_name,
      last_name: this.last_name,
      suffix: this.suffix,
      full_name: this.getFullName(),
      phone_number: this.phone_number,
      email: this.email,
      id_type: this.id_type,
      id_number: this.id_number,
      id_expiry_date: this.id_expiry_date,
      id_image_path: this.id_image_path,
      id_image_name: this.id_image_name,
      authorization_letter_path: this.authorization_letter_path,
      relationship_to_beneficiary: this.relationship_to_beneficiary,
      is_verified: this.is_verified,
      verification_status: this.getVerificationStatus(),
      verified_by: this.verified_by,
      verified_at: this.verified_at,
      verification_notes: this.verification_notes,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Get full name
  getFullName() {
    let name = this.first_name;
    if (this.middle_name) name += ` ${this.middle_name}`;
    name += ` ${this.last_name}`;
    if (this.suffix) name += ` ${this.suffix}`;
    return name;
  }

  // Get verification status
  getVerificationStatus() {
    if (this.is_verified) return 'verified';
    if (this.verified_at && !this.is_verified) return 'rejected';
    return 'pending';
  }

  // Create new authorized pickup person
  static async create(pickupData) {
    const {
      request_id,
      first_name,
      middle_name,
      last_name,
      suffix,
      phone_number,
      email,
      relationship_to_beneficiary
    } = pickupData;

    const query = `
      INSERT INTO authorized_pickup_persons (
        request_id, first_name, middle_name, last_name, suffix,
        phone_number, email, relationship_to_beneficiary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      request_id,
      first_name,
      middle_name || null,
      last_name,
      suffix || null,
      phone_number || null,
      email || null,
      relationship_to_beneficiary
    ];

    const result = await executeQuery(query, values);
    
    // Fetch the created pickup person
    return await AuthorizedPickupPerson.findById(result.insertId);
  }

  // Find pickup person by ID
  static async findById(id) {
    const query = `
      SELECT app.*, 
             aep.first_name as verified_by_first_name,
             aep.last_name as verified_by_last_name
      FROM authorized_pickup_persons app
      LEFT JOIN admin_employee_accounts aea ON app.verified_by = aea.id
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      WHERE app.id = ?
    `;
    
    const results = await executeQuery(query, [id]);
    
    if (results.length === 0) {
      return null;
    }
    
    return new AuthorizedPickupPerson(results[0]);
  }

  // Find pickup person by request ID
  static async findByRequestId(requestId) {
    const query = `
      SELECT app.*, 
             aep.first_name as verified_by_first_name,
             aep.last_name as verified_by_last_name
      FROM authorized_pickup_persons app
      LEFT JOIN admin_employee_accounts aea ON app.verified_by = aea.id
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      WHERE app.request_id = ?
    `;
    
    const results = await executeQuery(query, [requestId]);
    
    if (results.length === 0) {
      return null;
    }
    
    return new AuthorizedPickupPerson(results[0]);
  }

  // Update pickup person
  async update(updateData) {
    const allowedFields = [
      'first_name', 'middle_name', 'last_name', 'suffix',
      'phone_number', 'email', 'id_type', 'id_number',
      'id_expiry_date', 'relationship_to_beneficiary',
      'authorization_letter_path'
    ];

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    updateValues.push(this.id);

    const query = `
      UPDATE authorized_pickup_persons 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, updateValues);

    // Refresh the instance with updated data
    const updated = await AuthorizedPickupPerson.findById(this.id);
    Object.assign(this, updated);

    return this;
  }

  // Verify authorization (admin action)
  async verify(adminId, isVerified, notes = null) {
    const query = `
      UPDATE authorized_pickup_persons 
      SET is_verified = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP, 
          verification_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    // Ensure notes is null instead of undefined for SQL
    await executeQuery(query, [isVerified, adminId, notes || null, this.id]);

    // Refresh the instance
    const updated = await AuthorizedPickupPerson.findById(this.id);
    Object.assign(this, updated);

    return this;
  }

  // Update verification status (matches pattern of other document types)
  async updateVerificationStatus(status, adminId, notes = null) {
    const isVerified = status === 'verified' ? 1 : 0;
    
    const query = `
      UPDATE authorized_pickup_persons 
      SET is_verified = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP, 
          verification_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    // Ensure notes is null instead of undefined for SQL
    await executeQuery(query, [isVerified, adminId, notes || null, this.id]);

    // Refresh the instance
    const updated = await AuthorizedPickupPerson.findById(this.id);
    Object.assign(this, updated);

    return this;
  }

  // Delete pickup person
  async delete() {
    const query = 'DELETE FROM authorized_pickup_persons WHERE id = ?';
    await executeQuery(query, [this.id]);
    return true;
  }

  // Get all pending verifications (admin use)
  static async getPendingVerifications(limit = 50, offset = 0) {
    const query = `
      SELECT app.*, 
             dr.request_number,
             dt.type_name as document_type,
             cp.first_name as requestor_first_name,
             cp.last_name as requestor_last_name,
             cp.email as requestor_email
      FROM authorized_pickup_persons app
      JOIN document_requests dr ON app.request_id = dr.id
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      WHERE app.is_verified = FALSE AND app.verified_at IS NULL
      ORDER BY app.created_at ASC
      LIMIT ? OFFSET ?
    `;
    
    const results = await executeQuery(query, [limit, offset]);
    return results.map(row => new AuthorizedPickupPerson(row));
  }

  // Get rejected pickup persons by client ID
  static async getRejectedByClientId(clientId) {
    const query = `
      SELECT app.*, 
             dr.request_number,
             dr.id as request_id,
             dt.type_name as document_type
      FROM authorized_pickup_persons app
      JOIN document_requests dr ON app.request_id = dr.id
      JOIN document_types dt ON dr.document_type_id = dt.id
      WHERE dr.client_id = ? 
        AND app.is_verified = FALSE 
        AND app.verified_at IS NOT NULL
      ORDER BY app.verified_at DESC
    `;
    
    const results = await executeQuery(query, [clientId]);
    
    if (!results) {
      return [];
    }
    
    return Array.isArray(results) ? results.map(row => ({ ...row })) : [];
  }

  // Validate pickup person data
  static validateData(data) {
    const errors = [];

    // Required fields for initial submission
    const requiredFields = [
      'request_id', 'first_name', 'last_name', 'phone_number',
      'relationship_to_beneficiary'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    }

    // ID type and number are optional for initial submission
    // They can be provided later through document uploads

    // ID type and number validation removed - using image uploads instead

    // Validate email format
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('Invalid email format');
      }
    }

    // Validate phone number format (Philippine format)
    if (data.phone_number) {
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(data.phone_number.replace(/\s|-/g, ''))) {
        errors.push('Invalid phone number format (must be 09XXXXXXXXX - 11 digits starting with 09)');
      }
    }

    // ID expiry date validation removed - using image uploads instead

    // Validate relationship
    const validRelationships = [
      'spouse', 'child', 'parent', 'sibling', 'relative',
      'friend', 'colleague'
      // 'other'
    ];
    
    if (data.relationship_to_beneficiary && !validRelationships.includes(data.relationship_to_beneficiary)) {
      errors.push('Invalid relationship type');
    }

    return errors;
  }

  // Get ID type display name
  static getIdTypeDisplayName(idType) {
    const displayNames = {
      'drivers_license': "Driver's License",
      'passport': 'Passport',
      'national_id': 'National ID',
      'voters_id': "Voter's ID",
      'sss_id': 'SSS ID',
      'philhealth_id': 'PhilHealth ID',
      'tin_id': 'TIN ID',
      'postal_id': 'Postal ID',
      'prc_id': 'PRC ID'
    };
    
    return displayNames[idType] || idType;
  }

  // Get relationship display name
  static getRelationshipDisplayName(relationship) {
    const displayNames = {
      'spouse': 'Spouse',
      'child': 'Child',
      'parent': 'Parent',
      'sibling': 'Sibling',
      'relative': 'Other Relative',
      'friend': 'Friend',
      'colleague': 'Colleague',
      // 'other': 'Other'
    };
    
    return displayNames[relationship] || relationship;
  }
}

module.exports = AuthorizedPickupPerson;
