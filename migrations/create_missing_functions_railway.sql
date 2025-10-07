-- ============================================================================
-- RAILWAY DATABASE MIGRATION: CREATE MISSING STORED FUNCTIONS
-- ============================================================================
-- This script creates the stored functions required for the application
-- that are missing from the Railway production database.
--
-- Functions included:
-- 1. GenerateRequestNumber - Generates unique request numbers for documents
-- 2. GenerateTransactionId - Generates unique transaction IDs for payments
-- 3. CalculateAge - Calculates age from birth date
-- 4. CalculateProcessingFee - Calculates processing fees for payment methods
--
-- Usage:
-- 1. Connect to Railway MySQL database
-- 2. Execute this entire script
-- 3. Verify functions are created successfully
-- ============================================================================

-- Set delimiter for function creation
DELIMITER $$

-- ============================================================================
-- FUNCTION: GenerateRequestNumber
-- ============================================================================
-- Purpose: Generates unique request numbers for document requests
-- Format: DOC-YYYY-NNNNNN (e.g., CED-2025-000001, BC-2025-000123)
-- Parameters:
--   - doc_type: Document type code ('CED' for Cedula, 'BC' for Barangay Clearance)
-- Returns: VARCHAR(50) - Formatted request number
-- ============================================================================

DROP FUNCTION IF EXISTS GenerateRequestNumber$$

CREATE FUNCTION GenerateRequestNumber(doc_type VARCHAR(10)) 
RETURNS VARCHAR(50) 
CHARSET utf8mb4 
COLLATE utf8mb4_general_ci 
DETERMINISTIC 
READS SQL DATA
BEGIN
    DECLARE next_seq INT;
    DECLARE current_year VARCHAR(4);
    DECLARE request_num VARCHAR(50);

    -- Get current year
    SET current_year = YEAR(CURDATE());

    -- Get next sequence number for the year
    -- Finds the highest sequence number for this document type and year, then adds 1
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number, -6) AS UNSIGNED)), 0) + 1
    INTO next_seq
    FROM document_requests
    WHERE request_number LIKE CONCAT(doc_type, '-', current_year, '-%');

    -- Format: DOC-YYYY-NNNNNN (e.g., CED-2025-000001)
    SET request_num = CONCAT(doc_type, '-', current_year, '-', LPAD(next_seq, 6, '0'));

    RETURN request_num;
END$$

-- ============================================================================
-- FUNCTION: GenerateTransactionId
-- ============================================================================
-- Purpose: Generates unique transaction IDs for payment transactions
-- Format: TXN-TIMESTAMP-RANDOM (e.g., TXN-1704067200-123456)
-- Parameters: None
-- Returns: VARCHAR(100) - Formatted transaction ID
-- ============================================================================

DROP FUNCTION IF EXISTS GenerateTransactionId$$

CREATE FUNCTION GenerateTransactionId() 
RETURNS VARCHAR(100) 
CHARSET utf8mb4 
COLLATE utf8mb4_general_ci 
DETERMINISTIC 
READS SQL DATA
BEGIN
    DECLARE transaction_id VARCHAR(100);
    DECLARE timestamp_str VARCHAR(20);
    DECLARE random_suffix VARCHAR(10);

    -- Get current Unix timestamp
    SET timestamp_str = UNIX_TIMESTAMP();
    
    -- Generate random 6-digit suffix
    SET random_suffix = LPAD(FLOOR(RAND() * 1000000), 6, '0');
    
    -- Format: TXN-TIMESTAMP-RANDOM
    SET transaction_id = CONCAT('TXN-', timestamp_str, '-', random_suffix);

    RETURN transaction_id;
END$$

-- ============================================================================
-- FUNCTION: CalculateAge
-- ============================================================================
-- Purpose: Calculates age in years from birth date
-- Parameters:
--   - birth_date: DATE - The birth date to calculate age from
-- Returns: INT - Age in years
-- ============================================================================

DROP FUNCTION IF EXISTS CalculateAge$$

CREATE FUNCTION CalculateAge(birth_date DATE) 
RETURNS INT 
DETERMINISTIC 
READS SQL DATA
BEGIN
    -- Calculate age considering if birthday has passed this year
    RETURN YEAR(CURDATE()) - YEAR(birth_date) - 
           (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(birth_date, '%m%d'));
END$$

-- ============================================================================
-- FUNCTION: CalculateProcessingFee
-- ============================================================================
-- Purpose: Calculates processing fees based on amount and payment method
-- Parameters:
--   - amount: DECIMAL(10,2) - The base amount to calculate fee for
--   - payment_method_id: INT - The payment method ID
-- Returns: DECIMAL(10,2) - Calculated processing fee
-- ============================================================================

DROP FUNCTION IF EXISTS CalculateProcessingFee$$

CREATE FUNCTION CalculateProcessingFee(amount DECIMAL(10,2), payment_method_id INT) 
RETURNS DECIMAL(10,2) 
DETERMINISTIC 
READS SQL DATA
BEGIN
    DECLARE fee_percentage DECIMAL(5,2);
    DECLARE fee_fixed DECIMAL(10,2);
    DECLARE total_fee DECIMAL(10,2);

    -- Get fee structure from payment_methods table
    SELECT processing_fee_percentage, processing_fee_fixed
    INTO fee_percentage, fee_fixed
    FROM payment_methods
    WHERE id = payment_method_id;

    -- Calculate total fee: (amount * percentage / 100) + fixed fee
    SET total_fee = (amount * fee_percentage / 100) + fee_fixed;
    
    RETURN total_fee;
END$$

-- Reset delimiter
DELIMITER ;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after executing the script to verify functions are created

-- Check if functions exist
SELECT 
    ROUTINE_NAME as function_name,
    ROUTINE_TYPE as type,
    DATA_TYPE as return_type,
    ROUTINE_DEFINITION as definition_preview
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA = DATABASE()
  AND ROUTINE_TYPE = 'FUNCTION'
  AND ROUTINE_NAME IN ('GenerateRequestNumber', 'GenerateTransactionId', 'CalculateAge', 'CalculateProcessingFee')
ORDER BY ROUTINE_NAME;

-- Test GenerateRequestNumber function
-- SELECT GenerateRequestNumber('CED') as cedula_request_number;
-- SELECT GenerateRequestNumber('BC') as barangay_clearance_request_number;

-- Test GenerateTransactionId function
-- SELECT GenerateTransactionId() as transaction_id;

-- Test CalculateAge function
-- SELECT CalculateAge('1990-05-15') as age_test;

-- Test CalculateProcessingFee function (requires payment_methods table to have data)
-- SELECT CalculateProcessingFee(100.00, 1) as processing_fee_test;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This script uses DROP FUNCTION IF EXISTS to safely recreate functions
-- 2. All functions are marked as DETERMINISTIC and READS SQL DATA
-- 3. The DEFINER clause is omitted for Railway compatibility
-- 4. Character set is utf8mb4 with utf8mb4_general_ci collation
-- 5. Functions depend on existing tables: document_requests, payment_methods
-- ============================================================================

