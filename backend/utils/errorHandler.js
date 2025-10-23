/**
 * Error Handling Utilities
 * Provides centralized error handling and logging
 * Ensures consistent error responses across the application
 */

/**
 * Log error with context information
 * @param {Error} error - The error object
 * @param {Object} context - Additional context information
 * @param {String} operation - The operation that failed
 */
const logError = (error, context = {}, operation = 'Unknown') => {
  console.error(`❌ ${operation} Error:`, {
    message: error.message,
    name: error.name,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString()
  });
};

/**
 * Handle database errors
 * @param {Error} error - The database error
 * @param {Object} res - Express response object
 * @param {String} operation - The operation that failed
 */
const handleDatabaseError = (error, res, operation = 'Database operation') => {
  logError(error, {}, operation);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: Object.values(error.errors).map(e => e.message)
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid data format'
    });
  }
  
  if (error.name === 'MongoError' && error.code === 11000) {
    return res.status(400).json({
      status: 'error',
      message: 'Duplicate entry found'
    });
  }
  
  return res.status(500).json({
    status: 'error',
    message: 'Database operation failed',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * Handle authentication errors
 * @param {Error} error - The authentication error
 * @param {Object} res - Express response object
 * @param {String} operation - The operation that failed
 */
const handleAuthError = (error, res, operation = 'Authentication') => {
  logError(error, {}, operation);
  
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'error',
      message: 'Token expired'
    });
  }
  
  return res.status(401).json({
    status: 'error',
    message: 'Authentication failed'
  });
};

/**
 * Handle file operation errors
 * @param {Error} error - The file operation error
 * @param {Object} res - Express response object
 * @param {String} operation - The operation that failed
 */
const handleFileError = (error, res, operation = 'File operation') => {
  logError(error, {}, operation);
  
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      status: 'error',
      message: 'File not found'
    });
  }
  
  if (error.code === 'EACCES') {
    return res.status(403).json({
      status: 'error',
      message: 'Permission denied'
    });
  }
  
  if (error.code === 'EMFILE' || error.code === 'ENFILE') {
    return res.status(507).json({
      status: 'error',
      message: 'Too many open files'
    });
  }
  
  return res.status(500).json({
    status: 'error',
    message: 'File operation failed',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * Handle network/API errors
 * @param {Error} error - The network error
 * @param {Object} res - Express response object
 * @param {String} operation - The operation that failed
 */
const handleNetworkError = (error, res, operation = 'Network operation') => {
  logError(error, {}, operation);
  
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      status: 'error',
      message: 'Service unavailable'
    });
  }
  
  if (error.code === 'ETIMEDOUT') {
    return res.status(504).json({
      status: 'error',
      message: 'Request timeout'
    });
  }
  
  return res.status(500).json({
    status: 'error',
    message: 'Network operation failed',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * Handle validation errors
 * @param {Error} error - The validation error
 * @param {Object} res - Express response object
 * @param {String} operation - The operation that failed
 */
const handleValidationError = (error, res, operation = 'Validation') => {
  logError(error, {}, operation);
  
  return res.status(400).json({
    status: 'error',
    message: 'Validation failed',
    errors: error.errors || [error.message]
  });
};

/**
 * Generic error handler
 * @param {Error} error - The error object
 * @param {Object} res - Express response object
 * @param {String} operation - The operation that failed
 * @param {Object} context - Additional context
 */
const handleGenericError = (error, res, operation = 'Operation', context = {}) => {
  logError(error, context, operation);
  
  // Determine error type and handle accordingly
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return handleDatabaseError(error, res, operation);
  }
  
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return handleAuthError(error, res, operation);
  }
  
  if (error.code && ['ENOENT', 'EACCES', 'EMFILE', 'ENFILE'].includes(error.code)) {
    return handleFileError(error, res, operation);
  }
  
  if (error.code && ['ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
    return handleNetworkError(error, res, operation);
  }
  
  // Generic error response
  return res.status(500).json({
    status: 'error',
    message: `${operation} failed`,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

/**
 * Async wrapper for route handlers
 * Catches errors and passes them to error handler
 * @param {Function} fn - The async route handler function
 * @returns {Function} - Wrapped function with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleGenericError(error, res, 'Route handler', {
        method: req.method,
        url: req.url,
        userId: req.user?._id
      });
    });
  };
};

/**
 * Validate required fields
 * @param {Object} data - The data to validate
 * @param {Array} requiredFields - Array of required field names
 * @throws {Error} - If validation fails
 */
const validateRequiredFields = (data, requiredFields) => {
  const missing = requiredFields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Validate object ID format
 * @param {String} id - The ID to validate
 * @throws {Error} - If ID format is invalid
 */
const validateObjectId = (id) => {
  if (!id || typeof id !== 'string' || id.length !== 24) {
    throw new Error('Invalid ID format');
  }
};

/**
 * Safe JSON parse with error handling
 * @param {String} jsonString - The JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} - Parsed object or default value
 */
const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('⚠️ JSON parse failed:', error.message);
    return defaultValue;
  }
};

module.exports = {
  logError,
  handleDatabaseError,
  handleAuthError,
  handleFileError,
  handleNetworkError,
  handleValidationError,
  handleGenericError,
  asyncHandler,
  validateRequiredFields,
  validateObjectId,
  safeJsonParse
};
