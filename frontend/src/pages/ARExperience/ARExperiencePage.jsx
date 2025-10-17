/**
 * AR Experience Page - Refactored
 * Main AR experience component with separated concerns
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Settings } from 'lucide-react';

// Hooks
import { useARState } from '../../hooks/useARState';
import { useDebug } from '../../hooks/useDebug';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useProjectData } from '../../hooks/useProjectData';
import { useARLogic } from '../../hooks/useARLogic';

// Utils
import { checkLibraries } from '../../utils/arUtils';

// Components
import DebugPanel from '../../components/AR/DebugPanel';
import LoadingScreen from '../../components/AR/LoadingScreen';
import ErrorScreen from '../../components/AR/ErrorScreen';
import ARControls from '../../components/AR/ARControls';
import ProjectDisabledScreen from '../../components/AR/ProjectDisabledScreen';

const ARExperiencePage = () => {
  const { userId, projectId } = useParams();
  const navigate = useNavigate();
  const scanId = projectId || userId;

  // State management
  const arState = useARState();
  const {
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
    setIsLoading,
    setProjectData,
    setError,
    setLibrariesLoaded,
    setCameraActive,
    setArReady,
    setTargetDetected,
    setVideoPlaying,
    setVideoMuted,
    setIsInitialized,
    setIsScanning,
    setShowDebug,
    setDebugMessages,
    resetARState
  } = arState;

  // Check if project is disabled
  const [isProjectDisabled, setIsProjectDisabled] = React.useState(false);
  const [disabledProjectName, setDisabledProjectName] = React.useState('');

  // Debug utilities
  const { addDebugMessage } = useDebug(setDebugMessages);

  // Analytics
  const { trackAnalytics } = useAnalytics(userId, projectId, addDebugMessage);

  // Project data
  const { fetchProjectData } = useProjectData(
    projectId, 
    userId, 
    setIsLoading, 
    setProjectData, 
    setError, 
    addDebugMessage, 
    trackAnalytics,
    setIsProjectDisabled,
    setDisabledProjectName
  );

  // AR logic
  const arLogic = useARLogic({
    librariesLoaded,
    projectData,
    isInitialized,
    isScanning,
    videoPlaying,
    videoMuted,
    targetDetected,
    setError,
    setCameraActive,
    setArReady,
    setTargetDetected,
    setVideoPlaying,
    setVideoMuted,
    setIsInitialized,
    setIsScanning,
    addDebugMessage,
    resetARState,
    trackAnalytics  // Pass analytics tracking to AR logic
  });

  const {
    containerRef,
    videoRef,
    startScanning,
    stopScanning,
    toggleVideo,
    toggleMute,
    restartAR
  } = arLogic;

  // Initialize libraries
  useEffect(() => {
    const initializeLibraries = async () => {
      const success = await checkLibraries(addDebugMessage);
      setLibrariesLoaded(success);
    };

    initializeLibraries();
  }, [addDebugMessage, setLibrariesLoaded]);

  // Fetch project data when libraries are ready
  useEffect(() => {
    if (librariesLoaded && !projectData) {
      fetchProjectData();
    }
  }, [librariesLoaded, projectData, fetchProjectData]);

  // Initialize AR when data is ready
  useEffect(() => {
    if (librariesLoaded && projectData && !isInitialized) {
      addDebugMessage('⏳ Delaying MindAR initialization to ensure container is ready...', 'info');
      setTimeout(() => {
        arLogic.initializeMindAR().then(success => {
          if (success) {
            setTimeout(() => {
              startScanning();
            }, 100);
          }
        });
      }, 1500);
    }
  }, [librariesLoaded, projectData, isInitialized, addDebugMessage]);

  // Show disabled screen if project is disabled
  if (isProjectDisabled) {
    return <ProjectDisabledScreen projectName={disabledProjectName} />;
  }

  // Loading screen
  if (isLoading) {
    return (
      <LoadingScreen
        librariesLoaded={librariesLoaded}
        projectData={projectData}
        showDebug={showDebug}
        setShowDebug={setShowDebug}
        DebugPanel={() => (
          <DebugPanel
            showDebug={showDebug}
            setShowDebug={setShowDebug}
            librariesLoaded={librariesLoaded}
            cameraActive={cameraActive}
            arReady={arReady}
            targetDetected={targetDetected}
            videoRef={videoRef}
            videoPlaying={videoPlaying}
            videoMuted={videoMuted}
            debugMessages={debugMessages}
          />
        )}
      />
    );
  }

  // Error screen
  if (error) {
    return (
      <ErrorScreen
        error={error}
        onRestartAR={restartAR}
        onGoBack={() => navigate(-1)}
      />
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* AR Container - Full screen with proper mobile viewport handling */}
      <div 
        ref={containerRef}
        className="absolute inset-0 w-full h-full"
        style={{ 
          width: '100%', 
          height: '100vh',
          touchAction: 'none',
          minWidth: '320px',
          minHeight: '100vh',
          backgroundColor: '#000',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}
      />

      {/* Top UI Bar - Compact and professional */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="safe-top px-3 py-3 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back button and project info */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="p-2 sm:p-2.5 bg-black/40 hover:bg-black/60 active:bg-black/70 rounded-full text-white backdrop-blur-md border border-white/10 transition-all duration-200 flex-shrink-0 shadow-lg"
                aria-label="Go back"
              >
                <X size={18} className="sm:hidden" />
                <X size={20} className="hidden sm:block" />
              </button>
              <div className="text-white min-w-0 flex-1">
                <h1 className="font-semibold text-sm sm:text-base truncate">AR Experience</h1>
                <p className="text-xs sm:text-sm text-gray-300 truncate">
                  {projectData?.projectName || projectData?.name || 'Phygital AR'}
                </p>
              </div>
            </div>
            
            {/* Right: Settings button with debug panel */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowDebug(true)}
                className="p-2 sm:p-2.5 bg-black/40 hover:bg-black/60 active:bg-black/70 rounded-full text-white backdrop-blur-md border border-white/10 transition-all duration-200 shadow-lg"
                aria-label="Settings and Debug"
              >
                <Settings size={18} className="sm:hidden" />
                <Settings size={20} className="hidden sm:block" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AR Controls - Mobile optimized */}
      <ARControls
        isScanning={isScanning}
        arReady={arReady}
        targetDetected={targetDetected}
        videoPlaying={videoPlaying}
        videoMuted={videoMuted}
        projectData={projectData}
        onStopScanning={stopScanning}
        onRestartAR={restartAR}
        onToggleVideo={toggleVideo}
        onToggleMute={toggleMute}
        onTrackAnalytics={trackAnalytics}
      />

      {/* Debug Panel - Accessed via Settings */}
      <DebugPanel
        showDebug={showDebug}
        setShowDebug={setShowDebug}
        librariesLoaded={librariesLoaded}
        cameraActive={cameraActive}
        arReady={arReady}
        targetDetected={targetDetected}
        videoRef={videoRef}
        videoPlaying={videoPlaying}
        videoMuted={videoMuted}
        debugMessages={debugMessages}
      />
    </div>
  );
};

export default ARExperiencePage;
