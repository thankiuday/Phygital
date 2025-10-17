/**
 * AR Controls Component
 * Handles AR scanning controls and video controls
 */

import React from 'react';
import { Play, Pause, Volume2, VolumeX, RefreshCw, Instagram, Facebook, Twitter, Linkedin, Globe, ExternalLink } from 'lucide-react';

const ARControls = ({
  isScanning,
  arReady,
  targetDetected,
  videoPlaying,
  videoMuted,
  projectData = {}, // Default empty object to prevent crashes
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

      {/* Video Controls and Social Links - Futuristic glass design */}
      {targetDetected && projectData?.videoUrl && (
        <div className="fixed bottom-16 sm:bottom-20 left-0 right-0 z-30 px-3 sm:px-4">
          <div className="max-w-md mx-auto space-y-3">
            {/* Video Controls */}
            <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-slate-600/40 shadow-2xl hover:shadow-neon-blue/20 transition-all duration-300">
              {/* Animated border glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-neon-blue/20 via-neon-purple/20 to-neon-pink/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative flex items-center justify-between gap-3 sm:gap-4">
                {/* Play/Pause Button - Enhanced */}
                <button
                  onClick={safeToggleVideo}
                  className="group relative p-3 sm:p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:from-neon-blue/20 hover:to-neon-purple/20 active:scale-95 rounded-xl text-white transition-all duration-300 shadow-lg hover:shadow-neon-blue/30 border border-slate-600/30 hover:border-neon-blue/50 flex-shrink-0"
                  aria-label={videoPlaying ? 'Pause video' : 'Play video'}
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-blue/10 to-neon-purple/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {videoPlaying ? <Pause size={20} className="sm:w-6 sm:h-6 relative z-10 group-hover:scale-110 transition-transform" /> : <Play size={20} className="sm:w-6 sm:h-6 relative z-10 group-hover:scale-110 transition-transform" />}
                </button>

                {/* Video Status - Enhanced */}
                <div className="flex-1 text-center text-white min-w-0">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${videoPlaying ? 'bg-neon-green animate-pulse' : 'bg-slate-500'}`} />
                    <p className="text-sm sm:text-base font-semibold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                      {videoPlaying ? '▶️ Video Playing' : '⏸️ Paused'}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
                    Tap to {videoPlaying ? 'pause' : 'play'}
                  </p>
                </div>

                {/* Mute/Unmute Button - Enhanced */}
                <button
                  onClick={safeToggleMute}
                  className="group relative p-3 sm:p-4 bg-gradient-to-br from-slate-800/80 to-slate-900/80 hover:from-neon-cyan/20 hover:to-neon-green/20 active:scale-95 rounded-xl text-white transition-all duration-300 shadow-lg hover:shadow-neon-cyan/30 border border-slate-600/30 hover:border-neon-cyan/50 flex-shrink-0"
                  aria-label={videoMuted ? 'Unmute video' : 'Mute video'}
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-cyan/10 to-neon-green/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {videoMuted ? <VolumeX size={20} className="sm:w-6 sm:h-6 relative z-10 group-hover:scale-110 transition-transform" /> : <Volume2 size={20} className="sm:w-6 sm:h-6 relative z-10 group-hover:scale-110 transition-transform" />}
                </button>
              </div>
            </div>

            {/* Social Media Links - Only show if user has social links */}
            {projectData?.socialLinks && Object.values(projectData.socialLinks).some(link => link && link.trim() !== '') && (
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-slate-600/40 shadow-2xl hover:shadow-neon-purple/20 transition-all duration-300">
                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-neon-purple/20 via-neon-pink/20 to-neon-blue/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-bold text-base sm:text-lg flex items-center gap-2">
                      <ExternalLink size={18} className="sm:w-6 sm:h-6 text-neon-purple" />
                      <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        Connect With Us
                      </span>
                    </h4>
                    <span className="text-xs text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-600/30">
                      {Object.values(projectData.socialLinks).filter(link => link && link.trim() !== '').length} links
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {Object.entries(projectData.socialLinks).map(([platform, url]) => {
                      if (!url || url.trim() === '') return null;

                      const platformConfig = {
                        instagram: {
                          icon: Instagram,
                          color: 'from-pink-500/30 to-purple-500/30 hover:from-pink-500/50 hover:to-purple-500/50',
                          glow: 'shadow-pink-500/30 hover:shadow-pink-500/50',
                          label: 'Instagram'
                        },
                        facebook: {
                          icon: Facebook,
                          color: 'from-blue-500/30 to-blue-600/30 hover:from-blue-500/50 hover:to-blue-600/50',
                          glow: 'shadow-blue-500/30 hover:shadow-blue-500/50',
                          label: 'Facebook'
                        },
                        twitter: {
                          icon: Twitter,
                          color: 'from-sky-500/30 to-sky-600/30 hover:from-sky-500/50 hover:to-sky-600/50',
                          glow: 'shadow-sky-500/30 hover:shadow-sky-500/50',
                          label: 'Twitter'
                        },
                        linkedin: {
                          icon: Linkedin,
                          color: 'from-blue-600/30 to-blue-700/30 hover:from-blue-600/50 hover:to-blue-700/50',
                          glow: 'shadow-blue-600/30 hover:shadow-blue-600/50',
                          label: 'LinkedIn'
                        },
                        website: {
                          icon: Globe,
                          color: 'from-green-500/30 to-green-600/30 hover:from-green-500/50 hover:to-green-600/50',
                          glow: 'shadow-green-500/30 hover:shadow-green-500/50',
                          label: 'Website'
                        }
                      };

                      const config = platformConfig[platform];
                      if (!config) return null;

                      const Icon = config.icon;
                      return (
                        <button
                          key={platform}
                          onClick={() => handleSocialClick(platform, url)}
                          className={`group relative p-3 sm:p-4 bg-gradient-to-br ${config.color} rounded-xl text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-white/10 backdrop-blur-sm`}
                          aria-label={`Visit ${config.label}`}
                        >
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative flex flex-col items-center gap-2 sm:gap-3">
                            <Icon size={18} className="sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                            <span className="text-xs sm:text-sm font-semibold capitalize">{platform}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scanning Instructions - Enhanced futuristic design */}
      {isScanning && !targetDetected && (
        <div className="fixed bottom-32 sm:bottom-36 left-0 right-0 z-30 px-3 sm:px-4">
          <div className="relative max-w-md mx-auto">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 rounded-2xl blur-xl animate-pulse" />

            <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 border border-yellow-400/40 shadow-2xl hover:shadow-yellow-400/30 transition-all duration-300">
              {/* Animated border */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/30 via-orange-400/30 to-red-400/30 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-400/20 rounded-xl">
                    <span className="text-2xl animate-bounce">💡</span>
                  </div>
                  <h4 className="text-yellow-100 font-bold text-base sm:text-lg bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
                    Scanning Guide
                  </h4>
                </div>

                <div className="space-y-3">
                  {[
                    { icon: '🎯', text: 'Scan the composite image (design + QR code)', highlight: 'composite image' },
                    { icon: '📸', text: 'Use the image from Step 5: Final Design', highlight: 'Step 5' },
                    { icon: '📏', text: 'Keep camera 30-50cm away', highlight: '30-50cm' },
                    { icon: '💡', text: 'Ensure good lighting, no glare', highlight: 'good lighting' },
                    { icon: '🎯', text: 'Hold camera steady and perpendicular', highlight: 'steady' }
                  ].map((tip, index) => (
                    <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800/70 transition-colors duration-200">
                      <span className="text-yellow-400 text-sm">{tip.icon}</span>
                      <p className="text-slate-200 text-sm leading-relaxed">
                        {tip.text.split(tip.highlight).map((part, i) => (
                          <span key={i}>
                            {part}
                            {i < tip.text.split(tip.highlight).length - 1 && (
                              <span className="text-yellow-400 font-semibold">{tip.highlight}</span>
                            )}
                          </span>
                        ))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default ARControls;
