/**
 * Analytics Calculations Utility
 * Provides helper functions for calculating analytics metrics
 */

/**
 * Calculate conversion rate
 * @param {number} numerator - The numerator value
 * @param {number} denominator - The denominator value
 * @returns {number} Conversion rate as percentage
 */
export const calculateConversionRate = (numerator, denominator) => {
  if (!denominator || denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
};

/**
 * Calculate percentage change between two values
 * @param {number} current - Current value
 * @param {number} previous - Previous value
 * @returns {object} Object with percentage change and trend direction
 */
export const calculateTrend = (current, previous) => {
  if (!previous || previous === 0) {
    return { percentage: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(Math.round(change)),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  };
};

/**
 * Aggregate analytics by campaign type
 * @param {array} projects - Array of project objects
 * @param {string} campaignType - Campaign type to filter by
 * @returns {object} Aggregated analytics for the campaign type
 */
export const aggregateByCampaignType = (projects, campaignType) => {
  const filteredProjects = campaignType === 'all' 
    ? projects 
    : projects.filter(p => p.campaignType === campaignType);

  return filteredProjects.reduce((acc, project) => {
    const analytics = project.analytics || {};
    return {
      totalScans: acc.totalScans + (analytics.totalScans || 0),
      videoViews: acc.videoViews + (analytics.videoViews || 0),
      linkClicks: acc.linkClicks + (analytics.linkClicks || 0),
      documentViews: acc.documentViews + (analytics.documentViews || 0),
      documentDownloads: acc.documentDownloads + (analytics.documentDownloads || 0),
      socialMediaClicks: acc.socialMediaClicks + (analytics.socialMediaClicks || 0),
      projectCount: acc.projectCount + 1
    };
  }, {
    totalScans: 0,
    videoViews: 0,
    linkClicks: 0,
    documentViews: 0,
    documentDownloads: 0,
    socialMediaClicks: 0,
    projectCount: 0
  });
};

/**
 * Calculate engagement funnel metrics
 * @param {object} analytics - Analytics object
 * @param {string} campaignType - Campaign type to filter metrics (e.g., 'qr-link')
 * @returns {array} Array of funnel steps with conversion rates
 */
export const calculateEngagementFunnel = (analytics, campaignType = null) => {
  const scans = analytics.totalScans || 0;
  const videoViews = analytics.videoViews || 0;
  const linkClicks = analytics.linkClicks || 0;
  const documentViews = analytics.documentViews || 0;

  const steps = [
    { step: 'QR Scans', value: scans, percentage: 100 }
  ];

  // For qr-link campaigns, only show QR scans (no video/document/link clicks)
  // QR link campaigns redirect to external URLs automatically, so there are no clickable links
  if (campaignType === 'qr-link') {
    // Only show scans - no other interactions available
    return steps;
  } else {
    // For other campaign types, show all metrics
    steps.push(
      { step: 'Video Views', value: videoViews, percentage: calculateConversionRate(videoViews, scans) },
      { step: 'Document Views', value: documentViews, percentage: calculateConversionRate(documentViews, scans) },
      { step: 'Link Clicks', value: linkClicks, percentage: calculateConversionRate(linkClicks, scans) }
    );
  }

  return steps;
};

/**
 * Group analytics by time period
 * @param {array} events - Array of event objects with timestamps
 * @param {string} period - 'day', 'hour', 'week'
 * @returns {array} Grouped data
 */
export const groupByTimePeriod = (events, period = 'day') => {
  if (!events || events.length === 0) return [];
  
  const grouped = {};
  
  events.forEach(event => {
    const timestamp = event.timestamp || event.createdAt || new Date();
    const date = new Date(timestamp);
    let key;
    
    if (period === 'hour') {
      key = `${date.toISOString().split('T')[0]} ${date.getHours()}:00`;
    } else if (period === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = date.toISOString().split('T')[0];
    }
    
    if (!grouped[key]) {
      grouped[key] = { date: key, count: 0 };
    }
    grouped[key].count++;
  });
  
  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Calculate average watch time
 * @param {array} videoEvents - Array of video view events with videoProgress and videoDuration
 * @returns {number} Average watch time in seconds
 */
export const calculateAverageWatchTime = (videoEvents) => {
  if (!videoEvents || videoEvents.length === 0) return 0;
  
  const totalWatchTime = videoEvents.reduce((sum, event) => {
    const progress = event.eventData?.videoProgress || 0;
    const duration = event.eventData?.videoDuration || 0;
    return sum + (duration * (progress / 100));
  }, 0);
  
  return Math.round(totalWatchTime / videoEvents.length);
};

/**
 * Calculate video completion rate
 * @param {array} videoEvents - Array of video view events
 * @param {number} completionThreshold - Percentage threshold for completion (default 90)
 * @returns {number} Completion rate as percentage
 */
export const calculateVideoCompletionRate = (videoEvents, completionThreshold = 90) => {
  if (!videoEvents || videoEvents.length === 0) return 0;
  
  const completed = videoEvents.filter(event => {
    const progress = event.eventData?.videoProgress || 0;
    return progress >= completionThreshold;
  }).length;
  
  return calculateConversionRate(completed, videoEvents.length);
};

/**
 * Get top performing links
 * @param {array} linkClickEvents - Array of link click events
 * @param {number} limit - Number of top links to return
 * @returns {array} Sorted array of link performance
 */
export const getTopPerformingLinks = (linkClickEvents, limit = 10) => {
  if (!linkClickEvents || linkClickEvents.length === 0) return [];
  
  const linkCounts = {};
  
  linkClickEvents.forEach(event => {
    const linkType = event.eventData?.linkType || 'unknown';
    const linkUrl = event.eventData?.linkUrl || '';
    const key = `${linkType}:${linkUrl}`;
    
    if (!linkCounts[key]) {
      linkCounts[key] = {
        linkType,
        linkUrl,
        count: 0
      };
    }
    linkCounts[key].count++;
  });
  
  return Object.values(linkCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

/**
 * Calculate device breakdown
 * @param {array} events - Array of events with deviceInfo
 * @returns {object} Device breakdown statistics
 */
export const calculateDeviceBreakdown = (events) => {
  const breakdown = {
    mobile: 0,
    desktop: 0,
    tablet: 0,
    unknown: 0
  };
  
  events.forEach(event => {
    const deviceType = event.deviceInfo?.type || 'unknown';
    if (breakdown.hasOwnProperty(deviceType)) {
      breakdown[deviceType]++;
    } else {
      breakdown.unknown++;
    }
  });
  
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  return {
    ...breakdown,
    total,
    percentages: {
      mobile: calculateConversionRate(breakdown.mobile, total),
      desktop: calculateConversionRate(breakdown.desktop, total),
      tablet: calculateConversionRate(breakdown.tablet, total),
      unknown: calculateConversionRate(breakdown.unknown, total)
    }
  };
};

/**
 * Calculate browser breakdown
 * @param {array} events - Array of events with deviceInfo
 * @returns {object} Browser breakdown statistics
 */
export const calculateBrowserBreakdown = (events) => {
  const breakdown = {};
  
  events.forEach(event => {
    const browser = event.deviceInfo?.browser || 'unknown';
    breakdown[browser] = (breakdown[browser] || 0) + 1;
  });
  
  const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
  
  return {
    breakdown,
    total,
    percentages: Object.keys(breakdown).reduce((acc, browser) => {
      acc[browser] = calculateConversionRate(breakdown[browser], total);
      return acc;
    }, {})
  };
};

/**
 * Calculate peak hours
 * @param {array} events - Array of events with timestamps
 * @returns {array} Array of hour statistics
 */
export const calculatePeakHours = (events) => {
  const hourCounts = Array(24).fill(0);
  
  events.forEach(event => {
    const date = new Date(event.timestamp);
    const hour = date.getHours();
    hourCounts[hour]++;
  });
  
  return hourCounts.map((count, hour) => ({
    hour,
    count,
    label: `${hour}:00`
  }));
};

/**
 * Filter analytics by date range
 * @param {array} events - Array of events with timestamps
 * @param {number} days - Number of days to look back
 * @returns {array} Filtered events
 */
export const filterByDateRange = (events, days) => {
  if (!events || events.length === 0) return [];
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return events.filter(event => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= cutoffDate;
  });
};

