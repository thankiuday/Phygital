/**
 * Loading Screen Component
 * Shows loading state with debug information
 */

import React from 'react';

const LoadingScreen = ({ 
  librariesLoaded, 
  projectData, 
  showDebug, 
  setShowDebug, 
  DebugPanel 
}) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="text-center text-white max-w-md w-full">
        {/* Animated Logo/Spinner */}
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-20 w-20 sm:h-24 sm:w-24 border-4 border-gray-700 border-t-blue-500 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
          </div>
        </div>
        
        {/* Loading Text */}
        <h2 className="text-xl sm:text-2xl font-bold mb-2 animate-pulse">Loading AR Experience</h2>
        <p className="text-sm sm:text-base text-gray-400 mb-8">Preparing your augmented reality...</p>
        
        {/* Status Cards */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-4 sm:p-5 border border-gray-700 mb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Libraries</span>
              <div className="flex items-center gap-2">
                {librariesLoaded ? (
                  <>
                    <span className="text-green-400 text-sm font-medium">Loaded</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </>
                ) : (
                  <>
                    <span className="text-gray-400 text-sm">Loading...</span>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                  </>
                )}
              </div>
            </div>
            
            <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Project Data</span>
              <div className="flex items-center gap-2">
                {projectData ? (
                  <>
                    <span className="text-green-400 text-sm font-medium">Loaded</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </>
                ) : (
                  <>
                    <span className="text-gray-400 text-sm">Loading...</span>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Debug button */}
        <button
          onClick={() => setShowDebug(true)}
          className="px-5 py-2.5 bg-gray-800/80 hover:bg-gray-700/80 active:bg-gray-600/80 text-white rounded-full text-sm font-medium transition-all duration-200 border border-gray-600 shadow-lg"
        >
          Show Debug Info
        </button>
      </div>
      
      {/* Debug Panel - available even during loading */}
      <DebugPanel />
    </div>
  );
};

export default LoadingScreen;
