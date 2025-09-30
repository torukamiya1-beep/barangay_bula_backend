-- Migration: Add total_document_fee column to replace chaotic fee system
-- Date: 2025-09-08
-- Purpose: Fix PayMongo payment accuracy by using single authoritative fee amount

-- Step 1: Add the new total_document_fee column
ALTER TABLE document_requests 
ADD COLUMN total_document_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 
AFTER delivery_fee;

-- Step 2: Migrate existing data from multiple fee columns to single fee
UPDATE document_requests 
SET total_document_fee = COALESCE(base_fee, 0) + COALESCE(additional_fees, 0) + COALESCE(processing_fee, 0) + COALESCE(delivery_fee, 0);

-- Step 3: Update the view to use total_document_fee instead of calculated total_fee
-- Note: Skip view update for now since v_clients view may not exist
-- The view will be updated after confirming the database structure

-- Step 4: Verify migration worked correctly
-- Show sample data to verify migration
SELECT 
  id,
  request_number,
  base_fee,
  additional_fees,
  processing_fee,
  delivery_fee,
  total_document_fee,
  (base_fee + additional_fees + processing_fee + delivery_fee) AS calculated_old_total,
  CASE 
    WHEN total_document_fee = (base_fee + additional_fees + processing_fee + delivery_fee) 
    THEN 'MATCH' 
    ELSE 'MISMATCH' 
  END AS migration_status
FROM document_requests 
ORDER BY id DESC 
LIMIT 10;

-- Step 5: Add index for performance
CREATE INDEX idx_total_document_fee ON document_requests(total_document_fee);

-- Note: Keep old columns for now during testing phase
-- After confirming everything works correctly, run these commands:
-- ALTER TABLE document_requests DROP COLUMN base_fee;
-- ALTER TABLE document_requests DROP COLUMN additional_fees;
-- ALTER TABLE document_requests DROP COLUMN processing_fee;
-- ALTER TABLE document_requests DROP COLUMN delivery_fee;
