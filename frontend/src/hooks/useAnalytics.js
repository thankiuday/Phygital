/**
 * Analytics Hook
 * Handles analytics tracking for AR experience
 */

import { useCallback } from 'react';

export const useAnalytics = (userId, projectId, addDebugMessage) => {
  const trackAnalytics = useCallback(async (event, data = {}) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      // Map event names to correct backend endpoints
      const eventEndpoints = {
        'scan': '/analytics/scan',
        'videoView': '/analytics/video-view',
        'linkClick': '/analytics/link-click',
        'ar-experience-start': '/analytics/ar-experience-start',
        'ar-experience-error': '/analytics/ar-experience-error',
        'pageView': '/analytics/page-view'
      };
      
      const endpoint = eventEndpoints[event] || `/analytics/${event}`;
      
      // Prepare request body based on event type
      let requestBody = {
        userId: userId || projectId,
        projectId,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ...data
      };
      
      // Special handling for different event types to match backend expectations
      if (event === 'scan') {
        requestBody = {
          userId: userId || projectId,
          projectId,
          scanData: {
            userAgent: navigator.userAgent,
            ...data
          }
        };
      } else if (event === 'videoView') {
        requestBody = {
          userId: userId || projectId,
          projectId,
          videoProgress: data.videoProgress || 100,
          videoDuration: data.videoDuration || 0,
          userAgent: navigator.userAgent
        };
      } else if (event === 'linkClick') {
        requestBody = {
          userId: userId || projectId,
          projectId,
          linkType: data.linkType || 'unknown',
          linkUrl: data.linkUrl || '',
          userAgent: navigator.userAgent
        };
      }
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      addDebugMessage(`📊 Analytics tracked: ${event}`, 'success');
      console.log(`✅ Analytics tracked: ${event} for project ${projectId}`);
    } catch (error) {
      addDebugMessage(`⚠️ Analytics tracking failed for ${event}: ${error.message}`, 'warning');
      console.error(`❌ Analytics tracking failed for ${event}:`, error);
    }
  }, [userId, projectId, addDebugMessage]);

  return { trackAnalytics };
};
