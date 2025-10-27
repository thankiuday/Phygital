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
        className="bg-slate-800/95 backdrop-blur-sm w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[85vh] sm:max-h-[80vh] overflow-hidden shadow-dark-large animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-600/20 rounded-lg">
              <Settings size={20} className="text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-100">Debug Panel</h3>
              <p className="text-xs text-slate-400">System diagnostics & logs</p>
            </div>
          </div>
          <button
            onClick={() => setShowDebug(false)}
            className="p-2 hover:bg-slate-700/50 rounded-full transition-colors"
            aria-label="Close debug panel"
          >
            <X size={20} className="text-slate-300" />
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(85vh-80px)] sm:max-h-[calc(80vh-80px)]">
          {/* Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* System Status Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-600">
              <h4 className="font-bold text-slate-100 mb-3 flex items-center gap-2">
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
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-600">
              <h4 className="font-bold text-slate-100 mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                Video Status
              </h4>
              <div className="space-y-2.5">
                <div className={`flex items-center gap-2.5 ${videoRef.current ? 'text-green-400' : 'text-slate-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${videoRef.current ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                  <span className="text-sm font-medium">Video: {videoRef.current ? 'Loaded ✓' : 'Not Loaded'}</span>
                </div>
                <div className={`flex items-center gap-2.5 ${videoPlaying ? 'text-green-400' : 'text-slate-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${videoPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`}></div>
                  <span className="text-sm font-medium">Playback: {videoPlaying ? 'Playing ▶️' : 'Paused ⏸️'}</span>
                </div>
                <div className={`flex items-center gap-2.5 ${videoMuted ? 'text-orange-400' : 'text-green-400'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${videoMuted ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                  <span className="text-sm font-medium">Audio: {videoMuted ? 'Muted 🔇' : 'Unmuted 🔊'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Debug Messages */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-600">
            <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-gray-500 rounded-full"></div>
              Debug Messages
              <span className="ml-auto text-xs text-slate-400 font-normal">Last 10 messages</span>
            </h4>
            <div className="bg-slate-900/50 rounded-lg p-3 max-h-48 overflow-y-auto text-xs space-y-2 font-mono border border-slate-600">
              {debugMessages.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No messages yet</p>
              ) : (
                debugMessages.slice(-10).reverse().map(msg => (
                  <div key={msg.id} className={`flex gap-2 p-2 rounded ${
                    msg.type === 'error' ? 'bg-red-900/20 text-red-300' : 
                    msg.type === 'success' ? 'bg-green-900/20 text-green-300' : 
                    msg.type === 'warning' ? 'bg-orange-900/20 text-orange-300' : 
                    'bg-slate-800/50 text-slate-300'
                  }`}>
                    <span className="text-slate-400 flex-shrink-0">{msg.timestamp}</span>
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
