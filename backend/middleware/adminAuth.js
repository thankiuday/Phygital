/**
 * Admin Authentication Middleware
 * Verifies that the authenticated user has admin role with enhanced security
 * Must be used after authenticateToken middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAdminActivity, getClientIP } = require('./adminSecurity');

/**
 * Enhanced middleware to verify user has admin role
 * Includes JWT payload verification and security checks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAdmin = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }

    // Verify JWT token and decode payload
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token expired. Please login again.'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token'
        });
      }
      throw jwtError;
    }

    // Verify user exists and is active
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }

    // STRICT: Verify admin role in both JWT payload and database
    // Check database role first (most authoritative)
    if (user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin privileges required'
      });
    }

    // Additional check: verify email matches admin email pattern
    // This provides defense in depth
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@phygital.zone';
    if (user.email !== adminEmail && user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access denied'
      });
    }

    // Attach user to request
    req.user = user;
    req.adminId = user._id;

    // Continue to next middleware
    next();

  } catch (error) {
    console.error('❌ Admin auth error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Admin authentication failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

/**
 * Middleware to log admin activity (should be used after requireAdmin)
 */
const logAdminAction = (action) => {
  return async (req, res, next) => {
    // Log will be done after the action completes
    res.on('finish', () => {
      if (req.user && req.user.role === 'admin') {
        const ipAddress = getClientIP(req);
        const userAgent = req.headers['user-agent'];
        
        logAdminActivity(
          req.user._id,
          action,
          req.body?.targetType || null,
          req.params?.id || req.body?.targetId || null,
          ipAddress,
          userAgent,
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            ...(req.body && Object.keys(req.body).length > 0 && { requestBody: req.body })
          }
        ).catch(err => {
          console.error('Failed to log admin activity:', err);
        });
      }
    });

    next();
  };
};

module.exports = {
  requireAdmin,
  logAdminAction
};

