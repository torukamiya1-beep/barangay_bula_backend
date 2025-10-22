-- Migration: Create document_fees table for dynamic pricing
-- This table stores the pricing history for each document type
-- Previous transactions will always reference their original fee at the time of request

-- Create document_fees table
CREATE TABLE IF NOT EXISTS `document_fees` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `document_type_id` INT(11) NOT NULL,
  `fee_amount` DECIMAL(10,2) NOT NULL,
  `effective_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT(11) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_document_type_id` (`document_type_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_effective_date` (`effective_date`),
  CONSTRAINT `fk_document_fees_document_type` 
    FOREIGN KEY (`document_type_id`) 
    REFERENCES `document_types` (`id`) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert initial fees from document_types table
INSERT INTO `document_fees` (`document_type_id`, `fee_amount`, `effective_date`, `is_active`)
SELECT 
  `id` as document_type_id,
  `base_fee` as fee_amount,
  `created_at` as effective_date,
  1 as is_active
FROM `document_types`
WHERE `is_active` = 1;

-- Add comment to document_types.base_fee to indicate it's now managed via document_fees
ALTER TABLE `document_types` 
  MODIFY COLUMN `base_fee` DECIMAL(10,2) DEFAULT NULL 
  COMMENT 'Deprecated: Use document_fees table for current pricing';

-- Create view for easy access to current active fees
CREATE OR REPLACE VIEW `v_current_document_fees` AS
SELECT 
  dt.id as document_type_id,
  dt.type_name,
  dt.description,
  df.id as fee_id,
  df.fee_amount,
  df.effective_date,
  df.created_at as fee_created_at
FROM document_types dt
LEFT JOIN document_fees df ON dt.id = df.document_type_id AND df.is_active = 1
WHERE dt.is_active = 1
ORDER BY dt.id;
