-- =====================================================
-- MIGRATION: Add Document Verification Status
-- Version: 1.0
-- Date: 2025-01-21
-- Description: Add verification_status and account_id to supporting_documents, 
--              authorization_documents, and document_beneficiaries tables
-- =====================================================

-- 1. Modify supporting_documents table
ALTER TABLE supporting_documents
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER is_verified,
ADD COLUMN IF NOT EXISTS account_id INT AFTER request_id,
ADD INDEX IF NOT EXISTS idx_verification_status (verification_status),
ADD INDEX IF NOT EXISTS idx_account_id (account_id);

-- Populate account_id from request
UPDATE supporting_documents sd
JOIN document_requests dr ON sd.request_id = dr.id
SET sd.account_id = dr.client_id
WHERE sd.account_id IS NULL;

-- 2. Modify authorization_documents table
ALTER TABLE authorization_documents
ADD COLUMN IF NOT EXISTS verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER is_verified,
ADD COLUMN IF NOT EXISTS account_id INT AFTER authorized_pickup_person_id,
ADD INDEX IF NOT EXISTS idx_verification_status (verification_status),
ADD INDEX IF NOT EXISTS idx_account_id (account_id);

-- Populate account_id from request via pickup person
UPDATE authorization_documents ad
JOIN authorized_pickup_persons app ON ad.authorized_pickup_person_id = app.id
JOIN document_requests dr ON app.request_id = dr.id
SET ad.account_id = dr.client_id
WHERE ad.account_id IS NULL;

-- 3. Modify document_beneficiaries table (already has verification_status, just add account_id)
ALTER TABLE document_beneficiaries
ADD COLUMN IF NOT EXISTS account_id INT AFTER request_id,
ADD INDEX IF NOT EXISTS idx_account_id (account_id);

-- Add index for verification_status if it doesn't exist
ALTER TABLE document_beneficiaries
ADD INDEX IF NOT EXISTS idx_verification_status (verification_status);

-- Populate account_id from request
UPDATE document_beneficiaries db
JOIN document_requests dr ON db.request_id = dr.id
SET db.account_id = dr.client_id
WHERE db.account_id IS NULL;

-- Verify changes
SELECT 'Migration completed successfully' as status;
SELECT 'supporting_documents' as table_name, COUNT(*) as total_records FROM supporting_documents;
SELECT 'authorization_documents' as table_name, COUNT(*) as total_records FROM authorization_documents;
SELECT 'document_beneficiaries' as table_name, COUNT(*) as total_records FROM document_beneficiaries;
