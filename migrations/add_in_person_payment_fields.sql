-- Migration: Add fields for in-person payment verification
-- Date: 2025-07-13
-- Description: Adds fields to support in-person payment verification by admin staff

-- Add fields to payment_transactions table for in-person payment verification
ALTER TABLE payment_transactions 
ADD COLUMN verified_by INT NULL COMMENT 'Admin who verified in-person payment',
ADD COLUMN verified_at TIMESTAMP NULL COMMENT 'When payment was verified',
ADD COLUMN receipt_number VARCHAR(100) NULL COMMENT 'Physical receipt number for cash payments',
ADD COLUMN verification_notes TEXT NULL COMMENT 'Additional notes from payment verification';

-- Add foreign key constraint for verified_by
ALTER TABLE payment_transactions 
ADD CONSTRAINT fk_payment_verified_by 
FOREIGN KEY (verified_by) REFERENCES admin_employee_accounts(id);

-- Add index for better query performance
ALTER TABLE payment_transactions 
ADD INDEX idx_verified_by (verified_by),
ADD INDEX idx_verified_at (verified_at),
ADD INDEX idx_receipt_number (receipt_number);

-- Update payment_methods table to include verification requirements
ALTER TABLE payment_methods 
ADD COLUMN requires_verification BOOLEAN DEFAULT FALSE COMMENT 'Whether payment method requires manual verification';

-- Update cash payment method to require verification
UPDATE payment_methods 
SET requires_verification = TRUE 
WHERE method_code = 'CASH';

-- Create view for payment verification dashboard
CREATE OR REPLACE VIEW v_payment_verification_queue AS
SELECT 
    dr.id as request_id,
    dr.request_number,
    dr.status_id,
    rs.status_name,
    dt.document_name,
    dt.base_fee,
    pm.method_name as payment_method,
    pm.requires_verification,
    CONCAT(c.first_name, ' ', c.last_name) as client_name,
    c.email as client_email,
    dr.created_at as request_date,
    dr.approved_at,
    dr.payment_status,
    pt.transaction_id,
    pt.amount as payment_amount,
    pt.status as transaction_status,
    pt.verified_by,
    pt.verified_at,
    pt.receipt_number,
    CONCAT(admin.first_name, ' ', admin.last_name) as verified_by_name
FROM document_requests dr
JOIN request_status rs ON dr.status_id = rs.id
JOIN document_types dt ON dr.document_type_id = dt.id
JOIN payment_methods pm ON dr.payment_method_id = pm.id
JOIN client_accounts c ON dr.client_id = c.id
LEFT JOIN payment_transactions pt ON dr.id = pt.request_id
LEFT JOIN admin_employee_accounts admin ON pt.verified_by = admin.id
WHERE dr.status_id = 4 -- approved status
  AND pm.requires_verification = TRUE
  AND (dr.payment_status = 'pending' OR dr.payment_status IS NULL)
ORDER BY dr.created_at ASC;

-- Create view for payment audit trail
CREATE OR REPLACE VIEW v_payment_audit_trail AS
SELECT 
    pt.id as transaction_id,
    pt.transaction_id as reference_number,
    dr.request_number,
    dt.document_name,
    pm.method_name as payment_method,
    pt.amount,
    pt.processing_fee,
    pt.net_amount,
    pt.status as payment_status,
    pt.created_at as initiated_at,
    pt.verified_at,
    pt.receipt_number,
    pt.verification_notes,
    CONCAT(c.first_name, ' ', c.last_name) as client_name,
    CONCAT(admin.first_name, ' ', admin.last_name) as verified_by_name,
    CASE 
        WHEN pm.is_online = 1 THEN 'Online'
        ELSE 'In-Person'
    END as payment_type
FROM payment_transactions pt
JOIN document_requests dr ON pt.request_id = dr.id
JOIN document_types dt ON dr.document_type_id = dt.id
JOIN payment_methods pm ON pt.payment_method_id = pm.id
JOIN client_accounts c ON dr.client_id = c.id
LEFT JOIN admin_employee_accounts admin ON pt.verified_by = admin.id
ORDER BY pt.created_at DESC;
