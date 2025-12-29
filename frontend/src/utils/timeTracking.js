/**
 * Time Tracking Utility
 * Tracks time spent on landing pages using visibility API and sendBeacon
 */

let pageEntryTime = null
let totalTimeSpent = 0
let isTracking = false
let visibilityStartTime = null
let trackingCallbacks = []

/**
 * Initialize time tracking for a page
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @param {Function} onTimeUpdate - Optional callback when time is updated
 */
export const startTimeTracking = (userId, projectId, onTimeUpdate = null) => {
  if (isTracking) {
    console.warn('Time tracking already started')
    return
  }

  pageEntryTime = Date.now()
  visibilityStartTime = Date.now()
  totalTimeSpent = 0
  isTracking = true

  if (onTimeUpdate) {
    trackingCallbacks.push(onTimeUpdate)
  }

  // Track visibility changes (tab switch, minimize, etc.)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Page is hidden - pause tracking
      if (visibilityStartTime) {
        totalTimeSpent += Math.floor((Date.now() - visibilityStartTime) / 1000)
        visibilityStartTime = null
      }
    } else {
      // Page is visible - resume tracking
      visibilityStartTime = Date.now()
    }
  }

  // Send time on page unload
  const handleBeforeUnload = () => {
    if (visibilityStartTime) {
      totalTimeSpent += Math.floor((Date.now() - visibilityStartTime) / 1000)
    }
    
    const finalTimeSpent = totalTimeSpent || Math.floor((Date.now() - pageEntryTime) / 1000)
    
    // Use sendBeacon for reliable delivery even if page is closing
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const data = JSON.stringify({
      userId,
      projectId,
      timeSpent: finalTimeSpent
    })
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon(`${apiUrl}/analytics/page-view-duration`, data)
      console.log('📊 Time spent sent via sendBeacon:', finalTimeSpent, 'seconds')
    } else {
      // Fallback for browsers without sendBeacon
      fetch(`${apiUrl}/analytics/page-view-duration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true
      }).catch(err => console.error('Failed to send time spent:', err))
    }
  }

  // Handle pagehide (for mobile browsers)
  const handlePageHide = () => {
    handleBeforeUnload()
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('pagehide', handlePageHide)

  // Store cleanup function
  window._timeTrackingCleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('pagehide', handlePageHide)
    isTracking = false
    trackingCallbacks = []
  }

  console.log('⏱️ Time tracking started')
}

/**
 * Stop time tracking and send final time
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 */
export const stopTimeTracking = async (userId, projectId) => {
  if (!isTracking) return

  if (visibilityStartTime) {
    totalTimeSpent += Math.floor((Date.now() - visibilityStartTime) / 1000)
    visibilityStartTime = null
  }

  const finalTimeSpent = totalTimeSpent || Math.floor((Date.now() - pageEntryTime) / 1000)

  // Cleanup event listeners
  if (window._timeTrackingCleanup) {
    window._timeTrackingCleanup()
  }

  // Send time spent
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    await fetch(`${apiUrl}/analytics/page-view-duration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        projectId,
        timeSpent: finalTimeSpent
      })
    })
    console.log('📊 Time spent sent:', finalTimeSpent, 'seconds')
  } catch (error) {
    console.error('Failed to send time spent:', error)
  }

  isTracking = false
  trackingCallbacks = []
}

/**
 * Get current time spent (for display purposes)
 */
export const getCurrentTimeSpent = () => {
  if (!isTracking) return 0
  
  let currentTotal = totalTimeSpent
  if (visibilityStartTime && !document.hidden) {
    currentTotal += Math.floor((Date.now() - visibilityStartTime) / 1000)
  }
  
  return currentTotal
}


