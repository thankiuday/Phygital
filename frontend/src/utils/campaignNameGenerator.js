/**
 * Campaign Name Generator
 * Generates human-readable campaign names for phygitalized campaigns
 */

/**
 * Generate a human-readable campaign name
 * @param {string} username - User's username
 * @param {string} campaignType - Type of campaign (e.g., 'QR Link', 'QR Links Video')
 * @param {Array} existingProjects - Optional array of existing projects to check for duplicates
 * @returns {string} Human-readable campaign name (unique)
 */
export const generateHumanReadableCampaignName = (username, campaignType, existingProjects = []) => {
  if (!username || !campaignType) {
    return 'My Campaign';
  }

  // Format username: capitalize first letter, lowercase the rest
  const formattedUsername = username.charAt(0).toUpperCase() + username.slice(1).toLowerCase();
  
  // Format campaign type: remove 'QR' prefix if present, capitalize properly
  let formattedType = campaignType.trim();
  if (formattedType.startsWith('QR ')) {
    formattedType = formattedType.substring(3); // Remove 'QR ' prefix
  }
  
  // Capitalize first letter of each word, but preserve acronyms (all caps)
  formattedType = formattedType
    .split(' ')
    .map(word => {
      // If word is all uppercase (acronym), keep it as is
      if (word === word.toUpperCase() && word.length > 1) {
        return word;
      }
      // Otherwise capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  // Generate base name: "{Username}'s {Campaign Type} Campaign"
  const baseName = `${formattedUsername}'s ${formattedType} Campaign`;
  
  // Add timestamp to ensure uniqueness (shorter format)
  const now = new Date();
  const timestamp = now.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  const time = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  }).replace(':', '');
  
  // Generate base name with timestamp
  const baseNameWithTimestamp = `${baseName} - ${timestamp} ${time}`;
  
  // Check for duplicates and add counter if needed
  if (existingProjects && existingProjects.length > 0) {
    let counter = 1;
    let uniqueName = baseNameWithTimestamp;
    
    // Check if name already exists
    const nameExists = existingProjects.some(project => {
      const projectName = project.name || '';
      // Check exact match or if it starts with base name
      if (projectName === baseNameWithTimestamp || projectName === baseName) {
        return true;
      }
      // Check if it matches pattern with counter: "Base Name - Date Time (N)"
      if (projectName.startsWith(baseName)) {
        const counterMatch = projectName.match(/\((\d+)\)$/);
        if (counterMatch) {
          const num = parseInt(counterMatch[1], 10);
          if (num >= counter) {
            counter = num + 1;
          }
        }
        return projectName.startsWith(`${baseName} - ${timestamp}`);
      }
      return false;
    });
    
    if (nameExists) {
      // Add counter to make it unique
      uniqueName = `${baseName} - ${timestamp} ${time} (${counter})`;
      
      // Double-check if this name also exists (in case of rapid creation)
      while (existingProjects.some(p => (p.name || '') === uniqueName)) {
        counter++;
        uniqueName = `${baseName} - ${timestamp} ${time} (${counter})`;
      }
    }
    
    return uniqueName;
  }
  
  // No existing projects to check, use timestamp version
  return baseNameWithTimestamp;
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
