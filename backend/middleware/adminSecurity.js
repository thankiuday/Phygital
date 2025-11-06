/**
 * Admin Security Middleware
 * Provides rate limiting, brute force protection, and security utilities
 */

const rateLimit = require('express-rate-limit');
const LoginAttempt = require('../models/LoginAttempt');
const AdminActivity = require('../models/AdminActivity');

/**
 * Strict rate limiter for admin login
 * Allows only 5 attempts per 15 minutes per IP
 */
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again in 15 minutes.',
    retryAfter: 900 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false,
  keyGenerator: (req) => {
    // Use IP address for rate limiting
    return req.ip || req.connection.remoteAddress;
  },
  handler: async (req, res) => {
    // Log the blocked attempt
    try {
      await LoginAttempt.create({
        email: req.body.email || 'unknown',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        success: false,
        failureReason: 'rate_limited',
        isAdmin: true
      });
    } catch (error) {
      console.error('Failed to log blocked login attempt:', error);
    }

    return res.status(429).json({
      status: 'error',
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: 900
    });
  }
});

/**
 * Check for brute force attempts
 * Returns true if IP should be blocked
 */
const checkBruteForce = async (email, ipAddress, isAdmin = false) => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  // Check failed attempts for this email/IP combination
  const recentFailures = await LoginAttempt.countDocuments({
    $or: [
      { email, isAdmin: true },
      { ipAddress, isAdmin: true }
    ],
    success: false,
    timestamp: { $gte: fifteenMinutesAgo }
  });

  // Block after 5 failed attempts in 15 minutes
  if (recentFailures >= 5) {
    return {
      blocked: true,
      reason: 'Too many failed login attempts. Please try again later.',
      retryAfter: 900 // 15 minutes in seconds
    };
  }

  // Check for IP-based blocking (more strict - 10 failures from same IP)
  const ipFailures = await LoginAttempt.countDocuments({
    ipAddress,
    isAdmin: true,
    success: false,
    timestamp: { $gte: fifteenMinutesAgo }
  });

  if (ipFailures >= 10) {
    return {
      blocked: true,
      reason: 'This IP address has been temporarily blocked due to suspicious activity.',
      retryAfter: 3600 // 1 hour
    };
  }

  return { blocked: false };
};

/**
 * Log login attempt
 */
const logLoginAttempt = async (email, ipAddress, userAgent, success, failureReason = null, isAdmin = false) => {
  try {
    const attemptData = {
      email,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      success,
      isAdmin
    };
    
    // Only include failureReason if login failed and a reason is provided
    if (!success && failureReason) {
      attemptData.failureReason = failureReason;
    }
    
    await LoginAttempt.create(attemptData);
  } catch (error) {
    console.error('Failed to log login attempt:', error);
  }
};

/**
 * Log admin activity
 */
const logAdminActivity = async (adminId, action, targetType = null, targetId = null, ipAddress, userAgent, details = {}) => {
  try {
    await AdminActivity.create({
      adminId,
      action,
      targetType,
      targetId,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || 'unknown',
      details
    });
  } catch (error) {
    console.error('Failed to log admin activity:', error);
  }
};

/**
 * Get client IP address
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip ||
         'unknown';
};

module.exports = {
  adminLoginLimiter,
  checkBruteForce,
  logLoginAttempt,
  logAdminActivity,
  getClientIP
};

