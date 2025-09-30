-- Migration: Add verification document support for third-party requests and pickup persons
-- This migration adds support for:
-- 1. Family member ID verification images for "for someone" requests
-- 2. Enhanced file upload support for pickup person authorization

-- 1. Add family member verification image field to document_beneficiaries table
ALTER TABLE document_beneficiaries
ADD COLUMN verification_image_path VARCHAR(500) NULL,
ADD COLUMN verification_image_name VARCHAR(200) NULL,
ADD COLUMN verification_image_size INT NULL,
ADD COLUMN verification_image_mime_type VARCHAR(100) NULL,
ADD COLUMN verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
ADD COLUMN verified_by INT NULL,
ADD COLUMN verified_at TIMESTAMP NULL,
ADD COLUMN verification_notes TEXT NULL;

-- 2. Add valid ID image field to authorized_pickup_persons table
ALTER TABLE authorized_pickup_persons
ADD COLUMN id_image_path VARCHAR(500) NULL,
ADD COLUMN id_image_name VARCHAR(200) NULL,
ADD COLUMN id_image_size INT NULL,
ADD COLUMN id_image_mime_type VARCHAR(100) NULL;

-- 3. Create table for beneficiary verification documents (if we need multiple files per beneficiary)
CREATE TABLE IF NOT EXISTS beneficiary_verification_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    beneficiary_id INT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_beneficiary_id (beneficiary_id),
    INDEX idx_document_type (document_type),
    INDEX idx_verification_status (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Update authorization_documents table to ensure it has all needed fields
ALTER TABLE authorization_documents
ADD COLUMN verification_notes TEXT;

-- 6. Create view for admin requests with enhanced beneficiary information
CREATE OR REPLACE VIEW admin_requests_enhanced AS
SELECT 
    dr.*,
    dt.type_name as document_type,
    dt.description as document_description,
    pc.category_name as purpose_category,
    rs.status_name as status,
    rs.description as status_description,
    pm.method_name as payment_method,
    
    -- Client information
    CONCAT(cp.first_name, ' ', 
           COALESCE(CONCAT(cp.middle_name, ' '), ''),
           cp.last_name,
           COALESCE(CONCAT(' ', cp.suffix), '')) as client_name,
    cp.phone_number as client_phone,
    ca.email as client_email,
    CONCAT(cp.house_number, ' ', cp.street, ', ', cp.barangay, ', ', 
           cp.city_municipality, ', ', cp.province) as client_address,
    
    -- Beneficiary information (for third-party requests)
    CASE 
        WHEN dr.is_third_party_request = TRUE THEN
            CONCAT(db.first_name, ' ', 
                   COALESCE(CONCAT(db.middle_name, ' '), ''),
                   db.last_name,
                   COALESCE(CONCAT(' ', db.suffix), ''))
        ELSE NULL
    END as beneficiary_name,
    
    db.relationship_to_requestor,
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
    app.authorization_letter_path as pickup_authorization_letter,
    
    -- Display name (beneficiary name if third-party, otherwise client name)
    CASE 
        WHEN dr.is_third_party_request = TRUE AND db.id IS NOT NULL THEN
            CONCAT(db.first_name, ' ', 
                   COALESCE(CONCAT(db.middle_name, ' '), ''),
                   db.last_name,
                   COALESCE(CONCAT(' ', db.suffix), ''))
        ELSE
            CONCAT(cp.first_name, ' ', 
                   COALESCE(CONCAT(cp.middle_name, ' '), ''),
                   cp.last_name,
                   COALESCE(CONCAT(' ', cp.suffix), ''))
    END as display_name,
    
    -- Request type indicator
    CASE 
        WHEN dr.is_third_party_request = TRUE THEN 'Third-Party'
        ELSE 'Self'
    END as request_type

FROM document_requests dr
JOIN document_types dt ON dr.document_type_id = dt.id
JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
JOIN request_status rs ON dr.status_id = rs.id
JOIN client_accounts ca ON dr.client_id = ca.id
LEFT JOIN client_profiles cp ON ca.id = cp.account_id
LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
LEFT JOIN document_beneficiaries db ON dr.id = db.request_id
LEFT JOIN authorized_pickup_persons app ON dr.id = app.request_id;

-- 7. Add comments for documentation
ALTER TABLE document_beneficiaries 
COMMENT = 'Stores information about people for whom documents are requested (third-party requests)';

ALTER TABLE beneficiary_verification_documents 
COMMENT = 'Stores verification documents (ID images) for beneficiaries in third-party requests';

ALTER TABLE authorized_pickup_persons 
COMMENT = 'Stores information about people authorized to pick up documents on behalf of others';

ALTER TABLE authorization_documents 
COMMENT = 'Stores authorization documents (letters, IDs) for pickup persons';
