/**
 * Time Tracking Utility
 * Tracks time spent on landing pages using visibility API and sendBeacon
 */

import { getCompleteLocation } from './geolocation'

let pageEntryTime = null
let totalTimeSpent = 0
let isTracking = false
let visibilityStartTime = null
let trackingCallbacks = []
let cachedLocation = null
let periodicUpdateInterval = null
let lastSentTime = 0

/**
 * Initialize time tracking for a page
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @param {Function} onTimeUpdate - Optional callback when time is updated
 */
export const startTimeTracking = async (userId, projectId, onTimeUpdate = null) => {
  if (isTracking) {
    console.warn('Time tracking already started')
    return
  }

  pageEntryTime = Date.now()
  visibilityStartTime = Date.now()
  totalTimeSpent = 0
  isTracking = true

  // Capture location when tracking starts (non-blocking)
  if (!cachedLocation) {
    try {
      console.log('📍 Capturing location for time tracking...')
      cachedLocation = await getCompleteLocation()
      if (cachedLocation) {
        console.log('✅ Location captured for time tracking:', cachedLocation)
      }
    } catch (locationError) {
      console.log('ℹ️ Location not available for time tracking:', locationError.message)
    }
  }

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
      timeSpent: finalTimeSpent,
      scanLocation: cachedLocation ? {
        latitude: cachedLocation.latitude,
        longitude: cachedLocation.longitude,
        village: cachedLocation.village,
        city: cachedLocation.city,
        state: cachedLocation.state,
        country: cachedLocation.country
      } : null
    })
    
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: 'application/json' })
      navigator.sendBeacon(`${apiUrl}/analytics/page-view-duration`, blob)
      console.log('📊 Time spent sent via sendBeacon:', finalTimeSpent, 'seconds', cachedLocation ? 'with location' : 'without location')
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

  // Send periodic updates every 30 seconds to ensure data is saved
  const sendPeriodicUpdate = async () => {
    if (!isTracking) return
    
    if (visibilityStartTime) {
      totalTimeSpent += Math.floor((Date.now() - visibilityStartTime) / 1000)
      visibilityStartTime = Date.now()
    }
    
    const currentTimeSpent = totalTimeSpent || Math.floor((Date.now() - pageEntryTime) / 1000)
    
    // Only send if at least 30 seconds have passed since last send
    if (currentTimeSpent - lastSentTime >= 30) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
        await fetch(`${apiUrl}/analytics/page-view-duration`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            projectId,
            timeSpent: currentTimeSpent,
            scanLocation: cachedLocation ? {
              latitude: cachedLocation.latitude,
              longitude: cachedLocation.longitude,
              village: cachedLocation.village,
              city: cachedLocation.city,
              state: cachedLocation.state,
              country: cachedLocation.country
            } : null
          }),
          keepalive: true
        })
        lastSentTime = currentTimeSpent
        console.log('📊 Periodic time update sent:', currentTimeSpent, 'seconds')
      } catch (error) {
        console.error('Failed to send periodic time update:', error)
      }
    }
  }

  // Send updates every 30 seconds
  periodicUpdateInterval = setInterval(sendPeriodicUpdate, 30000)

  // Store cleanup function
  window._timeTrackingCleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('pagehide', handlePageHide)
    if (periodicUpdateInterval) {
      clearInterval(periodicUpdateInterval)
      periodicUpdateInterval = null
    }
    isTracking = false
    trackingCallbacks = []
  }

  console.log('⏱️ Time tracking started with periodic updates')
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

  // Stop periodic updates
  if (periodicUpdateInterval) {
    clearInterval(periodicUpdateInterval)
    periodicUpdateInterval = null
  }

  // Cleanup event listeners
  if (window._timeTrackingCleanup) {
    window._timeTrackingCleanup()
  }

  // Send final time spent
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    await fetch(`${apiUrl}/analytics/page-view-duration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        projectId,
        timeSpent: finalTimeSpent,
        scanLocation: cachedLocation ? {
          latitude: cachedLocation.latitude,
          longitude: cachedLocation.longitude,
          village: cachedLocation.village,
          city: cachedLocation.city,
          state: cachedLocation.state,
          country: cachedLocation.country
        } : null
      })
    })
    console.log('📊 Time spent sent:', finalTimeSpent, 'seconds', cachedLocation ? 'with location' : 'without location')
  } catch (error) {
    console.error('Failed to send time spent:', error)
  }

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
        timeSpent: finalTimeSpent,
        scanLocation: cachedLocation ? {
          latitude: cachedLocation.latitude,
          longitude: cachedLocation.longitude,
          village: cachedLocation.village,
          city: cachedLocation.city,
          state: cachedLocation.state,
          country: cachedLocation.country
        } : null
      }),
      keepalive: true
    })
    console.log('📊 Final time spent sent:', finalTimeSpent, 'seconds', cachedLocation ? 'with location' : 'without location')
  } catch (error) {
    console.error('Failed to send final time spent:', error)
  }

  isTracking = false
  trackingCallbacks = []
  cachedLocation = null // Clear cached location
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


