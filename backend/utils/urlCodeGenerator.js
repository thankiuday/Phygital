/**
 * URL Code Generator Utility
 * Generates unique, short URL codes similar to Amazon/Flipkart style
 * Uses URL-safe characters and handles collisions gracefully
 */

const crypto = require('crypto');

// URL-safe character set (62 characters: a-z, A-Z, 0-9, -, _)
const URL_SAFE_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';

/**
 * Generate a random URL code of specified length
 * @param {number} length - Length of the code (default: 7)
 * @returns {string} Generated URL code
 */
function generateRandomCode(length = 7) {
  let code = '';
  const charLength = URL_SAFE_CHARS.length;
  
  // Use crypto for cryptographically secure random generation
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    code += URL_SAFE_CHARS[randomBytes[i] % charLength];
  }
  
  return code;
}

/**
 * Generate a unique URL code for a user
 * Checks database for uniqueness and handles collisions
 * @param {Object} UserModel - Mongoose User model
 * @param {number} length - Initial code length (default: 7, max: 8)
 * @param {number} maxAttempts - Maximum attempts to find unique code (default: 10)
 * @returns {Promise<string>} Unique URL code
 */
async function generateUniqueUserCode(UserModel, length = 7, maxAttempts = 10) {
  if (length > 8) {
    throw new Error('URL code length cannot exceed 8 characters');
  }
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const code = generateRandomCode(length);
    
    // Check if code already exists
    const existingUser = await UserModel.findOne({ urlCode: code });
    
    if (!existingUser) {
      return code;
    }
    
    attempts++;
    
    // If we've tried many times with current length, try with longer code
    if (attempts >= maxAttempts && length < 8) {
      return generateUniqueUserCode(UserModel, length + 1, maxAttempts);
    }
  }
  
  // If still no unique code, throw error (should be very rare)
  throw new Error(`Failed to generate unique URL code after ${maxAttempts} attempts`);
}

/**
 * Generate a unique URL code for a project within a user's projects
 * Checks if the code already exists in the user's projects
 * @param {Object} user - User document with projects array
 * @param {number} length - Initial code length (default: 7, max: 8)
 * @param {number} maxAttempts - Maximum attempts to find unique code (default: 10)
 * @returns {Promise<string>} Unique URL code for the project
 */
async function generateUniqueProjectCode(user, length = 7, maxAttempts = 10) {
  if (length > 8) {
    throw new Error('URL code length cannot exceed 8 characters');
  }
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const code = generateRandomCode(length);
    
    // Check if code already exists in user's projects
    const existingProject = user.projects?.find(p => p.urlCode === code);
    
    if (!existingProject) {
      return code;
    }
    
    attempts++;
    
    // If we've tried many times with current length, try with longer code
    if (attempts >= maxAttempts && length < 8) {
      return generateUniqueProjectCode(user, length + 1, maxAttempts);
    }
  }
  
  // If still no unique code, throw error (should be very rare)
  throw new Error(`Failed to generate unique project URL code after ${maxAttempts} attempts`);
}

/**
 * Validate URL code format
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidUrlCode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }
  
  // Must be 6-8 characters, alphanumeric with hyphens or underscores
  const urlCodeRegex = /^[a-zA-Z0-9_-]{6,8}$/;
  return urlCodeRegex.test(code);
}

module.exports = {
  generateRandomCode,
  generateUniqueUserCode,
  generateUniqueProjectCode,
  isValidUrlCode
};





