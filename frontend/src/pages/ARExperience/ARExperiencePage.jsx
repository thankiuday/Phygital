/**
 * AR Experience Page - Refactored
 * Main AR experience component with separated concerns
 */

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Settings } from 'lucide-react';
import { analyticsAPI } from '../../utils/api';

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

  // Helpers: social/contact
  const socialLinks = projectData?.socialLinks || {};
  const contactNumber = socialLinks?.contactNumber?.trim();
  const whatsappNumber = socialLinks?.whatsappNumber?.trim();

  const sanitizeNumber = (num) => (num || '').replace(/[^0-9+]/g, '');
  const handleSocialClick = (platform, url) => {
    try {
      if (url) {
        analyticsAPI.trackLinkClick(userId, platform, url, projectId).catch(() => {});
      }
    } catch (_) {}
  };

  // Responsive video sizing support
  const [videoAspectRatio, setVideoAspectRatio] = React.useState(16 / 9);
  const isLandscape = videoAspectRatio >= 1.5;
  const paddingTopPercent = (100 / videoAspectRatio) * (isLandscape ? 1.15 : 1);

  // Ensure video element respects play/pause state
  useEffect(() => {
    if (!videoRef?.current) return;
    try {
      if (videoPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    } catch (_) {}
  }, [videoPlaying, targetDetected]);

  // Auto-play on first detection
  const prevDetectedRef = React.useRef(false);
  useEffect(() => {
    if (targetDetected && !prevDetectedRef.current) {
      setVideoPlaying(true);
    }
    prevDetectedRef.current = targetDetected;
  }, [targetDetected, setVideoPlaying]);

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
    <div className="min-h-screen bg-dark-mesh">
      {/* Main Content */}
      <main className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-sm min-h-screen">
        {/* Video Container */}
        <div className="px-4 py-6">
          {/* Responsive ratio box using padding-top technique for broader mobile support */}
          <div
            className="relative bg-slate-800/80 rounded-lg overflow-hidden shadow-dark-large w-full"
            style={{ paddingTop: `${paddingTopPercent}%`, minHeight: isLandscape ? '240px' : '200px' }}
          >
            {/* AR Container - Hidden but functional */}
            <div
              ref={containerRef}
              className="absolute inset-0 w-full h-full"
              style={{
                width: '100%',
                height: '100%',
                touchAction: 'none',
                background: 'transparent',
                overflow: 'hidden',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1
              }}
            />
            
            {/* Video Overlay - Shows when target is detected */}
            {targetDetected && projectData?.videoUrl && (
              <video
                ref={videoRef}
                src={projectData.videoUrl}
                className="absolute inset-0 w-full h-full object-contain z-10"
                muted={videoMuted}
                loop
                playsInline
                onLoadedMetadata={(e) => {
                  // Adjust container size based on video dimensions
                  const video = e.target;
                  const aspectRatio = video.videoWidth / video.videoHeight;
                  if (aspectRatio && isFinite(aspectRatio)) {
                    setVideoAspectRatio(aspectRatio);
                  }
                }}
              />
            )}
            
            {/* Play Button - Shows when no target detected */}
            {!targetDetected && !isScanning && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-16 h-16 bg-gradient-to-r from-primary-600 to-purple-600 rounded-full flex items-center justify-center shadow-glow">
                  <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1"></div>
                </div>
              </div>
            )}
            
            {/* Scanning Indicator */}
            {isScanning && !targetDetected && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="text-white text-center">
                  <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm font-medium text-slate-100">Scanning for target...</p>
                  <p className="text-xs text-slate-300 mt-1">Point camera at QR code</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video Controls */}
        <div className="px-4 pb-4">
          <div className="flex space-x-3">
            <button
              onClick={toggleVideo}
              className="flex-1 bg-slate-800/80 border border-slate-600/30 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center space-x-2 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
            >
              {videoPlaying ? (
                <>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-1 h-3 bg-slate-100 mr-1"></div>
                    <div className="w-1 h-3 bg-slate-100"></div>
                  </div>
                  <span className="text-slate-100 font-medium text-sm sm:text-base">Pause</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-0 h-0 border-l-[6px] border-l-slate-100 border-y-[4px] border-y-transparent ml-0.5"></div>
                  </div>
                  <span className="text-slate-100 font-medium text-sm sm:text-base">Play</span>
                </>
              )}
            </button>
            
            <button
              onClick={toggleMute}
              className="flex-1 bg-slate-800/80 border border-slate-600/30 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center space-x-2 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
            >
              {videoMuted ? (
                <>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-100">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  </div>
                  <span className="text-slate-100 font-medium text-sm sm:text-base">Mute</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-slate-100">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  </div>
                  <span className="text-slate-100 font-medium text-sm sm:text-base">Unmute</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Contact Information */}
        {(contactNumber || whatsappNumber) && (
          <div className="px-4 pb-6">
            <div className="flex space-x-3 sm:space-x-4">
              {contactNumber && (
                <a 
                  href={`tel:${sanitizeNumber(contactNumber)}`}
                  className="flex-1 flex items-center space-x-2 bg-slate-800/80 border border-slate-600/30 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
                >
                  <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-slate-100">
                      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                    </svg>
                  </div>
                  <span className="text-slate-100 font-medium text-sm sm:text-base truncate">{contactNumber}</span>
                </a>
              )}
              {whatsappNumber && (
                <a 
                  href={`https://wa.me/${sanitizeNumber(whatsappNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center space-x-2 bg-slate-800/80 border border-slate-600/30 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
                >
                  <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 text-slate-100">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                  </div>
                  <span className="text-slate-100 font-medium text-sm sm:text-base truncate">{whatsappNumber}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Social Links */}
        {(
          socialLinks?.instagram ||
          socialLinks?.facebook ||
          socialLinks?.twitter ||
          socialLinks?.linkedin ||
          socialLinks?.website
        ) && (
          <div className="px-4 pb-8">
            <h2 className="text-base sm:text-lg font-bold text-slate-100 mb-3 sm:mb-4">Social Links</h2>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSocialClick('instagram', socialLinks.instagram)}
                  className="bg-slate-800/80 border border-slate-600/30 rounded-lg p-3 sm:p-4 flex flex-col items-center space-y-1.5 sm:space-y-2 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 sm:w-8 sm:h-8 text-slate-100"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  </div>
                  <span className="text-xs font-medium text-slate-100 text-center">Instagram</span>
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSocialClick('facebook', socialLinks.facebook)}
                  className="bg-slate-800/80 border border-slate-600/30 rounded-lg p-3 sm:p-4 flex flex-col items-center space-y-1.5 sm:space-y-2 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 sm:w-8 sm:h-8 text-slate-100"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </div>
                  <span className="text-xs font-medium text-slate-100 text-center">Facebook</span>
                </a>
              )}
              {socialLinks.website && (
                <a
                  href={socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSocialClick('website', socialLinks.website)}
                  className="bg-slate-800/80 border border-slate-600/30 rounded-lg p-3 sm:p-4 flex flex-col items-center space-y-1.5 sm:space-y-2 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 sm:w-8 sm:h-8 text-slate-100"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  </div>
                  <span className="text-xs font-medium text-slate-100 text-center">Website</span>
                </a>
              )}
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSocialClick('twitter', socialLinks.twitter)}
                  className="bg-slate-800/80 border border-slate-600/30 rounded-lg p-3 sm:p-4 flex flex-col items-center space-y-1.5 sm:space-y-2 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 sm:w-8 sm:h-8 text-slate-100"><path d="M22.46 6c-.77.35-1.6.58-2.46.69a4.3 4.3 0 001.88-2.37 8.59 8.59 0 01-2.72 1.04 4.29 4.29 0 00-7.31 3.92A12.18 12.18 0 013 5.16a4.28 4.28 0 001.33 5.72 4.26 4.26 0 01-1.94-.54v.06a4.29 4.29 0 003.44 4.2 4.3 4.3 0 01-1.93.07 4.29 4.29 0 004 2.97A8.61 8.61 0 012 19.54a12.14 12.14 0 006.57 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19-.01-.39-.02-.58A8.7 8.7 0 0024 5.55a8.5 8.5 0 01-2.54.7z"/></svg>
                  </div>
                  <span className="text-xs font-medium text-slate-100 text-center">Twitter</span>
                </a>
              )}
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleSocialClick('linkedin', socialLinks.linkedin)}
                  className="bg-slate-800/80 border border-slate-600/30 rounded-lg p-3 sm:p-4 flex flex-col items-center space-y-1.5 sm:space-y-2 hover:bg-slate-700/80 active:bg-slate-600/90 transition-colors touch-manipulation backdrop-blur-md"
                >
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 sm:w-8 sm:h-8 text-slate-100"><path d="M19 0h-14c-2.76 0-5 2.24-5 5v14c0 2.76 2.24 5 5 5h14c2.76 0 5-2.24 5-5v-14c0-2.76-2.24-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.27c-.97 0-1.75-.79-1.75-1.76s.78-1.76 1.75-1.76 1.75.79 1.75 1.76-.78 1.76-1.75 1.76zm13.5 11.27h-3v-5.6c0-1.34-.02-3.06-1.87-3.06s-2.16 1.46-2.16 2.97v5.69h-3v-10h2.88v1.37h.04c.4-.75 1.38-1.54 2.84-1.54 3.04 0 3.6 2 3.6 4.59v5.58z"/></svg>
                  </div>
                  <span className="text-xs font-medium text-slate-100 text-center">LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        )}
      </main>

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
