/**
 * Project Data Hook
 * Handles fetching and managing project data
 */

import { useCallback } from 'react';

export const useProjectData = (projectId, userId, setIsLoading, setProjectData, setError, addDebugMessage, trackAnalytics, setIsProjectDisabled = null, setDisabledProjectName = null) => {
  const fetchProjectData = useCallback(async () => {
    const startTime = performance.now();
    
    try {
      setIsLoading(true);

      // Validate environment variables
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        throw new Error('VITE_API_URL environment variable not defined');
      }

      // Determine endpoint based on available parameters
      let endpoint;
      if (userId && projectId) {
        // New format: /ar/user/{userId}/project/{projectId}
        endpoint = `/qr/user/${userId}/project/${projectId}`;
      } else if (projectId) {
        // Legacy format: just project ID
        endpoint = `/qr/project-data/${projectId}`;
      } else if (userId) {
        // Legacy format: just user ID
        endpoint = `/qr/user-data/${userId}`;
      } else {
        throw new Error('Either userId and projectId, or userId alone, or projectId alone must be provided');
      }

      const fullUrl = `${apiUrl}${endpoint}`;

      const response = await fetch(fullUrl);
      
      if (!response.ok) {
        // Check if project is disabled (403 status)
        if (response.status === 403) {
          const errorData = await response.json();
          if (errorData.isDisabled) {
            console.log('🚫 Project is disabled:', errorData.projectName);
            if (setIsProjectDisabled) setIsProjectDisabled(true);
            if (setDisabledProjectName) setDisabledProjectName(errorData.projectName);
            addDebugMessage('🚫 This project has been disabled by its owner', 'error');
            return; // Exit early, don't throw error
          }
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      // Handle both success formats: {success: true} and {status: 'success'}
      const isSuccess = data.success === true || data.status === 'success';
      if (!isSuccess) {
        throw new Error(data.message || 'Failed to fetch project data');
      }

      // Validate data structure
      const projectData = data?.data;
      if (!projectData) {
        throw new Error('Invalid response format: missing data field');
      }

      setProjectData(projectData);
      
      // Track QR scan when accessing AR experience (prevents duplicates within 1 minute)
      try {
        const sessionMinute = Math.floor(Date.now() / 60000);
        const scanSessionKey = `scan_${userId}_${projectId}_${sessionMinute}`;
        const alreadyTrackedScan = sessionStorage.getItem(scanSessionKey);
        
        if (!alreadyTrackedScan && projectId) {
          // Set the key BEFORE tracking to prevent race conditions in React Strict Mode
          sessionStorage.setItem(scanSessionKey, 'true');
          addDebugMessage('📊 Tracking QR scan...', 'info');
          await trackAnalytics('scan', {
            source: 'ar_experience',
            userAgent: navigator.userAgent
          });
          addDebugMessage('✅ QR scan tracked', 'success');
        } else if (alreadyTrackedScan) {
          console.log('ℹ️ Scan already tracked in this minute, skipping duplicate');
        }
      } catch (analyticsError) {
        console.warn('Scan tracking failed:', analyticsError);
      }
      
      // Track AR experience start with error handling
      try {
        addDebugMessage('📊 Tracking AR experience start...', 'info');
        await trackAnalytics('ar-experience-start', {
          loadTime: performance.now() - startTime,
          hasVideo: !!projectData.videoUrl,
          hasDesign: !!projectData.designUrl
        });
        addDebugMessage('✅ AR experience start tracked', 'success');
      } catch (analyticsError) {
        console.warn('Analytics tracking failed:', analyticsError);
        // Don't block the main flow for analytics failures
      }
      
    } catch (error) {
      console.error('Project data fetch error:', error);
      setError(`Failed to load project: ${error.message}`);

      // Track error with individual try/catch
      try {
        await trackAnalytics('ar-experience-error', {
          error: error.message,
          step: 'project-data-fetch'
        });
      } catch (analyticsError) {
        console.warn('Analytics error tracking failed:', analyticsError);
        // Don't block the main flow for analytics failures
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, userId, setIsLoading, setProjectData, setError, addDebugMessage, trackAnalytics]);

  return { fetchProjectData };
};
