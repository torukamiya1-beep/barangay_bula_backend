const { executeQuery } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserService {
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
          u.created_at,
          u.last_login,
          u.position,
          u.department,
          u.employee_id,
          u.birth_date,
          u.gender,
          u.barangay,
          u.city_municipality,
          u.province
        FROM (
          -- Admin users
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
            aea.created_at,
            aea.last_login,
            aep.position,
            aep.department,
            aep.employee_id,
            NULL as birth_date,
            NULL as gender,
            NULL as barangay,
            NULL as city_municipality,
            NULL as province
          FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id

          UNION ALL

          -- Client users
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
            ca.created_at,
            ca.last_login,
            NULL as position,
            NULL as department,
            NULL as employee_id,
            cp.birth_date,
            cp.gender,
            cp.barangay,
            cp.city_municipality,
            cp.province
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ) u
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `;

      queryParams.push(limit, offset);

      const users = await executeQuery(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM (
          SELECT aea.id FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id

          UNION ALL

          SELECT ca.id FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ) u
        ${whereClause}
      `;

      const countParams = queryParams.slice(0, -2); // Remove limit and offset
      const [{ total }] = await executeQuery(countQuery, countParams);

      return {
        success: true,
        data: {
          users: users.map(user => ({
            ...user,
            full_name: `${user.first_name || ''} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name || ''}${user.suffix ? ' ' + user.suffix : ''}`.trim(),
            email: user.email || 'N/A',
            phone_number: user.phone_number || 'N/A',
            address: user.type === 'client' ?
              `${user.barangay || ''}, ${user.city_municipality || ''}, ${user.province || ''}`.replace(/^,\s*|,\s*$/g, '') :
              'N/A'
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

  // Get user by ID (check both admin and client tables)
  static async getUserById(userId) {
    try {
      // Try to find in admin accounts first
      let query = `
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

      let user = await executeQuery(query, [userId]);

      if (user.length === 0) {
        // Try to find in client accounts
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
            cp.verified_at
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
          WHERE ca.id = ?
        `;

        user = await executeQuery(query, [userId]);
      }

      if (user.length === 0) {
        throw new Error('User not found');
      }

      const userData = user[0];
      return {
        success: true,
        data: {
          ...userData,
          full_name: `${userData.first_name || ''} ${userData.middle_name ? userData.middle_name + ' ' : ''}${userData.last_name || ''}${userData.suffix ? ' ' + userData.suffix : ''}`.trim(),
          email: userData.email || 'N/A',
          phone_number: userData.phone_number || 'N/A',
          address: userData.type === 'client' ?
            `${userData.house_number || ''} ${userData.street || ''}, ${userData.subdivision || ''}, ${userData.barangay || ''}, ${userData.city_municipality || ''}, ${userData.province || ''}`.replace(/^,\s*|,\s*$/g, '').replace(/\s+/g, ' ').trim() :
            'N/A'
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Create new user (admin or client)
  static async createUser(userData) {
    try {
      const {
        username,
        email,
        password,
        first_name,
        middle_name,
        last_name,
        suffix,
        role,
        phone_number,
        position,
        department,
        employee_id,
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
        postal_code
      } = userData;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      let userId;

      if (role === 'admin') {
        // Create admin account
        const adminQuery = `
          INSERT INTO admin_employee_accounts (username, password_hash, role, status, created_at)
          VALUES (?, ?, 'admin', 'active', NOW())
        `;
        const adminResult = await executeQuery(adminQuery, [username, passwordHash]);
        userId = adminResult.insertId;

        // Create admin profile
        const profileQuery = `
          INSERT INTO admin_employee_profiles (
            account_id, employee_id, first_name, middle_name, last_name, suffix,
            phone_number, email, position, department, hire_date, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW())
        `;
        await executeQuery(profileQuery, [
          userId, employee_id || null, first_name, middle_name || null,
          last_name, suffix || null, phone_number || null, email || null,
          position || null, department || null
        ]);
      } else {
        // Create client account
        const clientQuery = `
          INSERT INTO client_accounts (username, password_hash, status, email_verified, phone_verified, created_at)
          VALUES (?, ?, 'active', 1, 1, NOW())
        `;
        const clientResult = await executeQuery(clientQuery, [username, passwordHash]);
        userId = clientResult.insertId;

        // Create client profile with all required fields
        const profileQuery = `
          INSERT INTO client_profiles (
            account_id, first_name, middle_name, last_name, suffix, birth_date, gender,
            civil_status_id, nationality, phone_number, email, house_number, street,
            subdivision, barangay, city_municipality, province, postal_code, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        await executeQuery(profileQuery, [
          userId,
          first_name,
          middle_name || null,
          last_name,
          suffix || null,
          birth_date || '1990-01-01',
          gender || 'male',
          civil_status_id || 1,
          nationality || 'Filipino',
          phone_number,
          email || null,
          house_number || null,
          street || null,
          subdivision || null,
          barangay || 'Default Barangay',
          city_municipality || 'Default City',
          province || 'Default Province',
          postal_code || null
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
      // First, get the user to determine type
      const userResult = await this.getUserById(userId);
      if (!userResult.success) {
        throw new Error('User not found');
      }

      const user = userResult.data;
      const {
        username,
        email,
        first_name,
        middle_name,
        last_name,
        suffix,
        status,
        phone_number,
        position,
        department,
        employee_id,
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
        postal_code
      } = updateData;

      if (user.type === 'admin') {
        // Update admin account
        if (username || status) {
          const adminQuery = `
            UPDATE admin_employee_accounts
            SET ${username ? 'username = ?, ' : ''}${status ? 'status = ?, ' : ''}updated_at = NOW()
            WHERE id = ?
          `;
          const params = [];
          if (username) params.push(username);
          if (status) params.push(status);
          params.push(userId);

          await executeQuery(adminQuery, params);
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
        if (position !== undefined) { profileFields.push('position = ?'); profileParams.push(position); }
        if (department !== undefined) { profileFields.push('department = ?'); profileParams.push(department); }
        if (employee_id !== undefined) { profileFields.push('employee_id = ?'); profileParams.push(employee_id); }

        if (profileFields.length > 0) {
          const profileQuery = `
            UPDATE admin_employee_profiles
            SET ${profileFields.join(', ')}, updated_at = NOW()
            WHERE account_id = ?
          `;
          profileParams.push(userId);
          await executeQuery(profileQuery, profileParams);
        }
      } else {
        // Update client account
        if (username || status) {
          const clientQuery = `
            UPDATE client_accounts
            SET ${username ? 'username = ?, ' : ''}${status ? 'status = ?, ' : ''}updated_at = NOW()
            WHERE id = ?
          `;
          const params = [];
          if (username) params.push(username);
          if (status) params.push(status);
          params.push(userId);

          await executeQuery(clientQuery, params);
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

        if (profileFields.length > 0) {
          const profileQuery = `
            UPDATE client_profiles
            SET ${profileFields.join(', ')}, updated_at = NOW()
            WHERE account_id = ?
          `;
          profileParams.push(userId);
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
      // First, get the user to determine type
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

      await executeQuery(deleteQuery, [userId]);

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Activate/Deactivate user (works for both admin and client users)
  static async toggleUserStatus(userId) {
    try {
      // First, get the user to determine type and current status
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
        data: { ...user, status: newStatus },
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

  // Search users (updated implementation)
  static async searchUsers(searchTerm, limit = 10) {
    try {
      const searchQuery = `
        SELECT
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.email,
          u.status,
          u.user_type as type,
          u.created_at
        FROM (
          SELECT
            aea.id,
            aea.username,
            aep.first_name,
            aep.last_name,
            aep.email,
            aea.status,
            'admin' as user_type,
            aea.created_at
          FROM admin_employee_accounts aea
          LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
          WHERE aea.role = 'admin'

          UNION ALL

          SELECT
            ca.id,
            ca.username,
            cp.first_name,
            cp.last_name,
            cp.email,
            ca.status,
            'client' as user_type,
            ca.created_at
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        ) u
        WHERE (
          u.username LIKE ? OR
          u.first_name LIKE ? OR
          u.last_name LIKE ? OR
          u.email LIKE ?
        )
        ORDER BY u.created_at DESC
        LIMIT ?
      `;

      const searchTerm_wildcard = `%${searchTerm}%`;
      const users = await executeQuery(searchQuery, [
        searchTerm_wildcard, searchTerm_wildcard, searchTerm_wildcard, searchTerm_wildcard, limit
      ]);

      return {
        success: true,
        data: users.map(user => ({
          ...user,
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email || 'N/A'
        }))
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

  // Search users
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
}

module.exports = UserService;
/ /   F o r c e   r e s t a r t 
 
 