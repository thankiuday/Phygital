/**
 * History Routes
 * Handles user activity history and statistics
 * Provides audit trail and activity tracking
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
  getUserHistory, 
  getActivityStats, 
  getRecentActivities, 
  getActivitySummary 
} = require('../services/historyService');

const router = express.Router();

/**
 * GET /api/history
 * Get user's upload history with pagination and filtering
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      activityType,
      startDate,
      endDate,
      status
    } = req.query;
    
    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      activityType,
      startDate,
      endDate,
      status
    };
    
    const history = await getUserHistory(req.user._id, options);
    const formattedHistory = history.map(activity => activity.getFormattedActivity());
    
    res.status(200).json({
      status: 'success',
      data: {
        history: formattedHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: formattedHistory.length
        }
      }
    });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/history/recent
 * Get recent activities for dashboard
 */
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const recentActivities = await getRecentActivities(req.user._id, parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: {
        activities: recentActivities
      }
    });
    
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get recent activities',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/history/stats
 * Get activity statistics for user
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getActivityStats(req.user._id);
    
    res.status(200).json({
      status: 'success',
      data: {
        stats
      }
    });
    
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get activity statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/history/summary
 * Get comprehensive activity summary
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    console.log('Getting activity summary for user:', req.user._id);
    const summary = await getActivitySummary(req.user._id);
    console.log('Activity summary result:', summary);
    
    res.status(200).json({
      status: 'success',
      data: summary
    });
    
  } catch (error) {
    console.error('Get activity summary error:', error);
    // Return default summary instead of 500 error
    res.status(200).json({
      status: 'success',
      data: {
        stats: [],
        recentActivities: [],
        totalActivities: 0,
        lastActivity: null
      }
    });
  }
});

/**
 * GET /api/history/activity/:activityType
 * Get history for specific activity type
 */
router.get('/activity/:activityType', authenticateToken, async (req, res) => {
  try {
    const { activityType } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const options = {
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      activityType
    };
    
    const history = await getUserHistory(req.user._id, options);
    const formattedHistory = history.map(activity => activity.getFormattedActivity());
    
    res.status(200).json({
      status: 'success',
      data: {
        activityType,
        history: formattedHistory,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: formattedHistory.length
        }
      }
    });
    
  } catch (error) {
    console.error('Get activity type history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get activity history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

