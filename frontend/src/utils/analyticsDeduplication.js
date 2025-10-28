/**
 * Analytics Deduplication Utility
 * Prevents double-counting of analytics events using a global singleton cache
 * This persists across component re-renders and remounts
 */

// Global cache that persists for the entire session
const analyticsCache = new Map();

// Load existing cache from sessionStorage on initialization
const loadCacheFromSessionStorage = () => {
  try {
    const keys = Object.keys(sessionStorage);
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    keys.forEach(key => {
      if (key.startsWith('scan_') || key.startsWith('videoView_') || key.startsWith('linkClick_') || key.startsWith('arStart_')) {
        const timestamp = parseInt(sessionStorage.getItem(key)) || now;
        // Only load if not expired
        if (timestamp > fiveMinutesAgo) {
          analyticsCache.set(key, timestamp);
        } else {
          // Remove expired keys
          sessionStorage.removeItem(key);
        }
      }
    });
    
    if (analyticsCache.size > 0) {
      console.log(`🔄 Loaded ${analyticsCache.size} analytics cache entries from sessionStorage`);
    }
  } catch (error) {
    console.error('Failed to load analytics cache from sessionStorage:', error);
  }
};

// Initialize cache from sessionStorage
loadCacheFromSessionStorage();

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, timestamp] of analyticsCache.entries()) {
    if (timestamp < fiveMinutesAgo) {
      analyticsCache.delete(key);
      // Also remove from sessionStorage
      sessionStorage.removeItem(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if an analytics event should be tracked
 * @param {string} eventType - Type of event (scan, videoView, linkClick)
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @param {object} additionalData - Additional data for creating unique key
 * @returns {boolean} - True if event should be tracked, false if duplicate
 */
export const shouldTrackAnalytics = (eventType, userId, projectId, additionalData = {}) => {
  try {
    // Create unique key based on event type and time window
    const sessionMinute = Math.floor(Date.now() / 60000);
    let cacheKey;
    
    switch (eventType) {
      case 'scan':
        cacheKey = `scan_${userId}_${projectId}_${sessionMinute}`;
        break;
      case 'videoView':
        cacheKey = `videoView_${userId}_${projectId}_${sessionMinute}`;
        break;
      case 'linkClick':
        cacheKey = `linkClick_${userId}_${projectId}_${additionalData.platform}_${sessionMinute}`;
        break;
      case 'ar-experience-start':
        cacheKey = `arStart_${userId}_${projectId}_${sessionMinute}`;
        break;
      default:
        cacheKey = `${eventType}_${userId}_${projectId}_${sessionMinute}`;
    }
    
    // Check both in-memory cache and sessionStorage
    const now = Date.now();
    const inMemoryCheck = analyticsCache.has(cacheKey);
    const sessionCheck = sessionStorage.getItem(cacheKey);
    
    if (inMemoryCheck || sessionCheck) {
      console.log(`ℹ️ Analytics event already tracked: ${eventType} (${cacheKey})`);
      return false;
    }
    
    // Mark as tracked in both places with timestamp
    analyticsCache.set(cacheKey, now);
    sessionStorage.setItem(cacheKey, now.toString());
    
    console.log(`✅ Analytics event will be tracked: ${eventType} (${cacheKey})`);
    return true;
    
  } catch (error) {
    console.error('Error in shouldTrackAnalytics:', error);
    // If there's an error, allow tracking to prevent data loss
    return true;
  }
};

/**
 * Mark an analytics event as failed so it can be retried
 * @param {string} eventType - Type of event
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @param {object} additionalData - Additional data for creating unique key
 */
export const markAnalyticsFailed = (eventType, userId, projectId, additionalData = {}) => {
  try {
    const sessionMinute = Math.floor(Date.now() / 60000);
    let cacheKey;
    
    switch (eventType) {
      case 'scan':
        cacheKey = `scan_${userId}_${projectId}_${sessionMinute}`;
        break;
      case 'videoView':
        cacheKey = `videoView_${userId}_${projectId}_${sessionMinute}`;
        break;
      case 'linkClick':
        cacheKey = `linkClick_${userId}_${projectId}_${additionalData.platform}_${sessionMinute}`;
        break;
      case 'ar-experience-start':
        cacheKey = `arStart_${userId}_${projectId}_${sessionMinute}`;
        break;
      default:
        cacheKey = `${eventType}_${userId}_${projectId}_${sessionMinute}`;
    }
    
    // Remove from both caches so it can be retried
    analyticsCache.delete(cacheKey);
    sessionStorage.removeItem(cacheKey);
    
    console.log(`🔄 Analytics event marked for retry: ${eventType} (${cacheKey})`);
  } catch (error) {
    console.error('Error in markAnalyticsFailed:', error);
  }
};

/**
 * Clear all analytics cache (useful for testing)
 */
export const clearAnalyticsCache = () => {
  analyticsCache.clear();
  // Clear sessionStorage keys related to analytics
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('scan_') || key.startsWith('videoView_') || key.startsWith('linkClick_') || key.startsWith('arStart_')) {
      sessionStorage.removeItem(key);
    }
  });
  console.log('🧹 Analytics cache cleared');
};

