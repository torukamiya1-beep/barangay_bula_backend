-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jun 08, 2025 at 10:36 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Database: `barangay_management_system`
--
CREATE DATABASE IF NOT EXISTS `barangay_management_system` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `barangay_management_system`;

DELIMITER $$
--
-- Functions
--
CREATE FUNCTION `CalculateAge` (`birth_date` DATE) RETURNS INT(11) DETERMINISTIC READS SQL DATA
BEGIN
    RETURN YEAR(CURDATE()) - YEAR(birth_date) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(birth_date, '%m%d'));
END$$

CREATE FUNCTION `CalculateProcessingFee` (`amount` DECIMAL(10,2), `payment_method_id` INT) RETURNS DECIMAL(10,2) DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE fee_percentage DECIMAL(5,2);
    DECLARE fee_fixed DECIMAL(10,2);
    DECLARE total_fee DECIMAL(10,2);

    SELECT processing_fee_percentage, processing_fee_fixed
    INTO fee_percentage, fee_fixed
    FROM payment_methods
    WHERE id = payment_method_id;

    SET total_fee = (amount * fee_percentage / 100) + fee_fixed;
    RETURN total_fee;
END$$

CREATE FUNCTION `GenerateRequestNumber` (`doc_type` VARCHAR(10)) RETURNS VARCHAR(50) CHARSET utf8mb4 COLLATE utf8mb4_general_ci DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE next_seq INT;
    DECLARE current_year VARCHAR(4);
    DECLARE request_num VARCHAR(50);

    SET current_year = YEAR(CURDATE());
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number, -6) AS UNSIGNED)), 0) + 1
    INTO next_seq
    FROM document_requests
    WHERE request_number LIKE CONCAT(doc_type, '-', current_year, '-%');

    SET request_num = CONCAT(doc_type, '-', current_year, '-', LPAD(next_seq, 6, '0'));
    RETURN request_num;
END$$

CREATE FUNCTION `GenerateTransactionId` () RETURNS VARCHAR(100) CHARSET utf8mb4 COLLATE utf8mb4_general_ci DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE transaction_id VARCHAR(100);
    DECLARE timestamp_str VARCHAR(20);
    DECLARE random_suffix VARCHAR(10);

    SET timestamp_str = UNIX_TIMESTAMP();
    SET random_suffix = LPAD(FLOOR(RAND() * 1000000), 6, '0');
    SET transaction_id = CONCAT('TXN-', timestamp_str, '-', random_suffix);
    RETURN transaction_id;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `admin_employee_accounts`
--
CREATE TABLE `admin_employee_accounts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','employee') NOT NULL,
  `status` ENUM('active','inactive','suspended') DEFAULT 'active',
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  `password_changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `admin_employee_profiles`
--
CREATE TABLE `admin_employee_profiles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `account_id` INT(11) NOT NULL,
  `employee_id` VARCHAR(20) DEFAULT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100) DEFAULT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `suffix` VARCHAR(10) DEFAULT NULL,
  `phone_number` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `profile_picture` VARCHAR(255) DEFAULT NULL,
  `position` VARCHAR(100) DEFAULT NULL,
  `department` VARCHAR(100) DEFAULT NULL,
  `hire_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  UNIQUE KEY `email` (`email`),
  KEY `account_id` (`account_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_email` (`email`),
  KEY `idx_full_name` (`last_name`,`first_name`),
  CONSTRAINT `admin_employee_profiles_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `admin_employee_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--
CREATE TABLE `audit_logs` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) DEFAULT NULL,
  `user_type` ENUM('admin','employee','client') NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `table_name` VARCHAR(100) DEFAULT NULL,
  `record_id` INT(11) DEFAULT NULL,
  `old_values` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (JSON_VALID(`old_values`)),
  `new_values` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (JSON_VALID(`new_values`)),
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `barangay_clearance_applications`
--
CREATE TABLE `barangay_clearance_applications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_id` INT(11) NOT NULL,
  `has_pending_cases` TINYINT(1) DEFAULT 0,
  `pending_cases_details` TEXT DEFAULT NULL,
  `voter_registration_number` VARCHAR(50) DEFAULT NULL,
  `precinct_number` VARCHAR(20) DEFAULT NULL,
  `emergency_contact_name` VARCHAR(200) DEFAULT NULL,
  `emergency_contact_relationship` VARCHAR(50) DEFAULT NULL,
  `emergency_contact_phone` VARCHAR(20) DEFAULT NULL,
  `emergency_contact_address` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  KEY `idx_voter_registration` (`voter_registration_number`),
  CONSTRAINT `barangay_clearance_applications_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cedula_applications`
--
CREATE TABLE `cedula_applications` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_id` INT(11) NOT NULL,
  `occupation` VARCHAR(100) DEFAULT NULL,
  `employer_name` VARCHAR(200) DEFAULT NULL,
  `employer_address` TEXT DEFAULT NULL,
  `monthly_income` DECIMAL(12,2) DEFAULT NULL,
  `annual_income` DECIMAL(12,2) DEFAULT NULL,
  `business_name` VARCHAR(200) DEFAULT NULL,
  `business_address` TEXT DEFAULT NULL,
  `business_type` VARCHAR(100) DEFAULT NULL,
  `business_income` DECIMAL(12,2) DEFAULT NULL,
  `has_real_property` TINYINT(1) DEFAULT 0,
  `property_assessed_value` DECIMAL(15,2) DEFAULT NULL,
  `property_location` TEXT DEFAULT NULL,
  `tin_number` VARCHAR(20) DEFAULT NULL,
  `previous_ctc_number` VARCHAR(50) DEFAULT NULL,
  `previous_ctc_date_issued` DATE DEFAULT NULL,
  `previous_ctc_place_issued` VARCHAR(100) DEFAULT NULL,
  `computed_tax` DECIMAL(10,2) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  KEY `idx_tin_number` (`tin_number`),
  KEY `idx_occupation` (`occupation`),
  CONSTRAINT `cedula_applications_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `civil_status`
--
CREATE TABLE `civil_status` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `status_name` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_name` (`status_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client_accounts`
--
CREATE TABLE `client_accounts` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('active','inactive','suspended','pending_verification') DEFAULT 'pending_verification',
  `email_verified` TINYINT(1) DEFAULT 0,
  `phone_verified` TINYINT(1) DEFAULT 0,
  `last_login` TIMESTAMP NULL DEFAULT NULL,
  `password_changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client_profiles`
--
CREATE TABLE `client_profiles` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `account_id` INT(11) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100) DEFAULT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `suffix` VARCHAR(10) DEFAULT NULL,
  `birth_date` DATE NOT NULL,
  `gender` ENUM('male','female') NOT NULL,
  `civil_status_id` INT(11) NOT NULL,
  `nationality` VARCHAR(50) DEFAULT 'Filipino',
  `phone_number` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `house_number` VARCHAR(20) DEFAULT NULL,
  `street` VARCHAR(100) DEFAULT NULL,
  `subdivision` VARCHAR(100) DEFAULT NULL,
  `barangay` VARCHAR(100) NOT NULL,
  `city_municipality` VARCHAR(100) NOT NULL,
  `province` VARCHAR(100) NOT NULL,
  `postal_code` VARCHAR(10) DEFAULT NULL,
  `years_of_residency` INT(11) DEFAULT NULL,
  `months_of_residency` INT(11) DEFAULT NULL,
  `profile_picture` VARCHAR(255) DEFAULT NULL,
  `is_verified` TINYINT(1) DEFAULT 0,
  `verified_by` INT(11) DEFAULT NULL,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `account_id` (`account_id`),
  KEY `civil_status_id` (`civil_status_id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_full_name` (`last_name`,`first_name`),
  KEY `idx_birth_date` (`birth_date`),
  KEY `idx_barangay` (`barangay`),
  KEY `idx_email` (`email`),
  KEY `idx_phone` (`phone_number`),
  CONSTRAINT `client_profiles_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `client_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_profiles_ibfk_2` FOREIGN KEY (`civil_status_id`) REFERENCES `civil_status` (`id`),
  CONSTRAINT `client_profiles_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_requests`
--
CREATE TABLE `document_requests` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_number` VARCHAR(50) NOT NULL,
  `client_id` INT(11) NOT NULL,
  `document_type_id` INT(11) NOT NULL,
  `purpose_category_id` INT(11) NOT NULL,
  `purpose_details` TEXT NOT NULL,
  `status_id` INT(11) NOT NULL,
  `priority` ENUM('normal','urgent') DEFAULT 'normal',
  `processed_by` INT(11) DEFAULT NULL,
  `approved_by` INT(11) DEFAULT NULL,
  `processed_at` TIMESTAMP NULL DEFAULT NULL,
  `approved_at` TIMESTAMP NULL DEFAULT NULL,
  `base_fee` DECIMAL(10,2) NOT NULL,
  `additional_fees` DECIMAL(10,2) DEFAULT 0.00,
  `processing_fee` DECIMAL(10,2) DEFAULT 0.00,
  `payment_method_id` INT(11) DEFAULT NULL,
  `payment_status` ENUM('pending','processing','paid','failed','refunded','cancelled') DEFAULT 'pending',
  `payment_reference` VARCHAR(100) DEFAULT NULL,
  `payment_provider_reference` VARCHAR(100) DEFAULT NULL,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `delivery_method` ENUM('pickup','delivery') DEFAULT 'pickup',
  `delivery_address` TEXT DEFAULT NULL,
  `delivery_fee` DECIMAL(10,2) DEFAULT 0.00,
  `requested_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `target_completion_date` DATE DEFAULT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `purpose_category_id` (`purpose_category_id`),
  KEY `processed_by` (`processed_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_request_number` (`request_number`),
  KEY `idx_client_id` (`client_id`),
  KEY `idx_document_type` (`document_type_id`),
  KEY `idx_status` (`status_id`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_payment_method` (`payment_method_id`),
  KEY `idx_requested_at` (`requested_at`),
  CONSTRAINT `document_requests_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `client_accounts` (`id`),
  CONSTRAINT `document_requests_ibfk_2` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`),
  CONSTRAINT `document_requests_ibfk_3` FOREIGN KEY (`purpose_category_id`) REFERENCES `purpose_categories` (`id`),
  CONSTRAINT `document_requests_ibfk_4` FOREIGN KEY (`status_id`) REFERENCES `request_status` (`id`),
  CONSTRAINT `document_requests_ibfk_5` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `document_requests_ibfk_6` FOREIGN KEY (`processed_by`) REFERENCES `admin_employee_accounts` (`id`),
  CONSTRAINT `document_requests_ibfk_7` FOREIGN KEY (`approved_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `document_types`
--
CREATE TABLE `document_types` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `type_name` VARCHAR(50) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `base_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_name` (`type_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `generated_documents`
--
CREATE TABLE `generated_documents` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_id` INT(11) NOT NULL,
  `document_number` VARCHAR(100) NOT NULL,
  `document_path` VARCHAR(500) DEFAULT NULL,
  `qr_code_data` TEXT DEFAULT NULL,
  `issued_date` DATE NOT NULL,
  `expiry_date` DATE DEFAULT NULL,
  `is_valid` TINYINT(1) DEFAULT 1,
  `issued_by` INT(11) NOT NULL,
  `authorized_signatory` VARCHAR(200) DEFAULT NULL,
  `security_hash` VARCHAR(255) DEFAULT NULL,
  `verification_code` VARCHAR(50) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_number` (`document_number`),
  KEY `request_id` (`request_id`),
  KEY `issued_by` (`issued_by`),
  KEY `idx_document_number` (`document_number`),
  KEY `idx_verification_code` (`verification_code`),
  KEY `idx_issued_date` (`issued_date`),
  CONSTRAINT `generated_documents_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`),
  CONSTRAINT `generated_documents_ibfk_2` FOREIGN KEY (`issued_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_methods`
--
CREATE TABLE `payment_methods` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `method_name` VARCHAR(50) NOT NULL,
  `method_code` VARCHAR(20) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_online` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `processing_fee_percentage` DECIMAL(5,2) DEFAULT 0.00,
  `processing_fee_fixed` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `method_name` (`method_name`),
  UNIQUE KEY `method_code` (`method_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_transactions`
--
CREATE TABLE `payment_transactions` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_id` INT(11) NOT NULL,
  `payment_method_id` INT(11) NOT NULL,
  `transaction_id` VARCHAR(100) NOT NULL,
  `external_transaction_id` VARCHAR(100) DEFAULT NULL,
  `paymongo_payment_intent_id` VARCHAR(100) DEFAULT NULL,
  `paymongo_payment_method_id` VARCHAR(100) DEFAULT NULL,
  `paymongo_source_id` VARCHAR(100) DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `processing_fee` DECIMAL(10,2) DEFAULT 0.00,
  `net_amount` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(3) DEFAULT 'PHP',
  `status` ENUM('pending','processing','succeeded','failed','cancelled','refunded') DEFAULT 'pending',
  `failure_reason` TEXT DEFAULT NULL,
  `payment_description` TEXT DEFAULT NULL,
  `customer_email` VARCHAR(100) DEFAULT NULL,
  `customer_phone` VARCHAR(20) DEFAULT NULL,
  `webhook_data` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (JSON_VALID(`webhook_data`)),
  `callback_url` VARCHAR(500) DEFAULT NULL,
  `success_url` VARCHAR(500) DEFAULT NULL,
  `cancel_url` VARCHAR(500) DEFAULT NULL,
  `initiated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  KEY `payment_method_id` (`payment_method_id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_external_transaction_id` (`external_transaction_id`),
  KEY `idx_paymongo_payment_intent` (`paymongo_payment_intent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_initiated_at` (`initiated_at`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_transactions_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_webhooks`
--
CREATE TABLE `payment_webhooks` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `webhook_id` VARCHAR(100) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `transaction_id` VARCHAR(100) DEFAULT NULL,
  `payment_transaction_id` INT(11) DEFAULT NULL,
  `payload` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (JSON_VALID(`payload`)),
  `signature` VARCHAR(500) DEFAULT NULL,
  `processed` TINYINT(1) DEFAULT 0,
  `processed_at` TIMESTAMP NULL DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `retry_count` INT(11) DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_transaction_id` (`payment_transaction_id`),
  KEY `idx_webhook_id` (`webhook_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_processed` (`processed`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `payment_webhooks_ibfk_1` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `purpose_categories`
--
CREATE TABLE `purpose_categories` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `request_status`
--
CREATE TABLE `request_status` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `status_name` VARCHAR(30) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_name` (`status_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `request_status_history`
--
CREATE TABLE `request_status_history` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_id` INT(11) NOT NULL,
  `old_status_id` INT(11) DEFAULT NULL,
  `new_status_id` INT(11) NOT NULL,
  `changed_by` INT(11) NOT NULL,
  `change_reason` TEXT DEFAULT NULL,
  `changed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `old_status_id` (`old_status_id`),
  KEY `new_status_id` (`new_status_id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `request_status_history_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `request_status_history_ibfk_2` FOREIGN KEY (`old_status_id`) REFERENCES `request_status` (`id`),
  CONSTRAINT `request_status_history_ibfk_3` FOREIGN KEY (`new_status_id`) REFERENCES `request_status` (`id`),
  CONSTRAINT `request_status_history_ibfk_4` FOREIGN KEY (`changed_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `supporting_documents`
--
CREATE TABLE `supporting_documents` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `request_id` INT(11) NOT NULL,
  `document_name` VARCHAR(200) NOT NULL,
  `document_type` VARCHAR(100) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_size` INT(11) DEFAULT NULL,
  `mime_type` VARCHAR(100) DEFAULT NULL,
  `uploaded_by` INT(11) NOT NULL,
  `is_verified` TINYINT(1) DEFAULT 0,
  `verified_by` INT(11) DEFAULT NULL,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_document_type` (`document_type`),
  CONSTRAINT `supporting_documents_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supporting_documents_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `client_accounts` (`id`),
  CONSTRAINT `supporting_documents_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--
CREATE TABLE `system_settings` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `setting_type` ENUM('string','number','boolean','json') DEFAULT 'string',
  `description` TEXT DEFAULT NULL,
  `is_public` TINYINT(1) DEFAULT 0,
  `updated_by` INT(11) DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_setting_key` (`setting_key`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure for view `v_client_complete`
--
CREATE VIEW `v_client_complete` AS
SELECT
  `ca`.`id` AS `account_id`,
  `ca`.`username` AS `username`,
  `ca`.`status` AS `account_status`,
  `ca`.`email_verified` AS `email_verified`,
  `ca`.`phone_verified` AS `phone_verified`,
  `cp`.`id` AS `profile_id`,
  CONCAT(
    `cp`.`first_name`,
    CASE WHEN `cp`.`middle_name` IS NOT NULL THEN CONCAT(' ', `cp`.`middle_name`) ELSE '' END,
    ' ',
    `cp`.`last_name`,
    CASE WHEN `cp`.`suffix` IS NOT NULL THEN CONCAT(' ', `cp`.`suffix`) ELSE '' END
  ) AS `full_name`,
  `cp`.`first_name` AS `first_name`,
  `cp`.`middle_name` AS `middle_name`,
  `cp`.`last_name` AS `last_name`,
  `cp`.`suffix` AS `suffix`,
  `cp`.`birth_date` AS `birth_date`,
  YEAR(CURDATE()) - YEAR(`cp`.`birth_date`) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(`cp`.`birth_date`, '%m%d')) AS `age`,
  `cp`.`gender` AS `gender`,
  `cs`.`status_name` AS `civil_status`,
  `cp`.`nationality` AS `nationality`,
  `cp`.`phone_number` AS `phone_number`,
  `cp`.`email` AS `email`,
  CONCAT_WS(
    ', ',
    NULLIF(CONCAT_WS(' ', `cp`.`house_number`, `cp`.`street`), ''),
    NULLIF(`cp`.`subdivision`, ''),
    `cp`.`barangay`,
    `cp`.`city_municipality`,
    `cp`.`province`,
    NULLIF(`cp`.`postal_code`, '')
  ) AS `complete_address`,
  `cp`.`barangay` AS `barangay`,
  `cp`.`city_municipality` AS `city_municipality`,
  `cp`.`province` AS `province`,
  `cp`.`years_of_residency` AS `years_of_residency`,
  `cp`.`months_of_residency` AS `months_of_residency`,
  `cp`.`is_verified` AS `is_verified`,
  `cp`.`verified_at` AS `verified_at`
FROM
  `client_accounts` `ca`
  JOIN `client_profiles` `cp` ON `ca`.`id` = `cp`.`account_id`
  JOIN `civil_status` `cs` ON `cp`.`civil_status_id` = `cs`.`id`;

-- --------------------------------------------------------

--
-- Structure for view `v_document_requests_complete`
--
CREATE VIEW `v_document_requests_complete` AS
SELECT
  `dr`.`id` AS `request_id`,
  `dr`.`request_number` AS `request_number`,
  `dt`.`type_name` AS `document_type`,
  `pc`.`category_name` AS `purpose_category`,
  `dr`.`purpose_details` AS `purpose_details`,
  `rs`.`status_name` AS `current_status`,
  `dr`.`priority` AS `priority`,
  `dr`.`base_fee` + `dr`.`additional_fees` + `dr`.`processing_fee` AS `total_fee`,
  `dr`.`base_fee` AS `base_fee`,
  `dr`.`additional_fees` AS `additional_fees`,
  `dr`.`processing_fee` AS `processing_fee`,
  `dr`.`payment_status` AS `payment_status`,
  `pm`.`method_name` AS `payment_method`,
  `pm`.`is_online` AS `is_online_payment`,
  `dr`.`payment_reference` AS `payment_reference`,
  `dr`.`payment_provider_reference` AS `payment_provider_reference`,
  `dr`.`paid_at` AS `paid_at`,
  `dr`.`delivery_method` AS `delivery_method`,
  `dr`.`requested_at` AS `requested_at`,
  `dr`.`target_completion_date` AS `target_completion_date`,
  `dr`.`completed_at` AS `completed_at`,
  `vc`.`full_name` AS `client_name`,
  `vc`.`phone_number` AS `client_phone`,
  `vc`.`email` AS `client_email`,
  `vc`.`complete_address` AS `client_address`,
  CONCAT(`aep_processed`.`first_name`, ' ', `aep_processed`.`last_name`) AS `processed_by_name`,
  CONCAT(`aep_approved`.`first_name`, ' ', `aep_approved`.`last_name`) AS `approved_by_name`
FROM
  `document_requests` `dr`
  JOIN `document_types` `dt` ON `dr`.`document_type_id` = `dt`.`id`
  JOIN `purpose_categories` `pc` ON `dr`.`purpose_category_id` = `pc`.`id`
  JOIN `request_status` `rs` ON `dr`.`status_id` = `rs`.`id`
  JOIN `v_client_complete` `vc` ON `dr`.`client_id` = `vc`.`account_id`
  LEFT JOIN `payment_methods` `pm` ON `dr`.`payment_method_id` = `pm`.`id`
  LEFT JOIN `admin_employee_accounts` `aea_processed` ON `dr`.`processed_by` = `aea_processed`.`id`
  LEFT JOIN `admin_employee_profiles` `aep_processed` ON `aea_processed`.`id` = `aep_processed`.`account_id`
  LEFT JOIN `admin_employee_accounts` `aea_approved` ON `dr`.`approved_by` = `aea_approved`.`id`
  LEFT JOIN `admin_employee_profiles` `aep_approved` ON `aea_approved`.`id` = `aep_approved`.`account_id`;

-- --------------------------------------------------------

--
-- Structure for view `v_payment_transactions_complete`
--
CREATE VIEW `v_payment_transactions_complete` AS
SELECT
  `pt`.`id` AS `transaction_id`,
  `pt`.`transaction_id` AS `internal_transaction_id`,
  `pt`.`external_transaction_id` AS `external_transaction_id`,
  `pt`.`paymongo_payment_intent_id` AS `paymongo_payment_intent_id`,
  `dr`.`request_number` AS `request_number`,
  `dr`.`id` AS `request_id`,
  `vc`.`full_name` AS `client_name`,
  `vc`.`email` AS `client_email`,
  `vc`.`phone_number` AS `client_phone`,
  `pm`.`method_name` AS `payment_method`,
  `pm`.`method_code` AS `payment_method_code`,
  `pt`.`amount` AS `amount`,
  `pt`.`processing_fee` AS `processing_fee`,
  `pt`.`net_amount` AS `net_amount`,
  `pt`.`currency` AS `currency`,
  `pt`.`status` AS `payment_status`,
  `pt`.`failure_reason` AS `failure_reason`,
  `pt`.`initiated_at` AS `initiated_at`,
  `pt`.`completed_at` AS `completed_at`,
  `pt`.`expires_at` AS `expires_at`,
  `dt`.`type_name` AS `document_type`
FROM
  `payment_transactions` `pt`
  JOIN `document_requests` `dr` ON `pt`.`request_id` = `dr`.`id`
  JOIN `payment_methods` `pm` ON `pt`.`payment_method_id` = `pm`.`id`
  JOIN `document_types` `dt` ON `dr`.`document_type_id` = `dt`.`id`
  JOIN `v_client_complete` `vc` ON `dr`.`client_id` = `vc`.`account_id`;

COMMIT;