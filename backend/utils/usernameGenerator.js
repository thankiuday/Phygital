/**
 * Username Generator Utility
 * Generates unique usernames from email addresses
 * Handles duplicates by appending numbers
 * Uses lazy loading to avoid circular dependency with User model
 */

const mongoose = require('mongoose');

/**
 * Get User model (lazy loading to avoid circular dependency)
 * @returns {Model} User model
 */
function getUserModel() {
  // Use mongoose.model() to get the model dynamically
  // This avoids circular dependency issues
  try {
    return mongoose.model('User');
  } catch (error) {
    // If model not registered yet, require it
    return require('../models/User');
  }
}

/**
 * Generate a username from an email address
 * @param {string} email - Email address to generate username from
 * @returns {Promise<string>} Generated unique username
 */
async function generateUsernameFromEmail(email) {
  // Extract local part of email (before @)
  let baseUsername = email.split('@')[0];
  
  // Replace special characters with underscores
  baseUsername = baseUsername.replace(/[^a-zA-Z0-9_]/g, '_');
  
  // Remove leading/trailing underscores
  baseUsername = baseUsername.replace(/^_+|_+$/g, '');
  
  // Ensure minimum length of 3 characters
  if (baseUsername.length < 3) {
    baseUsername = baseUsername + '_user';
  }
  
  // Truncate to 30 characters (max username length)
  if (baseUsername.length > 30) {
    baseUsername = baseUsername.substring(0, 30);
    // Remove trailing underscore if truncated
    baseUsername = baseUsername.replace(/_+$/, '');
  }
  
  // Ensure it starts with a letter or number (not underscore)
  if (baseUsername.startsWith('_')) {
    baseUsername = 'user_' + baseUsername.substring(1);
  }
  
  // Get User model (lazy load to avoid circular dependency)
  const User = getUserModel();
  
  // Check for uniqueness and append number if needed
  let username = baseUsername;
  let counter = 1;
  
  while (true) {
    const existingUser = await User.findOne({ username });
    
    if (!existingUser) {
      return username;
    }
    
    // If username exists, append number
    const suffix = `_${counter}`;
    const maxLength = 30 - suffix.length;
    const truncatedBase = baseUsername.substring(0, maxLength);
    username = truncatedBase + suffix;
    counter++;
    
    // Safety check to prevent infinite loop
    if (counter > 1000) {
      // Fallback: use timestamp
      const timestamp = Date.now().toString().slice(-6);
      username = baseUsername.substring(0, 24) + '_' + timestamp;
      const finalCheck = await User.findOne({ username });
      if (!finalCheck) {
        return username;
      }
      // Last resort: add random suffix
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      return baseUsername.substring(0, 22) + '_' + randomSuffix;
    }
  }
}

module.exports = {
  generateUsernameFromEmail
};
