/**
 * Analytics Routes
 * Handles analytics tracking and reporting
 * Tracks QR scans, video views, link clicks, and other user interactions
 */

const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const { authenticateToken } = require('../middleware/auth');
const { preventDuplicateAnalytics } = require('../middleware/analyticsDeduplication');

const router = express.Router();

// Initialize cache with 30 second default TTL
const analyticsCache = new NodeCache({ 
  stdTTL: 30, // Default TTL: 30 seconds
  checkperiod: 10, // Check for expired keys every 10 seconds
  useClones: false // Better performance for large objects
});

/**
 * Cache helper function
 * @param {string} cacheKey - Unique cache key
 * @param {Function} fetchFn - Function that returns a Promise with the data to cache
 * @param {number} ttl - Time to live in seconds (default: 30)
 * @returns {Promise} - Cached or freshly fetched data
 */
function getCachedOrFetch(cacheKey, fetchFn, ttl = 30) {
  const cached = analyticsCache.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache hit: ${cacheKey}`);
    return Promise.resolve(cached);
  }
  
  console.log(`❌ Cache miss: ${cacheKey}`);
  return fetchFn().then(data => {
    analyticsCache.set(cacheKey, data, ttl);
    return data;
  });
}

/**
 * Invalidate cache for a user
 * @param {string} userId - User ID to invalidate cache for
 */
function invalidateUserCache(userId) {
  const keys = analyticsCache.keys();
  const userKeys = keys.filter(key => key.includes(`:${userId}:`) || key.includes(`:${userId}`));
  if (userKeys.length > 0) {
    analyticsCache.del(userKeys);
    console.log(`🗑️ Invalidated ${userKeys.length} cache entries for user ${userId}`);
  }
}

/**
 * POST /api/analytics/scan
 * Track QR code scan event
 * Increments scan counter and logs detailed analytics
 */
router.post('/scan', 
  preventDuplicateAnalytics('scan'),
  [
    body('userId').isString().withMessage('Valid user ID is required'),
    body('projectId').optional().isString().withMessage('Project ID must be a string'),
    body('scanData').optional().isObject().withMessage('Scan data must be an object')
  ], 
  async (req, res) => {
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
    
    // Track detailed analytics with projectId
    // Note: Analytics.trackEvent() handles both user-level and project-level analytics updates
    console.log(`📍 Storing scan with userId=${userId}, projectId=${projectId}, hasLocation=${!!scanData.location}`);
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
    
    // Invalidate cache for this user
    invalidateUserCache(userId);
    
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
router.post('/video-view', 
  preventDuplicateAnalytics('videoView'),
  [
    body('userId').isString().withMessage('Valid user ID is required'),
    body('projectId').optional().isString().withMessage('Project ID must be a string'),
    body('videoProgress').optional().isNumeric().withMessage('Video progress must be a number'),
    body('videoDuration').optional().isNumeric().withMessage('Video duration must be a number'),
    body('videoIndex').optional({ nullable: true, values: 'null' }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return Number.isInteger(Number(value)) && Number(value) >= 0;
    }).withMessage('Video index must be a non-negative integer or null'),
    body('videoId').optional({ nullable: true, values: 'null' }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return typeof value === 'string';
    }).withMessage('Video ID must be a string or null'),
    body('videoUrl').optional({ nullable: true, values: 'null' }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return typeof value === 'string';
    }).withMessage('Video URL must be a string or null')
  ], 
  async (req, res) => {
  try {
    console.log('📹 Video view request received:', {
      body: req.body,
      timestamp: new Date().toISOString()
    });
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Video view validation failed:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { userId, projectId, videoProgress = 0, videoDuration = 0, videoIndex, videoId, videoUrl } = req.body;
    console.log('✅ Video view validation passed:', { userId, projectId, videoProgress, videoDuration, videoIndex, videoId, videoUrl });
    
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
    // Note: Analytics.trackEvent() handles both user-level and project-level analytics updates
    console.log('📊 Tracking video view analytics...');
    const eventData = {
      videoProgress: parseFloat(videoProgress),
      videoDuration: parseFloat(videoDuration),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer
    };
    
    // Add video-specific tracking fields if provided
    if (videoIndex !== undefined && videoIndex !== null) {
      eventData.videoIndex = parseInt(videoIndex);
    }
    if (videoId) {
      eventData.videoId = videoId;
    }
    if (videoUrl) {
      eventData.videoUrl = videoUrl;
    }
    
    await Analytics.trackEvent(userId, 'videoView', eventData, projectId);
    
    // Invalidate cache for this user
    invalidateUserCache(userId);
    
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
router.post('/link-click', 
  preventDuplicateAnalytics('linkClick'),
  [
    body('userId').isString().withMessage('Valid user ID is required'),
    body('projectId').optional().isString().withMessage('Project ID must be a string'),
    body('linkType').isString().withMessage('Link type is required'),
    body('linkUrl')
      .isString()
      .withMessage('Link URL is required')
      .custom((value) => {
        // Accept both standard URLs and protocol URLs like tel:, mailto:, etc.
        if (!value || typeof value !== 'string') {
          throw new Error('Link URL must be a string');
        }
        // Check if it's a standard URL (http/https)
        const urlPattern = /^https?:\/\/.+$/i;
        // Check if it's a protocol URL (tel:, mailto:, etc.)
        const protocolPattern = /^[a-z][a-z0-9+.-]*:/i;
        
        if (urlPattern.test(value) || protocolPattern.test(value)) {
          return true;
        }
        
        throw new Error('Link URL must be a valid URL or protocol URI (e.g., tel:, mailto:)');
      })
  ], 
  async (req, res) => {
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
    
    // Track detailed analytics with projectId
    // Note: Analytics.trackEvent() handles both user-level and project-level analytics updates
    await Analytics.trackEvent(userId, 'linkClick', {
      linkType,
      linkUrl,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer
    }, projectId);
    
    // Invalidate cache for this user
    invalidateUserCache(userId);
    
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
 * Cached for 30 seconds to reduce database load
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
    
    // Create cache key
    const cacheKey = `analytics:dashboard:${userId}:${period}`;
    
    // Get cached or fetch data
    const dashboardData = await getCachedOrFetch(cacheKey, async () => {
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
        throw new Error('User not found');
      }
      
      // Get detailed analytics with time filter
      const detailedAnalytics = await Analytics.getUserAnalytics(userId, days);
      
      // Calculate engagement metrics using filtered data
      const filteredScans = detailedAnalytics.summary.find(s => s.eventType === 'scan')?.count || 0;
      const filteredVideoViews = detailedAnalytics.summary.find(s => s.eventType === 'videoView')?.count || 0;
      const filteredLinkClicks = detailedAnalytics.summary.find(s => s.eventType === 'linkClick')?.count || 0;
      
      const totalInteractions = filteredScans + filteredVideoViews + filteredLinkClicks;
      const engagementRate = filteredScans > 0 ? 
        ((filteredVideoViews + filteredLinkClicks) / filteredScans * 100).toFixed(2) : 0;
      
      // Prepare dashboard data with filtered analytics
      return {
        overview: {
          totalScans: filteredScans,
          totalVideoViews: filteredVideoViews,
          totalLinkClicks: filteredLinkClicks,
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
    }, 30); // 30 second cache TTL
    
    res.status(200).json({
      status: 'success',
      data: dashboardData
    });
    
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/analytics/dashboard-complete/:userId
 * Get complete dashboard analytics including both dashboard data and events
 * Returns combined data in single response to reduce API calls
 * Cached for 30 seconds
 */
router.get('/dashboard-complete/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30d', campaignType = 'all', projectId, eventTypes } = req.query;
    
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
    
    // Create cache key
    const cacheKey = `analytics:complete:${userId}:${period}:${campaignType}:${projectId || 'all'}:${eventTypes || 'all'}`;
    
    // Get cached or fetch data
    const completeData = await getCachedOrFetch(cacheKey, async () => {
      // Fetch dashboard data
      const dashboardPromise = (async () => {
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
        let user;
        if (isValidObjectId) {
          user = await User.findById(userId);
        } else {
          user = await User.findOne({ username: userId });
        }
        
        if (!user) {
          throw new Error('User not found');
        }
        
        const detailedAnalytics = await Analytics.getUserAnalytics(userId, days);
        const filteredScans = detailedAnalytics.summary.find(s => s.eventType === 'scan')?.count || 0;
        const filteredVideoViews = detailedAnalytics.summary.find(s => s.eventType === 'videoView')?.count || 0;
        const filteredLinkClicks = detailedAnalytics.summary.find(s => s.eventType === 'linkClick')?.count || 0;
        const totalInteractions = filteredScans + filteredVideoViews + filteredLinkClicks;
        const engagementRate = filteredScans > 0 ? 
          ((filteredVideoViews + filteredLinkClicks) / filteredScans * 100).toFixed(2) : 0;
        
        return {
          overview: {
            totalScans: filteredScans,
            totalVideoViews: filteredVideoViews,
            totalLinkClicks: filteredLinkClicks,
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
      })();
      
      // Fetch events data
      const eventsPromise = (async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const matchStage = {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        };
        
        if (projectId) {
          matchStage.projectId = projectId;
        }
        
        if (eventTypes) {
          const types = eventTypes.split(',');
          matchStage.eventType = { $in: types };
        }
        
        let projectIdsFilter = null;
        if (campaignType && campaignType !== 'all') {
          const user = await User.findById(userId).select('projects');
          if (user && user.projects) {
            const filteredProjectIds = user.projects
              .filter(p => p.campaignType === campaignType)
              .map(p => p.id);
            
            if (filteredProjectIds.length > 0) {
              projectIdsFilter = filteredProjectIds;
            } else {
              return {
                events: {
                  scan: [],
                  videoView: [],
                  linkClick: [],
                  arExperienceStart: [],
                  arExperienceError: [],
                  socialMediaClick: [],
                  documentView: [],
                  documentDownload: []
                },
                totalEvents: 0
              };
            }
          }
        }
        
        if (projectIdsFilter) {
          matchStage.projectId = { $in: projectIdsFilter };
        }
        
        const pipeline = [
          { $match: matchStage },
          { $sort: { timestamp: -1 } },
          { $limit: 1000 },
          {
            $group: {
              _id: '$eventType',
              events: {
                $push: {
                  eventType: '$eventType',
                  eventData: '$eventData',
                  timestamp: '$timestamp',
                  projectId: '$projectId',
                  deviceInfo: '$deviceInfo'
                }
              }
            }
          }
        ];
        
        const groupedEvents = await Analytics.aggregate(pipeline);
        
        const eventsByType = {
          scan: [],
          videoView: [],
          linkClick: [],
          arExperienceStart: [],
          arExperienceError: [],
          socialMediaClick: [],
          documentView: [],
          documentDownload: []
        };
        
        groupedEvents.forEach(group => {
          const eventType = group._id;
          if (eventsByType.hasOwnProperty(eventType)) {
            eventsByType[eventType] = group.events;
          }
        });
        
        const totalEvents = Object.values(eventsByType).reduce((sum, events) => sum + events.length, 0);
        
        return {
          events: eventsByType,
          totalEvents
        };
      })();
      
      // Calculate per-project analytics
      const projectsPromise = (async () => {
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
        let user;
        if (isValidObjectId) {
          user = await User.findById(userId).select('projects');
        } else {
          user = await User.findOne({ username: userId }).select('projects');
        }
        
        if (!user || !user.projects || user.projects.length === 0) {
          return [];
        }
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Get project IDs, optionally filtered by campaignType
        let projectIds = user.projects.map(p => p.id);
        if (campaignType && campaignType !== 'all') {
          projectIds = user.projects
            .filter(p => p.campaignType === campaignType)
            .map(p => p.id);
        }
        
        if (projectIds.length === 0) {
          return [];
        }
        
        // Get all events for these projects
        const allEvents = await Analytics.find({
          userId: new mongoose.Types.ObjectId(userId),
          projectId: { $in: projectIds },
          timestamp: { $gte: startDate }
        }).select('projectId eventType eventData timestamp');
        
        // Group events by projectId
        const eventsByProject = {};
        allEvents.forEach(event => {
          const pid = event.projectId;
          if (!eventsByProject[pid]) {
            eventsByProject[pid] = [];
          }
          eventsByProject[pid].push(event);
        });
        
        // Calculate analytics for each project
        const projectsAnalytics = projectIds.map(projectId => {
          const events = eventsByProject[projectId] || [];
          
          const totalScans = events.filter(e => e.eventType === 'scan').length;
          const totalVideoViews = events.filter(e => e.eventType === 'videoView').length;
          const totalLinkClicks = events.filter(e => e.eventType === 'linkClick').length;
          
          // Calculate average time spent
          const durationEvents = events.filter(e => e.eventType === 'pageViewDuration');
          const totalTimeSpent = durationEvents.reduce((sum, e) => sum + (e.eventData?.timeSpent || 0), 0);
          const averageTimeSpent = durationEvents.length > 0 ? Math.round(totalTimeSpent / durationEvents.length) : 0;
          
          return {
            projectId,
            totalScans,
            videoViews: totalVideoViews,
            linkClicks: totalLinkClicks,
            averageTimeSpent
          };
        });
        
        return projectsAnalytics;
      })();
      
      // Fetch all in parallel
      const [dashboard, events, projects] = await Promise.all([dashboardPromise, eventsPromise, projectsPromise]);
      
      return {
        dashboard,
        events,
        projects
      };
    }, 30); // 30 second cache TTL
    
    res.status(200).json({
      status: 'success',
      data: completeData
    });
    
  } catch (error) {
    console.error('Dashboard complete error:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch complete analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/analytics/events/:userId
 * Get detailed events for charts and analytics
 * Returns all event types with full details for visualization
 * Optimized with MongoDB aggregation and caching
 */
router.get('/events/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { projectId, campaignType, period = '30d', eventTypes } = req.query;
    
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
    
    // Create cache key
    const cacheKey = `analytics:events:${userId}:${period}:${campaignType || 'all'}:${projectId || 'all'}:${eventTypes || 'all'}`;
    
    // Get cached or fetch data
    const result = await getCachedOrFetch(cacheKey, async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Build aggregation pipeline
      const matchStage = {
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: startDate }
      };
      
      // Add projectId filter if provided
      if (projectId) {
        matchStage.projectId = projectId;
      }
      
      // Add event type filter if provided
      if (eventTypes) {
        const types = eventTypes.split(',');
        matchStage.eventType = { $in: types };
      }
      
      // If campaignType filter is provided, get project IDs first using aggregation
      let projectIdsFilter = null;
      if (campaignType && campaignType !== 'all') {
        const user = await User.findById(userId).select('projects');
        if (user && user.projects) {
          const filteredProjectIds = user.projects
            .filter(p => p.campaignType === campaignType)
            .map(p => p.id);
          
          if (filteredProjectIds.length > 0) {
            projectIdsFilter = filteredProjectIds;
          } else {
            // No projects match, return empty result
            return {
              events: {
                scan: [],
                videoView: [],
                linkClick: [],
                arExperienceStart: [],
                arExperienceError: [],
                socialMediaClick: [],
                documentView: [],
                documentDownload: []
              },
              totalEvents: 0,
              period: {
                days,
                startDate,
                endDate: new Date()
              }
            };
          }
        }
      }
      
      // Add campaignType project filter to match stage
      if (projectIdsFilter) {
        matchStage.projectId = { $in: projectIdsFilter };
      }
      
      // Use aggregation to group events by type and limit results
      // This is more efficient than fetching all records and filtering in memory
      const pipeline = [
        { $match: matchStage },
        { $sort: { timestamp: -1 } },
        { $limit: 1000 }, // Limit to 1000 most recent events (reduced from 10000)
        {
          $group: {
            _id: '$eventType',
            events: {
              $push: {
                eventType: '$eventType',
                eventData: '$eventData',
                timestamp: '$timestamp',
                projectId: '$projectId',
                deviceInfo: '$deviceInfo'
              }
            }
          }
        }
      ];
      
      const groupedEvents = await Analytics.aggregate(pipeline);
      
      // Initialize eventsByType
      const eventsByType = {
        scan: [],
        videoView: [],
        linkClick: [],
        arExperienceStart: [],
        arExperienceError: [],
        socialMediaClick: [],
        documentView: [],
        documentDownload: []
      };
      
      // Populate eventsByType from aggregation results
      groupedEvents.forEach(group => {
        const eventType = group._id;
        if (eventsByType.hasOwnProperty(eventType)) {
          eventsByType[eventType] = group.events;
        }
      });
      
      // Calculate total events
      const totalEvents = Object.values(eventsByType).reduce((sum, events) => sum + events.length, 0);
      
      return {
        events: eventsByType,
        totalEvents,
        period: {
          days,
          startDate,
          endDate: new Date()
        }
      };
    }, 60); // 60 second cache TTL for events
    
    res.status(200).json({
      status: 'success',
      data: result
    });
    
  } catch (error) {
    console.error('Events fetch error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analytics/ar-experience-start
 * Track AR experience start event
 * Logs when users start AR experience with performance metrics
 */
router.post('/ar-experience-start', 
  preventDuplicateAnalytics('arExperienceStart'),
  [
    body('userId').isString().withMessage('User ID is required'),
    body('projectId').isString().withMessage('Project ID is required'),
    body('timestamp').isISO8601().withMessage('Valid timestamp is required'),
    body('loadTime').optional().isNumeric().withMessage('Load time must be a number'),
    body('hasDesign').optional().isBoolean().withMessage('Has design must be boolean'),
    body('hasVideo').optional().isBoolean().withMessage('Has video must be boolean'),
    body('userAgent').optional().isString().withMessage('User agent must be string')
  ], 
  async (req, res) => {
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
    
    // Track detailed analytics with projectId
    // Note: Analytics.trackEvent() handles both user-level and project-level analytics updates
    await Analytics.trackEvent(userId, 'arExperienceStart', {
      loadTime: parseFloat(loadTime),
      hasDesign: Boolean(hasDesign),
      hasVideo: Boolean(hasVideo),
      userAgent: userAgent || req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer,
      timestamp: new Date(timestamp)
    }, projectId);
    
    // Invalidate cache for this user
    invalidateUserCache(userId);
    
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
router.post('/page-view', 
  preventDuplicateAnalytics('pageView'),
  [
    body('userId').isString().withMessage('Valid user ID is required'),
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
    
    // Extract location data if provided
    const scanLocation = req.body.scanLocation || null;
    
    // Track page view with projectId and location
    await Analytics.trackEvent(userId, 'pageView', {
      scanLocation: scanLocation ? {
        latitude: scanLocation.latitude,
        longitude: scanLocation.longitude,
        village: scanLocation.village,
        city: scanLocation.city,
        state: scanLocation.state,
        country: scanLocation.country
      } : undefined,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      referrer: req.headers.referer
    }, projectId);
    
    // Invalidate cache for this user
    invalidateUserCache(userId);
    
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
 * Updated: Fixed validation and error handling
 */
router.post('/ar-experience-error', [
  body('userId').isString().withMessage('User ID is required'),
  body('projectId').optional().isString().withMessage('Project ID must be a string'),
  body('errorType').optional().isString().withMessage('Error type must be a string'),
  body('errorMessage').optional().isString().withMessage('Error message must be a string'),
  body('error').optional().isString().withMessage('Error must be a string'),
  body('step').optional().isString().withMessage('Step must be a string'),
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
      error = '',
      step = '',
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
      errorType: errorType || step,
      errorMessage: errorMessage || error,
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

/**
 * GET /api/analytics/locations/:userId
 * Get location-based analytics for a user
 * Returns scan locations with city/country data
 */
router.get('/locations/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { projectId, days = 30 } = req.query;
    
    // Verify user can only access their own analytics
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to access these analytics'
      });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Build query - include both scan and pageView events since both can have location data
    const query = {
      userId: new mongoose.Types.ObjectId(userId),
      eventType: { $in: ['scan', 'pageView'] },
      timestamp: { $gte: startDate },
      'eventData.scanLocation': { $exists: true, $ne: null }
    };
    
    // Add projectId filter if provided
    if (projectId) {
      query.projectId = projectId;
    }
    
    // Get all events (scan and pageView) with location data
    const locationEvents = await Analytics.find(query)
      .select('timestamp eventData.scanLocation projectId eventType')
      .sort({ timestamp: -1 })
      .limit(1000); // Limit to most recent 1000 events
    
    // Group by location
    const locationGroups = {};
    const cityCountryStats = {};
    
    locationEvents.forEach(event => {
      const location = event.eventData?.scanLocation;
      if (!location || !location.latitude || !location.longitude) return;
      
      const key = `${location.latitude.toFixed(2)},${location.longitude.toFixed(2)}`;
      
      if (!locationGroups[key]) {
        locationGroups[key] = {
          latitude: location.latitude,
          longitude: location.longitude,
          village: location.village || null,
          city: location.city || 'Anonymous',
          state: location.state || '',
          country: location.country || 'Anonymous',
          count: 0,
          lastScanAt: event.timestamp
        };
      }
      
      locationGroups[key].count++;
      
      // Track city/country stats with village hierarchy
      const locationParts = [];
      if (location.village) locationParts.push(location.village);
      locationParts.push(location.city || 'Anonymous');
      locationParts.push(location.country || 'Anonymous');
      const cityCountryKey = locationParts.join(', ');
      
      if (!cityCountryStats[cityCountryKey]) {
        cityCountryStats[cityCountryKey] = {
          village: location.village || null,
          city: location.city || 'Anonymous',
          state: location.state || '',
          country: location.country || 'Anonymous',
          count: 0
        };
      }
      cityCountryStats[cityCountryKey].count++;
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        totalScansWithLocation: locationEvents.length,
        locations: Object.values(locationGroups),
        cityCountryStats: Object.values(cityCountryStats).sort((a, b) => b.count - a.count),
        period: {
          days: parseInt(days),
          startDate,
          endDate: new Date()
        }
      }
    });
    
  } catch (error) {
    console.error('Location analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch location analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/analytics/project/:userId/:projectId/locations
 * Get location-based analytics for a specific project
 * Returns scan locations for the project
 */
router.get('/project/:userId/:projectId/locations', authenticateToken, async (req, res) => {
  try {
    const { userId, projectId } = req.params;
    const { days = 30 } = req.query;
    
    // Verify user can only access their own analytics
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to access these analytics'
      });
    }
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Get all scan events with location data for this project
    console.log(`🔍 Querying location events: userId=${userId}, projectId=${projectId}, days=${days}`);
    const locationEvents = await Analytics.find({
      userId: new mongoose.Types.ObjectId(userId),
      projectId: projectId,
      eventType: 'scan',
      timestamp: { $gte: startDate },
      'eventData.scanLocation': { $exists: true, $ne: null }
    })
      .select('timestamp eventData.scanLocation')
      .sort({ timestamp: -1 });
    
    console.log(`📊 Found ${locationEvents.length} location events for project ${projectId}`);
    
    // Format response with village hierarchy
    const locations = locationEvents.map(event => ({
      latitude: event.eventData.scanLocation.latitude,
      longitude: event.eventData.scanLocation.longitude,
      village: event.eventData.scanLocation.village || null,
      city: event.eventData.scanLocation.city || 'Anonymous',
      state: event.eventData.scanLocation.state || '',
      country: event.eventData.scanLocation.country || 'Anonymous',
      timestamp: event.timestamp
    }));
    
    // Calculate city/country stats with village hierarchy
    const cityCountryStats = {};
    locations.forEach(location => {
      const locationParts = [];
      if (location.village) locationParts.push(location.village);
      locationParts.push(location.city);
      locationParts.push(location.country);
      const key = locationParts.join(', ');
      
      if (!cityCountryStats[key]) {
        cityCountryStats[key] = {
          village: location.village,
          city: location.city,
          state: location.state,
          country: location.country,
          count: 0
        };
      }
      cityCountryStats[key].count++;
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        projectId,
        totalScansWithLocation: locations.length,
        locations,
        cityCountryStats: Object.values(cityCountryStats).sort((a, b) => b.count - a.count),
        period: {
          days: parseInt(days),
          startDate,
          endDate: new Date()
        }
      }
    });
    
  } catch (error) {
    console.error('Project location analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch project location analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/analytics/social-media-click
 * Track social media link click event
 */
router.post('/social-media-click', 
  preventDuplicateAnalytics('socialMediaClick'),
  [
    body('userId').isString().withMessage('User ID is required'),
    body('projectId').isString().withMessage('Project ID is required'),
    body('platform').isString().withMessage('Platform is required'),
    body('url').isString().withMessage('URL is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, projectId, platform, url } = req.body;

      // Validate userId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
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

      // Track social media click
      await Analytics.trackEvent(userId, 'socialMediaClick', {
        platform,
        url,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        referrer: req.headers.referer
      }, projectId);

      // Invalidate cache for this user
      invalidateUserCache(userId);

      res.status(200).json({
        status: 'success',
        message: 'Social media click tracked successfully'
      });
    } catch (error) {
      console.error('Social media click tracking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to track social media click',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/analytics/document-view
 * Track document view/download event
 */
router.post('/document-view',
  preventDuplicateAnalytics('documentView'),
  [
    body('userId').isString().withMessage('User ID is required'),
    body('projectId').isString().withMessage('Project ID is required'),
    body('documentUrl').isString().withMessage('Document URL is required'),
    body('action').optional().isIn(['view', 'download']).withMessage('Action must be view or download')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, projectId, documentUrl, action = 'view' } = req.body;

      // Validate userId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
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

      // Track document view or download
      const eventType = action === 'download' ? 'documentDownload' : 'documentView';
      await Analytics.trackEvent(userId, eventType, {
        documentUrl,
        action,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        referrer: req.headers.referer
      }, projectId);

      // Invalidate cache for this user
      invalidateUserCache(userId);

      res.status(200).json({
        status: 'success',
        message: `Document ${action} tracked successfully`
      });
    } catch (error) {
      console.error('Document view tracking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to track document view',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/analytics/video-complete
 * Track video completion event
 */
router.post('/video-complete',
  preventDuplicateAnalytics('videoComplete'),
  [
    body('userId').isString().withMessage('User ID is required'),
    body('projectId').isString().withMessage('Project ID is required'),
    body('duration').isNumeric().withMessage('Duration must be a number'),
    body('videoIndex').optional().isInt({ min: 0 }).withMessage('Video index must be a non-negative integer'),
    body('videoId').optional({ nullable: true, values: 'null' }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return typeof value === 'string';
    }).withMessage('Video ID must be a string or null'),
    body('videoUrl').optional({ nullable: true, values: 'null' }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return typeof value === 'string';
    }).withMessage('Video URL must be a string or null')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { userId, projectId, duration, videoIndex, videoId, videoUrl } = req.body;

      // Validate userId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
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

      // Track video completion
      const eventData = {
        videoCompleted: true,
        videoDuration: parseFloat(duration),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        referrer: req.headers.referer
      };
      
      // Add video-specific tracking fields if provided
      if (videoIndex !== undefined && videoIndex !== null) {
        eventData.videoIndex = parseInt(videoIndex);
      }
      if (videoId) {
        eventData.videoId = videoId;
      }
      if (videoUrl) {
        eventData.videoUrl = videoUrl;
      }
      
      await Analytics.trackEvent(userId, 'videoComplete', eventData, projectId);

      res.status(200).json({
        status: 'success',
        message: 'Video completion tracked successfully'
      });
    } catch (error) {
      console.error('Video completion tracking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to track video completion',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/analytics/page-view-duration
 * Track time spent on landing page
 * Sends time spent when user leaves the page
 */
router.post('/page-view-duration', 
  [
    body('userId').isString().withMessage('User ID is required'),
    body('projectId').isString().withMessage('Project ID is required'),
    body('timeSpent').isNumeric().withMessage('Time spent must be a number')
  ], 
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { userId, projectId, timeSpent, scanLocation } = req.body;
      
      // Validate if userId is a valid ObjectId format
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
      
      // Track page view duration with location
      await Analytics.trackEvent(userId, 'pageViewDuration', {
        timeSpent: parseFloat(timeSpent),
        scanLocation: scanLocation ? {
          latitude: scanLocation.latitude,
          longitude: scanLocation.longitude,
          village: scanLocation.village,
          city: scanLocation.city,
          state: scanLocation.state,
          country: scanLocation.country
        } : undefined,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        referrer: req.headers.referer
      }, projectId);
      
      res.status(200).json({
        status: 'success',
        message: 'Page view duration tracked successfully'
      });
      
    } catch (error) {
      console.error('Page view duration tracking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to track page view duration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * POST /api/analytics/video-progress-milestone
 * Track video progress milestones (25%, 50%, 75%, 100%)
 */
router.post('/video-progress-milestone', 
  [
    body('userId').isString().withMessage('User ID is required'),
    body('projectId').optional().isString().withMessage('Project ID must be a string'),
    body('milestone').isIn(['25', '50', '75', '100']).withMessage('Milestone must be 25, 50, 75, or 100'),
    body('progress').custom((value) => {
      if (value === null || value === undefined || value === '') return false;
      const num = Number(value);
      return !isNaN(num) && isFinite(num);
    }).withMessage('Progress must be a valid number'),
    body('duration').custom((value) => {
      if (value === null || value === undefined || value === '') return false;
      const num = Number(value);
      return !isNaN(num) && isFinite(num);
    }).withMessage('Duration must be a valid number'),
    body('videoIndex').optional({ nullable: true, values: 'null' }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return Number.isInteger(Number(value)) && Number(value) >= 0;
    }).withMessage('Video index must be a non-negative integer or null'),
    body('videoId').optional({ nullable: true, values: 'null' }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return typeof value === 'string';
    }).withMessage('Video ID must be a string or null'),
    body('videoUrl').optional({ nullable: true, values: 'null' }).custom((value) => {
      if (value === null || value === undefined || value === '') return true;
      return typeof value === 'string';
    }).withMessage('Video URL must be a string or null')
  ], 
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      const { userId, projectId, milestone, progress, duration, videoIndex, videoId, videoUrl } = req.body;
      
      // Validate if userId is a valid ObjectId format
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
      
      // Track video progress milestone
      const eventData = {
        videoProgressMilestone: milestone,
        videoProgress: parseFloat(progress),
        videoDuration: parseFloat(duration),
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        referrer: req.headers.referer
      };
      
      // Add video-specific tracking fields if provided
      if (videoIndex !== undefined && videoIndex !== null) {
        eventData.videoIndex = parseInt(videoIndex);
      }
      if (videoId) {
        eventData.videoId = videoId;
      }
      if (videoUrl) {
        eventData.videoUrl = videoUrl;
      }
      
      await Analytics.trackEvent(userId, 'videoProgressMilestone', eventData, projectId);
      
      res.status(200).json({
        status: 'success',
        message: 'Video progress milestone tracked successfully'
      });
      
    } catch (error) {
      console.error('Video progress milestone tracking error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to track video progress milestone',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * GET /api/analytics/campaign/:projectId
 * Get detailed analytics for a specific campaign
 */
router.get('/campaign/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { period = '30d' } = req.query;
    
    // Parse period
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '30d') days = 30;
    else if (period === '90d') days = 90;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Find user with this project
    const user = await User.findOne({ 'projects.id': projectId });
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Verify user can only access their own analytics
    if (user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to access these analytics'
      });
    }
    
    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Get all analytics events for this project
    const events = await Analytics.find({
      userId: user._id,
      projectId: projectId,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });
    
    // Calculate metrics
    const metrics = {
      totalPageViews: events.filter(e => e.eventType === 'pageView').length,
      totalScans: events.filter(e => e.eventType === 'scan').length,
      totalVideoViews: events.filter(e => e.eventType === 'videoView').length,
      totalLinkClicks: events.filter(e => e.eventType === 'linkClick').length,
      totalSocialClicks: events.filter(e => e.eventType === 'socialMediaClick').length,
      totalDocumentViews: events.filter(e => e.eventType === 'documentView').length,
      totalDocumentDownloads: events.filter(e => e.eventType === 'documentDownload').length,
      totalVideoCompletions: events.filter(e => e.eventType === 'videoComplete').length,
      totalArStarts: events.filter(e => e.eventType === 'arExperienceStart').length
    };
    
    // Calculate average time spent
    const durationEvents = events.filter(e => e.eventType === 'pageViewDuration');
    const totalTimeSpent = durationEvents.reduce((sum, e) => sum + (e.eventData?.timeSpent || 0), 0);
    const averageTimeSpent = durationEvents.length > 0 ? Math.round(totalTimeSpent / durationEvents.length) : 0;
    
    // Video analytics - count unique video views (videoView events) as total plays
    const videoViewEvents = events.filter(e => e.eventType === 'videoView');
    const videoPlayedCount = videoViewEvents.length; // Count all videoView events as plays
    const videoMilestones = {
      '25': events.filter(e => e.eventType === 'videoProgressMilestone' && e.eventData?.videoProgressMilestone === '25').length,
      '50': events.filter(e => e.eventType === 'videoProgressMilestone' && e.eventData?.videoProgressMilestone === '50').length,
      '75': events.filter(e => e.eventType === 'videoProgressMilestone' && e.eventData?.videoProgressMilestone === '75').length,
      '100': events.filter(e => e.eventType === 'videoProgressMilestone' && e.eventData?.videoProgressMilestone === '100').length
    };
    const completionRate = videoPlayedCount > 0 ? Math.round((metrics.totalVideoCompletions / videoPlayedCount) * 100) : 0;
    
    // Social media click breakdown
    const socialClicks = events.filter(e => e.eventType === 'socialMediaClick');
    const socialBreakdown = {};
    socialClicks.forEach(event => {
      // Check both platform and linkType for backward compatibility
      let platform = event.eventData?.platform || event.eventData?.linkType || 'unknown';
      
      // Normalize platform names for better display
      if (platform === 'contactNumber') {
        platform = 'Phone Number';
      } else if (platform === 'whatsappNumber') {
        platform = 'WhatsApp';
      } else if (platform && typeof platform === 'string') {
        // Capitalize first letter of each word for other platforms
        platform = platform.split(/(?=[A-Z])/).map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
      
      socialBreakdown[platform] = (socialBreakdown[platform] || 0) + 1;
    });
    
    // Link click breakdown (includes all linkClick events, including contact/WhatsApp)
    const linkClicks = events.filter(e => e.eventType === 'linkClick');
    const linkBreakdown = {};
    linkClicks.forEach(event => {
      const linkType = event.eventData?.linkType || 'unknown';
      linkBreakdown[linkType] = (linkBreakdown[linkType] || 0) + 1;
    });
    
    // Location breakdown
    const scanEvents = events.filter(e => e.eventType === 'scan' && e.eventData?.scanLocation);
    const locationBreakdown = {
      countries: {},
      cities: {},
      villages: {}
    };
    scanEvents.forEach(event => {
      const location = event.eventData.scanLocation;
      if (location.country) {
        locationBreakdown.countries[location.country] = (locationBreakdown.countries[location.country] || 0) + 1;
      }
      if (location.city) {
        locationBreakdown.cities[location.city] = (locationBreakdown.cities[location.city] || 0) + 1;
      }
      if (location.village) {
        locationBreakdown.villages[location.village] = (locationBreakdown.villages[location.village] || 0) + 1;
      }
    });
    
    // Time-based trends (daily)
    const dailyTrends = {};
    events.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      if (!dailyTrends[date]) {
        dailyTrends[date] = {
          pageViews: 0,
          scans: 0,
          videoViews: 0,
          linkClicks: 0,
          socialClicks: 0
        };
      }
      if (event.eventType === 'pageView') dailyTrends[date].pageViews++;
      if (event.eventType === 'scan') dailyTrends[date].scans++;
      if (event.eventType === 'videoView') dailyTrends[date].videoViews++;
      if (event.eventType === 'linkClick') dailyTrends[date].linkClicks++;
      if (event.eventType === 'socialMediaClick') dailyTrends[date].socialClicks++;
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign: {
          id: project.id,
          name: project.name,
          type: project.type || project.campaignType,
          campaignType: project.campaignType
        },
        metrics,
        averageTimeSpent,
        videoAnalytics: {
          totalPlays: videoPlayedCount,
          completionRate,
          milestones: videoMilestones,
          totalCompletions: metrics.totalVideoCompletions
        },
        socialMediaBreakdown: socialBreakdown,
        linkBreakdown: linkBreakdown,
        locationBreakdown: locationBreakdown,
        dailyTrends: Object.entries(dailyTrends).map(([date, data]) => ({ date, ...data })),
        period: {
          days,
          startDate,
          endDate: new Date()
        }
      }
    });
    
  } catch (error) {
    console.error('Campaign analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch campaign analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
