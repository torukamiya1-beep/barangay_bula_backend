/**
 * Migration: Create temp_registration_data table
 * Purpose: Store registration data temporarily until OTP verification
 * Date: 2025-01-24
 */

const mysql = require('mysql2/promise');

async function up(connection) {
  console.log('Creating temp_registration_data table...');
  
  await connection.query(`
    CREATE TABLE IF NOT EXISTS temp_registration_data (
      id INT PRIMARY KEY AUTO_INCREMENT,
      account_id INT NOT NULL,
      profile_data JSON NOT NULL,
      document_data JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),
      FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE,
      INDEX idx_account_id (account_id),
      INDEX idx_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  
  console.log('✅ temp_registration_data table created successfully');
}

async function down(connection) {
  console.log('Dropping temp_registration_data table...');
  
  await connection.query(`
    DROP TABLE IF EXISTS temp_registration_data;
  `);
  
  console.log('✅ temp_registration_data table dropped successfully');
}

module.exports = { up, down };
