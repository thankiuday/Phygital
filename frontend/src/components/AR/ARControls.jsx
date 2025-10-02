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
      {/* Status Indicators */}
      <div className="absolute top-20 left-4 right-4 z-30">
        <div className="flex items-center justify-center">
          <div className={`px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm ${
            targetDetected 
              ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
              : isScanning 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
          }`}>
            {targetDetected ? '🎯 Target Detected' : isScanning ? '🔍 Scanning...' : '📱 Ready to Scan'}
          </div>
        </div>
      </div>

      {/* Video Controls */}
      {targetDetected && projectData?.videoUrl && (
        <div className="absolute bottom-32 sm:bottom-16 left-4 right-4 z-30">
          <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={safeToggleVideo}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                aria-label={videoPlaying ? 'Pause video' : 'Play video'}
              >
                {videoPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              
              <div className="flex-1 text-center text-white">
                <p className="text-sm font-medium">
                  {videoPlaying ? 'Video Playing' : 'Tap to Play Video'}
                </p>
              </div>
              
              <button
                onClick={safeToggleMute}
                className="p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                aria-label={videoMuted ? 'Unmute video' : 'Mute video'}
              >
                {videoMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-8 left-4 right-4 z-30">
        <div className="flex items-center justify-center gap-4">
          {!isScanning ? (
            <button
              onClick={safeStartScanning}
              disabled={!arReady}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-full font-semibold flex items-center gap-2 transition-colors"
              aria-label="Start AR Experience"
            >
              <Camera size={20} />
              Start AR Experience
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={safeStopScanning}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium transition-colors"
                aria-label="Stop Scanning"
              >
                Stop Scanning
              </button>
              
              <button
                onClick={safeRestartAR}
                className="p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-full transition-colors"
                aria-label="Restart AR"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ARControls;
