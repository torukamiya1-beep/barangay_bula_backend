-- GCash Manual Payment Rollback
-- Date: October 25, 2025
-- Purpose: Rollback GCash payment proof fields if needed

-- Remove GCash payment method
DELETE FROM payment_methods WHERE method_code = 'GCASH_MANUAL';

-- Drop index and columns from document_requests
ALTER TABLE document_requests
DROP INDEX idx_gcash_verification_status,
DROP FOREIGN KEY fk_gcash_verified_by,
DROP COLUMN gcash_proof_path,
DROP COLUMN gcash_proof_name,
DROP COLUMN gcash_proof_uploaded_at,
DROP COLUMN gcash_verification_status,
DROP COLUMN gcash_verified_by,
DROP COLUMN gcash_verified_at,
DROP COLUMN gcash_rejection_reason,
DROP COLUMN gcash_reference_number;
