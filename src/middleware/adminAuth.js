const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Admin-specific authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if this is an admin token
      if (decoded.type !== 'admin' && decoded.role !== 'admin' && decoded.role !== 'employee') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }

      // Get admin user from admin_employee_accounts table
      const adminQuery = `
        SELECT
          aea.id,
          aea.username,
          aea.role,
          aea.status,
          aea.created_at,
          aep.email,
          aep.first_name,
          aep.last_name
        FROM admin_employee_accounts aea
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        WHERE aea.id = ? AND aea.status = 'active'
      `;
      const adminUsers = await executeQuery(adminQuery, [decoded.id]);

      if (adminUsers.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Admin user not found or inactive'
        });
      }

      req.user = {
        id: adminUsers[0].id,
        username: adminUsers[0].username,
        email: adminUsers[0].email,
        role: adminUsers[0].role,
        status: adminUsers[0].status,
        created_at: adminUsers[0].created_at,
        first_name: adminUsers[0].first_name,
        last_name: adminUsers[0].last_name,
        type: 'admin'
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = adminAuth;
