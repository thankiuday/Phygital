/**
 * Analytics Hook
 * Handles analytics tracking for AR experience
 */

import { useCallback } from 'react';

export const useAnalytics = (userId, projectId, addDebugMessage) => {
  const trackAnalytics = useCallback(async (event, data = {}) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/analytics/${event}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || projectId,
          projectId,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ...data
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      addDebugMessage(`📊 Analytics tracked: ${event}`, 'info');
    } catch (error) {
      addDebugMessage(`⚠️ Analytics tracking failed for ${event}: ${error.message}`, 'warning');
    }
  }, [userId, projectId, addDebugMessage]);

  return { trackAnalytics };
};
