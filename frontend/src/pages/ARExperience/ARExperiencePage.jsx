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
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/5 via-transparent to-neon-purple/5 animate-pulse-slow" />

      {/* AR Container - Full screen with enhanced styling */}
      <div
        ref={containerRef}
        className="absolute inset-0 w-full h-full rounded-2xl shadow-2xl border border-slate-700/50"
        style={{
          width: '100%',
          height: '100vh',
          touchAction: 'none',
          minWidth: '320px',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.3)'
        }}
      />

      {/* Top UI Bar - Professional glass morphism design */}
      <div className="fixed top-0 left-0 right-0 z-40">
        {/* Glass morphism background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-800/80 to-transparent backdrop-blur-xl border-b border-slate-700/30" />

        {/* Content */}
        <div className="relative safe-top px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center justify-between">
            {/* Left: Back button and project info */}
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="group p-2.5 sm:p-3 bg-slate-800/60 hover:bg-slate-700/80 active:bg-slate-600/90 rounded-xl text-slate-200 hover:text-white backdrop-blur-md border border-slate-600/30 hover:border-neon-blue/50 transition-all duration-300 flex-shrink-0 shadow-lg hover:shadow-neon-blue/20"
                aria-label="Go back"
              >
                <X size={20} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              </button>

              <div className="text-white min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
                  <h1 className="font-bold text-base sm:text-lg bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                    AR Experience
                  </h1>
                </div>
                <p className="text-sm sm:text-base text-slate-300 font-medium truncate">
                  {projectData?.projectName || projectData?.name || 'Phygital AR'}
                </p>
              </div>
            </div>

            {/* Right: Settings button with enhanced styling */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowDebug(true)}
                className="group p-2.5 sm:p-3 bg-slate-800/60 hover:bg-slate-700/80 active:bg-slate-600/90 rounded-xl text-slate-200 hover:text-white backdrop-blur-md border border-slate-600/30 hover:border-neon-purple/50 transition-all duration-300 shadow-lg hover:shadow-neon-purple/20"
                aria-label="Settings and Debug"
              >
                <Settings size={20} className="sm:w-5 sm:h-5 group-hover:scale-110 group-hover:rotate-90 transition-all duration-300" />
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
