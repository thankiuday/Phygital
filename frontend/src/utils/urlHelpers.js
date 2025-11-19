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
  // Try VITE_FRONTEND_URL first
  let frontendUrl = import.meta.env.VITE_FRONTEND_URL;
  
  // If not set, try VITE_API_URL and remove /api suffix
  if (!frontendUrl && import.meta.env.VITE_API_URL) {
    frontendUrl = import.meta.env.VITE_API_URL;
  }
  
  // Fallback to window.location.origin
  if (!frontendUrl) {
    frontendUrl = window.location.origin || 'https://phygital.zone';
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
    frontendUrl = `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    // If URL parsing fails, try to extract domain manually
    const match = frontendUrl.match(/^(https?:\/\/[^\/]+)/);
    if (match) {
      frontendUrl = match[1];
    }
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

