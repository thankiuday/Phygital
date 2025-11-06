/**
 * Device Detection Utilities
 * Detect mobile devices to restrict admin panel access
 */

/**
 * Check if the current device is a mobile device
 * @returns {boolean} true if mobile device, false otherwise
 */
export const isMobileDevice = () => {
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  
  // Mobile device patterns
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i
  
  // Check user agent
  if (mobileRegex.test(userAgent)) {
    return true
  }
  
  // Check screen width (secondary check)
  // Most mobile devices have max width of 768px in portrait mode
  if (window.innerWidth <= 768) {
    // Additional check: touch capability
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      return true
    }
  }
  
  return false
}

/**
 * Check if device is a tablet
 * @returns {boolean} true if tablet, false otherwise
 */
export const isTablet = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera
  const tabletRegex = /ipad|android(?!.*mobile)|tablet/i
  return tabletRegex.test(userAgent) || (window.innerWidth > 768 && window.innerWidth <= 1024 && 'ontouchstart' in window)
}

/**
 * Get device type
 * @returns {string} 'mobile' | 'tablet' | 'desktop'
 */
export const getDeviceType = () => {
  if (isTablet()) {
    return 'tablet'
  }
  if (isMobileDevice()) {
    return 'mobile'
  }
  return 'desktop'
}







