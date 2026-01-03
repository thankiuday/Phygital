/**
 * Logo Configuration
 * Manages logo URL from environment variables with fallback support
 * 
 * The logo is stored in Cloudinary for reliable CDN delivery
 * This ensures the logo works on all hosting platforms including Hostinger VPS
 */

/**
 * Get the logo URL from environment variable
 * Falls back to null if not set (component will use icon-based logo)
 * 
 * @returns {string|null} Logo URL or null if not configured
 */
export const getLogoUrl = () => {
  return import.meta.env.VITE_LOGO_URL || null
}

/**
 * Check if logo URL is configured
 * 
 * @returns {boolean} True if logo URL is set
 */
export const isLogoUrlConfigured = () => {
  return !!import.meta.env.VITE_LOGO_URL
}

/**
 * Default logo URL (Cloudinary)
 * This is the production logo URL
 * Can be overridden by VITE_LOGO_URL environment variable
 */
export const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/dpfinjv0s/image/upload/v1767449368/PhygitalLogo_vwk9lg.png'

/**
 * Get logo URL with fallback to default
 * 
 * @returns {string} Logo URL (environment variable or default)
 */
export const getLogoUrlWithFallback = () => {
  return getLogoUrl() || DEFAULT_LOGO_URL
}

