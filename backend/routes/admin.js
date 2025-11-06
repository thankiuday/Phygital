/**
 * Admin Routes
 * Provides admin-only endpoints for managing the platform
 * Requires admin authentication
 */

const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Analytics = require('../models/Analytics');
const Contact = require('../models/Contact');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, logAdminAction } = require('../middleware/adminAuth');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// All admin routes require authentication and admin role
// Note: requireAdmin now handles JWT verification internally, so we don't need authenticateToken
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Get comprehensive system-wide statistics with analytics
 */
router.get('/stats', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Calculate previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Base match for current period
    const currentPeriodMatch = { timestamp: { $gte: startDate } };
    
    // Basic counts (all time)
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalProjects = await User.aggregate([
      { $project: { projectCount: { $size: { $ifNull: ['$projects', []] } } } },
      { $group: { _id: null, total: { $sum: '$projectCount' } } }
    ]);
    
    // All-time analytics
    const totalScans = await Analytics.countDocuments({ eventType: 'scan' });
    const totalVideoViews = await Analytics.countDocuments({ eventType: 'videoView' });
    const totalLinkClicks = await Analytics.countDocuments({ eventType: 'linkClick' });
    const totalArStarts = await Analytics.countDocuments({ eventType: 'arExperienceStart' });
    
    // Contact submissions
    const totalContacts = await Contact.countDocuments();
    const newContacts = await Contact.countDocuments({ status: 'new' });
    
    // Period analytics
    const analyticsByType = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const prevAnalyticsByType = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: prevStartDate, $lt: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate period metrics
    const scans = analyticsByType.find(e => e._id === 'scan')?.count || 0;
    const videoViews = analyticsByType.find(e => e._id === 'videoView')?.count || 0;
    const linkClicks = analyticsByType.find(e => e._id === 'linkClick')?.count || 0;
    const arStarts = analyticsByType.find(e => e._id === 'arExperienceStart')?.count || 0;
    
    const prevScans = prevAnalyticsByType.find(e => e._id === 'scan')?.count || 0;
    const prevVideoViews = prevAnalyticsByType.find(e => e._id === 'videoView')?.count || 0;
    const prevLinkClicks = prevAnalyticsByType.find(e => e._id === 'linkClick')?.count || 0;
    const prevArStarts = prevAnalyticsByType.find(e => e._id === 'arExperienceStart')?.count || 0;

    // Calculate period-over-period changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    // User stats
    const recentUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const prevRecentUsers = await User.countDocuments({ 
      createdAt: { $gte: prevStartDate, $lt: startDate } 
    });

    // Daily breakdown - ensure proper date sorting
    const dailyBreakdown = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 },
          dateValue: { $min: '$timestamp' } // Use min timestamp for sorting (all records on same day have same date)
        }
      },
      { $sort: { dateValue: 1, '_id.eventType': 1 } }, // Sort by actual date, then event type
      {
        $project: {
          _id: 1,
          count: 1
        }
      }
    ]);

    // Hourly breakdown
    const hourlyBreakdown = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    // Geographic analytics - Countries
    const countriesBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'eventData.scanLocation.country': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$eventData.scanLocation.country',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Geographic analytics - Cities
    const citiesBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'eventData.scanLocation.city': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            city: '$eventData.scanLocation.city',
            country: '$eventData.scanLocation.country'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Device type breakdown
    const deviceBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'deviceInfo.type': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Browser breakdown
    const browserBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'deviceInfo.browser': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.browser',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // OS breakdown
    const osBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'deviceInfo.os': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.os',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Social media link click breakdown
    const socialMediaBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          eventType: 'linkClick',
          'eventData.linkType': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$eventData.linkType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top users by activity
    const topUsers = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: '$userId',
          totalEvents: { $sum: 1 },
          scans: { $sum: { $cond: [{ $eq: ['$eventType', 'scan'] }, 1, 0] } },
          videoViews: { $sum: { $cond: [{ $eq: ['$eventType', 'videoView'] }, 1, 0] } },
          linkClicks: { $sum: { $cond: [{ $eq: ['$eventType', 'linkClick'] }, 1, 0] } }
        }
      },
      { $sort: { totalEvents: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userId: '$_id',
          username: { $arrayElemAt: ['$user.username', 0] },
          email: { $arrayElemAt: ['$user.email', 0] },
          totalEvents: 1,
          scans: 1,
          videoViews: 1,
          linkClicks: 1
        }
      }
    ]);

    // Top projects by activity
    const topProjects = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: {
            userId: '$userId',
            projectId: '$projectId'
          },
          totalEvents: { $sum: 1 },
          scans: { $sum: { $cond: [{ $eq: ['$eventType', 'scan'] }, 1, 0] } },
          videoViews: { $sum: { $cond: [{ $eq: ['$eventType', 'videoView'] }, 1, 0] } },
          linkClicks: { $sum: { $cond: [{ $eq: ['$eventType', 'linkClick'] }, 1, 0] } },
          arStarts: { $sum: { $cond: [{ $eq: ['$eventType', 'arExperienceStart'] }, 1, 0] } }
        }
      },
      { $sort: { totalEvents: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          userId: '$_id.userId',
          projectId: '$_id.projectId',
          username: { $arrayElemAt: ['$user.username', 0] },
          totalEvents: 1,
          scans: 1,
          videoViews: 1,
          linkClicks: 1,
          arStarts: 1
        }
      }
    ]);

    // Get project names for top projects
    const enrichedTopProjects = await Promise.all(
      topProjects.map(async (project) => {
        const user = await User.findById(project.userId);
        if (user && user.projects) {
          const proj = user.projects.find(p => p.id === project.projectId);
          if (proj) {
            return {
              ...project,
              projectName: proj.name || `Project ${project.projectId}`
            };
          }
        }
        return {
          ...project,
          projectName: `Project ${project.projectId}`
        };
      })
    );

    // Engagement funnel
    const scanToVideoConversion = scans > 0 ? (videoViews / scans * 100).toFixed(2) : 0;
    const videoToLinkConversion = videoViews > 0 ? (linkClicks / videoViews * 100).toFixed(2) : 0;
    const linkToArConversion = linkClicks > 0 ? (arStarts / linkClicks * 100).toFixed(2) : 0;
    const overallConversion = scans > 0 ? ((videoViews + linkClicks + arStarts) / scans * 100).toFixed(2) : 0;

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          users: {
            total: totalUsers,
            active: activeUsers,
            recent: recentUsers,
            recentChange: calculateChange(recentUsers, prevRecentUsers)
          },
          projects: {
            total: totalProjects[0]?.total || 0
          },
          analytics: {
            scans: {
              total: totalScans,
              period: scans,
              change: calculateChange(scans, prevScans)
            },
            videoViews: {
              total: totalVideoViews,
              period: videoViews,
              change: calculateChange(videoViews, prevVideoViews)
            },
            linkClicks: {
              total: totalLinkClicks,
              period: linkClicks,
              change: calculateChange(linkClicks, prevLinkClicks)
            },
            arStarts: {
              total: totalArStarts,
              period: arStarts,
              change: calculateChange(arStarts, prevArStarts)
            }
          },
          contacts: {
            total: totalContacts,
            new: newContacts
          }
        },
        dailyBreakdown,
        hourlyBreakdown,
        geography: {
          countries: countriesBreakdown,
          cities: citiesBreakdown
        },
        devices: {
          types: deviceBreakdown,
          browsers: browserBreakdown,
          operatingSystems: osBreakdown
        },
        topProjects: enrichedTopProjects,
        topUsers,
        engagement: {
          funnel: {
            scans,
            videoViews,
            linkClicks,
            arStarts,
            scanToVideoConversion,
            videoToLinkConversion,
            linkToArConversion,
            overallConversion
          }
        },
        socialMedia: socialMediaBreakdown,
        period: {
          days,
          startDate,
          endDate: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString(),
  query('status').optional().isIn(['active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    // Get users
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get user details by ID
 */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Admin user details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Enable or disable a user account
 */
router.put('/users/:id/status', logAdminAction('user_activate'), [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Admin user status update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user account
 */
router.delete('/users/:id', logAdminAction('user_delete'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Prevent deleting admin account
    if (user.role === 'admin' || user.email === 'admin@phygital.zone') {
      return res.status(403).json({
        status: 'error',
        message: 'Cannot delete admin account'
      });
    }

    // Delete user's analytics
    await Analytics.deleteMany({ userId: user._id });
    
    // Delete user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Admin user delete error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/projects
 * Get all projects across all users with comprehensive analytics
 */
router.get('/projects', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('status').optional().isIn(['active', 'completed', 'archived']),
  query('enabled').optional().isIn(['true', 'false']),
  query('sortBy').optional().isIn(['scans', 'views', 'clicks', 'arStarts', 'conversion', 'lastActivity', 'date', 'name']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const statusFilter = req.query.status;
    const enabledFilter = req.query.enabled === 'true' ? true : req.query.enabled === 'false' ? false : null;
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder || 'desc';

    // Get all users with their projects
    const users = await User.find({})
      .select('username email projects')
      .sort({ createdAt: -1 });

    // Get analytics data for all projects (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build list of all project identifiers first
    const projectKeys = [];
    users.forEach(user => {
      if (user.projects && user.projects.length > 0) {
        user.projects.forEach(project => {
          projectKeys.push({
            userId: user._id.toString(),
            projectId: project.id,
            user,
            project
          });
        });
      }
    });

    // Bulk fetch all analytics data in one query
    const allAnalyticsData = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          projectId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            projectId: '$projectId',
            eventType: '$eventType'
          },
          count: { $sum: 1 },
          lastOccurrence: { $max: '$timestamp' }
        }
      }
    ]);

    // Bulk fetch geographic data
    const allGeographicData = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          projectId: { $exists: true, $ne: null },
          'eventData.scanLocation.country': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            projectId: '$projectId',
            country: '$eventData.scanLocation.country'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Bulk fetch device data
    const allDeviceData = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          projectId: { $exists: true, $ne: null },
          'deviceInfo.type': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            projectId: '$projectId',
            deviceType: '$deviceInfo.type'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Bulk fetch social media clicks
    const allSocialData = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: thirtyDaysAgo },
          projectId: { $exists: true, $ne: null },
          eventType: 'linkClick',
          'eventData.linkType': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            projectId: '$projectId',
            linkType: '$eventData.linkType'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Create lookup maps for fast access
    const analyticsMap = new Map();
    allAnalyticsData.forEach(item => {
      // Convert ObjectId to string for consistent key matching
      const userIdStr = item._id.userId.toString();
      const key = `${userIdStr}_${item._id.projectId}`;
      if (!analyticsMap.has(key)) {
        analyticsMap.set(key, []);
      }
      analyticsMap.get(key).push({
        eventType: item._id.eventType,
        count: item.count,
        lastOccurrence: item.lastOccurrence
      });
    });

    const geographicMap = new Map();
    allGeographicData.forEach(item => {
      const userIdStr = item._id.userId.toString();
      const key = `${userIdStr}_${item._id.projectId}`;
      if (!geographicMap.has(key)) {
        geographicMap.set(key, []);
      }
      geographicMap.get(key).push({
        country: item._id.country,
        count: item.count
      });
    });

    const deviceMap = new Map();
    allDeviceData.forEach(item => {
      const userIdStr = item._id.userId.toString();
      const key = `${userIdStr}_${item._id.projectId}`;
      if (!deviceMap.has(key)) {
        deviceMap.set(key, []);
      }
      deviceMap.get(key).push({
        deviceType: item._id.deviceType,
        count: item.count
      });
    });

    const socialMap = new Map();
    allSocialData.forEach(item => {
      const userIdStr = item._id.userId.toString();
      const key = `${userIdStr}_${item._id.projectId}`;
      if (!socialMap.has(key)) {
        socialMap.set(key, []);
      }
      socialMap.get(key).push({
        linkType: item._id.linkType,
        count: item.count
      });
    });

    // Flatten projects with user info and enrich with analytics
    let allProjects = [];
    
    for (const { userId, projectId, user, project } of projectKeys) {
      // Apply filters
      if (statusFilter && project.status !== statusFilter) continue;
      if (enabledFilter !== null && project.isEnabled !== enabledFilter) continue;
      if (search && 
          !project.name.toLowerCase().includes(search.toLowerCase()) &&
          !user.username.toLowerCase().includes(search.toLowerCase()) &&
          !user.email.toLowerCase().includes(search.toLowerCase())) continue;

      const key = `${userId}_${projectId}`;
      const projectAnalytics = analyticsMap.get(key) || [];
      const geographicData = geographicMap.get(key) || [];
      const deviceData = deviceMap.get(key) || [];
      const socialData = socialMap.get(key) || [];

      // Calculate metrics
      const scans = projectAnalytics.find(e => e.eventType === 'scan')?.count || 0;
      const videoViews = projectAnalytics.find(e => e.eventType === 'videoView')?.count || 0;
      const linkClicks = projectAnalytics.find(e => e.eventType === 'linkClick')?.count || 0;
      const arStarts = projectAnalytics.find(e => e.eventType === 'arExperienceStart')?.count || 0;
      
      const scanToVideoConversion = scans > 0 ? (videoViews / scans * 100) : 0;
      const videoToLinkConversion = videoViews > 0 ? (linkClicks / videoViews * 100) : 0;
      const overallConversion = scans > 0 ? ((videoViews + linkClicks + arStarts) / scans * 100) : 0;

      // Find last activity
      const lastActivityDates = projectAnalytics.map(e => e.lastOccurrence).filter(Boolean);
      const lastActivity = lastActivityDates.length > 0 
        ? new Date(Math.max(...lastActivityDates.map(d => new Date(d))))
        : null;

      // Get top country
      const sortedCountries = geographicData.sort((a, b) => b.count - a.count);
      const topCountry = sortedCountries[0]?.country || null;

      // Calculate device percentages
      const totalDeviceEvents = deviceData.reduce((sum, d) => sum + d.count, 0);
      const mobileEvents = deviceData.find(d => d.deviceType === 'mobile')?.count || 0;
      const desktopEvents = deviceData.find(d => d.deviceType === 'desktop')?.count || 0;
      const mobilePercentage = totalDeviceEvents > 0 ? (mobileEvents / totalDeviceEvents * 100) : 0;
      const desktopPercentage = totalDeviceEvents > 0 ? (desktopEvents / totalDeviceEvents * 100) : 0;

      // Build social clicks object
      const socialClicks = socialData.reduce((acc, s) => {
        acc[s.linkType] = s.count;
        return acc;
      }, {});

      allProjects.push({
        ...project.toObject(),
        userId: user._id,
        username: user.username,
        userEmail: user.email,
        // Enhanced analytics
        analytics: {
          ...project.analytics,
          arStarts: project.analytics?.arExperienceStarts || 0,
          // Add real-time analytics from Analytics collection
          recentScans: scans,
          recentVideoViews: videoViews,
          recentLinkClicks: linkClicks,
          recentArStarts: arStarts,
          // Conversion rates
          scanToVideoConversion: scanToVideoConversion.toFixed(2),
          videoToLinkConversion: videoToLinkConversion.toFixed(2),
          overallConversion: overallConversion.toFixed(2)
        },
        // Geographic data
        topCountry,
        // Device data
        deviceBreakdown: {
          mobile: mobilePercentage.toFixed(1),
          desktop: desktopPercentage.toFixed(1),
          total: totalDeviceEvents
        },
        // Social media
        socialClicks,
        // Timestamps
        lastActivity,
        // File status
        hasDesign: !!project.uploadedFiles?.design?.url,
        hasVideo: !!project.uploadedFiles?.video?.url,
        hasMindTarget: !!project.uploadedFiles?.mindTarget?.url
      });
    }

    // Sort projects based on sortBy and sortOrder
    allProjects.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'scans':
          aValue = a.analytics?.recentScans || a.analytics?.totalScans || 0;
          bValue = b.analytics?.recentScans || b.analytics?.totalScans || 0;
          break;
        case 'views':
          aValue = a.analytics?.recentVideoViews || a.analytics?.videoViews || 0;
          bValue = b.analytics?.recentVideoViews || b.analytics?.videoViews || 0;
          break;
        case 'clicks':
          aValue = a.analytics?.recentLinkClicks || a.analytics?.linkClicks || 0;
          bValue = b.analytics?.recentLinkClicks || b.analytics?.linkClicks || 0;
          break;
        case 'arStarts':
          aValue = a.analytics?.recentArStarts || a.analytics?.arStarts || 0;
          bValue = b.analytics?.recentArStarts || b.analytics?.arStarts || 0;
          break;
        case 'conversion':
          aValue = parseFloat(a.analytics?.overallConversion || 0);
          bValue = parseFloat(b.analytics?.overallConversion || 0);
          break;
        case 'lastActivity':
          aValue = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          bValue = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          break;
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'date':
        default:
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        if (sortBy === 'name') {
          return aValue.localeCompare(bValue);
        }
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        if (sortBy === 'name') {
          return bValue.localeCompare(aValue);
        }
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    // Paginate
    const total = allProjects.length;
    const paginatedProjects = allProjects.slice(skip, skip + limit);

    res.status(200).json({
      status: 'success',
      data: {
        projects: paginatedProjects,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin projects list error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch projects',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/projects/:userId/:projectId/detailed
 * Get comprehensive analytics for a specific project
 */
router.get('/projects/:userId/:projectId/detailed', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, projectId } = req.params;
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user and project
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const project = user.projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({
        status: 'error',
        message: 'Project not found'
      });
    }

    // Get comprehensive analytics
    const matchQuery = {
      userId: user._id,
      projectId: projectId,
      timestamp: { $gte: startDate }
    };

    // Event type summary
    const eventSummary = await Analytics.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$timestamp' }
        }
      }
    ]);

    // Daily breakdown - ensure proper date sorting
    const dailyBreakdown = await Analytics.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 },
          dateValue: { $min: '$timestamp' } // Use min timestamp for sorting (all records on same day have same date)
        }
      },
      { $sort: { dateValue: 1, '_id.eventType': 1 } }, // Sort by actual date, then event type
      {
        $project: {
          _id: 1,
          count: 1
        }
      }
    ]);

    // Hourly breakdown
    const hourlyBreakdown = await Analytics.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    // Geographic data
    const countries = await Analytics.aggregate([
      {
        $match: {
          ...matchQuery,
          'eventData.scanLocation.country': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$eventData.scanLocation.country',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const cities = await Analytics.aggregate([
      {
        $match: {
          ...matchQuery,
          'eventData.scanLocation.city': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            city: '$eventData.scanLocation.city',
            country: '$eventData.scanLocation.country'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Device breakdown
    const devices = await Analytics.aggregate([
      {
        $match: {
          ...matchQuery,
          'deviceInfo.type': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const browsers = await Analytics.aggregate([
      {
        $match: {
          ...matchQuery,
          'deviceInfo.browser': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.browser',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const os = await Analytics.aggregate([
      {
        $match: {
          ...matchQuery,
          'deviceInfo.os': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.os',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Social media clicks
    const socialMedia = await Analytics.aggregate([
      {
        $match: {
          ...matchQuery,
          eventType: 'linkClick',
          'eventData.linkType': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$eventData.linkType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Video completion
    const videoCompletion = await Analytics.aggregate([
      {
        $match: {
          ...matchQuery,
          eventType: 'videoView',
          'eventData.videoProgress': { $exists: true },
          'eventData.videoDuration': { $exists: true }
        }
      },
      {
        $project: {
          progress: '$eventData.videoProgress',
          duration: '$eventData.videoDuration',
          completionRate: {
            $cond: {
              if: { $gt: ['$eventData.videoDuration', 0] },
              then: {
                $multiply: [
                  { $divide: ['$eventData.videoProgress', '$eventData.videoDuration'] },
                  100
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          averageCompletionRate: { $avg: '$completionRate' },
          completedViews: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    {
                      $cond: {
                        if: { $gt: ['$duration', 0] },
                        then: {
                          $multiply: [
                            { $divide: ['$progress', '$duration'] },
                            100
                          ]
                        },
                        else: 0
                      }
                    },
                    90
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Calculate engagement funnel
    const scans = eventSummary.find(e => e._id === 'scan')?.count || 0;
    const videoViews = eventSummary.find(e => e._id === 'videoView')?.count || 0;
    const linkClicks = eventSummary.find(e => e._id === 'linkClick')?.count || 0;
    const arStarts = eventSummary.find(e => e._id === 'arExperienceStart')?.count || 0;

    res.status(200).json({
      status: 'success',
      data: {
        project: {
          ...project.toObject(),
          userId: user._id,
          username: user.username,
          userEmail: user.email
        },
        analytics: {
          summary: eventSummary,
          dailyBreakdown,
          hourlyBreakdown,
          geography: {
            countries,
            cities
          },
          devices: {
            types: devices,
            browsers,
            operatingSystems: os
          },
          socialMedia,
          engagement: {
            funnel: {
              scans,
              videoViews,
              linkClicks,
              arStarts,
              scanToVideoConversion: scans > 0 ? (videoViews / scans * 100).toFixed(2) : 0,
              videoToLinkConversion: videoViews > 0 ? (linkClicks / videoViews * 100).toFixed(2) : 0,
              linkToArConversion: linkClicks > 0 ? (arStarts / linkClicks * 100).toFixed(2) : 0
            },
            videoCompletion: videoCompletion[0] ? {
              ...videoCompletion[0],
              completionRate: videoCompletion[0].totalViews > 0
                ? (videoCompletion[0].completedViews / videoCompletion[0].totalViews * 100).toFixed(2)
                : 0
            } : {
              totalViews: 0,
              averageCompletionRate: 0,
              completedViews: 0,
              completionRate: 0
            }
          }
        },
        period: {
          days,
          startDate,
          endDate: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Admin project detailed error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch project details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/analytics
 * Get comprehensive site-wide analytics
 */
router.get('/analytics', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Calculate previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);

    // Base match for current period
    const currentPeriodMatch = { timestamp: { $gte: startDate } };
    
    // Get analytics by event type
    const analyticsByType = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get previous period summary for comparison
    const prevAnalyticsByType = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: prevStartDate, $lt: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get daily breakdown - ensure proper date sorting
    const dailyBreakdown = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 },
          dateValue: { $min: '$timestamp' } // Use min timestamp for sorting (all records on same day have same date)
        }
      },
      { $sort: { dateValue: 1, '_id.eventType': 1 } }, // Sort by actual date, then event type
      {
        $project: {
          _id: 1,
          count: 1
        }
      }
    ]);

    // Get hourly breakdown
    const hourlyBreakdown = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    // Get weekly pattern (day of week)
    const weeklyPattern = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$timestamp' },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.dayOfWeek': 1 } }
    ]);

    // Geographic analytics - Countries
    const countriesBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'eventData.scanLocation.country': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$eventData.scanLocation.country',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Geographic analytics - Cities
    const citiesBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'eventData.scanLocation.city': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            city: '$eventData.scanLocation.city',
            country: '$eventData.scanLocation.country'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Device type breakdown
    const deviceBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'deviceInfo.type': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Browser breakdown
    const browserBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'deviceInfo.browser': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.browser',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // OS breakdown
    const osBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          'deviceInfo.os': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$deviceInfo.os',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Social media link click breakdown
    const socialMediaBreakdown = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          eventType: 'linkClick',
          'eventData.linkType': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$eventData.linkType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top users by activity
    const topUsers = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: '$userId',
          eventCount: { $sum: 1 }
        }
      },
      { $sort: { eventCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          email: '$user.email',
          eventCount: 1
        }
      }
    ]);

    // Top projects by engagement
    const topProjects = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          projectId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            userId: '$userId',
            projectId: '$projectId'
          },
          scans: {
            $sum: { $cond: [{ $eq: ['$eventType', 'scan'] }, 1, 0] }
          },
          videoViews: {
            $sum: { $cond: [{ $eq: ['$eventType', 'videoView'] }, 1, 0] }
          },
          linkClicks: {
            $sum: { $cond: [{ $eq: ['$eventType', 'linkClick'] }, 1, 0] }
          },
          arStarts: {
            $sum: { $cond: [{ $eq: ['$eventType', 'arExperienceStart'] }, 1, 0] }
          },
          totalEvents: { $sum: 1 }
        }
      },
      {
        $sort: { totalEvents: -1 }
      },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: '_id.userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id.userId',
          projectId: '$_id.projectId',
          username: '$user.username',
          projectName: {
            $let: {
              vars: {
                project: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$user.projects',
                        as: 'proj',
                        cond: { $eq: ['$$proj.id', '$_id.projectId'] }
                      }
                    },
                    0
                  ]
                }
              },
              in: '$$project.name'
            }
          },
          scans: 1,
          videoViews: 1,
          linkClicks: 1,
          arStarts: 1,
          totalEvents: 1
        }
      }
    ]);

    // Engagement funnel calculation
    const funnelData = await Analytics.aggregate([
      { $match: currentPeriodMatch },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      }
    ]);

    const scans = funnelData.find(e => e._id === 'scan')?.count || 0;
    const videoViews = funnelData.find(e => e._id === 'videoView')?.count || 0;
    const linkClicks = funnelData.find(e => e._id === 'linkClick')?.count || 0;
    const arStarts = funnelData.find(e => e._id === 'arExperienceStart')?.count || 0;

    // Video completion rates
    const videoCompletionData = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          eventType: 'videoView',
          'eventData.videoProgress': { $exists: true },
          'eventData.videoDuration': { $exists: true }
        }
      },
      {
        $project: {
          progress: '$eventData.videoProgress',
          duration: '$eventData.videoDuration',
          completionRate: {
            $cond: {
              if: { $gt: ['$eventData.videoDuration', 0] },
              then: {
                $multiply: [
                  { $divide: ['$eventData.videoProgress', '$eventData.videoDuration'] },
                  100
                ]
              },
              else: 0
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: 1 },
          averageProgress: { $avg: '$progress' },
          averageDuration: { $avg: '$duration' },
          averageCompletionRate: { $avg: '$completionRate' },
          completedViews: {
            $sum: {
              $cond: [
                {
                  $gte: [
                    {
                      $cond: {
                        if: { $gt: ['$duration', 0] },
                        then: {
                          $multiply: [
                            { $divide: ['$progress', '$duration'] },
                            100
                          ]
                        },
                        else: 0
                      }
                    },
                    90
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Session analysis
    const sessionData = await Analytics.aggregate([
      {
        $match: {
          ...currentPeriodMatch,
          sessionId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$sessionId',
          firstEvent: { $min: '$timestamp' },
          lastEvent: { $max: '$timestamp' },
          eventCount: { $sum: 1 },
          userId: { $first: '$userId' }
        }
      },
      {
        $project: {
          sessionId: '$_id',
          duration: {
            $divide: [
              { $subtract: ['$lastEvent', '$firstEvent'] },
              1000 * 60 // Convert to minutes
            ]
          },
          eventCount: 1,
          userId: 1
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          averageSessionDuration: { $avg: '$duration' },
          averageEventsPerSession: { $avg: '$eventCount' },
          singleEventSessions: {
            $sum: { $cond: [{ $eq: ['$eventCount', 1] }, 1, 0] }
          }
        }
      }
    ]);

    // Calculate percentage changes for comparison
    const calculateChange = (current, previous) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const getEventCount = (data, eventType) => {
      return data.find(e => e._id === eventType)?.count || 0;
    };

    const currentScans = getEventCount(analyticsByType, 'scan');
    const prevScans = getEventCount(prevAnalyticsByType, 'scan');
    const currentVideoViews = getEventCount(analyticsByType, 'videoView');
    const prevVideoViews = getEventCount(prevAnalyticsByType, 'videoView');
    const currentLinkClicks = getEventCount(analyticsByType, 'linkClick');
    const prevLinkClicks = getEventCount(prevAnalyticsByType, 'linkClick');
    const currentArStarts = getEventCount(analyticsByType, 'arExperienceStart');
    const prevArStarts = getEventCount(prevAnalyticsByType, 'arExperienceStart');

    res.status(200).json({
      status: 'success',
      data: {
        summary: analyticsByType,
        dailyBreakdown,
        hourlyBreakdown,
        weeklyPattern,
        topUsers,
        // Geographic data
        geography: {
          countries: countriesBreakdown,
          cities: citiesBreakdown
        },
        // Device data
        devices: {
          types: deviceBreakdown,
          browsers: browserBreakdown,
          operatingSystems: osBreakdown
        },
        // Social media
        socialMedia: socialMediaBreakdown,
        // Projects
        topProjects,
        // Engagement metrics
        engagement: {
          funnel: {
            scans,
            videoViews,
            linkClicks,
            arStarts,
            scanToVideoConversion: scans > 0 ? (videoViews / scans * 100).toFixed(2) : 0,
            videoToLinkConversion: videoViews > 0 ? (linkClicks / videoViews * 100).toFixed(2) : 0,
            linkToArConversion: linkClicks > 0 ? (arStarts / linkClicks * 100).toFixed(2) : 0
          },
          videoCompletion: videoCompletionData[0] ? {
            ...videoCompletionData[0],
            completionRate: videoCompletionData[0].totalViews > 0
              ? (videoCompletionData[0].completedViews / videoCompletionData[0].totalViews * 100).toFixed(2)
              : 0
          } : {
            totalViews: 0,
            averageProgress: 0,
            averageDuration: 0,
            averageCompletionRate: 0,
            completedViews: 0,
            completionRate: 0
          },
          sessions: sessionData[0] ? {
            ...sessionData[0],
            bounceRate: sessionData[0].totalSessions > 0 
              ? (sessionData[0].singleEventSessions / sessionData[0].totalSessions * 100).toFixed(2)
              : 0
          } : {
            totalSessions: 0,
            averageSessionDuration: 0,
            averageEventsPerSession: 0,
            singleEventSessions: 0,
            bounceRate: 0
          }
        },
        // Period comparison
        comparison: {
          scans: {
            current: currentScans,
            previous: prevScans,
            change: calculateChange(currentScans, prevScans)
          },
          videoViews: {
            current: currentVideoViews,
            previous: prevVideoViews,
            change: calculateChange(currentVideoViews, prevVideoViews)
          },
          linkClicks: {
            current: currentLinkClicks,
            previous: prevLinkClicks,
            change: calculateChange(currentLinkClicks, prevLinkClicks)
          },
          arStarts: {
            current: currentArStarts,
            previous: prevArStarts,
            change: calculateChange(currentArStarts, prevArStarts)
          }
        },
        period: {
          days,
          startDate,
          endDate: new Date(),
          previousStartDate: prevStartDate,
          previousEndDate: startDate
        }
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/admin/contacts
 * Get all contact form submissions
 */
router.get('/contacts', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['new', 'read', 'responded', 'archived']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const query = {};
    if (status) {
      query.status = status;
    }

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        contacts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin contacts list error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch contacts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/admin/contacts/:id/status
 * Update contact submission status
 */
router.put('/contacts/:id/status', [
  body('status')
    .isIn(['new', 'read', 'responded', 'archived'])
    .withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { status } = req.body;
    const updateData = { status };

    if (status === 'read' && !req.body.readAt) {
      updateData.readAt = new Date();
    }
    if (status === 'responded') {
      updateData.respondedAt = new Date();
    }
    if (req.body.notes) {
      updateData.notes = req.body.notes;
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({
        status: 'error',
        message: 'Contact not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Contact status updated successfully',
      data: {
        contact
      }
    });
  } catch (error) {
    console.error('Admin contact status update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update contact status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/maintenance
 * Toggle maintenance mode
 */
router.post('/maintenance', logAdminAction('maintenance_toggle'), [
  body('enabled')
    .isBoolean()
    .withMessage('enabled must be a boolean'),
  body('message').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { enabled, message } = req.body;

    // Update maintenance config file
    const configPath = path.join(__dirname, '../../frontend/src/config/maintenance.js');
    
    try {
      let configContent = await fs.readFile(configPath, 'utf8');
      
      // Update ENABLED value
      configContent = configContent.replace(
        /ENABLED:\s*(true|false)/,
        `ENABLED: ${enabled}`
      );
      
      // Update message if provided
      if (message) {
        configContent = configContent.replace(
          /MESSAGE:\s*"[^"]*"/,
          `MESSAGE: "${message.replace(/"/g, '\\"')}"`
        );
      }
      
      await fs.writeFile(configPath, configContent, 'utf8');
      
      res.status(200).json({
        status: 'success',
        message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'} successfully`,
        data: {
          enabled
        }
      });
    } catch (fileError) {
      console.error('Maintenance config file update error:', fileError);
      // Still return success if file update fails (for production deployments)
      res.status(200).json({
        status: 'success',
        message: 'Maintenance mode toggle received. Note: File update may require manual deployment.',
        data: {
          enabled
        }
      });
    }
  } catch (error) {
    console.error('Admin maintenance toggle error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle maintenance mode',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

