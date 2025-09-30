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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg max-h-96 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">AR Debug Panel</h3>
          <button
            onClick={() => setShowDebug(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <h4 className="font-medium">System Status</h4>
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${librariesLoaded ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${librariesLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  Libraries: {librariesLoaded ? 'Loaded' : 'Missing'}
                </div>
                <div className={`flex items-center gap-2 ${cameraActive ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  Camera: {cameraActive ? 'Active' : 'Inactive'}
                </div>
                <div className={`flex items-center gap-2 ${arReady ? 'text-green-600' : 'text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${arReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  AR: {arReady ? 'Ready' : 'Not Ready'}
                </div>
                <div className={`flex items-center gap-2 ${targetDetected ? 'text-green-600' : 'text-orange-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${targetDetected ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  Target: {targetDetected ? 'Detected' : 'Searching'}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Video Status</h4>
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${videoRef.current ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${videoRef.current ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  Video: {videoRef.current ? 'Loaded' : 'Not Loaded'}
                </div>
                <div className={`flex items-center gap-2 ${videoPlaying ? 'text-green-600' : 'text-gray-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${videoPlaying ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  Playing: {videoPlaying ? 'Yes' : 'No'}
                </div>
                <div className={`flex items-center gap-2 ${videoMuted ? 'text-orange-600' : 'text-green-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${videoMuted ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                  Audio: {videoMuted ? 'Muted' : 'Unmuted'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Recent Messages</h4>
            <div className="bg-gray-50 rounded p-2 max-h-32 overflow-y-auto text-xs space-y-1">
              {debugMessages.slice(-10).map(msg => (
                <div key={msg.id} className={`flex gap-2 ${
                  msg.type === 'error' ? 'text-red-600' : 
                  msg.type === 'success' ? 'text-green-600' : 
                  msg.type === 'warning' ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  <span className="text-gray-400">{msg.timestamp}</span>
                  <span>{msg.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
