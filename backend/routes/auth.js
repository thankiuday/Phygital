/**
 * Authentication Routes
 * Handles user registration, login, and profile management
 * Uses JWT for token-based authentication
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken, authenticateToken } = require('../middleware/auth');
const passport = require('../middleware/passport');
const { generateUsernameFromEmail } = require('../utils/usernameGenerator');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user account
 * Validates input, checks for duplicates, hashes password, and returns JWT token
 */
router.post('/register', [
  // Input validation - username is now optional (will be auto-generated if not provided)
  body('username')
    .optional()
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
    
    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already registered',
        errors: {
          email: 'Email already registered'
        }
      });
    }
    
    // If username is provided, check if it already exists
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({
          status: 'error',
          message: 'Username already taken',
          errors: {
            username: 'Username already taken'
          }
        });
      }
    }
    
    // Generate username from email if not provided
    let finalUsername = username;
    if (!finalUsername) {
      try {
        finalUsername = await generateUsernameFromEmail(email);
        console.log('Auto-generated username:', finalUsername);
      } catch (error) {
        console.error('Error generating username:', error);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to generate username. Please try again.'
        });
      }
    }
    
    // Create new user
    const user = new User({
      username: finalUsername,
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
 * Also supports auto-account creation if createAccount flag is true and user doesn't exist
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
    
    const { email, password, createAccount = false } = req.body;
    
    // Ensure createAccount is a boolean
    const shouldCreateAccount = createAccount === true || createAccount === 'true';
    
    console.log('Login request received:', { 
      email, 
      createAccount: req.body.createAccount, 
      shouldCreateAccount,
      createAccountType: typeof req.body.createAccount 
    });
    
    // Find user by email
    let user = await User.findOne({ email });
    
    // If user doesn't exist and createAccount is true, create new account
    if (!user && shouldCreateAccount) {
      console.log('Creating new account for:', email);
      // Validate password strength for new accounts
      if (password.length < 6) {
        return res.status(400).json({
          status: 'error',
          message: 'Password must be at least 6 characters long'
        });
      }
      
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return res.status(400).json({
          status: 'error',
          message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
        });
      }
      
      // Check if email already exists (double-check)
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Email already registered'
        });
      }
      
      // Generate username from email
      let username;
      try {
        username = await generateUsernameFromEmail(email);
        console.log('Generated username:', username);
      } catch (error) {
        console.error('Error generating username:', error);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to generate username. Please try again.'
        });
      }
      
      // Create new user
      try {
        user = new User({
          username,
          email,
          password
        });
        
        await user.save();
        console.log('User created successfully:', user.email);
      } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 11000) {
          const field = Object.keys(error.keyPattern)[0];
          return res.status(400).json({
            status: 'error',
            message: `${field === 'email' ? 'Email' : 'Username'} already exists`
          });
        }
        return res.status(500).json({
          status: 'error',
          message: 'Failed to create account. Please try again.'
        });
      }
      
      // Generate JWT token for new user
      const token = generateToken(user._id);
      
      // Return user data and token
      return res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        data: {
          user: user.getPublicProfile(),
          token
        }
      });
    }
    
    // If user doesn't exist and createAccount is false, return specific error
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Account not found. Please check your email or create a new account.',
        userNotFound: true
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
        message: 'Invalid password. Please check your password and try again.'
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
    
    // Handle duplicate key errors (username or email)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        status: 'error',
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/auth/smart-auth
 * Smart authentication endpoint - handles both login and registration automatically
 * If user exists: login
 * If user doesn't exist and termsAccepted: create account
 * If user doesn't exist and !termsAccepted: return userNotFound flag
 */
router.post('/smart-auth', [
  // Input validation
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  body('termsAccepted')
    .optional()
    .isBoolean()
    .withMessage('termsAccepted must be a boolean')
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
    
    const { email, password, termsAccepted = false } = req.body;
    
    // Find user by email
    let user = await User.findOne({ email });
    
    // CASE 1: User exists → LOGIN
    if (user) {
      // If user exists but termsAccepted is true, user tried to create account but account already exists
      if (termsAccepted) {
        return res.status(400).json({
          status: 'error',
          message: 'Account already exists. Please sign in instead.',
          accountExists: true
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
          message: 'Invalid password. Please check your password and try again.'
        });
      }
      
      // Generate JWT token
      const token = generateToken(user._id);
      
      // Update last login time
      user.updatedAt = new Date();
      await user.save();
      
      // Return success
      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        isNewUser: false,
        data: {
          user: user.getPublicProfile(),
          token
        }
      });
    }
    
    // CASE 2: User does NOT exist
    // If termsAccepted is false, return userNotFound flag (frontend will show checkbox)
    if (!termsAccepted) {
      return res.status(401).json({
        status: 'error',
        message: 'Account not found. Please accept the certification to create a new account.',
        userNotFound: true
      });
    }
    
    // If termsAccepted is true, CREATE ACCOUNT
    // Validate password strength for new accounts
    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }
    
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      });
    }
    
    // Generate username from email
    let username;
    try {
      username = await generateUsernameFromEmail(email);
      console.log('Auto-generated username:', username);
    } catch (error) {
      console.error('Error generating username:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to generate username. Please try again.'
      });
    }
    
    // Create new user
    try {
      user = new User({
        username,
        email,
        password
      });
      
      await user.save();
      console.log('User created successfully:', user.email);
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({
          status: 'error',
          message: `${field === 'email' ? 'Email' : 'Username'} already exists`
        });
      }
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create account. Please try again.'
      });
    }
    
    // Generate JWT token for new user
    const token = generateToken(user._id);
    
    // Return success with isNewUser flag
    return res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      isNewUser: true,
      data: {
        user: user.getPublicProfile(),
        token
      }
    });
    
  } catch (error) {
    console.error('Smart auth error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        status: 'error',
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed',
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
    const profile = req.user.getPublicProfile();

    res.status(200).json({
      status: 'success',
      data: {
        user: profile
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
 * POST /api/auth/admin/login
 * Admin login endpoint with enhanced security
 * Includes brute force protection, rate limiting, and activity logging
 */
const { adminLoginLimiter, checkBruteForce, logLoginAttempt, logAdminActivity, getClientIP } = require('../middleware/adminSecurity');

router.post('/admin/login', adminLoginLimiter, [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  const clientIP = getClientIP(req);
  const userAgent = req.headers['user-agent'];
  let email = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Log failed validation attempt
      if (req.body.email) {
        await logLoginAttempt(req.body.email, clientIP, userAgent, false, 'validation_error', true);
      }
      
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    email = req.body.email;
    const password = req.body.password;

    // Get admin credentials from environment variables (more secure)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@phygital.zone';
    const adminPassword = process.env.ADMIN_PASSWORD || 'PhygitalAdmin@2025';

    // Check for brute force attempts BEFORE verifying credentials
    const bruteForceCheck = await checkBruteForce(email, clientIP, true);
    if (bruteForceCheck.blocked) {
      await logLoginAttempt(email, clientIP, userAgent, false, 'ip_blocked', true);
      
      return res.status(429).json({
        status: 'error',
        message: bruteForceCheck.reason,
        retryAfter: bruteForceCheck.retryAfter
      });
    }

    // Verify admin email matches
    if (email !== adminEmail) {
      // Use constant-time comparison to prevent timing attacks
      // Always check password even if email doesn't match to prevent user enumeration
      await new Promise(resolve => setTimeout(resolve, 100)); // Constant delay
      await logLoginAttempt(email, clientIP, userAgent, false, 'invalid_credentials', true);
      
      return res.status(401).json({
        status: 'error',
        message: 'Invalid admin credentials'
      });
    }

    // Find or create admin user
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      // Create admin user if doesn't exist
      adminUser = new User({
        username: 'admin',
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        role: 'admin',
        isActive: true
      });
      await adminUser.save();
      
      console.log('✅ Admin user created successfully with role:', adminUser.role);
    } else {
      // Verify password using secure comparison FIRST
      const isPasswordValid = await adminUser.comparePassword(password);
      if (!isPasswordValid) {
        await logLoginAttempt(email, clientIP, userAgent, false, 'invalid_credentials', true);
        
        return res.status(401).json({
          status: 'error',
          message: 'Invalid admin credentials'
        });
      }
      
      // After successful password verification, ensure user has admin role and is active
      let needsUpdate = false;
      if (adminUser.role !== 'admin') {
        console.log('⚠️  Updating user role from', adminUser.role, 'to admin');
        adminUser.role = 'admin';
        needsUpdate = true;
      }
      if (!adminUser.isActive) {
        console.log('⚠️  Activating admin account');
        adminUser.isActive = true;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await adminUser.save();
        console.log('✅ Admin user updated successfully with role:', adminUser.role);
      }
    }

    // Check if account is locked (additional safety check)
    if (!adminUser.isActive) {
      await logLoginAttempt(email, clientIP, userAgent, false, 'account_inactive', true);
      
      return res.status(401).json({
        status: 'error',
        message: 'Admin account is deactivated'
      });
    }

    // Generate JWT token with admin flag for shorter expiration
    const token = generateToken(adminUser._id, true);

    // Update last login time and ensure role is admin (extra safety)
    adminUser.role = 'admin'; // Ensure role is always admin
    adminUser.isActive = true; // Ensure account is always active
    adminUser.updatedAt = new Date();
    await adminUser.save();
    
    console.log('✅ Admin login successful - role:', adminUser.role, 'isActive:', adminUser.isActive);

    // Log successful login attempt
    await logLoginAttempt(email, clientIP, userAgent, true, null, true);
    
    // Log admin activity
    await logAdminActivity(
      adminUser._id,
      'login',
      null,
      null,
      clientIP,
      userAgent,
      { method: 'POST', endpoint: '/admin/login' }
    );

    // Return admin user data and token
    res.status(200).json({
      status: 'success',
      message: 'Admin login successful',
      data: {
        user: adminUser.getPublicProfile(),
        token,
        expiresIn: process.env.ADMIN_JWT_EXPIRE || '2h' // Inform frontend of expiration
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    
    // Log failed attempt
    if (email) {
      await logLoginAttempt(email, clientIP, userAgent, false, 'server_error', true);
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Admin login failed',
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

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 * Redirects user to Google consent screen
 */
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 * Processes authentication result and redirects to frontend with token
 */
router.get('/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'https://phygital.zone'}/#/login?error=auth_failed`
  }),
  async (req, res) => {
    try {
      // User is authenticated via Passport
      const user = req.user;
      
      console.log('🔍 Google Callback - User received:', user ? 'Yes' : 'No');
      
      if (!user) {
        console.error('❌ No user found after Google authentication');
        const frontendUrl = process.env.FRONTEND_URL || 'https://phygital.zone';
        console.log('Redirecting to:', `${frontendUrl}/#/login?error=auth_failed`);
        return res.redirect(`${frontendUrl}/#/login?error=auth_failed`);
      }
      
      // Generate JWT token
      const token = generateToken(user._id);
      console.log('🔑 Token generated for user:', user.email);
      
      // Log successful authentication
      console.log('✅ Google OAuth successful for user:', user.email);
      
      // Redirect to frontend with token
      // Frontend will extract token from URL and complete login
      // IMPORTANT: Using HashRouter, so we need to include the # in the URL
      const frontendUrl = process.env.FRONTEND_URL || 'https://phygital.zone';
      const redirectUrl = `${frontendUrl}/#/auth/callback?token=${token}`;
      console.log('🔄 Redirecting to:', redirectUrl);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('❌ Google callback error:', error);
      console.error('Error stack:', error.stack);
      const frontendUrl = process.env.FRONTEND_URL || 'https://phygital.zone';
      res.redirect(`${frontendUrl}/#/login?error=server_error`);
    }
  }
);

module.exports = router;
