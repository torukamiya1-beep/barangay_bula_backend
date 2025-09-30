-- Simple migration to add verification document support

-- Add columns to document_beneficiaries table
ALTER TABLE document_beneficiaries 
ADD COLUMN verification_image_path VARCHAR(500) NULL,
ADD COLUMN verification_image_name VARCHAR(200) NULL,
ADD COLUMN verification_image_size INT NULL,
ADD COLUMN verification_image_mime_type VARCHAR(100) NULL,
ADD COLUMN verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
ADD COLUMN verified_by INT NULL,
ADD COLUMN verified_at TIMESTAMP NULL,
ADD COLUMN verification_notes TEXT NULL;

-- Add columns to authorized_pickup_persons table
ALTER TABLE authorized_pickup_persons 
ADD COLUMN id_image_path VARCHAR(500) NULL,
ADD COLUMN id_image_name VARCHAR(200) NULL,
ADD COLUMN id_image_size INT NULL,
ADD COLUMN id_image_mime_type VARCHAR(100) NULL;

-- Create beneficiary verification documents table
CREATE TABLE IF NOT EXISTS beneficiary_verification_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    beneficiary_id INT NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_name VARCHAR(200) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT NULL,
    verified_at TIMESTAMP NULL,
    verification_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add verification_notes column to authorization_documents if it doesn't exist
ALTER TABLE authorization_documents
ADD COLUMN verification_notes TEXT;
