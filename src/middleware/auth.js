const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // For SSE connections, also check query parameters
    else if (req.query.token) {
      token = req.query.token;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔐 JWT decoded successfully:', { id: decoded.id, type: decoded.type, role: decoded.role });

      let user = null;

      // Check if this is an admin token (has type field or role is admin/employee)
      if (decoded.type === 'admin' || decoded.role === 'admin' || decoded.role === 'employee') {
        console.log('🔐 Admin token detected, querying admin_employee_accounts...');
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
        console.log('🔐 Admin query result:', adminUsers.length, 'users found');

        if (adminUsers.length > 0) {
          user = {
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
        }
      } else {
        console.log('🔐 Client token detected, querying client_accounts...');
        // Get client user from client_accounts table
        // Allow access for active clients - residency verification is managed separately
        const clientQuery = `
          SELECT
            ca.id,
            ca.username,
            ca.status,
            ca.created_at,
            cp.email,
            cp.first_name,
            cp.last_name,
            cp.phone_number
          FROM client_accounts ca
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
          WHERE ca.id = ? AND ca.status IN ('active', 'pending_residency_verification', 'residency_rejected')
        `;
        const clients = await executeQuery(clientQuery, [decoded.id]);
        console.log('🔐 Client query result:', clients.length, 'users found');

        if (clients.length > 0) {
          user = {
            id: clients[0].id,
            username: clients[0].username,
            email: clients[0].email,
            status: clients[0].status,
            created_at: clients[0].created_at,
            first_name: clients[0].first_name,
            last_name: clients[0].last_name,
            phone_number: clients[0].phone_number,
            role: 'client',
            type: 'client'
          };
        }
      }

      if (!user) {
        console.log('❌ User not found or inactive after database query');
        return res.status(401).json({
          success: false,
          error: 'User not found or inactive'
        });
      }

      console.log('✅ User authenticated successfully:', { id: user.id, role: user.role, type: user.type });
      req.user = user;
      next();
    } catch (error) {
      console.log('❌ JWT verification failed:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Client-specific authentication middleware
const authenticateClient = async (req, res, next) => {
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
      console.log('Token decoded successfully:', decoded);

      // Get client user from client_accounts table
      const clientQuery = `
        SELECT
          ca.id,
          ca.username,
          ca.status,
          ca.created_at,
          cp.email,
          cp.first_name,
          cp.last_name,
          cp.phone_number
        FROM client_accounts ca
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE ca.id = ? AND ca.status IN ('active', 'pending_residency_verification', 'residency_rejected')
      `;
      const clients = await executeQuery(clientQuery, [decoded.id]);
      console.log('Client query result:', clients);

      if (clients.length === 0) {
        console.log('No client found for ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'Client not found or inactive'
        });
      }

      req.user = {
        id: clients[0].id,
        username: clients[0].username,
        email: clients[0].email,
        status: clients[0].status,
        created_at: clients[0].created_at,
        first_name: clients[0].first_name,
        last_name: clients[0].last_name,
        phone_number: clients[0].phone_number,
        role: 'client',
        type: 'client'
      };

      next();
    } catch (error) {
      console.log('Token verification error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protect,
  authorize,
  authenticateClient
};
