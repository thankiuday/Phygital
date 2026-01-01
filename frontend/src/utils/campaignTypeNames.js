/**
 * Campaign Type Display Names Utility
 * Provides user-friendly display names for campaign types
 */

/**
 * Mapping of campaign type IDs to display names
 */
export const CAMPAIGN_TYPE_DISPLAY_NAMES = {
  'qr-link': 'Single Link QR',
  'qr-links': 'Multiple Links QR',
  'qr-links-video': 'Links & Video QR',
  'qr-links-pdf-video': 'Links, PDF & Video QR',
  'qr-links-ar-video': 'AR Experience QR'
};

/**
 * Get the display name for a campaign type
 * @param {string} campaignType - The campaign type ID
 * @returns {string} The display name or the original type if not found
 */
export const getCampaignTypeDisplayName = (campaignType) => {
  if (!campaignType) return 'Unknown Campaign Type';
  return CAMPAIGN_TYPE_DISPLAY_NAMES[campaignType] || campaignType;
};

/**
 * Get a short description for a campaign type
 * @param {string} campaignType - The campaign type ID
 * @returns {string} A short description
 */
export const getCampaignTypeDescription = (campaignType) => {
  const descriptions = {
    'qr-link': 'QR code pointing to one URL',
    'qr-links': 'QR code with multiple links',
    'qr-links-video': 'QR code with links and video',
    'qr-links-pdf-video': 'QR code with links, PDFs, and video',
    'qr-links-ar-video': 'Full AR experience with video and links'
  };
  return descriptions[campaignType] || 'QR code campaign';
};

/**
 * Get the upgrade display name for transitioning between campaign types
 * @param {string} fromType - Current campaign type
 * @param {string} toType - Target campaign type
 * @returns {string} Display text for the upgrade
 */
export const getUpgradeDisplayText = (fromType, toType) => {
  const fromName = getCampaignTypeDisplayName(fromType);
  const toName = getCampaignTypeDisplayName(toType);
  return `Upgrade from ${fromName} to ${toName}`;
};

