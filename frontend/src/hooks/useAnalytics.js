/**
 * Analytics Hook
 * Handles analytics tracking for AR experience
 * Now includes geolocation tracking for better insights
 */

import { useCallback } from 'react';
import { getUserLocation, reverseGeocode } from '../utils/geolocation';

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
        // Capture user location for scan events
        let locationData = null;
        try {
          console.log('📍 Attempting to capture user location for scan...');
          const coords = await getUserLocation();
          
          if (coords) {
            console.log('✅ Location captured:', coords);
            addDebugMessage(`📍 Location: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`, 'info');
            
            // Try to get city/country (non-blocking)
            try {
              const address = await reverseGeocode(coords.latitude, coords.longitude);
              locationData = {
                latitude: coords.latitude,
                longitude: coords.longitude,
                city: address.city,
                country: address.country
              };
              console.log('🌍 Location with address:', locationData);
              addDebugMessage(`🌍 Location: ${address.city}, ${address.country}`, 'success');
            } catch (geocodeError) {
              // If reverse geocoding fails, still send coordinates
              locationData = {
                latitude: coords.latitude,
                longitude: coords.longitude
              };
              console.log('⚠️ Geocoding failed, using coordinates only');
            }
          }
        } catch (locationError) {
          console.log('ℹ️ Location not available:', locationError.message);
          addDebugMessage('ℹ️ Location tracking not available', 'info');
        }
        
        requestBody = {
          userId: userId || projectId,
          projectId,
          scanData: {
            location: locationData,
            userAgent: navigator.userAgent,
            ...data
          }
        };
        
        console.log('📊 Track scan request:', { 
        userId: userId || projectId, 
        projectId, 
        hasLocation: !!locationData,
        debug: {
          userIdValue: userId,
          projectIdValue: projectId,
          fallbackUserId: userId || projectId
        }
      });
      } else if (event === 'videoView') {
        requestBody = {
          userId: userId || projectId,
          projectId,
          videoProgress: data.videoProgress || 100,
          videoDuration: data.videoDuration || 0,
          eventId: data.eventId, // Include eventId for deduplication
          userAgent: navigator.userAgent
        };
      } else if (event === 'linkClick') {
        requestBody = {
          userId: userId || projectId,
          projectId,
          linkType: data.linkType || 'unknown',
          linkUrl: data.linkUrl || '',
          eventId: data.eventId, // Include eventId for deduplication
          userAgent: navigator.userAgent
        };
      }
      
      console.log(`🌐 Sending analytics request:`, {
        event,
        endpoint: `${apiUrl}${endpoint}`,
        body: requestBody
      });
      
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log(`📡 Analytics response:`, {
        event,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Analytics API error response:`, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log(`✅ Analytics API success response:`, responseData);
      
      addDebugMessage(`📊 Analytics tracked: ${event}`, 'success');
      console.log(`✅ Analytics tracked: ${event} for project ${projectId}`);
    } catch (error) {
      addDebugMessage(`⚠️ Analytics tracking failed for ${event}: ${error.message}`, 'warning');
      console.error(`❌ Analytics tracking failed for ${event}:`, error);
    }
  }, [userId, projectId, addDebugMessage]);

  return { trackAnalytics };
};
