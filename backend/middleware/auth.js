/**
 * Authentication Middleware
 * Handles JWT token verification and user authentication
 * Protects routes that require user authentication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to verify JWT token and authenticate user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user by ID from token
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
    
    // Add user to request object
    req.user = user;
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    
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
    
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token is provided, but adds user to req if token is valid
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Generate JWT token for user
 * @param {String} userId - User ID
 * @returns {String} JWT token
 */
const generateToken = (userId) => {
  try {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  } catch (error) {
    throw new Error('Failed to generate token');
  }
};

/**
 * Middleware to check if user has uploaded files
 * Used for routes that require user to have completed setup
 */
const requireUploadedFiles = async (req, res, next) => {
  try {
    if (!req.user.uploadedFiles.design.url || !req.user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Please upload both design and video files first'
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify uploaded files'
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  requireUploadedFiles
};
