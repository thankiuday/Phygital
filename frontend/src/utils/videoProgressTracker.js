/**
 * Video Progress Tracker Utility
 * Tracks video play status and progress milestones (25%, 50%, 75%, 100%)
 */

/**
 * Track video progress milestones
 * @param {HTMLVideoElement} videoElement - Video element to track
 * @param {string} userId - User ID
 * @param {string} projectId - Project ID
 * @param {Function} onMilestone - Callback when milestone is reached
 */
export const trackVideoProgress = (videoElement, userId, projectId, onMilestone) => {
  if (!videoElement) {
    console.warn('Video element not provided for tracking')
    return null
  }

  const milestones = [25, 50, 75, 100]
  const trackedMilestones = new Set()
  let hasPlayed = false
  let hasCompleted = false

  const handlePlay = () => {
    if (!hasPlayed) {
      hasPlayed = true
      console.log('▶️ Video started playing')
      // Track initial play if needed
      if (onMilestone) {
        onMilestone('play', 0, videoElement.duration || 0)
      }
    }
  }

  const handleTimeUpdate = () => {
    if (!videoElement.duration || videoElement.duration === 0) return

    const progress = (videoElement.currentTime / videoElement.duration) * 100

    // Track milestones
    milestones.forEach(milestone => {
      if (progress >= milestone && !trackedMilestones.has(milestone)) {
        trackedMilestones.add(milestone)
        console.log(`📊 Video milestone reached: ${milestone}%`)
        if (onMilestone) {
          onMilestone('milestone', milestone, progress, videoElement.duration)
        }
      }
    })

    // Track completion (100%)
    if (progress >= 99.5 && !hasCompleted) {
      hasCompleted = true
      console.log('✅ Video completed')
      if (onMilestone) {
        onMilestone('complete', 100, progress, videoElement.duration)
      }
    }
  }

  const handleEnded = () => {
    if (!hasCompleted) {
      hasCompleted = true
      console.log('✅ Video ended')
      if (onMilestone) {
        onMilestone('complete', 100, 100, videoElement.duration)
      }
    }
  }

  // Add event listeners
  videoElement.addEventListener('play', handlePlay)
  videoElement.addEventListener('timeupdate', handleTimeUpdate)
  videoElement.addEventListener('ended', handleEnded)

  // Return cleanup function
  return () => {
    videoElement.removeEventListener('play', handlePlay)
    videoElement.removeEventListener('timeupdate', handleTimeUpdate)
    videoElement.removeEventListener('ended', handleEnded)
  }
}

/**
 * Get video play status
 * @param {HTMLVideoElement} videoElement - Video element
 */
export const getVideoPlayStatus = (videoElement) => {
  if (!videoElement) return { played: false, progress: 0, duration: 0 }
  
  return {
    played: !videoElement.paused && videoElement.currentTime > 0,
    progress: videoElement.duration > 0 
      ? (videoElement.currentTime / videoElement.duration) * 100 
      : 0,
    duration: videoElement.duration || 0,
    currentTime: videoElement.currentTime || 0
  }
}




