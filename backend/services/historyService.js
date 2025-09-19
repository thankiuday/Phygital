/**
 * History Service
 * Handles all history tracking operations
 * Provides centralized history management
 */

const UploadHistory = require('../models/UploadHistory');

/**
 * Log a user activity
 * @param {String} userId - User ID
 * @param {String} activityType - Type of activity
 * @param {Object} activityData - Activity data
 * @param {Object} options - Additional options
 */
const logActivity = async (userId, activityType, activityData, options = {}) => {
  try {
    return await UploadHistory.logActivity(userId, activityType, activityData, options);
  } catch (error) {
    console.error('History service - logActivity error:', error);
    return null;
  }
};

/**
 * Get user's upload history
 * @param {String} userId - User ID
 * @param {Object} options - Query options
 */
const getUserHistory = async (userId, options = {}) => {
  try {
    return await UploadHistory.getUserHistory(userId, options);
  } catch (error) {
    console.error('History service - getUserHistory error:', error);
    throw error;
  }
};

/**
 * Get activity statistics for a user
 * @param {String} userId - User ID
 */
const getActivityStats = async (userId) => {
  try {
    console.log('Getting activity stats for user:', userId);
    const stats = await UploadHistory.getActivityStats(userId);
    console.log('Activity stats result:', stats);
    return stats;
  } catch (error) {
    console.error('History service - getActivityStats error:', error);
    // Return empty array instead of throwing to prevent 500 errors
    return [];
  }
};

/**
 * Log design upload
 * @param {String} userId - User ID
 * @param {Object} fileData - File data
 * @param {Object} options - Additional options
 */
const logDesignUpload = async (userId, fileData, options = {}) => {
  const activityData = {
    filename: fileData.filename,
    originalName: fileData.originalName,
    fileSize: fileData.size,
    fileType: fileData.mimetype,
    url: fileData.url
  };
  
  return await logActivity(userId, 'design_upload', activityData, options);
};

/**
 * Log design update
 * @param {String} userId - User ID
 * @param {Object} newFileData - New file data
 * @param {Object} oldFileData - Old file data
 * @param {Object} options - Additional options
 */
const logDesignUpdate = async (userId, newFileData, oldFileData, options = {}) => {
  const activityData = {
    filename: newFileData.filename,
    originalName: newFileData.originalName,
    fileSize: newFileData.size,
    fileType: newFileData.mimetype,
    url: newFileData.url,
    previousValues: {
      filename: oldFileData.filename,
      originalName: oldFileData.originalName,
      fileSize: oldFileData.size,
      url: oldFileData.url
    }
  };
  
  return await logActivity(userId, 'design_update', activityData, options);
};

/**
 * Log video upload
 * @param {String} userId - User ID
 * @param {Object} fileData - File data
 * @param {Object} options - Additional options
 * @param {Object} projectData - Project information
 */
const logVideoUpload = async (userId, fileData, options = {}, projectData = null) => {
  const activityData = {
    filename: fileData.filename,
    originalName: fileData.originalName,
    fileSize: fileData.size,
    fileType: fileData.mimetype,
    url: fileData.url,
    project: projectData ? {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description
    } : null
  };
  
  return await logActivity(userId, 'video_upload', activityData, options);
};

/**
 * Log QR position set/update
 * @param {String} userId - User ID
 * @param {Object} qrPosition - QR position data
 * @param {Object} oldPosition - Previous position (for updates)
 * @param {Object} options - Additional options
 */
const logQRPositionUpdate = async (userId, qrPosition, oldPosition = null, options = {}) => {
  const activityData = {
    qrPosition: qrPosition,
    previousValues: oldPosition ? { qrPosition: oldPosition } : null
  };
  
  const activityType = oldPosition ? 'qr_position_update' : 'qr_position_set';
  return await logActivity(userId, activityType, activityData, options);
};

/**
 * Log social links update
 * @param {String} userId - User ID
 * @param {Object} socialLinks - New social links
 * @param {Object} oldSocialLinks - Previous social links
 * @param {Object} options - Additional options
 */
const logSocialLinksUpdate = async (userId, socialLinks, oldSocialLinks = null, options = {}) => {
  const activityData = {
    socialLinks: socialLinks,
    previousValues: oldSocialLinks ? { socialLinks: oldSocialLinks } : null
  };
  
  return await logActivity(userId, 'social_links_update', activityData, options);
};

/**
 * Log final design generation
 * @param {String} userId - User ID
 * @param {String} qrData - QR code data
 * @param {Object} options - Additional options
 * @param {Object} projectData - Project information
 */
const logFinalDesignGeneration = async (userId, qrData, options = {}, projectData = null) => {
  const activityData = {
    qrData: qrData,
    project: projectData ? {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description
    } : null,
    metadata: {
      generatedAt: new Date(),
      userAgent: options.userAgent
    }
  };
  
  return await logActivity(userId, 'final_design_generated', activityData, options);
};

/**
 * Log final design download
 * @param {String} userId - User ID
 * @param {String} filename - Downloaded filename
 * @param {Object} options - Additional options
 * @param {Object} projectData - Project information
 */
const logFinalDesignDownload = async (userId, filename, options = {}, projectData = null) => {
  const activityData = {
    finalDesignUrl: filename,
    project: projectData ? {
      id: projectData.id,
      name: projectData.name,
      description: projectData.description
    } : null,
    metadata: {
      downloadedAt: new Date(),
      userAgent: options.userAgent
    }
  };
  
  return await logActivity(userId, 'final_design_downloaded', activityData, options);
};

/**
 * Log project deletion activity
 * @param {String} userId - User ID
 * @param {Object} projectData - Project data
 * @param {Object} options - Additional options
 */
const logProjectDeletion = async (userId, projectData, options = {}) => {
  const activityData = {
    projectId: projectData.projectId,
    projectName: projectData.projectName,
    deletedFiles: projectData.deletedFiles,
    metadata: {
      deletedAt: new Date(),
      userAgent: options.userAgent
    }
  };
  
  return await logActivity(userId, 'project_deleted', activityData, options);
};

/**
 * Get recent activities for dashboard
 * @param {String} userId - User ID
 * @param {Number} limit - Number of recent activities
 */
const getRecentActivities = async (userId, limit = 10) => {
  try {
    const activities = await getUserHistory(userId, { limit });
    return activities.map(activity => activity.getFormattedActivity());
  } catch (error) {
    console.error('History service - getRecentActivities error:', error);
    throw error;
  }
};

/**
 * Get activity summary for a user
 * @param {String} userId - User ID
 */
const getActivitySummary = async (userId) => {
  try {
    const [stats, recentActivities] = await Promise.all([
      getActivityStats(userId),
      getRecentActivities(userId, 5)
    ]);
    
    return {
      stats: stats || [],
      recentActivities: recentActivities || [],
      totalActivities: (stats || []).reduce((sum, stat) => sum + stat.count, 0),
      lastActivity: (recentActivities && recentActivities[0])?.createdAt || null
    };
  } catch (error) {
    console.error('History service - getActivitySummary error:', error);
    // Return default summary instead of throwing
    return {
      stats: [],
      recentActivities: [],
      totalActivities: 0,
      lastActivity: null
    };
  }
};

module.exports = {
  logActivity,
  getUserHistory,
  getActivityStats,
  logDesignUpload,
  logDesignUpdate,
  logVideoUpload,
  logQRPositionUpdate,
  logSocialLinksUpdate,
  logFinalDesignGeneration,
  logFinalDesignDownload,
  logProjectDeletion,
  getRecentActivities,
  getActivitySummary
};

