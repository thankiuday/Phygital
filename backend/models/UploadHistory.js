/**
 * Upload History Model
 * Tracks all user upload activities and changes
 * Provides audit trail and history management
 */

const mongoose = require('mongoose');

const uploadHistorySchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Activity type
  activityType: {
    type: String,
    required: true,
    enum: [
      'design_upload',
      'design_update',
      'design_delete',
      'video_upload',
      'video_update',
      'video_delete',
      'qr_position_set',
      'qr_position_update',
      'social_links_update',
      'final_design_generated',
      'final_design_downloaded',
      'project_deleted'
    ]
  },
  
  // Activity details
  activityData: {
    // For file uploads
    filename: String,
    originalName: String,
    fileSize: Number,
    fileType: String,
    url: String,
    
    // For QR position
    qrPosition: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    },
    
    // For social links
    socialLinks: {
      instagram: String,
      facebook: String,
      twitter: String,
      linkedin: String,
      website: String
    },
    
    // For final design
    finalDesignUrl: String,
    qrData: String,
    
    // Project information
    project: {
      id: String,
      name: String,
      description: String
    },
    
    // Previous values (for updates)
    previousValues: mongoose.Schema.Types.Mixed,
    
    // Additional metadata
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // Status
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'success'
  },
  
  // Error information (if failed)
  error: {
    message: String,
    code: String,
    details: mongoose.Schema.Types.Mixed
  },
  
  // IP address and user agent for security
  ipAddress: String,
  userAgent: String,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
uploadHistorySchema.index({ userId: 1, createdAt: -1 });
uploadHistorySchema.index({ activityType: 1, createdAt: -1 });
uploadHistorySchema.index({ status: 1 });

// Static methods
uploadHistorySchema.statics.logActivity = async function(userId, activityType, activityData, options = {}) {
  try {
    const historyEntry = new this({
      userId,
      activityType,
      activityData,
      status: options.status || 'success',
      error: options.error,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent
    });
    
    return await historyEntry.save();
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main operation
    return null;
  }
};

uploadHistorySchema.statics.getUserHistory = async function(userId, options = {}) {
  try {
    const {
      limit = 50,
      skip = 0,
      activityType,
      startDate,
      endDate,
      status
    } = options;
    
    const query = { userId };
    
    if (activityType) {
      query.activityType = activityType;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    return await this.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('userId', 'username email');
  } catch (error) {
    console.error('Failed to get user history:', error);
    throw error;
  }
};

uploadHistorySchema.statics.getActivityStats = async function(userId) {
  try {
    const stats = await this.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$activityType',
          count: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
        }
      },
      { $sort: { lastActivity: -1 } }
    ]);
    
    return stats;
  } catch (error) {
    console.error('Failed to get activity stats:', error);
    throw error;
  }
};

// Instance methods
uploadHistorySchema.methods.getFormattedActivity = function() {
  const activityTypes = {
    'design_upload': 'Design Uploaded',
    'design_update': 'Design Updated',
    'design_delete': 'Design Deleted',
    'video_upload': 'Video Uploaded',
    'video_update': 'Video Updated',
    'video_delete': 'Video Deleted',
    'qr_position_set': 'QR Position Set',
    'qr_position_update': 'QR Position Updated',
    'social_links_update': 'Social Links Updated',
    'final_design_generated': 'Final Design Generated',
    'final_design_downloaded': 'Final Design Downloaded',
    'project_deleted': 'Project Deleted'
  };
  
  let displayName = activityTypes[this.activityType] || this.activityType;
  
  // Add project name to display name if available
  if (this.activityData?.project?.name) {
    displayName += ` - ${this.activityData.project.name}`;
  }
  
  return {
    id: this._id,
    type: this.activityType,
    displayName: displayName,
    data: this.activityData,
    status: this.status,
    error: this.error,
    createdAt: this.createdAt,
    formattedDate: this.createdAt.toLocaleDateString(),
    formattedTime: this.createdAt.toLocaleTimeString()
  };
};

module.exports = mongoose.model('UploadHistory', uploadHistorySchema);

