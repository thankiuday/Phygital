/**
 * Data Refresh Hook
 * Automatically refreshes user data when navigating between pages
 * Ensures data consistency across the application
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const useDataRefresh = () => {
  const location = useLocation();
  const { refreshUserData, isAuthenticated } = useAuth();
  const refreshUserDataRef = useRef(refreshUserData);
  const lastPathRef = useRef('');

  // Store latest refreshUserData in ref to prevent dependency issues
  useEffect(() => {
    refreshUserDataRef.current = refreshUserData;
  }, [refreshUserData]);

  useEffect(() => {
    // Only refresh if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    // Refresh user data when navigating to important pages
    // Support both hash routing (#/analytics) and regular routing (/analytics)
    // Note: `/projects` (campaigns page) performs its own heavy data loading,
    // so we intentionally exclude it here to avoid duplicate work.
    const importantPages = ['/dashboard', '/analytics', '/profile'];
    const currentPath = location.pathname;
    const hashPath = location.hash.replace('#', '') || location.pathname;
    const currentLocation = `${currentPath}${hashPath}`;
    
    // Only refresh if location actually changed (prevent loops)
    if (currentLocation === lastPathRef.current) {
      return;
    }
    
    lastPathRef.current = currentLocation;
    
    // Check both pathname and hash for hash routing support
    const isImportantPage = importantPages.includes(currentPath) || importantPages.includes(hashPath);
    
    if (isImportantPage) {
      // Silently refresh user data to ensure consistency
      if (refreshUserDataRef.current) {
        refreshUserDataRef.current().catch(error => {
          // Only log errors, not successful refreshes
          console.error('Failed to refresh user data:', error);
        });
      }
    }
  }, [location.pathname, location.hash, isAuthenticated]); // Removed refreshUserData from deps
};



