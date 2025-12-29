/**
 * Landing Page Analytics Utility
 * Tracks user interactions on landing pages
 */

import { analyticsAPI } from './api'
import { getCompleteLocation } from './geolocation'

/**
 * Track landing page view with location
 */
export const trackLandingPageView = async (userId, projectId) => {
  try {
    // Capture location for landing page view
    let locationData = null
    try {
      console.log('📍 Capturing location for landing page view...')
      locationData = await getCompleteLocation()
      if (locationData) {
        console.log('✅ Location captured for landing page:', locationData)
      }
    } catch (locationError) {
      console.log('ℹ️ Location not available for landing page view:', locationError.message)
    }

    // Track page view with location data
    await analyticsAPI.trackPageView(userId, projectId, locationData)
  } catch (error) {
    console.error('Failed to track page view:', error)
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
export const trackVideoPlay = async (userId, projectId, videoUrl) => {
  try {
    await analyticsAPI.trackVideoView(userId, 0, 0, projectId) // Initial play, progress 0
  } catch (error) {
    console.error('Failed to track video play:', error)
  }
}

/**
 * Track video progress
 */
export const trackVideoProgress = async (userId, projectId, progress, duration) => {
  try {
    await analyticsAPI.trackVideoView(userId, progress, duration, projectId)
  } catch (error) {
    console.error('Failed to track video progress:', error)
  }
}

/**
 * Track video completion
 */
export const trackVideoComplete = async (userId, projectId, duration) => {
  try {
    await analyticsAPI.trackVideoComplete(userId, projectId, duration)
  } catch (error) {
    console.error('Failed to track video completion:', error)
  }
}

/**
 * Track additional link click
 */
export const trackLinkClick = async (userId, projectId, linkLabel, linkUrl) => {
  try {
    await analyticsAPI.trackLinkClick(userId, linkLabel.toLowerCase(), linkUrl, projectId)
  } catch (error) {
    console.error('Failed to track link click:', error)
  }
}

/**
 * Track page view duration (time spent on page)
 */
export const trackPageViewDuration = async (userId, projectId, timeSpent) => {
  try {
    await analyticsAPI.trackPageViewDuration(userId, projectId, timeSpent)
  } catch (error) {
    console.error('Failed to track page view duration:', error)
  }
}

/**
 * Track video progress milestone (25%, 50%, 75%, 100%)
 */
export const trackVideoProgressMilestone = async (userId, projectId, milestone, progress, duration) => {
  try {
    await analyticsAPI.trackVideoProgressMilestone(userId, projectId, milestone, progress, duration)
  } catch (error) {
    console.error('Failed to track video progress milestone:', error)
  }
}

