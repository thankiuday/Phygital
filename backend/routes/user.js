/**
 * User Routes
 * Handles user-related operations and profile management
 * Provides endpoints for user data retrieval and updates
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/user/profile
 * Get current user's complete profile
 * Returns all user data including uploaded files and analytics
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // User is already attached to req by authenticateToken middleware
    const user = req.user;
    
    // Get public profile with all data
    const profileData = user.getPublicProfile();
    
    res.status(200).json({
      status: 'success',
      data: {
        user: profileData
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
 * GET /api/user/:identifier
 * Get public profile by urlCode, username, or userId
 * Returns public user data for personalized pages
 * Supports backward compatibility with username and userId
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Build query to support urlCode, username, or userId (ObjectId)
    let query;
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    const isValidUrlCode = /^[a-zA-Z0-9_-]{6,8}$/.test(identifier);
    
    if (isValidObjectId) {
      // Check if it's a valid MongoDB ObjectId
      query = { _id: identifier };
    } else if (isValidUrlCode) {
      // Check if it's a valid urlCode format
      query = { urlCode: identifier };
    } else {
      // Fallback to username (backward compatibility)
      query = { username: identifier };
    }
    
    // Find user by identifier
    const user = await User.findOne(query).select('-password -email');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Check if user has completed setup
    if (!user.uploadedFiles.design.url || !user.uploadedFiles.video.url) {
      return res.status(400).json({
        status: 'error',
        message: 'User profile not complete'
      });
    }
    
    // Return public profile data
    const publicProfile = {
      username: user.username,
      uploadedFiles: user.uploadedFiles,
      socialLinks: user.socialLinks,
      qrPosition: user.qrPosition,
      analytics: {
        totalScans: user.analytics.totalScans,
        videoViews: user.analytics.videoViews,
        linkClicks: user.analytics.linkClicks
      },
      createdAt: user.createdAt
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        user: publicProfile
      }
    });
    
  } catch (error) {
    console.error('Public profile fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/user/profile
 * Update user profile information
 * Allows updating username, social links, and other profile data
 */
router.put('/profile', authenticateToken, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('socialLinks')
    .optional()
    .isObject()
    .withMessage('Social links must be an object'),
  
  body('socialLinks.instagram')
    .optional()
    .isURL()
    .withMessage('Instagram must be a valid URL'),
  
  body('socialLinks.facebook')
    .optional()
    .isURL()
    .withMessage('Facebook must be a valid URL'),
  
  body('socialLinks.twitter')
    .optional()
    .isURL()
    .withMessage('Twitter must be a valid URL'),
  
  body('socialLinks.linkedin')
    .optional()
    .isURL()
    .withMessage('LinkedIn must be a valid URL'),
  
  body('socialLinks.website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  
  body('socialLinks.contactNumber')
    .optional()
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      // Accept international format: +[country code][number] or just digits
      const phoneRegex = /^\+?[1-9]\d{7,14}$/;
      if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        throw new Error('Contact number must be a valid phone number');
      }
      return true;
    }),
  
  body('socialLinks.whatsappNumber')
    .optional()
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      // Accept international format: +[country code][number] or just digits
      const phoneRegex = /^\+?[1-9]\d{7,14}$/;
      if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) {
        throw new Error('WhatsApp number must be a valid phone number');
      }
      return true;
    })
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
    
    const { username, socialLinks } = req.body;
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
 * GET /api/user/setup/status
 * Get user setup status
 * Returns information about what the user has completed
 */
router.get('/setup/status', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    const setupStatus = {
      profile: {
        completed: !!(user.username && user.email),
        username: user.username,
        email: user.email
      },
      design: {
        completed: !!user.uploadedFiles.design.url,
        url: user.uploadedFiles.design.url,
        filename: user.uploadedFiles.design.filename,
        uploadedAt: user.uploadedFiles.design.uploadedAt
      },
      video: {
        completed: !!user.uploadedFiles.video.url,
        url: user.uploadedFiles.video.url,
        filename: user.uploadedFiles.video.filename,
        uploadedAt: user.uploadedFiles.video.uploadedAt,
        compressed: user.uploadedFiles.video.compressed
      },
      qrPosition: {
        completed: !!(user.qrPosition.x !== 0 || user.qrPosition.y !== 0),
        position: user.qrPosition
      },
      socialLinks: {
        completed: !!(user.socialLinks.instagram || user.socialLinks.facebook || 
                     user.socialLinks.twitter || user.socialLinks.linkedin || 
                     user.socialLinks.website),
        links: user.socialLinks
      },
      overall: {
        completed: !!(user.uploadedFiles.design.url && user.uploadedFiles.video.url),
        progress: 0
      }
    };
    
    // Calculate overall progress
    let completedSteps = 0;
    const totalSteps = 4; // design, video, qrPosition, socialLinks
    
    if (setupStatus.design.completed) completedSteps++;
    if (setupStatus.video.completed) completedSteps++;
    if (setupStatus.qrPosition.completed) completedSteps++;
    if (setupStatus.socialLinks.completed) completedSteps++;
    
    setupStatus.overall.progress = Math.round((completedSteps / totalSteps) * 100);
    
    res.status(200).json({
      status: 'success',
      data: setupStatus
    });
    
  } catch (error) {
    console.error('Setup status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get setup status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/user/account
 * Delete user account and all associated data
 * Requires password confirmation
 */
router.delete('/account', authenticateToken, [
  body('password')
    .notEmpty()
    .withMessage('Password is required for account deletion')
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
    
    const { password } = req.body;
    
    // Get user with password field
    const user = await User.findById(req.user._id);
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid password'
      });
    }
    
    // TODO: Delete files from Cloudinary
    // TODO: Delete analytics data
    // TODO: Send deletion confirmation email
    
    // Delete user account
    await User.findByIdAndDelete(req.user._id);
    
    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
    
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/user/analytics/summary
 * Get user analytics summary
 * Returns basic analytics data for dashboard
 */
router.get('/analytics/summary', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    const analyticsSummary = {
      totalScans: user.analytics.totalScans,
      totalVideoViews: user.analytics.videoViews,
      totalLinkClicks: user.analytics.linkClicks,
      lastScanAt: user.analytics.lastScanAt,
      lastVideoViewAt: user.analytics.lastVideoViewAt,
      engagementRate: user.analytics.totalScans > 0 ? 
        ((user.analytics.videoViews + user.analytics.linkClicks) / user.analytics.totalScans * 100).toFixed(2) : 0
    };
    
    res.status(200).json({
      status: 'success',
      data: analyticsSummary
    });
    
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get analytics summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
