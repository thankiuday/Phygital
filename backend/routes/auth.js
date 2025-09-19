/**
 * Authentication Routes
 * Handles user registration, login, and profile management
 * Uses JWT for token-based authentication
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user account
 * Validates input, checks for duplicates, hashes password, and returns JWT token
 */
router.post('/register', [
  // Input validation
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }
    
    // Create new user
    const user = new User({
      username,
      email,
      password
    });
    
    await user.save();
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    // Return user data (without password) and token
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 * Validates credentials and returns user data with token
 */
router.post('/login', [
  // Input validation
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact support.'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = generateToken(user._id);
    
    // Update last login time
    user.updatedAt = new Date();
    await user.save();
    
    // Return user data and token
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/profile
 * Get current user's profile information
 * Requires authentication token
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // User is already attached to req by authenticateToken middleware
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/auth/profile
 * Update user profile information
 * Requires authentication token
 */
router.put('/profile', authenticateToken, [
  // Optional validation for profile updates
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { username, email, socialLinks } = req.body;
    const updateData = {};
    
    // Check if username is being updated and if it's available
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Username already taken'
        });
      }
      updateData.username = username;
    }
    
    // Check if email is being updated and if it's available
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already registered'
        });
      }
      updateData.email = email;
    }
    
    // Update social links if provided
    if (socialLinks) {
      updateData.socialLinks = { ...req.user.socialLinks, ...socialLinks };
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser.getPublicProfile()
      }
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 * Requires authentication token and current password
 */
router.post('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Get user with password field
    const user = await User.findById(req.user._id);
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
