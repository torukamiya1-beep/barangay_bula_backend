-- Migration: Fix Cedula Missing Columns
-- Date: 2025-01-13
-- Description: Add missing columns to cedula_applications table for complete tax calculation

USE barangay_management_system;

-- Add missing columns to cedula_applications table
ALTER TABLE cedula_applications
ADD COLUMN IF NOT EXISTS has_personal_property TINYINT(1) DEFAULT 0 COMMENT 'Whether applicant has personal property',
ADD COLUMN IF NOT EXISTS personal_property_value DECIMAL(15,2) DEFAULT NULL COMMENT 'Personal property value for tax calculation',
ADD COLUMN IF NOT EXISTS business_gross_receipts DECIMAL(15,2) DEFAULT NULL COMMENT 'Business gross receipts for tax calculation';

-- Update the existing CedulaApplication model to include these fields
-- The backend model and service will be updated separately

-- Verify the changes
SELECT 'Cedula applications table updated successfully' AS result;
DESCRIBE cedula_applications;

-- Show sample data to verify structure
SELECT 'Sample cedula applications data:' AS info;
SELECT ca.id, ca.request_id, ca.annual_income, ca.property_assessed_value, 
       ca.personal_property_value, ca.business_gross_receipts, ca.computed_tax,
       dr.request_number, dr.total_document_fee
FROM cedula_applications ca
JOIN document_requests dr ON ca.request_id = dr.id
ORDER BY ca.id DESC
LIMIT 5;
