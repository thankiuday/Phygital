/**
 * Data Refresh Hook
 * Automatically refreshes user data when navigating between pages
 * Ensures data consistency across the application
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const useDataRefresh = () => {
  const location = useLocation();
  const { refreshUserData, isAuthenticated } = useAuth();

  useEffect(() => {
    // Only refresh if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    // Refresh user data when navigating to important pages
    const importantPages = ['/dashboard', '/projects', '/analytics', '/profile'];
    const currentPath = location.pathname;
    
    if (importantPages.includes(currentPath)) {
      // Silently refresh user data to ensure consistency
      refreshUserData().catch(error => {
        // Only log errors, not successful refreshes
        console.error('Failed to refresh user data:', error);
      });
    }
  }, [location.pathname, refreshUserData, isAuthenticated]);
};



