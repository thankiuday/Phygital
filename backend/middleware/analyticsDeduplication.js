/**
 * Analytics Deduplication Middleware
 * Prevents duplicate analytics tracking on the backend
 * Uses in-memory cache to track recent requests
 */

// In-memory cache for tracking recent analytics requests
// Key format: `${eventType}_${userId}_${projectId}_${minute}`
const analyticsCache = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, timestamp] of analyticsCache.entries()) {
    if (timestamp < fiveMinutesAgo) {
      analyticsCache.delete(key);
      console.log(`🧹 Cleaned up old analytics cache entry: ${key}`);
    }
  }
}, 5 * 60 * 1000);

/**
 * Middleware to prevent duplicate analytics tracking
 * Checks if the same event has been tracked recently (within 1 minute)
 */
const preventDuplicateAnalytics = (eventType) => {
  return (req, res, next) => {
    try {
      const { userId, projectId } = req.body;
      
      // Create a unique cache key based on event type and time window (1 minute)
      const currentMinute = Math.floor(Date.now() / 60000);
      let cacheKey;
      
      if (eventType === 'linkClick') {
        // For link clicks, include linkType to allow multiple different links
        const { linkType } = req.body;
        cacheKey = `${eventType}_${userId}_${projectId || 'none'}_${linkType}_${currentMinute}`;
      } else {
        cacheKey = `${eventType}_${userId}_${projectId || 'none'}_${currentMinute}`;
      }
      
      // Check if this exact event was recently tracked
      if (analyticsCache.has(cacheKey)) {
        const cachedTime = analyticsCache.get(cacheKey);
        const timeSinceCache = Date.now() - cachedTime;
        
        console.log(`⚠️ DUPLICATE ${eventType} request detected and blocked:`, {
          cacheKey,
          timeSinceCache: `${timeSinceCache}ms`,
          userId,
          projectId
        });
        
        // Return success response without processing
        // This prevents the client from retrying
        return res.status(200).json({
          status: 'success',
          message: `${eventType} already tracked (duplicate prevented)`,
          duplicate: true,
          data: {}
        });
      }
      
      // Mark this event as tracked BEFORE processing
      // This prevents race conditions if two identical requests arrive simultaneously
      analyticsCache.set(cacheKey, Date.now());
      
      console.log(`✅ ${eventType} request allowed:`, {
        cacheKey,
        userId,
        projectId
      });
      
      // Continue to the actual route handler
      next();
      
    } catch (error) {
      console.error('Error in analyticsDeduplication middleware:', error);
      // If there's an error in deduplication, allow the request through
      // Better to potentially double-count than to lose data
      next();
    }
  };
};

/**
 * Clear the analytics cache (useful for testing)
 */
const clearAnalyticsCache = () => {
  analyticsCache.clear();
  console.log('🧹 Analytics cache cleared');
};

/**
 * Get cache statistics (useful for monitoring)
 */
const getCacheStats = () => {
  return {
    size: analyticsCache.size,
    entries: Array.from(analyticsCache.entries()).map(([key, timestamp]) => ({
      key,
      timestamp,
      age: Date.now() - timestamp
    }))
  };
};

module.exports = {
  preventDuplicateAnalytics,
  clearAnalyticsCache,
  getCacheStats
};

