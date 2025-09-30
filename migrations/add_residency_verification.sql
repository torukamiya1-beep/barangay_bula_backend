-- Migration: Add Residency Verification System
-- Date: 2025-01-08
-- Description: Adds residency verification functionality to the Barangay Bula Management System

-- 1. Update client_accounts table to include new residency verification statuses
ALTER TABLE client_accounts 
MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'pending_verification', 'pending_residency_verification', 'residency_rejected') DEFAULT 'pending_verification';

-- 2. Create residency_documents table for storing proof of residency uploads
CREATE TABLE IF NOT EXISTS residency_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    account_id INT NOT NULL,
    document_type ENUM('utility_bill', 'barangay_certificate', 'valid_id', 'lease_contract', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    
    -- Verification fields
    verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    rejection_reason TEXT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES admin_employee_accounts(id),
    
    INDEX idx_account_id (account_id),
    INDEX idx_verification_status (verification_status),
    INDEX idx_document_type (document_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Add residency verification fields to client_profiles table
ALTER TABLE client_profiles 
ADD COLUMN residency_verified BOOLEAN DEFAULT FALSE AFTER is_verified,
ADD COLUMN residency_verified_by INT NULL AFTER residency_verified,
ADD COLUMN residency_verified_at TIMESTAMP NULL AFTER residency_verified_by,
ADD FOREIGN KEY (residency_verified_by) REFERENCES admin_employee_accounts(id);

-- 4. Create indexes for better performance
CREATE INDEX idx_residency_verified ON client_profiles(residency_verified);

-- 5. Update existing accounts that are already active to have residency verified
-- (This assumes existing active accounts are grandfathered in)
UPDATE client_profiles cp
JOIN client_accounts ca ON cp.account_id = ca.id
SET cp.residency_verified = TRUE, cp.residency_verified_at = NOW()
WHERE ca.status = 'active';

-- 6. Create a view for easy admin access to pending residency verifications
CREATE OR REPLACE VIEW pending_residency_verifications AS
SELECT 
    ca.id as account_id,
    ca.username,
    ca.status as account_status,
    ca.created_at as registration_date,
    cp.first_name,
    cp.middle_name,
    cp.last_name,
    cp.email,
    cp.phone_number,
    cp.barangay,
    cp.city_municipality,
    cp.province,
    cp.years_of_residency,
    cp.months_of_residency,
    COUNT(rd.id) as document_count,
    MAX(rd.created_at) as latest_document_upload
FROM client_accounts ca
LEFT JOIN client_profiles cp ON ca.id = cp.account_id
LEFT JOIN residency_documents rd ON ca.id = rd.account_id
WHERE ca.status IN ('pending_residency_verification', 'residency_rejected')
GROUP BY ca.id, ca.username, ca.status, ca.created_at, cp.first_name, cp.middle_name, 
         cp.last_name, cp.email, cp.phone_number, cp.barangay, cp.city_municipality, 
         cp.province, cp.years_of_residency, cp.months_of_residency
ORDER BY ca.created_at ASC;
