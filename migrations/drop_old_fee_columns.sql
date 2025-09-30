-- Drop Old Fee Columns Migration & Fix Cedula Calculations
-- This migration removes the old chaotic fee structure columns and fixes existing Cedula records

USE rhai_db;

-- Step 1: Drop old fee columns if they exist
ALTER TABLE document_requests DROP COLUMN IF EXISTS base_fee;
ALTER TABLE document_requests DROP COLUMN IF EXISTS additional_fee;
ALTER TABLE document_requests DROP COLUMN IF EXISTS processing_fee;
ALTER TABLE document_requests DROP COLUMN IF EXISTS delivery_fee;

SELECT 'Old fee columns dropped successfully' AS result;

-- Step 2: Fix existing Cedula records with incorrect total_document_fee
-- Recalculate based on the correct Philippine legal formula

UPDATE document_requests dr
JOIN document_types dt ON dr.document_type_id = dt.id
JOIN cedula_applications ca ON dr.id = ca.request_id
SET dr.total_document_fee = (
    -- Official Philippine Community Tax Formula (2024)
    5.00 + -- Basic community tax ₱5
    (FLOOR(COALESCE(ca.annual_income, 0) / 1000) * 1.00) + -- ₱1 per ₱1,000 income
    (CASE WHEN ca.property_assessed_value > 0 THEN FLOOR(ca.property_assessed_value / 1000) * 1.00 ELSE 0 END) + -- Property tax
    (CASE WHEN ca.personal_property_value >= 1000 THEN FLOOR(ca.personal_property_value / 1000) * 1.00 ELSE 0 END) + -- Personal property
    (CASE WHEN ca.business_gross_receipts > 0 THEN FLOOR(ca.business_gross_receipts / 1000) * 1.00 ELSE 0 END) + -- Business tax
    5.00 -- Processing fee
)
WHERE dt.type_name = 'Cedula';

SELECT 'Cedula records updated with correct Philippine legal formula' AS result;

-- Step 3: Verify the current structure
SELECT 'Current document_requests structure:' AS info;
DESCRIBE document_requests;

-- Step 4: Show updated Cedula records
SELECT 'Updated Cedula records:' AS info;
SELECT
    dr.id,
    dr.request_number,
    dr.total_document_fee,
    ca.annual_income,
    CONCAT('₱5 + (₱', ca.annual_income, ' ÷ 1000 × ₱1) + ₱5 processing = ₱', dr.total_document_fee) AS calculation_breakdown,
    dr.created_at
FROM document_requests dr
JOIN document_types dt ON dr.document_type_id = dt.id
JOIN cedula_applications ca ON dr.id = ca.request_id
WHERE dt.type_name = 'Cedula'
ORDER BY dr.created_at DESC
LIMIT 10;

-- Step 5: Show all recent records
SELECT 'All recent document requests:' AS info;
SELECT
    dr.id,
    dr.request_number,
    dt.type_name,
    dr.total_document_fee,
    dr.created_at
FROM document_requests dr
JOIN document_types dt ON dr.document_type_id = dt.id
ORDER BY dr.created_at DESC
LIMIT 5;
