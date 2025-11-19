/**
 * URL Helper Utilities
 * Shared functions for normalizing frontend URLs and constructing QR code URLs
 */

/**
 * Get normalized frontend URL from environment variables
 * Handles various malformed URL patterns and ensures clean base URL
 * @returns {string} Normalized frontend URL (e.g., "https://phygital.zone")
 */
export const getFrontendUrl = () => {
  const DEFAULT_URL = 'https://phygital.zone';
  
  // Try VITE_FRONTEND_URL first
  let frontendUrl = import.meta.env.VITE_FRONTEND_URL;
  
  // Validate VITE_FRONTEND_URL - must contain a domain, not just "https" or protocol
  if (frontendUrl) {
    frontendUrl = frontendUrl.trim();
    // Reject if it's just a protocol or doesn't contain a valid domain
    if (frontendUrl === 'https' || frontendUrl === 'http' || 
        frontendUrl === 'https://' || frontendUrl === 'http://' ||
        !frontendUrl.includes('.') || frontendUrl.length < 10) {
      console.warn('⚠️ Invalid VITE_FRONTEND_URL detected:', frontendUrl, '- using fallback');
      frontendUrl = null;
    }
  }
  
  // If not set or invalid, try VITE_API_URL and remove /api suffix
  if (!frontendUrl && import.meta.env.VITE_API_URL) {
    frontendUrl = import.meta.env.VITE_API_URL.trim();
    // Validate VITE_API_URL as well
    if (frontendUrl === 'https' || frontendUrl === 'http' || 
        frontendUrl === 'https://' || frontendUrl === 'http://' ||
        !frontendUrl.includes('.') || frontendUrl.length < 10) {
      console.warn('⚠️ Invalid VITE_API_URL detected:', frontendUrl, '- using fallback');
      frontendUrl = null;
    }
  }
  
  // Fallback to window.location.origin if available and valid
  if (!frontendUrl && typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && origin !== 'null' && origin.includes('.')) {
      frontendUrl = origin;
    }
  }
  
  // Final fallback to default
  if (!frontendUrl) {
    console.warn('⚠️ No valid frontend URL found in environment variables, using default:', DEFAULT_URL);
    return DEFAULT_URL;
  }
  
  // Normalize the URL - aggressive cleaning
  frontendUrl = frontendUrl.trim();
  
  // Fix malformed URLs like "https:/.phygital.zone" -> "https://phygital.zone"
  // Handle various malformed protocol patterns
  frontendUrl = frontendUrl.replace(/^https:\/\./, 'https://');
  frontendUrl = frontendUrl.replace(/^http:\/\./, 'http://');
  frontendUrl = frontendUrl.replace(/^https:\./, 'https://');
  frontendUrl = frontendUrl.replace(/^http:\./, 'http://');
  frontendUrl = frontendUrl.replace(/^https:\//, 'https://');
  frontendUrl = frontendUrl.replace(/^http:\//, 'http://');
  
  // Remove /api from anywhere in the URL path (not just the end)
  // Split by /api and take the first part, then clean it up
  if (frontendUrl.includes('/api')) {
    const parts = frontendUrl.split('/api');
    frontendUrl = parts[0];
  }
  
  // Remove trailing slashes
  frontendUrl = frontendUrl.replace(/\/+$/, '');
  
  // Ensure URL starts with http:// or https://
  if (!frontendUrl.match(/^https?:\/\//)) {
    // If it doesn't start with protocol, add https://
    frontendUrl = `https://${frontendUrl}`;
  }
  
  // Final cleanup: remove any remaining /api
  frontendUrl = frontendUrl.replace(/\/api\/?$/, '');
  
  // Ensure we have a clean domain (remove any path after domain)
  try {
    const urlObj = new URL(frontendUrl);
    // Validate that host is not empty and contains a domain
    if (!urlObj.host || !urlObj.host.includes('.')) {
      throw new Error('Invalid host in URL');
    }
    frontendUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    // If URL parsing fails, try to extract domain manually
    const match = frontendUrl.match(/^(https?:\/\/[^\/\s]+)/);
    if (match && match[1].includes('.')) {
      frontendUrl = match[1];
    } else {
      // If all else fails, use default
      console.warn('⚠️ Failed to parse frontend URL:', frontendUrl, '- using default:', DEFAULT_URL);
      return DEFAULT_URL;
    }
  }
  
  // Final validation: ensure we have a valid domain
  if (!frontendUrl || !frontendUrl.includes('.') || frontendUrl.length < 10) {
    console.warn('⚠️ Final URL validation failed:', frontendUrl, '- using default:', DEFAULT_URL);
    return DEFAULT_URL;
  }
  
  return frontendUrl;
};

/**
 * Validate and construct QR code URL
 * @param {string} userId - User ID (must be user._id, not urlCode)
 * @param {string} projectId - Project ID
 * @returns {string} Valid QR code URL
 * @throws {Error} If userId or projectId is invalid
 */
export const constructQRCodeUrl = (userId, projectId) => {
  // Validate userId - must be user._id, not urlCode or username
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a valid string (user._id)');
  }
  
  // Validate projectId
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a valid string');
  }
  
  // Get normalized frontend URL
  const frontendUrl = getFrontendUrl();
  
  // Construct hash-based URL matching backend format: /#/ar/user/{userId}/project/{projectId}
  const qrCodeUrl = `${frontendUrl}/#/ar/user/${userId}/project/${projectId}`;
  
  // Validate the final URL
  try {
    // Check if URL is valid by creating a URL object (for validation only)
    // We can't use URL constructor with hash, so we validate the base URL
    const baseUrl = qrCodeUrl.split('#')[0];
    new URL(baseUrl);
    
    // Additional validation: ensure URL starts with http:// or https://
    if (!qrCodeUrl.match(/^https?:\/\//)) {
      throw new Error(`Invalid URL format: ${qrCodeUrl}`);
    }
    
    // Ensure no double slashes in path (except after protocol)
    if (qrCodeUrl.match(/https?:\/\/[^/]+\/\/+/)) {
      throw new Error(`URL contains double slashes: ${qrCodeUrl}`);
    }
    
    return qrCodeUrl;
  } catch (error) {
    throw new Error(`Invalid QR code URL constructed: ${qrCodeUrl}. Error: ${error.message}`);
  }
};

