-- Migration: Create receipts table for transaction history
-- Date: 2025-01-17
-- Description: Creates receipts table to store payment receipts for client transactions view

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_id INT NOT NULL,
  client_id INT NOT NULL,
  request_id INT NOT NULL,
  receipt_number VARCHAR(100) NOT NULL UNIQUE,
  
  -- Client information (denormalized for performance)
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(100),
  client_phone VARCHAR(20),
  
  -- Request information
  request_number VARCHAR(100) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  
  -- Payment information
  payment_method VARCHAR(50) NOT NULL,
  payment_method_code VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  processing_fee DECIMAL(10,2) DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PHP',
  
  -- Transaction details
  external_transaction_id VARCHAR(100),
  paymongo_payment_intent_id VARCHAR(100),
  payment_status ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded') DEFAULT 'succeeded',
  
  -- Receipt metadata
  receipt_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_date TIMESTAMP NULL,
  
  -- Additional details
  description TEXT,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraints
  FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES client_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (request_id) REFERENCES document_requests(id) ON DELETE CASCADE,
  
  -- Indexes for performance
  INDEX idx_client_id (client_id),
  INDEX idx_request_id (request_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_receipt_number (receipt_number),
  INDEX idx_receipt_date (receipt_date),
  INDEX idx_payment_status (payment_status),
  INDEX idx_external_transaction_id (external_transaction_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create view for complete receipt information
CREATE OR REPLACE VIEW v_receipts_complete AS
SELECT 
  r.*,
  pt.initiated_at as payment_initiated_at,
  pt.completed_at as payment_completed_at,
  dr.status_id as request_status_id,
  rs.status_name as request_status,
  dt.type_name as document_type_full,
  dt.base_fee as document_base_fee
FROM receipts r
JOIN payment_transactions pt ON r.transaction_id = pt.id
JOIN document_requests dr ON r.request_id = dr.id
JOIN request_status rs ON dr.status_id = rs.id
JOIN document_types dt ON dr.document_type_id = dt.id;

-- Insert existing successful payments as receipts
INSERT INTO receipts (
  transaction_id,
  client_id,
  request_id,
  receipt_number,
  client_name,
  client_email,
  client_phone,
  request_number,
  document_type,
  payment_method,
  payment_method_code,
  amount,
  processing_fee,
  net_amount,
  currency,
  external_transaction_id,
  paymongo_payment_intent_id,
  payment_status,
  receipt_date,
  payment_date,
  description
)
SELECT 
  pt.id as transaction_id,
  dr.client_id,
  pt.request_id,
  CONCAT('RCP-', LPAD(pt.id, 8, '0')) as receipt_number,
  CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
  cp.email as client_email,
  cp.phone_number as client_phone,
  dr.request_number,
  dt.type_name as document_type,
  pm.method_name as payment_method,
  pm.method_code as payment_method_code,
  pt.amount,
  pt.processing_fee,
  pt.net_amount,
  pt.currency,
  pt.external_transaction_id,
  pt.paymongo_payment_intent_id,
  pt.status as payment_status,
  COALESCE(pt.completed_at, pt.created_at) as receipt_date,
  pt.completed_at as payment_date,
  pt.payment_description as description
FROM payment_transactions pt
JOIN document_requests dr ON pt.request_id = dr.id
JOIN client_profiles cp ON dr.client_id = cp.account_id
JOIN document_types dt ON dr.document_type_id = dt.id
JOIN payment_methods pm ON pt.payment_method_id = pm.id
WHERE pt.status IN ('succeeded', 'processing')
  AND NOT EXISTS (
    SELECT 1 FROM receipts r WHERE r.transaction_id = pt.id
  );

-- Add trigger to automatically create receipts for successful payments
DELIMITER //

CREATE TRIGGER tr_create_receipt_on_payment_success
AFTER UPDATE ON payment_transactions
FOR EACH ROW
BEGIN
  -- Only create receipt if payment status changed to succeeded and no receipt exists
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    -- Check if receipt already exists
    IF NOT EXISTS (SELECT 1 FROM receipts WHERE transaction_id = NEW.id) THEN
      -- Insert receipt with data from related tables
      INSERT INTO receipts (
        transaction_id,
        client_id,
        request_id,
        receipt_number,
        client_name,
        client_email,
        client_phone,
        request_number,
        document_type,
        payment_method,
        payment_method_code,
        amount,
        processing_fee,
        net_amount,
        currency,
        external_transaction_id,
        paymongo_payment_intent_id,
        payment_status,
        receipt_date,
        payment_date,
        description
      )
      SELECT 
        NEW.id as transaction_id,
        dr.client_id,
        NEW.request_id,
        CONCAT('RCP-', LPAD(NEW.id, 8, '0')) as receipt_number,
        CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
        cp.email as client_email,
        cp.phone_number as client_phone,
        dr.request_number,
        dt.type_name as document_type,
        pm.method_name as payment_method,
        pm.method_code as payment_method_code,
        NEW.amount,
        NEW.processing_fee,
        NEW.net_amount,
        NEW.currency,
        NEW.external_transaction_id,
        NEW.paymongo_payment_intent_id,
        NEW.status as payment_status,
        COALESCE(NEW.completed_at, NOW()) as receipt_date,
        NEW.completed_at as payment_date,
        NEW.payment_description as description
      FROM document_requests dr
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN payment_methods pm ON NEW.payment_method_id = pm.id
      WHERE dr.id = NEW.request_id;
    END IF;
  END IF;
END//

DELIMITER ;

-- Add indexes for better query performance
CREATE INDEX idx_receipts_client_date ON receipts(client_id, receipt_date DESC);
CREATE INDEX idx_receipts_status_date ON receipts(payment_status, receipt_date DESC);
