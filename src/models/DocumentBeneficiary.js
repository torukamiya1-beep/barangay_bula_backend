const { executeQuery } = require('../config/database');

class DocumentBeneficiary {
  constructor(data) {
    this.id = data.id;
    this.request_id = data.request_id;
    this.account_id = data.account_id;
    this.first_name = data.first_name;
    this.middle_name = data.middle_name;
    this.last_name = data.last_name;
    this.suffix = data.suffix;
    this.birth_date = data.birth_date;
    this.gender = data.gender;
    this.civil_status_id = data.civil_status_id;
    this.nationality = data.nationality;
    this.phone_number = data.phone_number;
    this.email = data.email;
    this.house_number = data.house_number;
    this.street = data.street;
    this.subdivision = data.subdivision;
    this.barangay = data.barangay;
    this.city_municipality = data.city_municipality;
    this.province = data.province;
    this.postal_code = data.postal_code;
    this.years_of_residency = data.years_of_residency;
    this.months_of_residency = data.months_of_residency;
    this.relationship_to_requestor = data.relationship_to_requestor;
    this.verification_image_path = data.verification_image_path;
    this.verification_image_name = data.verification_image_name;
    this.verification_image_size = data.verification_image_size;
    this.verification_image_mime_type = data.verification_image_mime_type;
    this.verification_status = data.verification_status;
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
      account_id: this.account_id,
      first_name: this.first_name,
      middle_name: this.middle_name,
      last_name: this.last_name,
      suffix: this.suffix,
      full_name: this.getFullName(),
      birth_date: this.birth_date,
      gender: this.gender,
      civil_status_id: this.civil_status_id,
      nationality: this.nationality,
      phone_number: this.phone_number,
      email: this.email,
      address: this.getFullAddress(),
      house_number: this.house_number,
      street: this.street,
      subdivision: this.subdivision,
      barangay: this.barangay,
      city_municipality: this.city_municipality,
      province: this.province,
      postal_code: this.postal_code,
      years_of_residency: this.years_of_residency,
      months_of_residency: this.months_of_residency,
      relationship_to_requestor: this.relationship_to_requestor,
      verification_image_path: this.verification_image_path,
      verification_image_name: this.verification_image_name,
      verification_image_size: this.verification_image_size,
      verification_image_mime_type: this.verification_image_mime_type,
      verification_status: this.verification_status,
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

  // Get full address
  getFullAddress() {
    const parts = [];
    if (this.house_number) parts.push(this.house_number);
    if (this.street) parts.push(this.street);
    if (this.subdivision) parts.push(this.subdivision);
    parts.push(this.barangay);
    parts.push(this.city_municipality);
    parts.push(this.province);
    if (this.postal_code) parts.push(this.postal_code);
    return parts.join(', ');
  }

  // Create new beneficiary
  static async create(beneficiaryData) {
    const {
      request_id,
      account_id,
      first_name,
      middle_name,
      last_name,
      suffix,
      birth_date,
      gender,
      civil_status_id,
      nationality = 'Filipino',
      phone_number,
      email,
      house_number,
      street,
      subdivision,
      barangay,
      city_municipality,
      province,
      postal_code,
      years_of_residency,
      months_of_residency,
      relationship_to_requestor,
      region,
      region_code,
      province_code,
      city_code,
      barangay_code
    } = beneficiaryData;

    const query = `
      INSERT INTO document_beneficiaries (
        request_id, account_id, first_name, middle_name, last_name, suffix,
        birth_date, gender, civil_status_id, nationality,
        phone_number, email, house_number, street, subdivision,
        barangay, city_municipality, province, postal_code,
        years_of_residency, months_of_residency, relationship_to_requestor
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      request_id,
      account_id || null,
      first_name,
      middle_name || null,
      last_name,
      suffix || null,
      birth_date,
      gender,
      civil_status_id,
      nationality,
      phone_number || null,
      email || null,
      house_number || null,
      street || null,
      subdivision || null,
      barangay,
      city_municipality,
      province,
      postal_code || null,
      years_of_residency || null,
      months_of_residency || null,
      relationship_to_requestor
    ];

    const result = await executeQuery(query, values);
    
    // Fetch the created beneficiary
    return await DocumentBeneficiary.findById(result.insertId);
  }

  // Find beneficiary by ID
  static async findById(id) {
    const query = `
      SELECT db.*, cs.status_name as civil_status_name
      FROM document_beneficiaries db
      LEFT JOIN civil_status cs ON db.civil_status_id = cs.id
      WHERE db.id = ?
    `;
    
    const results = await executeQuery(query, [id]);
    
    if (results.length === 0) {
      return null;
    }
    
    return new DocumentBeneficiary(results[0]);
  }

  // Find beneficiary by request ID
  static async findByRequestId(requestId) {
    const query = `
      SELECT db.*, cs.status_name as civil_status_name
      FROM document_beneficiaries db
      LEFT JOIN civil_status cs ON db.civil_status_id = cs.id
      WHERE db.request_id = ?
    `;
    
    const results = await executeQuery(query, [requestId]);
    
    if (results.length === 0) {
      return null;
    }
    
    return new DocumentBeneficiary(results[0]);
  }

  // Update beneficiary
  async update(updateData) {
    const allowedFields = [
      'first_name', 'middle_name', 'last_name', 'suffix',
      'birth_date', 'gender', 'civil_status_id', 'nationality',
      'phone_number', 'email', 'house_number', 'street',
      'subdivision', 'barangay', 'city_municipality', 'province',
      'postal_code', 'years_of_residency', 'months_of_residency',
      'relationship_to_requestor'
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
      UPDATE document_beneficiaries 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await executeQuery(query, updateValues);

    // Refresh the instance with updated data
    Object.assign(this, updateData);
    this.updated_at = new Date();

    return this;
  }

  // Update verification status (approve/reject workflow)
  async updateVerificationStatus(status, verifiedBy, notes = null) {
    const query = `
      UPDATE document_beneficiaries 
      SET verification_status = ?, verified_by = ?, verified_at = NOW(), verification_notes = ?
      WHERE id = ?
    `;
    
    const params = [status, verifiedBy, notes, this.id];
    await executeQuery(query, params);
    
    this.verification_status = status;
    this.verified_by = verifiedBy;
    this.verified_at = new Date();
    this.verification_notes = notes;
    
    return this;
  }

  // Delete beneficiary
  async delete() {
    const query = 'DELETE FROM document_beneficiaries WHERE id = ?';
    await executeQuery(query, [this.id]);
    return true;
  }

  // Validate beneficiary data
  static validateData(data) {
    const errors = [];

    // Required fields
    const requiredFields = [
      'request_id', 'first_name', 'last_name', 'birth_date',
      'gender', 'civil_status_id', 'barangay', 'city_municipality',
      'province', 'relationship_to_requestor'
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    }

    // Validate gender
    if (data.gender && !['male', 'female'].includes(data.gender)) {
      errors.push('Gender must be either "male" or "female"');
    }

    // Validate birth date
    if (data.birth_date) {
      const birthDate = new Date(data.birth_date);
      const today = new Date();
      if (birthDate > today) {
        errors.push('Birth date cannot be in the future');
      }
    }

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

    return errors;
  }
}

module.exports = DocumentBeneficiary;
