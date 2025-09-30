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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center text-white max-w-md w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="mb-6">Loading AR Experience...</p>
        
        {/* Debug info during loading */}
        <div className="text-sm text-gray-400 mb-4">
          <p>Libraries: {librariesLoaded ? '✅ Loaded' : '⏳ Loading...'}</p>
          <p>Project Data: {projectData ? '✅ Loaded' : '⏳ Loading...'}</p>
        </div>
        
        {/* Debug button */}
        <button
          onClick={() => setShowDebug(true)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
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
