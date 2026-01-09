/**
 * Landing Page Analytics Utility
 * Tracks user interactions on landing pages
 */

import { analyticsAPI } from './api'
import { getCompleteLocation } from './geolocation'
import { shouldTrackAnalytics, markAnalyticsFailed } from './analyticsDeduplication'

/**
 * Track QR scan for landing page (when user scans QR code and visits landing page)
 */
export const trackLandingPageScan = async (userId, projectId) => {
  try {
    // Check if we should track this scan (prevents duplicates)
    if (!shouldTrackAnalytics('scan', userId, projectId)) {
      console.log('⏭️ Scan already tracked for this session')
      return
    }

    // Capture location for scan event (non-blocking, silent failures)
    let locationData = null
    try {
      console.log('📍 Capturing location for landing page scan...')
      locationData = await getCompleteLocation()
      if (locationData) {
        console.log('✅ Location captured for scan:', locationData)
      }
    } catch (locationError) {
      // Silently fail - location is optional
      console.log('ℹ️ Location not available for scan:', locationError.message)
    }

    // Prepare scan data with location
    const scanData = {
      scanType: 'landing_page',
      platform: navigator.userAgent,
      source: 'phygitalized_landing_page',
      location: locationData
    }

    // Track scan event (silent failure - don't show errors to users)
    try {
      // Ensure projectId is a string (backend expects string)
      const projectIdString = projectId ? String(projectId) : null
      
      if (!userId || !projectIdString) {
        console.warn('⚠️ Scan tracking skipped: missing userId or projectId', { userId, projectId, projectIdString })
        return
      }
      
      const response = await analyticsAPI.trackScan(userId, scanData, projectIdString)
      console.log('✅ Landing page scan tracked:', { 
        userId, 
        projectId: projectIdString,
        response: response?.data,
        totalScans: response?.data?.data?.totalScans
      })
    } catch (trackError) {
      // Log detailed error for debugging but don't break user experience
      console.warn('⚠️ Analytics tracking failed (silent):', {
        message: trackError.message,
        response: trackError.response?.data,
        status: trackError.response?.status,
        userId,
        projectId
      })
      // Mark as failed so it can be retried later
      markAnalyticsFailed('scan', userId, projectId)
    }
  } catch (error) {
    // Silently handle all errors - analytics should never break the user experience
    console.warn('⚠️ Landing page scan tracking error (silent):', error.message)
    // Mark as failed so it can be retried
    markAnalyticsFailed('scan', userId, projectId)
  }
}

/**
 * Track landing page view with location
 */
export const trackLandingPageView = async (userId, projectId) => {
  try {
    // Capture location for landing page view (non-blocking, silent failures)
    let locationData = null
    try {
      console.log('📍 Capturing location for landing page view...')
      locationData = await getCompleteLocation()
      if (locationData) {
        console.log('✅ Location captured for landing page:', locationData)
      }
    } catch (locationError) {
      // Silently fail - location is optional
      console.log('ℹ️ Location not available for landing page view:', locationError.message)
    }

    // Track page view with location data (silent failure)
    try {
      // Ensure projectId is a string (backend expects string)
      const projectIdString = projectId ? String(projectId) : null
      if (!userId || !projectIdString) {
        console.warn('⚠️ Page view tracking skipped: missing userId or projectId')
        return
      }
      const response = await analyticsAPI.trackPageView(userId, projectIdString, locationData)
      console.log('✅ Landing page view tracked:', { 
        userId, 
        projectId: projectIdString,
        response: response?.data
      })
    } catch (trackError) {
      // Log detailed error for debugging but don't break user experience
      console.warn('⚠️ Page view tracking failed (silent):', {
        message: trackError.message,
        response: trackError.response?.data,
        status: trackError.response?.status,
        userId,
        projectId
      })
    }
  } catch (error) {
    // Silently handle all errors
    console.warn('⚠️ Landing page view tracking error (silent):', error.message)
  }
}

/**
 * Track social media link click
 */
export const trackSocialMediaClick = async (userId, projectId, platform, url) => {
  try {
    // Track as both link click and social media click
    await Promise.all([
      analyticsAPI.trackLinkClick(userId, platform, url, projectId),
      analyticsAPI.trackSocialMediaClick(userId, projectId, platform, url)
    ])
  } catch (error) {
    console.error('Failed to track social media click:', error)
  }
}

/**
 * Track contact number click
 */
export const trackContactClick = async (userId, projectId, phoneNumber, type = 'contactNumber') => {
  try {
    // Clean phone number: remove spaces, dashes, parentheses, and keep only digits and + sign
    const cleanPhoneNumber = String(phoneNumber).replace(/[\s\-\(\)]/g, '')
    const url = `tel:${cleanPhoneNumber}`
    // Track as both link click and social media click (since it's a contact interaction)
    await Promise.all([
      analyticsAPI.trackLinkClick(userId, type, url, projectId),
      analyticsAPI.trackSocialMediaClick(userId, projectId, type, url)
    ])
  } catch (error) {
    console.error('Failed to track contact click:', error)
  }
}

/**
 * Track WhatsApp click
 */
export const trackWhatsAppClick = async (userId, projectId, phoneNumber) => {
  try {
    const url = `https://wa.me/${phoneNumber.replace(/\D/g, '')}`
    // Track as both link click and social media click (since WhatsApp is a social platform)
    await Promise.all([
      analyticsAPI.trackLinkClick(userId, 'whatsappNumber', url, projectId),
      analyticsAPI.trackSocialMediaClick(userId, projectId, 'whatsappNumber', url)
    ])
  } catch (error) {
    console.error('Failed to track WhatsApp click:', error)
  }
}

/**
 * Track document view/download
 */
export const trackDocumentView = async (userId, projectId, documentUrl, action = 'view') => {
  try {
    await analyticsAPI.trackDocumentView(userId, projectId, documentUrl, action)
  } catch (error) {
    console.error('Failed to track document view:', error)
  }
}

/**
 * Track video play
 */
export const trackVideoPlay = async (userId, projectId, videoUrl, videoIndex = null, videoId = null) => {
  try {
    if (!userId || !projectId) {
      console.warn('⚠️ Video play tracking skipped: missing userId or projectId')
      return
    }
    const projectIdString = projectId ? String(projectId) : null
    await analyticsAPI.trackVideoView(userId, 0, 0, projectIdString, videoIndex, videoId, videoUrl)
  } catch (error) {
    // Silently handle analytics errors - don't break user experience
    console.warn('⚠️ Video play tracking error (silent):', error.message)
  }
}

/**
 * Track video progress
 */
export const trackVideoProgress = async (userId, projectId, progress, duration) => {
  try {
    if (!userId || !projectId) {
      console.warn('⚠️ Video progress tracking skipped: missing userId or projectId')
      return
    }
    const projectIdString = projectId ? String(projectId) : null
    const validProgress = progress && !isNaN(parseFloat(progress)) ? parseFloat(progress) : 0
    const validDuration = duration && !isNaN(parseFloat(duration)) ? parseFloat(duration) : 0
    await analyticsAPI.trackVideoView(userId, validProgress, validDuration, projectIdString)
  } catch (error) {
    // Silently handle analytics errors - don't break user experience
    console.warn('⚠️ Video progress tracking error (silent):', error.message)
  }
}

/**
 * Track video completion
 */
export const trackVideoComplete = async (userId, projectId, duration, videoIndex = null, videoId = null, videoUrl = null) => {
  try {
    // Ensure projectId is a string
    const projectIdString = projectId ? String(projectId) : null
    
    if (!userId || !projectIdString) {
      console.warn('⚠️ Video complete tracking skipped: missing userId or projectId', { userId, projectId, projectIdString })
      return
    }
    
    // Ensure duration is a valid number (backend requires numeric duration)
    // If duration is invalid, use 0 as fallback
    let validDuration = 0
    if (duration != null && duration !== undefined) {
      const parsed = parseFloat(duration)
      if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
        validDuration = parsed
      }
    }
    
    // Ensure videoIndex is a valid non-negative integer or undefined (backend validation requires integer if provided)
    let validVideoIndex = undefined
    if (videoIndex != null && videoIndex !== undefined) {
      const parsed = parseInt(videoIndex)
      if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
        validVideoIndex = parsed
      }
    }
    // If videoIndex is null or invalid, don't send it (backend accepts optional videoIndex)
    
    // Log what we're sending for debugging
    console.log('📹 Tracking video complete:', { 
      userId, 
      projectId: projectIdString, 
      duration: validDuration, 
      videoIndex: validVideoIndex, 
      videoId, 
      videoUrl, 
      originalDuration: duration,
      originalVideoIndex: videoIndex,
      durationType: typeof duration,
      isValid: !isNaN(validDuration) && isFinite(validDuration)
    })
    
    await analyticsAPI.trackVideoComplete(userId, projectIdString, validDuration, validVideoIndex, videoId, videoUrl)
    console.log('✅ Video complete tracked:', { userId, projectId: projectIdString, duration: validDuration, videoIndex: validVideoIndex })
  } catch (error) {
    // Log detailed error for debugging but don't break user experience
    console.warn('⚠️ Video complete tracking error (silent):', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      userId,
      projectId,
      duration
    })
  }
}

/**
 * Track additional link click
 */
export const trackLinkClick = async (userId, projectId, linkLabel, linkUrl) => {
  try {
    if (!userId || !projectId) {
      console.warn('⚠️ Link click tracking skipped: missing userId or projectId')
      return
    }
    const projectIdString = projectId ? String(projectId) : null
    await analyticsAPI.trackLinkClick(userId, linkLabel.toLowerCase(), linkUrl, projectIdString)
  } catch (error) {
    // Silently handle analytics errors - don't break user experience
    console.warn('⚠️ Link click tracking error (silent):', error.message)
  }
}

/**
 * Track page view duration (time spent on page)
 */
export const trackPageViewDuration = async (userId, projectId, timeSpent) => {
  try {
    if (!userId || !projectId) {
      console.warn('⚠️ Page view duration tracking skipped: missing userId or projectId')
      return
    }
    const projectIdString = projectId ? String(projectId) : null
    const validTimeSpent = timeSpent && !isNaN(parseFloat(timeSpent)) ? parseFloat(timeSpent) : 0
    await analyticsAPI.trackPageViewDuration(userId, projectIdString, validTimeSpent)
  } catch (error) {
    // Silently handle analytics errors - don't break user experience
    console.warn('⚠️ Page view duration tracking error (silent):', error.message)
  }
}

/**
 * Track video progress milestone (25%, 50%, 75%, 100%)
 */
export const trackVideoProgressMilestone = async (userId, projectId, milestone, progress, duration, videoIndex = null, videoId = null, videoUrl = null) => {
  try {
    if (!userId || !projectId) {
      console.warn('⚠️ Video milestone tracking skipped: missing userId or projectId')
      return
    }
    const projectIdString = projectId ? String(projectId) : null
    const validProgress = progress && !isNaN(parseFloat(progress)) ? parseFloat(progress) : 0
    const validDuration = duration && !isNaN(parseFloat(duration)) ? parseFloat(duration) : 0
    
    // Ensure videoIndex is a valid non-negative integer or undefined
    let validVideoIndex = undefined
    if (videoIndex != null && videoIndex !== undefined) {
      const parsed = parseInt(videoIndex)
      if (!isNaN(parsed) && isFinite(parsed) && parsed >= 0) {
        validVideoIndex = parsed
      }
    }
    
    await analyticsAPI.trackVideoProgressMilestone(userId, projectIdString, milestone, validProgress, validDuration, validVideoIndex, videoId, videoUrl)
  } catch (error) {
    // Silently handle analytics errors - don't break user experience
    console.warn('⚠️ Video milestone tracking error (silent):', error.message)
  }
}

