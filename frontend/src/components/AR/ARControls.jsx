/**
 * AR Controls Component
 * Handles AR scanning controls and video controls
 */

import React from 'react';
import { Camera, Play, Pause, Volume2, VolumeX, RefreshCw } from 'lucide-react';

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
  onToggleMute
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
  return (
    <>
      {/* Status Indicator - Modern and compact for mobile */}
      <div className="fixed top-16 sm:top-20 left-0 right-0 z-30 px-3 sm:px-4">
        <div className="flex items-center justify-center">
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
        </div>
      </div>

      {/* Video Controls - Sleek mobile design */}
      {targetDetected && projectData?.videoUrl && (
        <div className="fixed bottom-24 sm:bottom-28 left-0 right-0 z-30 px-3 sm:px-4">
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
