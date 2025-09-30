#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script helps set up the MySQL database for the Rhai Backend application.
 * It creates the database if it doesn't exist and runs the table creation scripts.
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306,
};

const dbName = process.env.DB_NAME || 'barangay_management_system';

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔄 Connecting to MySQL server...');
    
    // Connect to MySQL server (without specifying database)
    connection = await mysql.createConnection(dbConfig);
    
    console.log('✅ Connected to MySQL server');
    
    // Create database if it doesn't exist
    console.log(`🔄 Creating database '${dbName}' if it doesn't exist...`);
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    
    console.log(`✅ Database '${dbName}' is ready`);
    
    // Switch to the database
    await connection.execute(`USE \`${dbName}\``);
    
    // Create users table
    console.log('🔄 Creating users table...');
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await connection.execute(createUsersTable);
    console.log('✅ Users table created successfully');
    
    // Check if admin user exists
    const [adminUsers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role = "admin"');
    
    if (adminUsers[0].count === 0) {
      console.log('🔄 Creating default admin user...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      await connection.execute(
        'INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)',
        ['admin@example.com', hashedPassword, 'System', 'Administrator', 'admin']
      );
      
      console.log('✅ Default admin user created');
      console.log('📧 Email: admin@example.com');
      console.log('🔑 Password: admin123');
      console.log('⚠️  Please change the default password after first login!');
    } else {
      console.log('ℹ️  Admin user already exists');
    }
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your .env file with the correct database credentials');
    console.log('2. Run "npm run dev" to start the development server');
    console.log('3. Visit http://localhost:3000 to see the API documentation');
    console.log('4. Test the API endpoints using the default admin credentials');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the setup
setupDatabase();
