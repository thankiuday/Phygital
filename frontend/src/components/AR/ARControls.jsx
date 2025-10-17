/**
 * AR Controls Component
 * Handles AR scanning controls and video controls
 */

import React from 'react';
import { Camera, Play, Pause, Volume2, VolumeX, RefreshCw, Instagram, Facebook, Twitter, Linkedin, Globe, ExternalLink } from 'lucide-react';

const ARControls = ({
  isScanning,
  arReady,
  targetDetected,
  videoPlaying,
  videoMuted,
  projectData = {}, // Default empty object to prevent crashes
  onStartScanning,
  onStopScanning,
  onRestartAR,
  onToggleVideo,
  onToggleMute,
  onTrackAnalytics
}) => {
  // Safe handler functions with fallbacks
  const safeToggleVideo = onToggleVideo || (() => {
    console.warn('onToggleVideo handler not provided');
  });
  
  const safeToggleMute = onToggleMute || (() => {
    console.warn('onToggleMute handler not provided');
  });
  
  const safeStartScanning = onStartScanning || (() => {
    console.warn('onStartScanning handler not provided');
  });
  
  const safeStopScanning = onStopScanning || (() => {
    console.warn('onStopScanning handler not provided');
  });
  
  const safeRestartAR = onRestartAR || (() => {
    console.warn('onRestartAR handler not provided');
  });

  const safeTrackAnalytics = onTrackAnalytics || (() => {
    console.warn('onTrackAnalytics handler not provided');
  });

  // Handle social media link clicks
  const handleSocialClick = async (platform, url) => {
    try {
      // Track the social media click
      await safeTrackAnalytics('socialMediaClick', {
        linkType: platform,
        linkUrl: url
      });

      // Open the link in a new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to track social media click:', error);
      // Still open the link even if tracking fails
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <>
      {/* Status Indicator - Modern and compact for mobile */}
      <div className="fixed top-16 sm:top-20 left-0 right-0 z-30 px-3 sm:px-4">
        <div className="flex flex-col items-center gap-2">
          <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium backdrop-blur-md shadow-lg transition-all duration-300 ${
            targetDetected 
              ? 'bg-green-500/30 text-green-100 border-2 border-green-400/50 shadow-green-500/20' 
              : isScanning 
                ? 'bg-blue-500/30 text-blue-100 border-2 border-blue-400/50 shadow-blue-500/20 animate-pulse'
                : 'bg-gray-500/30 text-gray-100 border-2 border-gray-400/50 shadow-gray-500/20'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                targetDetected ? 'bg-green-400 animate-pulse' : isScanning ? 'bg-blue-400' : 'bg-gray-400'
              }`}></div>
              <span className="font-semibold">
                {targetDetected ? '🎯 Target Detected' : isScanning ? '🔍 Scanning...' : '📱 Ready to Scan'}
              </span>
            </div>
          </div>
          
          {/* Additional tracking info */}
          {isScanning && !targetDetected && (
            <div className="px-3 py-1.5 rounded-full text-xs backdrop-blur-md bg-yellow-500/20 text-yellow-100 border border-yellow-400/30 animate-pulse">
              <span>📸 Point camera at the COMPOSITE IMAGE (with QR code)</span>
            </div>
          )}
          
          {/* Video playing indicator */}
          {targetDetected && videoPlaying && (
            <div className="px-3 py-1.5 rounded-full text-xs backdrop-blur-md bg-purple-500/20 text-purple-100 border border-purple-400/30">
              <span>▶️ Video Playing</span>
            </div>
          )}
        </div>
      </div>

      {/* Video Controls - Sleek mobile design */}
      {targetDetected && projectData?.videoUrl && (
        <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 z-30 px-3 sm:px-4">
          <div className="max-w-md mx-auto bg-black/60 backdrop-blur-lg rounded-2xl p-3 sm:p-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={safeToggleVideo}
                className="p-3 sm:p-3.5 bg-white/20 hover:bg-white/30 active:bg-white/40 active:scale-95 rounded-full text-white transition-all duration-200 shadow-lg flex-shrink-0"
                aria-label={videoPlaying ? 'Pause video' : 'Play video'}
              >
                {videoPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" /> : <Play size={20} className="sm:w-6 sm:h-6" />}
              </button>
              
              {/* Video Status */}
              <div className="flex-1 text-center text-white min-w-0">
                <p className="text-xs sm:text-sm font-semibold truncate">
                  {videoPlaying ? '▶️ Video Playing' : '⏸️ Paused'}
                </p>
                <p className="text-xs text-gray-300 mt-0.5 hidden sm:block">
                  Tap to {videoPlaying ? 'pause' : 'play'}
                </p>
              </div>
              
              {/* Mute/Unmute Button */}
              <button
                onClick={safeToggleMute}
                className="p-3 sm:p-3.5 bg-white/20 hover:bg-white/30 active:bg-white/40 active:scale-95 rounded-full text-white transition-all duration-200 shadow-lg flex-shrink-0"
                aria-label={videoMuted ? 'Unmute video' : 'Mute video'}
              >
                {videoMuted ? <VolumeX size={20} className="sm:w-6 sm:h-6" /> : <Volume2 size={20} className="sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Media Links - Only show if user has social links */}
      {projectData?.socialLinks && Object.values(projectData.socialLinks).some(link => link && link.trim() !== '') && (
        <div className="fixed bottom-28 sm:bottom-32 left-0 right-0 z-30 px-3 sm:px-4">
          <div className="max-w-md mx-auto bg-black/60 backdrop-blur-lg rounded-2xl p-3 sm:p-4 border border-white/10 shadow-2xl">
            <h4 className="text-white font-semibold text-sm sm:text-base mb-3 flex items-center gap-2">
              <ExternalLink size={16} className="sm:w-5 sm:h-5" />
              Connect With Us
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {Object.entries(projectData.socialLinks).map(([platform, url]) => {
                if (!url || url.trim() === '') return null;

                const platformConfig = {
                  instagram: { icon: Instagram, color: 'bg-pink-500/20 hover:bg-pink-500/30', label: 'Instagram' },
                  facebook: { icon: Facebook, color: 'bg-blue-500/20 hover:bg-blue-500/30', label: 'Facebook' },
                  twitter: { icon: Twitter, color: 'bg-sky-500/20 hover:bg-sky-500/30', label: 'Twitter' },
                  linkedin: { icon: Linkedin, color: 'bg-blue-600/20 hover:bg-blue-600/30', label: 'LinkedIn' },
                  website: { icon: Globe, color: 'bg-green-500/20 hover:bg-green-500/30', label: 'Website' }
                };

                const config = platformConfig[platform];
                if (!config) return null;

                const Icon = config.icon;
                return (
                  <button
                    key={platform}
                    onClick={() => handleSocialClick(platform, url)}
                    className={`p-2 sm:p-3 ${config.color} rounded-xl text-white transition-all duration-200 shadow-lg flex flex-col items-center gap-1 sm:gap-2 active:scale-95`}
                    aria-label={`Visit ${config.label}`}
                  >
                    <Icon size={16} className="sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium capitalize">{platform}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Scanning Instructions - Helpful tips when scanning */}
      {isScanning && !targetDetected && (
        <div className="fixed bottom-40 sm:bottom-44 left-0 right-0 z-30 px-3 sm:px-4">
          <div className="max-w-md mx-auto bg-black/70 backdrop-blur-lg rounded-2xl p-3 sm:p-4 border border-yellow-400/30 shadow-2xl">
            <h4 className="text-yellow-100 font-bold text-xs sm:text-sm mb-2 flex items-center gap-2">
              <span className="text-yellow-400 text-base">💡</span>
              Scanning Tips
            </h4>
            <ul className="text-yellow-50 text-xs space-y-1">
              <li>• Scan the <strong>composite image</strong> (design + QR code)</li>
              <li>• Use the image from <strong>Step 5: Final Design</strong></li>
              <li>• Keep camera <strong>30-50cm away</strong></li>
              <li>• Ensure <strong>good lighting</strong>, no glare</li>
              <li>• Hold camera <strong>steady</strong> and perpendicular</li>
            </ul>
          </div>
        </div>
      )}

      {/* Bottom Action Buttons - Professional mobile-first design */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="safe-bottom px-3 py-4 sm:px-4 sm:py-6">
          <div className="flex items-center justify-center gap-3">
            {!isScanning ? (
              // Start AR Button - Large and prominent
              <button
                onClick={safeStartScanning}
                disabled={!arReady}
                className="px-6 py-3.5 sm:px-8 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full font-bold text-sm sm:text-base flex items-center gap-2 sm:gap-3 transition-all duration-200 shadow-xl shadow-blue-500/30 border border-white/10"
                aria-label="Start AR Experience"
              >
                <Camera size={20} className="sm:w-5 sm:h-5" />
                <span>Start AR Experience</span>
              </button>
            ) : (
              // Stop and Restart Buttons - Clean layout
              <div className="flex gap-2 sm:gap-3 w-full max-w-md">
                <button
                  onClick={safeStopScanning}
                  className="flex-1 px-4 py-3 sm:px-6 sm:py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-95 text-white rounded-full font-bold text-sm sm:text-base transition-all duration-200 shadow-xl shadow-red-500/30 border border-white/10"
                  aria-label="Stop Scanning"
                >
                  Stop Scanning
                </button>
                
                <button
                  onClick={safeRestartAR}
                  className="p-3 sm:p-3.5 bg-gray-700/80 hover:bg-gray-600/80 active:scale-95 text-white rounded-full transition-all duration-200 shadow-lg border border-white/10 flex-shrink-0"
                  aria-label="Restart AR"
                >
                  <RefreshCw size={20} className="sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ARControls;
