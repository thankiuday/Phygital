/**
 * Debug Utilities Hook
 * Manages debug logging and message handling
 */

import { useCallback } from 'react';

export const useDebug = (setDebugMessages) => {
  const addDebugMessage = useCallback((message, type = 'info', data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const debugEntry = {
      id: Date.now(),
      message,
      type,
      timestamp,
      data
    };
    
    // Log to console with performance timing
    const perfMark = `AR-${Date.now()}`;
    performance.mark(perfMark);
    console.log(`[AR Debug ${timestamp}] ${message}`, data || '');
    
    // Track performance metrics
    if (type === 'performance') {
      console.log(`⏱️ Performance: ${message}`);
    }
    
    setDebugMessages(prev => [...prev.slice(-29), debugEntry]); // Keep last 30 messages
    
    // Send critical errors to analytics (in production)
    if (type === 'error' && process.env.NODE_ENV === 'production') {
      console.error('Critical AR Error:', message, data);
    }
  }, [setDebugMessages]);

  return { addDebugMessage };
};
