/**
 * Campaign Name Generator
 * Generates human-readable campaign names for phygitalized campaigns
 */

import { getCampaignTypeDisplayName } from './campaignTypeNames';

/**
 * Generate a human-readable campaign name
 * @param {string} username - User's username
 * @param {string} campaignType - Type of campaign (e.g., 'qr-link', 'qr-links-video')
 * @param {Array} existingProjects - Optional array of existing projects to check for duplicates
 * @returns {string} Human-readable campaign name (unique)
 */
export const generateHumanReadableCampaignName = (username, campaignType, existingProjects = []) => {
  if (!username || !campaignType) {
    return 'My Campaign';
  }

  // Format username: capitalize first letter, lowercase the rest
  const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
  
  // Get display name for campaign type using the utility function
  const formattedType = getCampaignTypeDisplayName(campaignType);

  // Generate base name: "{Username}'s {Campaign Type} Campaign"
  const baseName = `${formattedUsername}'s ${formattedType} Campaign`;
  
  // Generate short hash for uniqueness (4-char random hex string)
  // This ensures uniqueness without long date/time strings
  const generateShortHash = () => {
    // Use timestamp (last 4 digits) + 2 random hex chars = 6 chars total
    // Or use pure random 4-char hex string for shorter name
    const randomHex = Math.random().toString(16).substring(2, 6).toUpperCase();
    return randomHex;
  };
  
  let shortHash = generateShortHash();
  let uniqueName = `${baseName}-${shortHash}`;
  
  // Check for duplicates and regenerate hash if needed
  if (existingProjects && existingProjects.length > 0) {
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop
    
    // Check if name already exists
    while (existingProjects.some(project => {
      const projectName = project.name || '';
      // Check exact match
      if (projectName === uniqueName) {
        return true;
      }
      // Check if it matches pattern with same hash: "Base Name-HASH"
      if (projectName.startsWith(baseName + '-') && projectName.match(new RegExp(`^${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[A-F0-9]{4}$`))) {
        return projectName === uniqueName;
      }
      return false;
    }) && attempts < maxAttempts) {
      attempts++;
      shortHash = generateShortHash();
      uniqueName = `${baseName}-${shortHash}`;
    }
    
    // If still not unique after max attempts, add counter as fallback
    if (attempts >= maxAttempts && existingProjects.some(p => (p.name || '') === uniqueName)) {
      let counter = 1;
      uniqueName = `${baseName}-${shortHash}-${counter}`;
      
      // Double-check if this name also exists
      while (existingProjects.some(p => (p.name || '') === uniqueName)) {
        counter++;
        uniqueName = `${baseName}-${shortHash}-${counter}`;
      }
    }
  }
  
  return uniqueName;
};

/**
 * Generate a campaign name with timestamp (legacy function for backward compatibility)
 * @param {string} username - User's username
 * @param {string} campaignType - Type of campaign
 * @returns {string} Campaign name with timestamp
 */
export const generateCampaignNameWithTimestamp = (username, campaignType) => {
  return generateHumanReadableCampaignName(username, campaignType);
};
