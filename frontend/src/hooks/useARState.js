/**
 * AR State Management Hook
 * Manages all AR-related state and provides state update functions
 */

import { useState, useCallback } from 'react';

export const useARState = () => {
  // Core states
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [projectData, setProjectData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // AR states
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [arReady, setArReady] = useState(false);
  const [targetDetected, setTargetDetected] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);

  // Debug states
  const [showDebug, setShowDebug] = useState(false);
  const [debugMessages, setDebugMessages] = useState([]);
  const [cameraPermissionRequired, setCameraPermissionRequired] = useState(false);
  const [cameraPermissionBlocked, setCameraPermissionBlocked] = useState(false);
  const [cameraPermissionDismissed, setCameraPermissionDismissed] = useState(false);

  // State update functions
  const resetARState = useCallback(() => {
    setIsInitialized(false);
    setIsScanning(false);
    setArReady(false);
    setCameraActive(false);
    setTargetDetected(false);
    setVideoPlaying(false);
    setCameraPermissionRequired(false);
    setCameraPermissionBlocked(false);
    setCameraPermissionDismissed(false);
    setError(null);
  }, []);

  const setARReady = useCallback((ready) => {
    setArReady(ready);
    if (ready) {
      setCameraActive(true);
    }
  }, [setCameraActive]);

  const setTargetFound = useCallback((found) => {
    setTargetDetected(found);
    if (!found) {
      setVideoPlaying(false);
    }
  }, [setVideoPlaying]);

  return {
    // State
    isInitialized,
    isScanning,
    projectData,
    error,
    isLoading,
    librariesLoaded,
    cameraActive,
    arReady,
    targetDetected,
    videoPlaying,
    videoMuted,
    showDebug,
    debugMessages,
    
    // Setters
    setIsInitialized,
    setIsScanning,
    setProjectData,
    setError,
    setIsLoading,
    setLibrariesLoaded,
    setCameraActive,
    setArReady: setARReady,
    setTargetDetected: setTargetFound,
    setVideoPlaying,
    setVideoMuted,
    setShowDebug,
    setDebugMessages,
    setCameraPermissionRequired,
    setCameraPermissionBlocked,
    setCameraPermissionDismissed,
    
    // Utility functions
    resetARState,
    cameraPermissionRequired,
    cameraPermissionBlocked,
    cameraPermissionDismissed
  };
};
