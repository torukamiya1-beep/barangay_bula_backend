-- Migration: Update Address Structure for Dropdown Selection
-- Date: 2025-01-08
-- Description: Add region and address codes to support Region → Province → City → Barangay dropdown selection

-- 1. Add region field and address codes to client_profiles table
ALTER TABLE client_profiles 
ADD COLUMN region VARCHAR(100) NULL AFTER province,
ADD COLUMN region_code VARCHAR(20) NULL AFTER region,
ADD COLUMN province_code VARCHAR(20) NULL AFTER region_code,
ADD COLUMN city_code VARCHAR(20) NULL AFTER province_code,
ADD COLUMN barangay_code VARCHAR(20) NULL AFTER city_code;

-- 2. Add indexes for better performance on address lookups
CREATE INDEX idx_region ON client_profiles(region);
CREATE INDEX idx_region_code ON client_profiles(region_code);
CREATE INDEX idx_province_code ON client_profiles(province_code);
CREATE INDEX idx_city_code ON client_profiles(city_code);
CREATE INDEX idx_barangay_code ON client_profiles(barangay_code);

-- 3. Update document_beneficiaries table (if exists) to include region and codes
-- Check if table exists first
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables 
                    WHERE table_schema = DATABASE() AND table_name = 'document_beneficiaries');

SET @sql = IF(@table_exists > 0,
    'ALTER TABLE document_beneficiaries 
     ADD COLUMN region VARCHAR(100) NULL AFTER province,
     ADD COLUMN region_code VARCHAR(20) NULL AFTER region,
     ADD COLUMN province_code VARCHAR(20) NULL AFTER region_code,
     ADD COLUMN city_code VARCHAR(20) NULL AFTER province_code,
     ADD COLUMN barangay_code VARCHAR(20) NULL AFTER city_code',
    'SELECT "document_beneficiaries table does not exist, skipping..." as message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Create a view for complete address information
CREATE OR REPLACE VIEW client_complete_addresses AS
SELECT 
    cp.id,
    cp.account_id,
    cp.first_name,
    cp.last_name,
    cp.house_number,
    cp.street,
    cp.subdivision,
    cp.barangay,
    cp.barangay_code,
    cp.city_municipality,
    cp.city_code,
    cp.province,
    cp.province_code,
    cp.region,
    cp.region_code,
    cp.postal_code,
    -- Construct full address
    CONCAT_WS(', ',
        NULLIF(CONCAT_WS(' ', cp.house_number, cp.street), ''),
        NULLIF(cp.subdivision, ''),
        CONCAT('Brgy. ', cp.barangay),
        cp.city_municipality,
        cp.province,
        cp.region,
        NULLIF(cp.postal_code, '')
    ) AS full_address,
    -- Construct address without house details (for matching)
    CONCAT_WS(', ',
        CONCAT('Brgy. ', cp.barangay),
        cp.city_municipality,
        cp.province,
        cp.region
    ) AS standard_address
FROM client_profiles cp;

-- 5. Create helper function to validate address codes (stored procedure)
DELIMITER //
CREATE PROCEDURE ValidateAddressCodes(
    IN p_region_code VARCHAR(20),
    IN p_province_code VARCHAR(20),
    IN p_city_code VARCHAR(20),
    IN p_barangay_code VARCHAR(20),
    OUT p_is_valid BOOLEAN,
    OUT p_error_message VARCHAR(255)
)
BEGIN
    DECLARE region_exists INT DEFAULT 0;
    DECLARE province_exists INT DEFAULT 0;
    DECLARE city_exists INT DEFAULT 0;
    DECLARE barangay_exists INT DEFAULT 0;
    
    SET p_is_valid = FALSE;
    SET p_error_message = '';
    
    -- Note: This is a placeholder for validation logic
    -- In a real implementation, you would validate against the Philippine address data
    -- For now, we'll just check that codes are not empty
    
    IF p_region_code IS NULL OR p_region_code = '' THEN
        SET p_error_message = 'Region code is required';
    ELSEIF p_province_code IS NULL OR p_province_code = '' THEN
        SET p_error_message = 'Province code is required';
    ELSEIF p_city_code IS NULL OR p_city_code = '' THEN
        SET p_error_message = 'City code is required';
    ELSEIF p_barangay_code IS NULL OR p_barangay_code = '' THEN
        SET p_error_message = 'Barangay code is required';
    ELSE
        SET p_is_valid = TRUE;
        SET p_error_message = 'Address codes are valid';
    END IF;
END //
DELIMITER ;

-- 6. Update existing records to have region = 'Region IV-A (CALABARZON)' for Laguna province
-- This is a reasonable assumption for existing Barangay Bula records
UPDATE client_profiles 
SET region = 'Region IV-A (CALABARZON)',
    region_code = '04'
WHERE province LIKE '%Laguna%' OR province LIKE '%LAGUNA%';

-- 7. Create trigger to ensure address consistency
DELIMITER //
CREATE TRIGGER tr_client_profiles_address_consistency
    BEFORE INSERT ON client_profiles
    FOR EACH ROW
BEGIN
    -- Ensure that if codes are provided, names are also provided
    IF NEW.region_code IS NOT NULL AND (NEW.region IS NULL OR NEW.region = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Region name is required when region code is provided';
    END IF;
    
    IF NEW.province_code IS NOT NULL AND (NEW.province IS NULL OR NEW.province = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Province name is required when province code is provided';
    END IF;
    
    IF NEW.city_code IS NOT NULL AND (NEW.city_municipality IS NULL OR NEW.city_municipality = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'City name is required when city code is provided';
    END IF;
    
    IF NEW.barangay_code IS NOT NULL AND (NEW.barangay IS NULL OR NEW.barangay = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Barangay name is required when barangay code is provided';
    END IF;
END //
DELIMITER ;

-- 8. Create similar trigger for updates
DELIMITER //
CREATE TRIGGER tr_client_profiles_address_consistency_update
    BEFORE UPDATE ON client_profiles
    FOR EACH ROW
BEGIN
    -- Ensure that if codes are provided, names are also provided
    IF NEW.region_code IS NOT NULL AND (NEW.region IS NULL OR NEW.region = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Region name is required when region code is provided';
    END IF;
    
    IF NEW.province_code IS NOT NULL AND (NEW.province IS NULL OR NEW.province = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Province name is required when province code is provided';
    END IF;
    
    IF NEW.city_code IS NOT NULL AND (NEW.city_municipality IS NULL OR NEW.city_municipality = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'City name is required when city code is provided';
    END IF;
    
    IF NEW.barangay_code IS NOT NULL AND (NEW.barangay IS NULL OR NEW.barangay = '') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Barangay name is required when barangay code is provided';
    END IF;
END //
DELIMITER ;
