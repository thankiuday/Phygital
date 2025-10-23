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
      console.log('❌ No token provided in request');
      return res.status(401).json({
        status: 'error',
        message: 'Access token required'
      });
    }
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('❌ JWT verification failed:', jwtError.message);
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token'
        });
      }
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token expired'
        });
      }
      throw jwtError;
    }
    
    // Find user by ID from token
    let user;
    try {
      user = await User.findById(decoded.userId).select('-password');
    } catch (dbError) {
      console.error('❌ Database error during user lookup:', dbError.message);
      return res.status(500).json({
        status: 'error',
        message: 'Database connection error'
      });
    }
    
    if (!user) {
      console.log('❌ User not found for token:', decoded.userId);
      return res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    if (!user.isActive) {
      console.log('❌ User account is deactivated:', user._id);
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated'
      });
    }
    
    // Add user to request object
    req.user = user;
    console.log('✅ User authenticated successfully:', user._id);
    next();
    
  } catch (error) {
    console.error('❌ Authentication error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Handle specific error types
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
    
    if (error.name === 'CastError') {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid user ID format'
      });
    }
    
    // Generic error response
    return res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
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
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        
        if (user && user.isActive) {
          req.user = user;
          console.log('✅ Optional auth: User authenticated:', user._id);
        } else {
          console.log('⚠️ Optional auth: User not found or inactive');
        }
      } catch (jwtError) {
        console.log('⚠️ Optional auth: Invalid token, continuing without auth');
        // Continue without authentication if token is invalid
      }
    } else {
      console.log('⚠️ Optional auth: No token provided, continuing without auth');
    }
    
    next();
  } catch (error) {
    console.error('❌ Optional auth error:', error.message);
    // Continue without authentication if any error occurs
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
    if (!userId) {
      throw new Error('User ID is required to generate token');
    }
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    
    console.log('✅ JWT token generated for user:', userId);
    return token;
  } catch (error) {
    console.error('❌ Token generation error:', error.message);
    throw new Error(`Failed to generate token: ${error.message}`);
  }
};

/**
 * Middleware to check if user has uploaded files
 * Used for routes that require user to have completed setup
 */
const requireUploadedFiles = async (req, res, next) => {
  try {
    if (!req.user) {
      console.log('❌ requireUploadedFiles: No user in request');
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    if (!req.user.uploadedFiles) {
      console.log('❌ requireUploadedFiles: No uploadedFiles object for user:', req.user._id);
      return res.status(400).json({
        status: 'error',
        message: 'User profile not properly initialized'
      });
    }
    
    const hasDesign = req.user.uploadedFiles.design && req.user.uploadedFiles.design.url;
    const hasVideo = req.user.uploadedFiles.video && req.user.uploadedFiles.video.url;
    
    if (!hasDesign || !hasVideo) {
      const missing = [];
      if (!hasDesign) missing.push('design');
      if (!hasVideo) missing.push('video');
      
      console.log('❌ requireUploadedFiles: Missing files for user:', req.user._id, 'Missing:', missing);
      return res.status(400).json({
        status: 'error',
        message: `Please upload ${missing.join(' and ')} files first`,
        missingFiles: missing
      });
    }
    
    console.log('✅ requireUploadedFiles: User has all required files:', req.user._id);
    next();
  } catch (error) {
    console.error('❌ requireUploadedFiles error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify uploaded files',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  requireUploadedFiles
};
