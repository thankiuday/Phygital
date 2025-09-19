/**
 * Analytics Model
 * Tracks detailed analytics events for each user
 * Provides insights into QR scans, video views, and user engagement
 */

const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  // Reference to the user
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Event type (scan, videoView, linkClick, etc.)
  eventType: {
    type: String,
    required: true,
    enum: ['scan', 'videoView', 'linkClick', 'pageView', 'videoComplete']
  },
  
  // Event details
  eventData: {
    // For scan events
    scanLocation: {
      latitude: Number,
      longitude: Number,
      city: String,
      country: String
    },
    
    // For video events
    videoProgress: Number, // percentage watched
    videoDuration: Number, // total video duration
    
    // For link clicks
    linkType: String, // instagram, facebook, etc.
    linkUrl: String,
    
    // General event data
    userAgent: String,
    ipAddress: String,
    referrer: String
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now
  },
  
  // Session information
  sessionId: String,
  
  // Device information
  deviceInfo: {
    type: String, // mobile, desktop, tablet
    browser: String,
    os: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
analyticsSchema.index({ userId: 1, eventType: 1 });
analyticsSchema.index({ timestamp: -1 });
analyticsSchema.index({ userId: 1, timestamp: -1 });

// Static method to get analytics summary for a user
analyticsSchema.statics.getUserAnalytics = async function(userId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const analytics = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          lastOccurrence: { $max: '$timestamp' }
        }
      }
    ]);
    
    // Get daily breakdown
    const dailyBreakdown = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.date': 1 }
      }
    ]);
    
    return {
      summary: analytics,
      dailyBreakdown: dailyBreakdown
    };
  } catch (error) {
    throw new Error('Failed to fetch analytics data');
  }
};

// Static method to track an event
analyticsSchema.statics.trackEvent = async function(userId, eventType, eventData = {}) {
  try {
    const analytics = new this({
      userId,
      eventType,
      eventData,
      timestamp: new Date()
    });
    
    await analytics.save();
    
    // Update user's analytics summary
    const User = mongoose.model('User');
    let fieldToUpdate = 'totalScans'; // default
    if (eventType === 'scan') fieldToUpdate = 'analytics.totalScans';
    else if (eventType === 'videoView') fieldToUpdate = 'analytics.videoViews';
    else if (eventType === 'linkClick') fieldToUpdate = 'analytics.linkClicks';
    
    await User.findByIdAndUpdate(userId, {
      $inc: { [fieldToUpdate]: 1 }
    });
    
    return analytics;
  } catch (error) {
    throw new Error('Failed to track analytics event');
  }
};

module.exports = mongoose.model('Analytics', analyticsSchema);
