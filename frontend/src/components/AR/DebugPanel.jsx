/**
 * Debug Panel Component
 * Shows AR debug information and system status
 */

import React from 'react';
import { X } from 'lucide-react';

const DebugPanel = ({ 
  showDebug, 
  setShowDebug, 
  librariesLoaded, 
  cameraActive, 
  arReady, 
  targetDetected, 
  videoRef, 
  videoPlaying, 
  videoMuted, 
  debugMessages 
}) => {
  if (!showDebug) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      {/* Modal Container - Slides up from bottom on mobile */}
      <div 
        className="bg-white dark:bg-gray-900 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Debug Panel</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">System diagnostics & logs</p>
            </div>
          </div>
          <button
            onClick={() => setShowDebug(false)}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-full transition-colors"
            aria-label="Close debug panel"
          >
            <X size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(85vh-80px)] sm:max-h-[calc(80vh-80px)]">
          {/* Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* System Status Card */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-blue-200 dark:border-gray-600">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                System Status
              </h4>
              <div className="space-y-2.5">
                <div className={`flex items-center gap-2.5 ${librariesLoaded ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${librariesLoaded ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">Libraries: {librariesLoaded ? 'Loaded ✓' : 'Missing ✗'}</span>
                </div>
                <div className={`flex items-center gap-2.5 ${cameraActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">Camera: {cameraActive ? 'Active ✓' : 'Inactive ✗'}</span>
                </div>
                <div className={`flex items-center gap-2.5 ${arReady ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${arReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium">AR System: {arReady ? 'Ready ✓' : 'Not Ready ✗'}</span>
                </div>
                <div className={`flex items-center gap-2.5 ${targetDetected ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${targetDetected ? 'bg-green-500 animate-pulse' : 'bg-orange-500 animate-pulse'}`}></div>
                  <span className="text-sm font-medium">Target: {targetDetected ? 'Detected 🎯' : 'Searching 🔍'}</span>
                </div>
              </div>
            </div>
            
            {/* Video Status Card */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-purple-200 dark:border-gray-600">
              <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                Video Status
              </h4>
              <div className="space-y-2.5">
                <div className={`flex items-center gap-2.5 ${videoRef.current ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${videoRef.current ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium">Video: {videoRef.current ? 'Loaded ✓' : 'Not Loaded'}</span>
                </div>
                <div className={`flex items-center gap-2.5 ${videoPlaying ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${videoPlaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium">Playback: {videoPlaying ? 'Playing ▶️' : 'Paused ⏸️'}</span>
                </div>
                <div className={`flex items-center gap-2.5 ${videoMuted ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${videoMuted ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                  <span className="text-sm font-medium">Audio: {videoMuted ? 'Muted 🔇' : 'Unmuted 🔊'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Debug Messages */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-gray-500 rounded-full"></div>
              Debug Messages
              <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 font-normal">Last 10 messages</span>
            </h4>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto text-xs space-y-2 font-mono border border-gray-200 dark:border-gray-700">
              {debugMessages.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No messages yet</p>
              ) : (
                debugMessages.slice(-10).reverse().map(msg => (
                  <div key={msg.id} className={`flex gap-2 p-2 rounded ${
                    msg.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 
                    msg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 
                    msg.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' : 
                    'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                    <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">{msg.timestamp}</span>
                    <span className="flex-1 break-words">{msg.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
