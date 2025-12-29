/**
 * Global Error Handling Middleware
 * Catches all unhandled errors and provides consistent error responses
 * Should be used as the last middleware in the Express app
 */

const { logError, handleGenericError } = require('../utils/errorHandler');

/**
 * Global error handler middleware
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log the error with request context
  logError(err, {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    params: req.params,
    query: req.query,
    userId: req.user?._id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }, 'Global Error Handler');

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: Object.values(err.errors).map(e => e.message),
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid data format',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate entry found',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'ENOENT') {
    return res.status(404).json({
      status: 'error',
      message: 'Resource not found',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'EACCES') {
    return res.status(403).json({
      status: 'error',
      message: 'Permission denied',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      status: 'error',
      message: 'Service unavailable',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'ETIMEDOUT') {
    return res.status(504).json({
      status: 'error',
      message: 'Request timeout',
      timestamp: new Date().toISOString()
    });
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        status: 'error',
        message: 'File size exceeds the maximum limit',
        code: 'FILE_TOO_LARGE',
        timestamp: new Date().toISOString()
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files uploaded',
        code: 'TOO_MANY_FILES',
        timestamp: new Date().toISOString()
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Unexpected file field',
        code: 'INVALID_FIELD_NAME',
        timestamp: new Date().toISOString()
      });
    }
    return res.status(400).json({
      status: 'error',
      message: 'File upload error',
      code: 'UPLOAD_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Generic error response
  const errorResponse = {
    status: 'error',
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = {
      name: err.name,
      code: err.code,
      message: err.message
    };
  }

  // Set appropriate status code
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  console.error('❌ Stack:', err.stack);
  
  // Log the error
  logError(err, {}, 'Uncaught Exception');
  
  // Graceful shutdown
  process.exit(1);
});

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  
  // Log the error
  logError(new Error(reason), { promise }, 'Unhandled Rejection');
  
  // Don't exit the process for unhandled rejections in production
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

/**
 * Handle SIGTERM signal
 */
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

/**
 * Handle SIGINT signal
 */
process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = {
  globalErrorHandler
};
