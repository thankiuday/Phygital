/**
 * Analytics Routes
 * Handles analytics tracking and reporting
 * Tracks QR scans, video views, link clicks, and other user interactions
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/analytics/scan
 * Track QR code scan event
 * Increments scan counter and logs detailed analytics
 */
router.post('/scan', [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('projectId').optional().isString().withMessage('Project ID must be a string'),
  body('scanData').optional().isObject().withMessage('Scan data must be an object')
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
    
    const { userId, projectId, scanData = {} } = req.body;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Find user by ID or username
    let user;
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update user analytics
    await user.updateAnalytics('scan');

    // Also increment project-specific analytics if projectId provided
    if (projectId) {
      const project = user.projects.find(p => p.id === projectId);
      if (project) {
        project.analytics = project.analytics || {};
        project.analytics.totalScans = (project.analytics.totalScans || 0) + 1;
        project.analytics.lastScanAt = new Date();
        project.updatedAt = new Date();
        await user.save();
      }
    }
    
    // Track detailed analytics with projectId
    await Analytics.trackEvent(userId, 'scan', {
      scanLocation: scanData.location || {},
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer,
      deviceInfo: {
        type: scanData.deviceType || 'unknown',
        browser: scanData.browser || 'unknown',
        os: scanData.os || 'unknown'
      }
    }, projectId);
    
    res.status(200).json({
      status: 'success',
      message: 'Scan tracked successfully',
      data: {
        totalScans: user.analytics.totalScans
      }
    });
    
  } catch (error) {
    console.error('Scan tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track scan',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analytics/video-view
 * Track video view event
 * Increments video view counter and logs analytics
 */
router.post('/video-view', [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('projectId').optional().isString().withMessage('Project ID must be a string'),
  body('videoProgress').optional().isNumeric().withMessage('Video progress must be a number'),
  body('videoDuration').optional().isNumeric().withMessage('Video duration must be a number')
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
    
    const { userId, projectId, videoProgress = 0, videoDuration = 0 } = req.body;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Find user by ID or username
    let user;
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update user analytics
    await user.updateAnalytics('videoView');

    // Also increment project-specific analytics if projectId provided
    if (projectId) {
      const project = user.projects.find(p => p.id === projectId);
      if (project) {
        project.analytics = project.analytics || {};
        project.analytics.videoViews = (project.analytics.videoViews || 0) + 1;
        project.analytics.lastVideoViewAt = new Date();
        project.updatedAt = new Date();
        await user.save();
      }
    }
    
    // Track detailed analytics with projectId
    await Analytics.trackEvent(userId, 'videoView', {
      videoProgress: parseFloat(videoProgress),
      videoDuration: parseFloat(videoDuration),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer
    }, projectId);
    
    res.status(200).json({
      status: 'success',
      message: 'Video view tracked successfully',
      data: {
        totalVideoViews: user.analytics.videoViews
      }
    });
    
  } catch (error) {
    console.error('Video view tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track video view',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analytics/link-click
 * Track social link click event
 * Increments link click counter and logs analytics
 */
router.post('/link-click', [
  body('userId').isString().withMessage('Valid user ID is required'),
  body('projectId').optional().isString().withMessage('Project ID must be a string'),
  body('linkType').isString().withMessage('Link type is required'),
  body('linkUrl').isURL().withMessage('Valid link URL is required')
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
    
    const { userId, projectId, linkType, linkUrl } = req.body;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Find user by ID or username
    let user;
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update user analytics
    await user.updateAnalytics('linkClick');

    // Also increment project-specific analytics if projectId provided
    if (projectId) {
      const project = user.projects.find(p => p.id === projectId);
      if (project) {
        project.analytics = project.analytics || {};
        project.analytics.linkClicks = (project.analytics.linkClicks || 0) + 1;
        project.updatedAt = new Date();
        await user.save();
      }
    }
    
    // Track detailed analytics with projectId
    await Analytics.trackEvent(userId, 'linkClick', {
      linkType,
      linkUrl,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer
    }, projectId);
    
    res.status(200).json({
      status: 'success',
      message: 'Link click tracked successfully',
      data: {
        totalLinkClicks: user.analytics.linkClicks
      }
    });
    
  } catch (error) {
    console.error('Link click tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track link click',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/analytics/:userId
 * Get analytics data for a specific user
 * Returns summary and detailed analytics
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;
    
    // Verify user can only access their own analytics
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to access these analytics'
      });
    }
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Find user by ID or username
    let user;
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Get detailed analytics
    const detailedAnalytics = await Analytics.getUserAnalytics(userId, parseInt(days));
    
    // Prepare response data
    const analyticsData = {
      summary: {
        totalScans: user.analytics.totalScans,
        totalVideoViews: user.analytics.videoViews,
        totalLinkClicks: user.analytics.linkClicks,
        lastScanAt: user.analytics.lastScanAt,
        lastVideoViewAt: user.analytics.lastVideoViewAt
      },
      detailed: detailedAnalytics,
      period: {
        days: parseInt(days),
        startDate: new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000),
        endDate: new Date()
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: analyticsData
    });
    
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/analytics/dashboard/:userId
 * Get dashboard analytics for a specific user
 * Returns formatted data for dashboard display
 */
router.get('/dashboard/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30d' } = req.query;
    
    // Verify user can only access their own analytics
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to access these analytics'
      });
    }
    
    // Parse period
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '30d') days = 30;
    else if (period === '90d') days = 90;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Find user by ID or username
    let user;
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Get detailed analytics
    const detailedAnalytics = await Analytics.getUserAnalytics(userId, days);
    
    // Calculate engagement metrics
    const totalInteractions = user.analytics.totalScans + user.analytics.videoViews + user.analytics.linkClicks;
    const engagementRate = user.analytics.totalScans > 0 ? 
      ((user.analytics.videoViews + user.analytics.linkClicks) / user.analytics.totalScans * 100).toFixed(2) : 0;
    
    // Prepare dashboard data
    const dashboardData = {
      overview: {
        totalScans: user.analytics.totalScans,
        totalVideoViews: user.analytics.videoViews,
        totalLinkClicks: user.analytics.linkClicks,
        totalInteractions,
        engagementRate: parseFloat(engagementRate)
      },
      recentActivity: {
        lastScanAt: user.analytics.lastScanAt,
        lastVideoViewAt: user.analytics.lastVideoViewAt
      },
      trends: detailedAnalytics.dailyBreakdown,
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        endDate: new Date()
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: dashboardData
    });
    
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analytics/ar-experience-start
 * Track AR experience start event
 * Logs when users start AR experience with performance metrics
 */
router.post('/ar-experience-start', [
  body('userId').isString().withMessage('User ID is required'),
  body('projectId').isString().withMessage('Project ID is required'),
  body('timestamp').isISO8601().withMessage('Valid timestamp is required'),
  body('loadTime').optional().isNumeric().withMessage('Load time must be a number'),
  body('hasDesign').optional().isBoolean().withMessage('Has design must be boolean'),
  body('hasVideo').optional().isBoolean().withMessage('Has video must be boolean'),
  body('userAgent').optional().isString().withMessage('User agent must be string')
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
    
    const { 
      userId, 
      projectId, 
      timestamp, 
      loadTime = 0, 
      hasDesign = false, 
      hasVideo = false, 
      userAgent 
    } = req.body;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Find user by ID or username
    let user;
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update user analytics
    await user.updateAnalytics('arExperienceStart');

    // Also increment project-specific analytics if projectId provided
    if (projectId) {
      const project = user.projects.find(p => p.id === projectId);
      if (project) {
        project.analytics = project.analytics || {};
        project.analytics.arExperienceStarts = (project.analytics.arExperienceStarts || 0) + 1;
        project.analytics.lastArExperienceStartAt = new Date();
        project.updatedAt = new Date();
        await user.save();
      }
    }
    
    // Track detailed analytics with projectId
    await Analytics.trackEvent(userId, 'arExperienceStart', {
      loadTime: parseFloat(loadTime),
      hasDesign: Boolean(hasDesign),
      hasVideo: Boolean(hasVideo),
      userAgent: userAgent || req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer,
      timestamp: new Date(timestamp)
    }, projectId);
    
    res.status(200).json({
      status: 'success',
      message: 'AR experience start tracked successfully',
      data: {
        totalArStarts: user.analytics.arExperienceStarts || 0
      }
    });
    
  } catch (error) {
    console.error('AR experience start tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track AR experience start',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analytics/page-view
 * Track page view event
 * Logs when users visit the personalized page
 */
router.post('/page-view', [
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('projectId').optional().isString().withMessage('Project ID must be a string')
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
    
    const { userId, projectId } = req.body;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Find user by ID or username
    let user;
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Track page view with projectId
    await Analytics.trackEvent(userId, 'pageView', {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer
    }, projectId);
    
    res.status(200).json({
      status: 'success',
      message: 'Page view tracked successfully'
    });
    
  } catch (error) {
    console.error('Page view tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track page view',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analytics/ar-experience-error
 * Track AR experience error events
 * Logs when users encounter errors during AR experience
 */
router.post('/ar-experience-error', [
  body('userId').isString().withMessage('User ID is required'),
  body('projectId').optional().isString().withMessage('Project ID must be a string'),
  body('errorType').isString().withMessage('Error type is required'),
  body('errorMessage').optional().isString().withMessage('Error message must be a string'),
  body('timestamp').optional().isISO8601().withMessage('Valid timestamp is required'),
  body('userAgent').optional().isString().withMessage('User agent must be string')
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
    
    const { 
      userId, 
      projectId, 
      errorType, 
      errorMessage = '', 
      timestamp = new Date().toISOString(),
      userAgent 
    } = req.body;
    
    // Validate if userId is a valid ObjectId format (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
    
    // Find user by ID or username
    let user;
    if (isValidObjectId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ username: userId });
    }
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Track detailed analytics with projectId
    await Analytics.trackEvent(userId, 'arExperienceError', {
      errorType,
      errorMessage,
      userAgent: userAgent || req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer,
      timestamp: new Date(timestamp)
    }, projectId);
    
    res.status(200).json({
      status: 'success',
      message: 'AR experience error tracked successfully'
    });
    
  } catch (error) {
    console.error('AR experience error tracking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to track AR experience error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
