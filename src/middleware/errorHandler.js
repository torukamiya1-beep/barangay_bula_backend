const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Enhanced error logging for production debugging
  console.error('❌ Error Handler - Full Error Details:');
  console.error('📍 Request URL:', req.originalUrl);
  console.error('📍 Request Method:', req.method);
  console.error('📍 Request Headers:', req.headers);
  console.error('📍 Request Body:', req.body);
  console.error('📍 Request User:', req.user ? { id: req.user.id, role: req.user.role } : 'Not authenticated');
  console.error('🔍 Error Name:', err.name);
  console.error('🔍 Error Message:', err.message);
  console.error('🔍 Error Code:', err.code);
  console.error('🔍 Error Stack:', err.stack);
  console.error('🔍 Full Error Object:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    const message = 'Duplicate entry found';
    error = { message, statusCode: 400 };
  }

  // MySQL foreign key constraint error
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    const message = 'Referenced record does not exist';
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Default error response with enhanced debugging info
  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    // Include more debugging info in production for troubleshooting
    ...(process.env.NODE_ENV === 'production' && {
      debug: {
        errorCode: err.code,
        errorName: err.name,
        sqlState: err.sqlState,
        sqlMessage: err.sqlMessage,
        url: req.originalUrl,
        method: req.method
      }
    }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
