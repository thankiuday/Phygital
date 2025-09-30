/**
 * Project Data Hook
 * Handles fetching and managing project data
 */

import { useCallback } from 'react';

export const useProjectData = (projectId, userId, setIsLoading, setProjectData, setError, addDebugMessage, trackAnalytics) => {
  const fetchProjectData = useCallback(async () => {
    const startTime = performance.now();
    
    try {
      console.log('🌐 Starting project data fetch...');
      addDebugMessage('🌐 Fetching project data...', 'info');
      setIsLoading(true);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const endpoint = projectId 
        ? `/qr/project-data/${projectId}` 
        : `/qr/user-data/${userId}`;
      
      const fullUrl = `${apiUrl}${endpoint}`;
      console.log('🌐 Fetching from URL:', fullUrl);
      addDebugMessage(`🌐 API URL: ${fullUrl}`, 'info');
      
      const response = await fetch(fullUrl);
      console.log('🌐 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🌐 Response data:', data);
      
      // Handle both success formats: {success: true} and {status: 'success'}
      const isSuccess = data.success === true || data.status === 'success';
      if (!isSuccess) {
        throw new Error(data.message || 'Failed to fetch project data');
      }
      
      setProjectData(data.data);
      console.log('✅ Project data set:', data.data);
      addDebugMessage('✅ Project data loaded successfully', 'success');
      
      // Track AR experience start
      await trackAnalytics('ar-experience-start', {
        loadTime: performance.now() - startTime,
        hasVideo: !!data.data.videoUrl,
        hasDesign: !!data.data.designUrl
      });
      
    } catch (error) {
      console.error('❌ Project data fetch error:', error);
      addDebugMessage(`❌ Failed to fetch project data: ${error.message}`, 'error');
      setError(`Failed to load project: ${error.message}`);
      
      // Track error
      await trackAnalytics('ar-experience-error', {
        error: error.message,
        step: 'project-data-fetch'
      });
    } finally {
      const loadTime = performance.now() - startTime;
      addDebugMessage(`⏱️ Project data fetch took ${loadTime.toFixed(2)}ms`, 'performance');
      console.log('🌐 Setting isLoading to false');
      setIsLoading(false);
    }
  }, [projectId, userId, setIsLoading, setProjectData, setError, addDebugMessage, trackAnalytics]);

  return { fetchProjectData };
};
