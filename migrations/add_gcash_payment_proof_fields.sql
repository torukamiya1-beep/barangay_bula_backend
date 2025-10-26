-- GCash Manual Payment Migration
-- Date: October 25, 2025
-- Purpose: Add GCash payment proof fields to document_requests table

-- Add GCash payment proof columns to document_requests table
ALTER TABLE document_requests
ADD COLUMN gcash_proof_path VARCHAR(500) DEFAULT NULL,
ADD COLUMN gcash_proof_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN gcash_proof_uploaded_at TIMESTAMP NULL,
ADD COLUMN gcash_verification_status ENUM('pending','verified','rejected') DEFAULT NULL,
ADD COLUMN gcash_verified_by INT(11) DEFAULT NULL,
ADD COLUMN gcash_verified_at TIMESTAMP NULL,
ADD COLUMN gcash_rejection_reason TEXT DEFAULT NULL,
ADD COLUMN gcash_reference_number VARCHAR(50) DEFAULT NULL,
ADD CONSTRAINT fk_gcash_verified_by FOREIGN KEY (gcash_verified_by) 
    REFERENCES admin_employee_accounts(id) ON DELETE SET NULL;

-- Add index for faster queries on verification status
CREATE INDEX idx_gcash_verification_status ON document_requests(gcash_verification_status);

-- Add GCash Manual payment method to payment_methods table
INSERT INTO payment_methods (method_name, method_code, description, is_online, 
    is_active, processing_fee_percentage, processing_fee_fixed, requires_verification)
VALUES ('GCash Manual Upload', 'GCASH_MANUAL', 
    'Upload GCash payment proof for verification', 1, 1, 0.00, 0.00, 1);

-- Verify migration
-- Run these commands to verify:
-- DESCRIBE document_requests;
-- SHOW COLUMNS FROM document_requests LIKE 'gcash%';
-- SELECT * FROM payment_methods WHERE method_code = 'GCASH_MANUAL';
