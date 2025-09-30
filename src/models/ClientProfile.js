const { executeQuery } = require('../config/database');

class ClientProfile {
  constructor(data) {
    this.id = data.id;
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
    this.region = data.region;
    this.region_code = data.region_code;
    this.province_code = data.province_code;
    this.city_code = data.city_code;
    this.barangay_code = data.barangay_code;
    this.postal_code = data.postal_code;
    this.years_of_residency = data.years_of_residency;
    this.months_of_residency = data.months_of_residency;
    this.profile_picture = data.profile_picture;
    this.is_verified = data.is_verified;
    this.verified_by = data.verified_by;
    this.verified_at = data.verified_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create client profiles table
  static async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS client_profiles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_id INT NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        last_name VARCHAR(100) NOT NULL,
        suffix VARCHAR(10),
        birth_date DATE NOT NULL,
        gender ENUM('male', 'female') NOT NULL,
        civil_status_id INT NOT NULL,
        nationality VARCHAR(50) DEFAULT 'Filipino',
        phone_number VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        
        house_number VARCHAR(20),
        street VARCHAR(100),
        subdivision VARCHAR(100),
        barangay VARCHAR(100) NOT NULL,
        city_municipality VARCHAR(100) NOT NULL,
        province VARCHAR(100) NOT NULL,
        region VARCHAR(100),
        region_code VARCHAR(20),
        province_code VARCHAR(20),
        city_code VARCHAR(20),
        barangay_code VARCHAR(20),
        postal_code VARCHAR(10),
        
        years_of_residency INT,
        months_of_residency INT,
        
        profile_picture VARCHAR(255),
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by INT NULL,
        verified_at TIMESTAMP NULL,
        residency_verified BOOLEAN DEFAULT FALSE,
        residency_verified_by INT NULL,
        residency_verified_at TIMESTAMP NULL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (residency_verified_by) REFERENCES admin_employee_accounts(id),
        
        INDEX idx_full_name (last_name, first_name),
        INDEX idx_birth_date (birth_date),
        INDEX idx_barangay (barangay),
        INDEX idx_email (email),
        INDEX idx_phone (phone_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await executeQuery(createTableQuery);
  }

  // Find profile by account ID
  static async findByAccountId(accountId) {
    const query = 'SELECT * FROM client_profiles WHERE account_id = ?';
    const results = await executeQuery(query, [accountId]);
    return results.length > 0 ? new ClientProfile(results[0]) : null;
  }

  // Find profile by ID
  static async findById(id) {
    const query = 'SELECT * FROM client_profiles WHERE id = ?';
    const results = await executeQuery(query, [id]);
    return results.length > 0 ? new ClientProfile(results[0]) : null;
  }

  // Find profile by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM client_profiles WHERE email = ?';
    const results = await executeQuery(query, [email]);
    return results.length > 0 ? new ClientProfile(results[0]) : null;
  }

  // Find profile by phone number
  static async findByPhoneNumber(phoneNumber) {
    const query = 'SELECT * FROM client_profiles WHERE phone_number = ?';
    const results = await executeQuery(query, [phoneNumber]);
    return results.length > 0 ? new ClientProfile(results[0]) : null;
  }

  // Create new client profile
  static async create(profileData) {
    const {
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
      region,
      region_code,
      province_code,
      city_code,
      barangay_code,
      postal_code,
      years_of_residency,
      months_of_residency
    } = profileData;

    // Convert empty strings to NULL for optional fields
    const cleanOptionalField = (value) => {
      if (value === '' || value === undefined) return null;
      return value;
    };

    const cleanedHouseNumber = cleanOptionalField(house_number);
    const cleanedStreet = cleanOptionalField(street);
    const cleanedSubdivision = cleanOptionalField(subdivision);
    const cleanedPostalCode = cleanOptionalField(postal_code);
    const cleanedYearsOfResidency = years_of_residency === '' || years_of_residency === undefined ? null : years_of_residency;
    const cleanedMonthsOfResidency = months_of_residency === '' || months_of_residency === undefined ? null : months_of_residency;

    const query = `
      INSERT INTO client_profiles (
        account_id, first_name, middle_name, last_name, suffix,
        birth_date, gender, civil_status_id, nationality,
        phone_number, email, house_number, street, subdivision,
        barangay, city_municipality, province, region,
        region_code, province_code, city_code, barangay_code, postal_code,
        years_of_residency, months_of_residency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const result = await executeQuery(query, [
        account_id, first_name, middle_name, last_name, suffix,
        birth_date, gender, civil_status_id, nationality,
        phone_number, email, cleanedHouseNumber, cleanedStreet, cleanedSubdivision,
        barangay, city_municipality, province, region,
        region_code, province_code, city_code, barangay_code, cleanedPostalCode,
        cleanedYearsOfResidency, cleanedMonthsOfResidency
      ]);
      
      return await ClientProfile.findById(result.insertId);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Profile already exists for this account');
      }
      throw error;
    }
  }

  // Update profile
  async update(updateData) {
    const allowedFields = [
      'first_name', 'middle_name', 'last_name', 'suffix',
      'birth_date', 'gender', 'civil_status_id', 'nationality',
      'phone_number', 'email', 'house_number', 'street',
      'subdivision', 'barangay', 'city_municipality', 'province',
      'postal_code', 'years_of_residency', 'months_of_residency'
    ];

    // Optional fields that should be converted from empty strings to NULL
    const optionalFields = ['house_number', 'street', 'subdivision', 'postal_code', 'years_of_residency', 'months_of_residency'];

    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);

        // Convert empty strings to NULL for optional fields
        let cleanedValue = value;
        if (optionalFields.includes(key) && (value === '' || value === undefined)) {
          cleanedValue = null;
        }

        updateValues.push(cleanedValue);
        this[key] = cleanedValue;
      }
    }

    if (updateFields.length === 0) {
      return this;
    }

    updateValues.push(this.id);
    
    const query = `
      UPDATE client_profiles 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    await executeQuery(query, updateValues);
    return this;
  }

  // Update profile picture
  async updateProfilePicture(picturePath) {
    const query = `
      UPDATE client_profiles 
      SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await executeQuery(query, [picturePath, this.id]);
    this.profile_picture = picturePath;
    return this;
  }

  // Verify profile
  async verify(verifiedBy) {
    const query = `
      UPDATE client_profiles 
      SET is_verified = TRUE, verified_by = ?, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await executeQuery(query, [verifiedBy, this.id]);
    this.is_verified = true;
    this.verified_by = verifiedBy;
    this.verified_at = new Date();
    return this;
  }

  // Get full name
  getFullName() {
    let fullName = `${this.first_name}`;
    
    if (this.middle_name) {
      fullName += ` ${this.middle_name}`;
    }
    
    fullName += ` ${this.last_name}`;
    
    if (this.suffix) {
      fullName += ` ${this.suffix}`;
    }
    
    return fullName;
  }

  // Get full address
  getFullAddress() {
    const addressParts = [];

    if (this.house_number) addressParts.push(this.house_number);
    if (this.street) addressParts.push(this.street);
    if (this.subdivision) addressParts.push(this.subdivision);
    if (this.barangay) addressParts.push(`Brgy. ${this.barangay}`);
    if (this.city_municipality) addressParts.push(this.city_municipality);
    if (this.province) addressParts.push(this.province);
    if (this.region) addressParts.push(this.region);
    if (this.postal_code) addressParts.push(this.postal_code);

    return addressParts.join(', ');
  }

  // Get structured address object
  getStructuredAddress() {
    return {
      house_number: this.house_number || '',
      street: this.street || '',
      subdivision: this.subdivision || '',
      barangay: {
        name: this.barangay || '',
        code: this.barangay_code || ''
      },
      city: {
        name: this.city_municipality || '',
        code: this.city_code || ''
      },
      province: {
        name: this.province || '',
        code: this.province_code || ''
      },
      region: {
        name: this.region || '',
        code: this.region_code || ''
      },
      postal_code: this.postal_code || '',
      full_address: this.getFullAddress()
    };
  }

  // Calculate age
  getAge() {
    if (!this.birth_date) return null;
    
    const today = new Date();
    const birthDate = new Date(this.birth_date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Update residency verification status
  async updateResidencyVerification(verified = true, verifiedBy = null) {
    const query = `
      UPDATE client_profiles
      SET residency_verified = ?, residency_verified_by = ?, residency_verified_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const verifiedAt = verified ? new Date() : null;

    await executeQuery(query, [verified, verifiedBy, verifiedAt, this.id]);

    this.residency_verified = verified;
    this.residency_verified_by = verifiedBy;
    this.residency_verified_at = verifiedAt;

    return this;
  }

  // Convert to JSON
  toJSON() {
    return {
      ...this,
      full_name: this.getFullName(),
      full_address: this.getFullAddress(),
      age: this.getAge()
    };
  }
}

module.exports = ClientProfile;
