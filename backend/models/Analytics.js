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
  
  // Reference to the project (for project-specific analytics)
  projectId: {
    type: String,
    required: false, // Optional for backward compatibility
    index: true
  },
  
  // Event type (scan, videoView, linkClick, etc.)
  eventType: {
    type: String,
    required: true,
    enum: ['scan', 'videoView', 'linkClick', 'pageView', 'pageViewDuration', 'videoComplete', 'videoProgressMilestone', 'arExperienceStart', 'arExperienceError', 'socialMediaClick', 'documentView', 'documentDownload']
  },
  
  // Event details
  eventData: {
    // For scan events
    scanLocation: {
      latitude: Number,
      longitude: Number,
      village: String,      // Village/neighborhood/area name
      city: String,
      state: String,        // State/region
      country: String
    },
    
    // For video events
    videoProgress: Number, // percentage watched
    videoDuration: Number, // total video duration
    videoProgressMilestone: String, // '25', '50', '75', '100'
    videoPlayed: Boolean, // whether video was played
    videoCompleted: Boolean, // whether video was completed
    videoIndex: Number, // Index in videos array
    videoId: String, // Unique video identifier
    videoUrl: String, // Video URL for reference
    
    // For page view duration
    timeSpent: Number, // seconds spent on page
    
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
analyticsSchema.index({ userId: 1, projectId: 1, eventType: 1 }); // New compound index for project-based queries
analyticsSchema.index({ projectId: 1, timestamp: -1 }); // For project timeline queries
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

// Static method to get analytics for a specific project
analyticsSchema.statics.getProjectAnalytics = async function(userId, projectId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const analytics = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          projectId: projectId,
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
    
    // Get daily breakdown for the project
    const dailyBreakdown = await this.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          projectId: projectId,
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
    throw new Error('Failed to fetch project analytics data');
  }
};

// Static method to track an event (now with project support)
analyticsSchema.statics.trackEvent = async function(userId, eventType, eventData = {}, projectId = null) {
  try {
    const analytics = new this({
      userId,
      projectId,
      eventType,
      eventData,
      timestamp: new Date()
    });
    
    await analytics.save();
    
    // Update user's analytics summary
    const User = mongoose.model('User');
    
    // If projectId is provided, update project-specific analytics
    if (projectId) {
      let fieldToUpdate = 'totalScans'; // default
      let timestampField = null;
      
      if (eventType === 'scan') {
        fieldToUpdate = 'analytics.totalScans';
        timestampField = 'analytics.lastScanAt';
      } else if (eventType === 'videoView') {
        fieldToUpdate = 'analytics.videoViews';
        timestampField = 'analytics.lastVideoViewAt';
      } else if (eventType === 'linkClick') {
        fieldToUpdate = 'analytics.linkClicks';
      } else if (eventType === 'socialMediaClick') {
        fieldToUpdate = 'analytics.socialMediaClicks';
      } else if (eventType === 'arExperienceStart') {
        fieldToUpdate = 'analytics.arExperienceStarts';
        timestampField = 'analytics.lastArExperienceStartAt';
      } else if (eventType === 'documentView') {
        fieldToUpdate = 'analytics.documentViews';
      } else if (eventType === 'documentDownload') {
        fieldToUpdate = 'analytics.documentDownloads';
      } else if (eventType === 'videoComplete') {
        fieldToUpdate = 'analytics.videoCompletions';
      } else if (eventType === 'pageViewDuration') {
        // Don't increment a counter for duration, just track the event
        fieldToUpdate = null;
      } else if (eventType === 'videoProgressMilestone') {
        // Don't increment a counter for milestones, just track the event
        fieldToUpdate = null;
      }
      
      // Only update if we have a field to update
      if (fieldToUpdate) {
        console.log(`📊 Updating project analytics: userId=${userId}, projectId=${projectId}, field=${fieldToUpdate}, event=${eventType}`);
      
      // Convert userId to ObjectId if it's a string
      const userObjectId = typeof userId === 'string' && userId.match(/^[0-9a-fA-F]{24}$/)
        ? new mongoose.Types.ObjectId(userId)
        : userId;
      
        // Build update object
        const updateObj = {
          $inc: { [`projects.$.${fieldToUpdate}`]: 1 },
          $set: { 'projects.$.updatedAt': new Date() }
        };
        
        // Add timestamp field if applicable
        if (timestampField) {
          updateObj.$set[`projects.$.${timestampField}`] = new Date();
        }
        
        // Update the specific project's analytics
        const updateResult = await User.findOneAndUpdate(
          { _id: userObjectId, 'projects.id': projectId },
          updateObj,
          { new: true }
        );
        
        if (updateResult) {
          console.log(`✅ Project analytics updated successfully for project ${projectId}`);
          // Debug: log the updated project
          const updatedProject = updateResult.projects.find(p => p.id === projectId);
          if (updatedProject) {
            console.log(`📈 Project "${updatedProject.name}" analytics:`, updatedProject.analytics);
          }
        } else {
          console.warn(`⚠️ Failed to update project analytics - project not found: userId=${userId}, projectId=${projectId}`);
          // Debug: try to find the user and list their projects
          const debugUser = await User.findById(userObjectId);
          if (debugUser) {
            console.log(`👤 User found: ${debugUser.username}, Projects:`, debugUser.projects.map(p => ({ id: p.id, name: p.name })));
          } else {
            console.error(`❌ User not found with ID: ${userId}`);
          }
        }
      } else {
        // For pageViewDuration and videoProgressMilestone, just log the event
        console.log(`📊 Tracking analytics event (no counter update): userId=${userId}, projectId=${projectId}, event=${eventType}`);
      }
    }
    
    // Also update global user analytics for backward compatibility
    let globalFieldToUpdate = 'analytics.totalScans'; // default
    let globalTimestampField = null;
    
    if (eventType === 'scan') {
      globalFieldToUpdate = 'analytics.totalScans';
      globalTimestampField = 'analytics.lastScanAt';
    } else if (eventType === 'videoView') {
      globalFieldToUpdate = 'analytics.videoViews';
      globalTimestampField = 'analytics.lastVideoViewAt';
    } else if (eventType === 'linkClick') {
      globalFieldToUpdate = 'analytics.linkClicks';
    } else if (eventType === 'socialMediaClick') {
      globalFieldToUpdate = 'analytics.socialMediaClicks';
    } else if (eventType === 'arExperienceStart') {
      globalFieldToUpdate = 'analytics.arExperienceStarts';
      globalTimestampField = 'analytics.lastArExperienceStartAt';
    } else if (eventType === 'documentView') {
      globalFieldToUpdate = 'analytics.documentViews';
    } else if (eventType === 'documentDownload') {
      globalFieldToUpdate = 'analytics.documentDownloads';
    } else if (eventType === 'videoComplete') {
      globalFieldToUpdate = 'analytics.videoCompletions';
    }
    
    // Build global update object
    const globalUpdateObj = {
      $inc: { [globalFieldToUpdate]: 1 }
    };
    
    // Add timestamp field if applicable
    if (globalTimestampField) {
      globalUpdateObj.$set = { [globalTimestampField]: new Date() };
    }
    
    await User.findByIdAndUpdate(userId, globalUpdateObj);
    
    return analytics;
  } catch (error) {
    console.error('Track event error:', error);
    throw new Error('Failed to track analytics event');
  }
};

module.exports = mongoose.model('Analytics', analyticsSchema);
