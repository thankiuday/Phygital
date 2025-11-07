/**
 * Maintenance Mode Configuration
 * 
 * To enable maintenance mode:
 * 1. Set MAINTENANCE_MODE to true
 * 2. Optionally update the expected return time
 * 3. Update the maintenance message and tasks if needed
 */

export const MAINTENANCE_CONFIG = {
  // Set to true to enable maintenance mode
  ENABLED: true,
  
  // Expected return time (ISO 8601 format)
  // Example: new Date('2024-12-31T15:00:00').toISOString()
  EXPECTED_RETURN: null,
  
  // Custom message (optional)
  MESSAGE: "We're currently performing scheduled maintenance to improve your experience. We'll be back online shortly!",
  
  // What you're working on (optional array of tasks)
  TASKS: [
    "Upgrading server infrastructure for better performance",
    "Implementing new features and improvements",
    "Enhancing security and reliability",
    "Optimizing database for faster response times"
  ],
  
  // Contact email for urgent matters
  CONTACT_EMAIL: "hello@phygital.zone",
  
  // Contact phone number
  CONTACT_PHONE: "(704) 966-7158",
  
  // Social media links
  SOCIAL_LINKS: {
    twitter: null,
    linkedin: null
  }
}

/**
 * Check if maintenance mode is enabled
 * Can also check environment variable
 */
export const isMaintenanceModeEnabled = () => {
  // Check environment variable first (for production)
  if (import.meta.env.VITE_MAINTENANCE_MODE === 'true') {
    return true
  }
  
  // Then check config
  return MAINTENANCE_CONFIG.ENABLED
}

/**
 * Get maintenance configuration
 */
export const getMaintenanceConfig = () => {
  return {
    ...MAINTENANCE_CONFIG,
    // Calculate expected return time if not set
    expectedReturn: MAINTENANCE_CONFIG.EXPECTED_RETURN 
      ? new Date(MAINTENANCE_CONFIG.EXPECTED_RETURN)
      : new Date(Date.now() + 2 * 60 * 60 * 1000) // Default: 2 hours from now
  }
}

