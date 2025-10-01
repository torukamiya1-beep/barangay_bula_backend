const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables
// Load .env.production in production, .env in development
const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

console.log(`\n📁 Loading environment from: ${envFile}`);

// Debug: Log environment variable status (without exposing secrets)
console.log('🔍 Environment Check:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
console.log('  PORT:', process.env.PORT || 'NOT SET');
console.log('  DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('  DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('  DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('  DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : '***NOT SET***');
console.log('  PAYMONGO_SECRET_KEY:', process.env.PAYMONGO_SECRET_KEY ? '***SET***' : '***NOT SET***');
console.log('  PAYMONGO_PUBLIC_KEY:', process.env.PAYMONGO_PUBLIC_KEY ? '***SET***' : '***NOT SET***');
console.log('  JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : '***NOT SET***');

// Ensure upload directories exist on startup
const { ensureUploadDirectories } = require('./scripts/ensure-upload-directories');
ensureUploadDirectories();

// Import configurations and middleware
const { connectDatabase } = require('./src/config/database');
const DatabaseUtils = require('./src/utils/database');
const errorHandler = require('./src/middleware/errorHandler');
const notFound = require('./src/middleware/notFound');
const { activityLoggerMiddleware } = require('./src/middleware/activityLogger');
const { enhancedActivityLogger } = require('./src/middleware/enhancedActivityLogger');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const testRoutes = require('./src/routes/testRoutes');
const otpRoutes = require('./src/routes/otpRoutes');
const clientAuthRoutes = require('./src/routes/clientAuthRoutes');
const adminAuthRoutes = require('./src/routes/adminAuthRoutes');
const unifiedAuthRoutes = require('./src/routes/unifiedAuthRoutes');
const adminDocumentRoutes = require('./src/routes/adminDocumentRoutes');
const documentRequestRoutes = require('./src/routes/documentRequestRoutes');
const documentViewRoutes = require('./src/routes/documentViewRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const residencyRoutes = require('./src/routes/residencyRoutes');
const addressRoutes = require('./src/routes/addressRoutes');
const archiveRoutes = require('./src/routes/archiveRoutes');
const verificationDocumentRoutes = require('./src/routes/verificationDocumentRoutes');
const activityLogRoutes = require('./src/routes/activityLogRoutes');
const enhancedActivityLogRoutes = require('./src/routes/enhancedActivityLogRoutes');
const receiptRoutes = require('./src/routes/receiptRoutes');

const app = express();
const PORT = process.env.PORT || 7000;

// Security middleware
app.use(helmet());

// Rate limiting (TEMPORARILY DISABLED FOR TESTING)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased for testing
  message: 'Too many requests from this IP, please try again later.'
});
// app.use(limiter); // DISABLED FOR TESTING

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Build allowed origins list
    const allowedOrigins = [
      // Development origins
      'http://localhost:8080',
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:3000',
      'http://localhost:5173', // Vite development server
      // Production frontend URL from environment variable
      process.env.FRONTEND_URL
    ].filter(Boolean); // Remove undefined/null values

    // In production, log CORS attempts for debugging
    if (process.env.NODE_ENV === 'production') {
      console.log('🔒 CORS Check:', {
        origin,
        allowed: allowedOrigins.includes(origin),
        allowedOrigins
      });
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      console.log('✅ Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  preflightContinue: false
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Debug middleware for CORS issues (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin') || 'none'}`);
    next();
  });
}

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced activity logging middleware (captures IP addresses and provides comprehensive logging functions)
app.use(enhancedActivityLogger);

// Legacy activity logging middleware (for backward compatibility)
app.use(activityLoggerMiddleware);

// Static files
app.use(express.static('public'));

// Serve uploads with CORS headers
app.use('/uploads', (req, res, next) => {
  // Add CORS headers for static files
  res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}, express.static('uploads'));

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const dbHealth = await DatabaseUtils.checkHealth();
    const dbStats = await DatabaseUtils.getStats();

    res.status(200).json({
      status: 'OK',
      message: 'Server is running',
      database: dbHealth,
      stats: dbStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes - Order matters! More specific routes first
app.use('/api/auth/unified', unifiedAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/users', userRoutes);
app.use('/api/test', testRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/client/auth', clientAuthRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/documents', adminDocumentRoutes);
app.use('/api/admin/activity-logs', activityLogRoutes);
app.use('/api/admin/enhanced-activity-logs', enhancedActivityLogRoutes);
app.use('/api/client/document-requests', documentRequestRoutes);
// Add test router for debugging
app.use('/api', documentRequestRoutes.testRouter);
app.use('/api/documents', documentViewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/residency', residencyRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/verification-documents', verificationDocumentRoutes);
app.use('/api/client/receipts', receiptRoutes);

// Handle deprecated payment intent URLs
app.get('/payment/intent', (req, res) => {
  console.error('❌ Deprecated /payment/intent route accessed:', {
    query: req.query,
    headers: req.headers,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(400).json({
    success: false,
    error: 'This payment method is no longer supported.',
    message: 'Please use the Pay Now button to proceed with PayMongo checkout.',
    redirect: '/client/my-requests'
  });
});

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection and setup
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Initialize database tables and default data
    await DatabaseUtils.setupDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server!');
    console.error('🔍 Error details:', {
      message: error.message || 'No error message',
      code: error.code || 'No error code',
      stack: error.stack || 'No stack trace'
    });
    console.error('🔍 Full error object:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise);
  console.error('❌ Reason:', err);

  // In development, log but don't exit to help with debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('🔧 Development mode: Server continuing to run for debugging');
  } else {
    console.error('🚨 Production mode: Shutting down server');
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);

  // In development, log but don't exit to help with debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('🔧 Development mode: Server continuing to run for debugging');
  } else {
    console.error('🚨 Production mode: Shutting down server');
    process.exit(1);
  }
});

startServer();

module.exports = app;