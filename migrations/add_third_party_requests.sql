-- =====================================================
-- MIGRATION: Add Third-Party Document Requests and Authorized Pickup
-- Version: 1.0
-- Date: 2025-01-17
-- =====================================================

-- Start transaction for safe migration
-- START TRANSACTION;

-- 1. Create table for document beneficiaries (people for whom documents are requested)
CREATE TABLE IF NOT EXISTS document_beneficiaries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(10),
    birth_date DATE NOT NULL,
    gender ENUM('male', 'female') NOT NULL,
    civil_status_id INT NOT NULL,
    nationality VARCHAR(50) DEFAULT 'Filipino',
    
    -- Contact Information
    phone_number VARCHAR(20),
    email VARCHAR(100),
    
    -- Address Information
    house_number VARCHAR(20),
    street VARCHAR(100),
    subdivision VARCHAR(100),
    barangay VARCHAR(100) NOT NULL,
    city_municipality VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10),
    
    -- Residency Information
    years_of_residency INT,
    months_of_residency INT,
    
    -- Relationship to requestor
    relationship_to_requestor VARCHAR(100) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (request_id) REFERENCES document_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (civil_status_id) REFERENCES civil_status(id),
    
    -- Indexes
    INDEX idx_request_id (request_id),
    INDEX idx_full_name (last_name, first_name),
    INDEX idx_birth_date (birth_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Create table for authorized pickup persons
CREATE TABLE IF NOT EXISTS authorized_pickup_persons (
    id INT PRIMARY KEY AUTO_INCREMENT,
    request_id INT NOT NULL,
    
    -- Pickup Person Information
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    suffix VARCHAR(10),
    phone_number VARCHAR(20),
    email VARCHAR(100),
    
    -- ID Information
    id_type VARCHAR(50) NOT NULL, -- 'drivers_license', 'passport', 'national_id', etc.
    id_number VARCHAR(50) NOT NULL,
    id_expiry_date DATE,
    
    -- Authorization Details
    authorization_letter_path VARCHAR(500), -- Path to uploaded authorization letter
    relationship_to_beneficiary VARCHAR(100), -- Relationship to the person the document is for
    
    -- Verification Status
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT NULL, -- Admin who verified the authorization
    verified_at TIMESTAMP NULL,
    verification_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (request_id) REFERENCES document_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES admin_employee_accounts(id),
    
    -- Indexes
    INDEX idx_request_id (request_id),
    INDEX idx_full_name (last_name, first_name),
    INDEX idx_id_number (id_number),
    INDEX idx_verification_status (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Create table for authorization documents (supporting files)
CREATE TABLE IF NOT EXISTS authorization_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    authorized_pickup_person_id INT NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- 'authorization_letter', 'valid_id', 'additional_proof'
    document_name VARCHAR(200) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (authorized_pickup_person_id) REFERENCES authorized_pickup_persons(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES admin_employee_accounts(id),
    
    INDEX idx_pickup_person_id (authorized_pickup_person_id),
    INDEX idx_document_type (document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Modify document_requests table to support third-party requests
-- Add columns if they don't exist
ALTER TABLE document_requests
ADD COLUMN IF NOT EXISTS is_third_party_request BOOLEAN DEFAULT FALSE AFTER client_id;

ALTER TABLE document_requests
ADD COLUMN IF NOT EXISTS requestor_notes TEXT AFTER purpose_details;

-- 5. Modify pickup_schedules table to link with authorized pickup persons
ALTER TABLE pickup_schedules
ADD COLUMN IF NOT EXISTS authorized_pickup_person_id INT NULL AFTER request_id;

-- Add foreign key constraint (will fail silently if already exists)
ALTER TABLE pickup_schedules
ADD CONSTRAINT fk_pickup_authorized_person
FOREIGN KEY (authorized_pickup_person_id) REFERENCES authorized_pickup_persons(id);

-- Commit the transaction
-- COMMIT;

-- Create view for complete document request information including beneficiary
CREATE OR REPLACE VIEW v_document_requests_with_beneficiary AS
SELECT 
    dr.*,
    dt.type_name as document_type,
    pc.category_name as purpose_category,
    rs.status_name as status,
    pm.method_name as payment_method,
    
    -- Requestor (logged-in user) information
    CONCAT(cp_requestor.first_name, ' ', 
           COALESCE(CONCAT(cp_requestor.middle_name, ' '), ''),
           cp_requestor.last_name,
           COALESCE(CONCAT(' ', cp_requestor.suffix), '')) as requestor_name,
    cp_requestor.email as requestor_email,
    cp_requestor.phone_number as requestor_phone,
    
    -- Beneficiary (person document is for) information
    CASE 
        WHEN dr.is_third_party_request = TRUE THEN
            CONCAT(db.first_name, ' ', 
                   COALESCE(CONCAT(db.middle_name, ' '), ''),
                   db.last_name,
                   COALESCE(CONCAT(' ', db.suffix), ''))
        ELSE
            CONCAT(cp_requestor.first_name, ' ', 
                   COALESCE(CONCAT(cp_requestor.middle_name, ' '), ''),
                   cp_requestor.last_name,
                   COALESCE(CONCAT(' ', cp_requestor.suffix), ''))
    END as beneficiary_name,
    
    CASE 
        WHEN dr.is_third_party_request = TRUE THEN db.email
        ELSE cp_requestor.email
    END as beneficiary_email,
    
    CASE 
        WHEN dr.is_third_party_request = TRUE THEN db.phone_number
        ELSE cp_requestor.phone_number
    END as beneficiary_phone,
    
    CASE 
        WHEN dr.is_third_party_request = TRUE THEN db.relationship_to_requestor
        ELSE 'self'
    END as relationship_to_requestor,
    
    -- Authorized pickup person information
    CASE 
        WHEN app.id IS NOT NULL THEN
            CONCAT(app.first_name, ' ', 
                   COALESCE(CONCAT(app.middle_name, ' '), ''),
                   app.last_name,
                   COALESCE(CONCAT(' ', app.suffix), ''))
        ELSE NULL
    END as pickup_person_name,
    
    app.phone_number as pickup_person_phone,
    app.id_type as pickup_person_id_type,
    app.id_number as pickup_person_id_number,
    app.relationship_to_beneficiary as pickup_person_relationship,
    app.is_verified as pickup_authorization_verified

FROM document_requests dr
JOIN document_types dt ON dr.document_type_id = dt.id
JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
JOIN request_status rs ON dr.status_id = rs.id
LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
JOIN client_profiles cp_requestor ON dr.client_id = cp_requestor.account_id
LEFT JOIN document_beneficiaries db ON dr.id = db.request_id
LEFT JOIN authorized_pickup_persons app ON dr.id = app.request_id;

-- Insert sample relationship types if they don't exist
INSERT IGNORE INTO civil_status (status_name) VALUES ('Common-law');

-- Log migration completion
INSERT INTO audit_logs (user_id, user_type, action, table_name, new_values, created_at) 
VALUES (NULL, 'admin', 'MIGRATION', 'database_schema', 
        JSON_OBJECT('migration', 'add_third_party_requests', 'version', '1.0', 'status', 'completed'),
        NOW());

SELECT 'Migration completed successfully: Third-party requests and authorized pickup functionality added' as result;
