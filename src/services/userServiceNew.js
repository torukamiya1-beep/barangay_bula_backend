const { executeQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserServiceNew {

  // Helper method to create composite ID
  static createCompositeId(type, id) {
    return `${type}_${id}`;
  }

  // Helper method to parse composite ID
  static parseCompositeId(compositeId) {
    if (typeof compositeId !== 'string' || !compositeId.includes('_')) {
      // Handle legacy numeric IDs by defaulting to admin type for backward compatibility
      return { type: 'admin', id: parseInt(compositeId) };
    }

    const [type, id] = compositeId.split('_');
    return { type, id: parseInt(id) };
  }
  // Get all users with pagination and filters (both admin and client users)
  static async getAllUsers(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];

      // Build WHERE conditions
      if (filters.role) {
        if (filters.role === 'admin') {
          whereConditions.push("u.user_type = 'admin'");
        } else if (filters.role === 'client') {
          whereConditions.push("u.user_type = 'client'");
        }
      }

      if (filters.search) {
        whereConditions.push(`(
          u.username LIKE ? OR 
          u.first_name LIKE ? OR 
          u.last_name LIKE ? OR 
          u.email LIKE ?
        )`);
        const searchTerm = `%${filters.search}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filters.is_active !== undefined) {
        whereConditions.push("u.status = ?");
        queryParams.push(filters.is_active ? 'active' : 'inactive');
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Combined query for both admin and client users
      const query = `
        SELECT
          CONCAT(u.user_type, '_', u.id) as id,
          u.original_id,
          u.username,
          u.first_name,
          u.middle_name,
          u.last_name,
          u.suffix,
          u.email,
          u.phone_number,
          u.status,
          u.user_type as type,
          u.created_at,
          u.last_login,
          u.residency_verification_status,
          u.residency_document_count
        FROM (
          -- Admin users
          SELECT
            aea.id,
            aea.id as original_id,
            aea.username,
            aep.first_name,
            aep.middle_name,
            aep.last_name,
            aep.suffix,
            aep.email,
            aep.phone_number,
            aea.status,
            'admin' as user_type,
            aea.created_at,
            aea.last_login,
            NULL as residency_verification_status,
            0 as residency_document_count
          FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id

          UNION ALL

          -- Client users with residency verification status
          SELECT
            ca.id,
            ca.id as original_id,
            ca.username,
            cp.first_name,
            cp.middle_name,
            cp.last_name,
            cp.suffix,
            cp.email,
            cp.phone_number,
            ca.status,
            'client' as user_type,
            ca.created_at,
            ca.last_login,
            CASE
              WHEN COUNT(rd.id) > 0 THEN
                CASE
                  WHEN COUNT(CASE WHEN rd.verification_status = 'approved' THEN 1 END) = COUNT(rd.id) THEN 'approved'
                  WHEN COUNT(CASE WHEN rd.verification_status = 'rejected' THEN 1 END) > 0 THEN 'rejected'
                  ELSE 'pending'
                END
              ELSE NULL
            END as residency_verification_status,
            COUNT(rd.id) as residency_document_count
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
          LEFT JOIN residency_documents rd ON ca.id = rd.account_id
          GROUP BY ca.id, ca.username, cp.first_name, cp.middle_name, cp.last_name, cp.suffix,
                   cp.email, cp.phone_number, ca.status, ca.created_at, ca.last_login
        ) u
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `;

      // Store filter params separately for count query
      const filterParams = [...queryParams];

      // Add limit and offset for main query
      queryParams.push(limit, offset);
      const users = await executeQuery(query, queryParams);

      // Get total count - need to include all columns used in WHERE clause
      const countQuery = `
        SELECT COUNT(*) as total
        FROM (
          SELECT
            aea.id,
            aea.username,
            aep.first_name,
            aep.last_name,
            aep.email,
            aea.status,
            'admin' as user_type
          FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id

          UNION ALL

          SELECT
            ca.id,
            ca.username,
            cp.first_name,
            cp.last_name,
            cp.email,
            ca.status,
            'client' as user_type
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
          LEFT JOIN residency_documents rd ON ca.id = rd.account_id
          GROUP BY ca.id, ca.username, cp.first_name, cp.last_name, cp.email, ca.status
        ) u
        ${whereClause}
      `;

      // Use only filter params for count query (no limit/offset)
      const [{ total }] = await executeQuery(countQuery, filterParams);

      return {
        success: true,
        data: {
          users: users.map(user => ({
            ...user,
            full_name: `${user.first_name || ''} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name || ''}${user.suffix ? ' ' + user.suffix : ''}`.trim(),
            email: user.email || 'N/A',
            phone_number: user.phone_number || 'N/A'
          })),
          pagination: {
            total: parseInt(total),
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user statistics
  static async getUserStats() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
          SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
          SUM(CASE WHEN status = 'pending_verification' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN user_type = 'admin' THEN 1 ELSE 0 END) as admins,
          SUM(CASE WHEN user_type = 'client' THEN 1 ELSE 0 END) as clients
        FROM (
          SELECT status, 'admin' as user_type
          FROM admin_employee_accounts
          
          UNION ALL
          
          SELECT status, 'client' as user_type
          FROM client_accounts
        ) u
      `;

      const [stats] = await executeQuery(statsQuery);

      return {
        success: true,
        data: {
          total: parseInt(stats.total) || 0,
          active: parseInt(stats.active) || 0,
          inactive: parseInt(stats.inactive) || 0,
          suspended: parseInt(stats.suspended) || 0,
          pending: parseInt(stats.pending) || 0,
          admins: parseInt(stats.admins) || 0,
          clients: parseInt(stats.clients) || 0
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Search users (updated implementation)
  static async searchUsers(searchTerm, limit = 10) {
    try {
      const searchQuery = `
        SELECT 
          u.id,
          u.username,
          u.first_name,
          u.middle_name,
          u.last_name,
          u.suffix,
          u.email,
          u.phone_number,
          u.status,
          u.user_type as type,
          u.created_at
        FROM (
          SELECT 
            aea.id,
            aea.username,
            aep.first_name,
            aep.middle_name,
            aep.last_name,
            aep.suffix,
            aep.email,
            aep.phone_number,
            aea.status,
            'admin' as user_type,
            aea.created_at
          FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
          
          UNION ALL
          
          SELECT 
            ca.id,
            ca.username,
            cp.first_name,
            cp.middle_name,
            cp.last_name,
            cp.suffix,
            cp.email,
            cp.phone_number,
            ca.status,
            'client' as user_type,
            ca.created_at
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ) u
        WHERE (
          u.username LIKE ? OR 
          u.first_name LIKE ? OR 
          u.middle_name LIKE ? OR
          u.last_name LIKE ? OR 
          u.email LIKE ? OR
          u.phone_number LIKE ?
        )
        ORDER BY u.created_at DESC
        LIMIT ?
      `;

      const searchTerm_wildcard = `%${searchTerm}%`;
      const users = await executeQuery(searchQuery, [
        searchTerm_wildcard, searchTerm_wildcard, searchTerm_wildcard, 
        searchTerm_wildcard, searchTerm_wildcard, searchTerm_wildcard, limit
      ]);

      return {
        success: true,
        data: users.map(user => ({
          ...user,
          full_name: `${user.first_name || ''} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name || ''}${user.suffix ? ' ' + user.suffix : ''}`.trim(),
          email: user.email || 'N/A',
          phone_number: user.phone_number || 'N/A'
        }))
      };
    } catch (error) {
      throw error;
    }
  }

  // Get user by ID (handles both composite IDs and legacy numeric IDs)
  static async getUserById(userId) {
    try {
      console.log('getUserById called with userId:', userId);

      // Parse the composite ID to determine type and actual ID
      const { type, id } = this.parseCompositeId(userId);
      console.log('Parsed ID - type:', type, 'id:', id);

      let query;
      let user;

      if (type === 'admin') {
        // Query admin accounts
        query = `
          SELECT
            aea.id,
            aea.username,
            aep.first_name,
            aep.middle_name,
            aep.last_name,
            aep.suffix,
            aep.email,
            aep.phone_number,
            aea.status,
            'admin' as type,
            aea.created_at,
            aea.last_login,
            aea.password_changed_at,
            aep.position,
            aep.department,
            aep.employee_id,
            aep.hire_date,
            aep.profile_picture
          FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
          WHERE aea.id = ?
        `;
        user = await executeQuery(query, [id]);
      } else if (type === 'client') {
        // Query client accounts with residency verification status
        query = `
          SELECT
            ca.id,
            ca.username,
            cp.first_name,
            cp.middle_name,
            cp.last_name,
            cp.suffix,
            cp.email,
            cp.phone_number,
            ca.status,
            'client' as type,
            ca.created_at,
            ca.last_login,
            ca.password_changed_at,
            ca.email_verified,
            ca.phone_verified,
            cp.birth_date,
            cp.gender,
            cp.civil_status_id,
            cp.nationality,
            cp.house_number,
            cp.street,
            cp.subdivision,
            cp.barangay,
            cp.city_municipality,
            cp.province,
            cp.postal_code,
            cp.years_of_residency,
            cp.months_of_residency,
            cp.profile_picture,
            cp.is_verified,
            cp.verified_by,
            cp.verified_at,
            CASE
              WHEN COUNT(rd.id) = 0 THEN NULL
              WHEN COUNT(CASE WHEN rd.verification_status = 'approved' THEN 1 END) > 0 THEN 'approved'
              WHEN COUNT(CASE WHEN rd.verification_status = 'rejected' THEN 1 END) > 0 THEN 'rejected'
              ELSE 'pending'
            END as residency_verification_status,
            COUNT(rd.id) as residency_document_count
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
          LEFT JOIN residency_documents rd ON ca.id = rd.account_id
          WHERE ca.id = ?
          GROUP BY ca.id, ca.username, cp.first_name, cp.middle_name, cp.last_name,
                   cp.suffix, cp.email, cp.phone_number, ca.status, ca.created_at, ca.last_login,
                   ca.password_changed_at, ca.email_verified, ca.phone_verified, cp.birth_date,
                   cp.gender, cp.civil_status_id, cp.nationality, cp.house_number, cp.street,
                   cp.subdivision, cp.barangay, cp.city_municipality, cp.province, cp.postal_code,
                   cp.years_of_residency, cp.months_of_residency, cp.profile_picture, cp.is_verified,
                   cp.verified_by, cp.verified_at
        `;
        user = await executeQuery(query, [id]);
      } else {
        throw new Error('Invalid user type');
      }

      if (user.length === 0) {
        throw new Error('User not found');
      }

      const userData = user[0];

      // Create composite ID for the response
      const compositeId = this.createCompositeId(userData.type, userData.id);

      return {
        success: true,
        data: {
          ...userData,
          id: compositeId, // Return composite ID
          original_id: userData.id, // Keep original ID for internal use
          full_name: `${userData.first_name || ''} ${userData.middle_name ? userData.middle_name + ' ' : ''}${userData.last_name || ''}${userData.suffix ? ' ' + userData.suffix : ''}`.trim(),
          email: userData.email || 'N/A',
          phone_number: userData.phone_number || 'N/A',
          address: userData.type === 'client' ?
            `${userData.house_number || ''} ${userData.street || ''}, ${userData.subdivision || ''}, ${userData.barangay || ''}, ${userData.city_municipality || ''}, ${userData.province || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/\s+/g, ' ').trim() :
            'N/A'
        }
      };
    } catch (error) {
      console.error('getUserById error:', error);
      throw error;
    }
  }

  // Check if user exists by ID
  static async checkUserExists(userId) {
    try {
      console.log('checkUserExists called with userId:', userId);

      // Parse the composite ID to determine type and actual ID
      const { type, id } = this.parseCompositeId(userId);
      console.log('Parsed userId:', { type, id });

      let query;
      let queryParams = [id];

      if (type === 'admin') {
        query = `
          SELECT COUNT(*) as count
          FROM admin_employee_accounts aea
          WHERE aea.id = ? AND aea.status != 'deleted'
        `;
      } else if (type === 'client') {
        query = `
          SELECT COUNT(*) as count
          FROM client_accounts ca
          WHERE ca.id = ? AND ca.status != 'deleted'
        `;
      } else {
        // For backward compatibility, check both tables
        query = `
          SELECT COUNT(*) as count FROM (
            SELECT id FROM admin_employee_accounts WHERE id = ? AND status != 'deleted'
            UNION
            SELECT id FROM client_accounts WHERE id = ? AND status != 'deleted'
          ) as combined_users
        `;
        queryParams = [id, id];
      }

      console.log('Executing query:', query, 'with params:', queryParams);
      const result = await executeQuery(query, queryParams);
      const exists = result[0].count > 0;

      console.log('User exists check result:', exists);
      return exists;

    } catch (error) {
      console.error('Error checking user existence:', error);
      throw error;
    }
  }

  // Get archived (soft-deleted) users
  static async getArchivedUsers(page = 1, limit = 10, filters = {}) {
    try {
      console.log('getArchivedUsers called with:', { page, limit, filters });

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];

      // Search filter
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        whereConditions.push(`(
          u.first_name LIKE ? OR
          u.last_name LIKE ? OR
          u.username LIKE ? OR
          u.email LIKE ?
        )`);
        queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(' AND ')}` : '';

      // Main query for archived users (status = 'inactive')
      const query = `
        SELECT
          CONCAT(u.user_type, '_', u.id) as id,
          u.original_id,
          u.username,
          u.first_name,
          u.last_name,
          u.email,
          u.status,
          u.user_type as type,
          u.created_at,
          u.updated_at,
          u.residency_verification_status,
          u.residency_document_count
        FROM (
          -- Admin users (archived)
          SELECT
            aea.id,
            aea.id as original_id,
            aea.username,
            aep.first_name,
            aep.middle_name,
            aep.last_name,
            aep.suffix,
            aep.phone_number,
            aep.email,
            aep.position,
            aep.department,
            aep.hire_date,
            aea.status,
            'admin' as user_type,
            aea.created_at,
            aea.updated_at,
            NULL as residency_verification_status,
            0 as residency_document_count
          FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
          WHERE aea.status = 'inactive'

          UNION ALL

          -- Client users (archived)
          SELECT
            ca.id,
            ca.id as original_id,
            ca.username,
            cp.first_name,
            cp.middle_name,
            cp.last_name,
            cp.suffix,
            cp.phone_number,
            cp.email,
            NULL as position,
            NULL as department,
            NULL as hire_date,
            ca.status,
            'client' as user_type,
            ca.created_at,
            ca.updated_at,
            NULL as residency_verification_status,
            0 as residency_document_count
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
          WHERE ca.status = 'inactive'
        ) u
        WHERE 1=1 ${whereClause}
        ORDER BY u.updated_at DESC
        LIMIT ? OFFSET ?
      `;

      queryParams.push(limit, offset);

      console.log('Executing archived users query:', query);
      console.log('Query params:', queryParams);

      const users = await executeQuery(query, queryParams);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total FROM (
          SELECT aea.id FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
          WHERE aea.status = 'inactive'
          ${filters.search ? `AND (aep.first_name LIKE ? OR aep.last_name LIKE ? OR aea.username LIKE ? OR aep.email LIKE ?)` : ''}

          UNION ALL

          SELECT ca.id FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
          WHERE ca.status = 'inactive'
          ${filters.search ? `AND (cp.first_name LIKE ? OR cp.last_name LIKE ? OR ca.username LIKE ? OR cp.email LIKE ?)` : ''}
        ) u
      `;

      let countParams = [];
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        countParams = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
      }

      const countResult = await executeQuery(countQuery, countParams);
      const total = countResult[0].total;

      // Add full_name field to users
      const formattedUsers = users.map(user => ({
        ...user,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
      }));

      console.log(`Found ${formattedUsers.length} archived users out of ${total} total`);

      return {
        success: true,
        data: formattedUsers,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: Math.ceil(total / limit)
        },
        message: `Retrieved ${formattedUsers.length} archived users`
      };

    } catch (error) {
      console.error('Error getting archived users:', error);
      throw error;
    }
  }

  // Restore archived user
  static async restoreUser(userId) {
    try {
      console.log('restoreUser called with userId:', userId);

      // Parse the composite ID to determine type and actual ID
      const { type, id } = this.parseCompositeId(userId);
      console.log('Parsed userId for restore:', { type, id });

      let query;
      let tableName;

      if (type === 'admin') {
        tableName = 'admin_employee_accounts';
        query = `
          UPDATE admin_employee_accounts
          SET status = 'active', updated_at = NOW()
          WHERE id = ? AND status = 'inactive'
        `;
      } else if (type === 'client') {
        tableName = 'client_accounts';
        query = `
          UPDATE client_accounts
          SET status = 'active', updated_at = NOW()
          WHERE id = ? AND status = 'inactive'
        `;
      } else {
        throw new Error('Invalid user type for restore operation');
      }

      console.log('Executing restore query:', query, 'with id:', id);
      const result = await executeQuery(query, [id]);

      if (result.affectedRows === 0) {
        throw new Error('User not found or not archived');
      }

      console.log(`User restored successfully from ${tableName}`);

      return {
        success: true,
        message: `User restored successfully`,
        data: { userId, type, restored: true }
      };

    } catch (error) {
      console.error('Error restoring user:', error);
      throw error;
    }
  }

  // Create new user (admin or client)
  static async createUser(userData) {
    try {
      const {
        username,
        email = null,
        password,
        first_name,
        middle_name = null,
        last_name,
        suffix = null,
        role,
        status = null,
        phone_number = null,
        birth_date = null,
        gender = 'male',
        civil_status_id = 1,
        nationality = 'Filipino',
        house_number = null,
        street = null,
        subdivision = null,
        barangay = null,
        city_municipality = null,
        province = null,
        postal_code = null,
        years_of_residency = null,
        months_of_residency = null
      } = userData;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      let userId;

      if (role === 'admin') {
        // Create admin account with explicit status handling
        // Default to 'active' for admin accounts, but allow override from frontend
        const adminStatus = status || 'active';
        const adminQuery = `
          INSERT INTO admin_employee_accounts (username, password_hash, role, status, created_at)
          VALUES (?, ?, 'admin', ?, NOW())
        `;
        const adminResult = await executeQuery(adminQuery, [username, passwordHash, adminStatus]);
        userId = adminResult.insertId;

        // Create admin profile
        const profileQuery = `
          INSERT INTO admin_employee_profiles (
            account_id, first_name, middle_name, last_name, suffix,
            phone_number, email, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        await executeQuery(profileQuery, [
          userId,
          first_name,
          middle_name || null,
          last_name,
          suffix || null,
          phone_number || null,
          email || null
        ]);
      } else {
        // Create client account with explicit status handling
        // Default to 'active' for client accounts, but allow override from frontend
        const clientStatus = status || 'active';
        const clientQuery = `
          INSERT INTO client_accounts (username, password_hash, status, email_verified, phone_verified, created_at)
          VALUES (?, ?, ?, 1, 1, NOW())
        `;
        const clientResult = await executeQuery(clientQuery, [username, passwordHash, clientStatus]);
        userId = clientResult.insertId;

        // Create client profile with all required fields
        const profileQuery = `
          INSERT INTO client_profiles (
            account_id, first_name, middle_name, last_name, suffix, birth_date, gender,
            civil_status_id, nationality, phone_number, email, house_number, street,
            subdivision, barangay, city_municipality, province, postal_code,
            years_of_residency, months_of_residency, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        await executeQuery(profileQuery, [
          userId,
          first_name,
          middle_name || null,
          last_name,
          suffix || null,
          birth_date || '1990-01-01',
          gender,
          civil_status_id,
          nationality || 'Filipino',
          phone_number || null,
          email || null,
          house_number || null,
          street || null,
          subdivision || null,
          barangay || 'Default Barangay',
          city_municipality || 'Default City',
          province || 'Default Province',
          postal_code || null,
          years_of_residency || null,
          months_of_residency || null
        ]);
      }

      // Get the created user
      const createdUser = await this.getUserById(userId);

      return {
        success: true,
        data: createdUser.data,
        message: 'User created successfully'
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Username or email already exists');
      }
      throw error;
    }
  }

  // Update user
  static async updateUser(userId, updateData) {
    try {
      console.log('updateUser called with userId:', userId);

      // Parse composite ID to get type and actual ID
      const { type, id } = this.parseCompositeId(userId);
      console.log('Update user - type:', type, 'id:', id);

      // First, get the user to determine type (using actual ID)
      const userResult = await this.getUserById(userId);
      if (!userResult.success) {
        throw new Error('User not found');
      }

      const user = userResult.data;
      const {
        username,
        email,
        password,
        first_name,
        middle_name,
        last_name,
        suffix,
        status,
        phone_number,
        birth_date,
        gender,
        civil_status_id,
        nationality,
        house_number,
        street,
        subdivision,
        barangay,
        city_municipality,
        province,
        postal_code,
        years_of_residency,
        months_of_residency
      } = updateData;

      if (user.type === 'admin') {
        // Update admin account
        if (username || status || password) {
          const updateFields = [];
          const params = [];

          if (username) {
            updateFields.push('username = ?');
            params.push(username);
          }
          if (status) {
            updateFields.push('status = ?');
            params.push(status);
          }
          if (password) {
            updateFields.push('password_hash = ?');
            const passwordHash = await bcrypt.hash(password, 12);
            params.push(passwordHash);
          }

          if (updateFields.length > 0) {
            const adminQuery = `
              UPDATE admin_employee_accounts
              SET ${updateFields.join(', ')}, updated_at = NOW()
              WHERE id = ?
            `;
            params.push(id); // Use actual ID, not composite ID
            await executeQuery(adminQuery, params);
          }
        }

        // Update admin profile
        const profileFields = [];
        const profileParams = [];

        if (first_name) { profileFields.push('first_name = ?'); profileParams.push(first_name); }
        if (middle_name !== undefined) { profileFields.push('middle_name = ?'); profileParams.push(middle_name); }
        if (last_name) { profileFields.push('last_name = ?'); profileParams.push(last_name); }
        if (suffix !== undefined) { profileFields.push('suffix = ?'); profileParams.push(suffix); }
        if (email !== undefined) { profileFields.push('email = ?'); profileParams.push(email); }
        if (phone_number !== undefined) { profileFields.push('phone_number = ?'); profileParams.push(phone_number); }

        if (profileFields.length > 0) {
          const profileQuery = `
            UPDATE admin_employee_profiles
            SET ${profileFields.join(', ')}, updated_at = NOW()
            WHERE account_id = ?
          `;
          profileParams.push(id); // Use actual ID, not composite ID
          await executeQuery(profileQuery, profileParams);
        }
      } else {
        // Update client account
        if (username || status || password) {
          const updateFields = [];
          const params = [];

          if (username) {
            updateFields.push('username = ?');
            params.push(username);
          }
          if (status) {
            updateFields.push('status = ?');
            params.push(status);
          }
          if (password) {
            updateFields.push('password_hash = ?');
            const passwordHash = await bcrypt.hash(password, 12);
            params.push(passwordHash);
          }

          if (updateFields.length > 0) {
            const clientQuery = `
              UPDATE client_accounts
              SET ${updateFields.join(', ')}, updated_at = NOW()
              WHERE id = ?
            `;
            params.push(id); // Use actual ID, not composite ID
            await executeQuery(clientQuery, params);
          }
        }

        // Update client profile
        const profileFields = [];
        const profileParams = [];

        if (first_name) { profileFields.push('first_name = ?'); profileParams.push(first_name); }
        if (middle_name !== undefined) { profileFields.push('middle_name = ?'); profileParams.push(middle_name); }
        if (last_name) { profileFields.push('last_name = ?'); profileParams.push(last_name); }
        if (suffix !== undefined) { profileFields.push('suffix = ?'); profileParams.push(suffix); }
        if (email !== undefined) { profileFields.push('email = ?'); profileParams.push(email); }
        if (phone_number !== undefined) { profileFields.push('phone_number = ?'); profileParams.push(phone_number); }
        if (birth_date !== undefined) { profileFields.push('birth_date = ?'); profileParams.push(birth_date); }
        if (gender !== undefined) { profileFields.push('gender = ?'); profileParams.push(gender); }
        if (civil_status_id !== undefined) { profileFields.push('civil_status_id = ?'); profileParams.push(civil_status_id); }
        if (nationality !== undefined) { profileFields.push('nationality = ?'); profileParams.push(nationality); }
        if (house_number !== undefined) { profileFields.push('house_number = ?'); profileParams.push(house_number); }
        if (street !== undefined) { profileFields.push('street = ?'); profileParams.push(street); }
        if (subdivision !== undefined) { profileFields.push('subdivision = ?'); profileParams.push(subdivision); }
        if (barangay !== undefined) { profileFields.push('barangay = ?'); profileParams.push(barangay); }
        if (city_municipality !== undefined) { profileFields.push('city_municipality = ?'); profileParams.push(city_municipality); }
        if (province !== undefined) { profileFields.push('province = ?'); profileParams.push(province); }
        if (postal_code !== undefined) { profileFields.push('postal_code = ?'); profileParams.push(postal_code); }
        if (years_of_residency !== undefined) { profileFields.push('years_of_residency = ?'); profileParams.push(years_of_residency); }
        if (months_of_residency !== undefined) { profileFields.push('months_of_residency = ?'); profileParams.push(months_of_residency); }

        if (profileFields.length > 0) {
          const profileQuery = `
            UPDATE client_profiles
            SET ${profileFields.join(', ')}, updated_at = NOW()
            WHERE account_id = ?
          `;
          profileParams.push(id); // Use actual ID, not composite ID
          await executeQuery(profileQuery, profileParams);
        }
      }

      // Get the updated user
      const updatedUser = await this.getUserById(userId);

      return {
        success: true,
        data: updatedUser.data,
        message: 'User updated successfully'
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Username or email already exists');
      }
      throw error;
    }
  }

  // Delete user (soft delete by setting status to inactive)
  static async deleteUser(userId) {
    try {
      console.log('deleteUser called with userId:', userId);

      // Parse composite ID to get type and actual ID
      const { type, id } = this.parseCompositeId(userId);
      console.log('Delete user - type:', type, 'id:', id);

      const userResult = await this.getUserById(userId);
      if (!userResult.success) {
        throw new Error('User not found');
      }

      const user = userResult.data;

      let deleteQuery;
      if (user.type === 'admin') {
        // For admin users, set status to inactive (soft delete)
        deleteQuery = `
          UPDATE admin_employee_accounts
          SET status = 'inactive', updated_at = NOW()
          WHERE id = ?
        `;
      } else {
        // For client users, set status to inactive (soft delete)
        deleteQuery = `
          UPDATE client_accounts
          SET status = 'inactive', updated_at = NOW()
          WHERE id = ?
        `;
      }

      await executeQuery(deleteQuery, [id]); // Use actual ID, not composite ID

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Toggle user status
  static async toggleUserStatus(userId) {
    try {
      const userResult = await this.getUserById(userId);
      if (!userResult.success) {
        throw new Error('User not found');
      }

      const user = userResult.data;
      const newStatus = user.status === 'active' ? 'suspended' : 'active';

      let updateQuery;
      if (user.type === 'admin') {
        updateQuery = `
          UPDATE admin_employee_accounts
          SET status = ?, updated_at = NOW()
          WHERE id = ?
        `;
      } else {
        updateQuery = `
          UPDATE client_accounts
          SET status = ?, updated_at = NOW()
          WHERE id = ?
        `;
      }

      await executeQuery(updateQuery, [newStatus, userId]);

      return {
        success: true,
        data: { status: newStatus },
        message: `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`
      };
    } catch (error) {
      throw error;
    }
  }

  // Get users by role
  static async getUsersByRole(role, page = 1, limit = 10) {
    try {
      const filters = { role };
      const result = await this.getAllUsers(page, limit, filters);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserServiceNew;