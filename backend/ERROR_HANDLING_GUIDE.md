# Error Handling Implementation Guide

## Overview
This document outlines the comprehensive error handling system implemented across the Phygital backend to prevent server crashes and provide consistent error responses.

## Error Handling Components

### 1. Global Error Handler (`middleware/errorHandler.js`)
- Catches all unhandled errors
- Provides consistent error responses
- Logs errors with context information
- Handles process-level errors (uncaught exceptions, unhandled rejections)

### 2. Error Utilities (`utils/errorHandler.js`)
- Centralized error handling functions
- Specific handlers for different error types
- Async wrapper for route handlers
- Validation utilities

### 3. Enhanced Middleware (`middleware/auth.js`)
- Comprehensive authentication error handling
- Detailed logging for debugging
- Graceful error responses

### 4. Route-Level Error Handling
All route files now include:
- Try-catch blocks around all async operations
- Specific error type handling
- Detailed error logging
- Consistent error response format

## Error Types Handled

### Database Errors
- **ValidationError**: Invalid data format
- **CastError**: Invalid ObjectId format
- **MongoError**: Duplicate entries, connection issues

### Authentication Errors
- **JsonWebTokenError**: Invalid token format
- **TokenExpiredError**: Expired tokens
- **Authentication failures**: Missing or invalid credentials

### File System Errors
- **ENOENT**: File not found
- **EACCES**: Permission denied
- **EMFILE/ENFILE**: Too many open files

### Network Errors
- **ECONNREFUSED**: Service unavailable
- **ETIMEDOUT**: Request timeout

## Implementation Examples

### Route Handler with Error Handling
```javascript
const { asyncHandler, validateRequiredFields } = require('../utils/errorHandler');

router.post('/example', authenticateToken, asyncHandler(async (req, res) => {
  // Validate required fields
  validateRequiredFields(req.body, ['name', 'email']);
  
  // Your route logic here
  const result = await someAsyncOperation();
  
  res.status(200).json({
    status: 'success',
    data: result
  });
}));
```

### Service Function with Error Handling
```javascript
const { logError } = require('../utils/errorHandler');

const processData = async (data) => {
  try {
    // Validate input
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data provided');
    }
    
    // Process data
    const result = await performOperation(data);
    
    return result;
  } catch (error) {
    logError(error, { data }, 'processData');
    throw new Error(`Data processing failed: ${error.message}`);
  }
};
```

## Error Response Format

All errors follow a consistent format:
```json
{
  "status": "error",
  "message": "Human-readable error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "errors": ["Detailed validation errors"] // Optional
}
```

## Development vs Production

### Development Mode
- Full error stack traces
- Detailed error information
- Debug logging

### Production Mode
- Sanitized error messages
- No stack traces exposed
- Minimal error details

## Monitoring and Logging

### Error Logging
- All errors are logged with context
- Includes request information
- Timestamps for debugging
- User information when available

### Error Metrics
- Error counts by type
- Response time tracking
- User impact assessment

## Best Practices

### 1. Always Use Try-Catch
```javascript
// Good
try {
  const result = await asyncOperation();
  return result;
} catch (error) {
  logError(error, context, 'operation');
  throw new Error(`Operation failed: ${error.message}`);
}
```

### 2. Validate Input Early
```javascript
// Good
if (!req.body.email) {
  return res.status(400).json({
    status: 'error',
    message: 'Email is required'
  });
}
```

### 3. Handle Specific Error Types
```javascript
// Good
if (error.name === 'ValidationError') {
  return res.status(400).json({
    status: 'error',
    message: 'Validation failed',
    errors: Object.values(error.errors).map(e => e.message)
  });
}
```

### 4. Use Async Wrapper
```javascript
// Good
const { asyncHandler } = require('../utils/errorHandler');

router.get('/example', asyncHandler(async (req, res) => {
  // Your route logic
}));
```

## Testing Error Handling

### 1. Test Error Scenarios
- Invalid input data
- Database connection failures
- Authentication failures
- File system errors

### 2. Verify Error Responses
- Correct HTTP status codes
- Consistent error format
- Appropriate error messages

### 3. Check Logging
- Errors are properly logged
- Context information included
- No sensitive data exposed

## Maintenance

### Regular Tasks
1. Review error logs for patterns
2. Update error messages for clarity
3. Add new error types as needed
4. Monitor error rates and trends

### Performance Considerations
- Error handling should not impact performance
- Logging should be efficient
- Error responses should be quick

## Troubleshooting

### Common Issues
1. **Silent failures**: Ensure all async operations are wrapped in try-catch
2. **Inconsistent responses**: Use the error utilities consistently
3. **Missing context**: Include relevant information in error logs
4. **Performance impact**: Monitor error handling overhead

### Debug Tips
1. Check error logs for patterns
2. Use development mode for detailed errors
3. Test error scenarios regularly
4. Monitor error rates in production

## Conclusion

This comprehensive error handling system ensures:
- Server stability and reliability
- Consistent user experience
- Effective debugging and monitoring
- Graceful failure handling
- Security through proper error sanitization

The system is designed to be maintainable, scalable, and user-friendly while providing robust error handling across all backend components.
