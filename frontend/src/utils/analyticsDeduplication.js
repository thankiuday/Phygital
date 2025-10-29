/**
 * Analytics Deduplication Utility - ROBUST VERSION
 * Prevents double-counting using unique event IDs and persistent storage
 * Features:
 * - Unique event IDs for each analytics event
 * - localStorage for persistent tracking across refreshes
 * - Time-based expiration
 * - Backend validation support
 */

// Global cache that persists for the entire session
const analyticsCache = new Map();

// Generate unique event ID
const generateEventId = () => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Load existing cache from localStorage on initialization
const loadCacheFromLocalStorage = () => {
  try {
    const stored = localStorage.getItem('phygital_analytics_cache');
    if (stored) {
      const data = JSON.parse(stored);
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000; // 1 hour expiration
      
      // Load non-expired entries
      Object.entries(data).forEach(([key, value]) => {
        if (value.timestamp > oneHourAgo) {
          analyticsCache.set(key, value);
        }
      });
      
      console.log(`🔄 Loaded ${analyticsCache.size} analytics cache entries from localStorage`);
    }
  } catch (error) {
    console.error('Failed to load analytics cache from localStorage:', error);
  }
};

// Save cache to localStorage
const saveCacheToLocalStorage = () => {
  try {
    const data = {};
    analyticsCache.forEach((value, key) => {
      data[key] = value;
    });
    localStorage.setItem('phygital_analytics_cache', JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save analytics cache to localStorage:', error);
  }
};

// Initialize cache from localStorage
loadCacheFromLocalStorage();

// Clean up old entries periodically (every 5 minutes) and save to localStorage
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  let cleaned = 0;
  
  for (const [key, value] of analyticsCache.entries()) {
    if (value.timestamp < oneHourAgo) {
      analyticsCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} old analytics cache entries`);
    saveCacheToLocalStorage();
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
    const now = Date.now();
    
    // Define time windows for different event types
    const timeWindows = {
      'scan': 600000,              // 10 minutes - scans are rare, prevent all duplicates
      'videoView': 180000,         // 3 minutes - video watching
      'linkClick': 30000,          // 30 seconds - allow multiple link clicks
      'ar-experience-start': 600000, // 10 minutes - AR session start
      'default': 60000             // 1 minute default
    };
    
    const timeWindow = timeWindows[eventType] || timeWindows.default;
    
    // Create unique cache key
    let cacheKey;
    switch (eventType) {
      case 'scan':
        cacheKey = `scan_${userId}_${projectId}`;
        break;
      case 'videoView':
        cacheKey = `videoView_${userId}_${projectId}`;
        break;
      case 'linkClick':
        cacheKey = `linkClick_${userId}_${projectId}_${additionalData.platform || 'unknown'}`;
        break;
      case 'ar-experience-start':
        cacheKey = `arStart_${userId}_${projectId}`;
        break;
      default:
        cacheKey = `${eventType}_${userId}_${projectId}`;
    }
    
    // Check cache for recent tracking
    const cachedData = analyticsCache.get(cacheKey);
    
    if (cachedData) {
      const timeSinceLastTrack = now - cachedData.timestamp;
      
      if (timeSinceLastTrack < timeWindow) {
        console.log(`🚫 Analytics BLOCKED: ${eventType} - Last tracked ${(timeSinceLastTrack / 1000).toFixed(1)}s ago (eventId: ${cachedData.eventId})`);
        return false;
      }
    }
    
    // Generate unique event ID for this tracking
    const eventId = generateEventId();
    
    // Mark as tracked with event ID and timestamp
    const trackingData = {
      eventId,
      timestamp: now,
      eventType,
      userId,
      projectId
    };
    
    analyticsCache.set(cacheKey, trackingData);
    
    // Persist to localStorage
    saveCacheToLocalStorage();
    
    // Store event ID in additionalData for backend validation
    if (additionalData) {
      additionalData.eventId = eventId;
    }
    
    console.log(`✅ Analytics ALLOWED: ${eventType} (eventId: ${eventId}, cacheKey: ${cacheKey})`);
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
    let cacheKey;
    
    switch (eventType) {
      case 'scan':
        cacheKey = `scan_${userId}_${projectId}`;
        break;
      case 'videoView':
        cacheKey = `videoView_${userId}_${projectId}`;
        break;
      case 'linkClick':
        cacheKey = `linkClick_${userId}_${projectId}_${additionalData.platform || 'unknown'}`;
        break;
      case 'ar-experience-start':
        cacheKey = `arStart_${userId}_${projectId}`;
        break;
      default:
        cacheKey = `${eventType}_${userId}_${projectId}`;
    }
    
    const cachedData = analyticsCache.get(cacheKey);
    const eventId = cachedData?.eventId || 'unknown';
    
    // Remove from cache so it can be retried
    analyticsCache.delete(cacheKey);
    
    // Update localStorage
    saveCacheToLocalStorage();
    
    console.log(`🔄 Analytics event marked for retry: ${eventType} (eventId: ${eventId}, cacheKey: ${cacheKey})`);
  } catch (error) {
    console.error('Error in markAnalyticsFailed:', error);
  }
};

/**
 * Clear all analytics cache (useful for testing)
 */
export const clearAnalyticsCache = () => {
  analyticsCache.clear();
  localStorage.removeItem('phygital_analytics_cache');
  console.log('🧹 Analytics cache cleared from memory and localStorage');
};

/**
 * Get analytics cache statistics
 */
export const getAnalyticsCacheStats = () => {
  const stats = {
    totalEntries: analyticsCache.size,
    entries: []
  };
  
  const now = Date.now();
  analyticsCache.forEach((value, key) => {
    stats.entries.push({
      key,
      eventId: value.eventId,
      eventType: value.eventType,
      age: Math.floor((now - value.timestamp) / 1000), // seconds
      timestamp: new Date(value.timestamp).toISOString()
    });
  });
  
  return stats;
};

