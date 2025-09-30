-- Migration: Make purpose_details column nullable
-- Date: 2025-01-14
-- Description: Updates purpose_details column to be nullable to support conditional display
--              when purpose category is not "Other" (id=10)

-- Make purpose_details nullable in document_requests table
ALTER TABLE document_requests 
MODIFY COLUMN purpose_details TEXT NULL;

-- Add comment to document the change
ALTER TABLE document_requests 
COMMENT = 'Document requests table - purpose_details is nullable when not required for specific categories';
