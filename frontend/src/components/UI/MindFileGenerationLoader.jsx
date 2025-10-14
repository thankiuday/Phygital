/**
 * Mind File Generation Loader Component
 * Shows during AR target file (.mind) generation
 * More detailed progress indicator for long-running process
 */

import React from 'react';
import { QrCode, Cpu, Zap } from 'lucide-react';

const MindFileGenerationLoader = ({ isLoading, message = 'Generating AR tracking file...' }) => {
  // Debug logging
  React.useEffect(() => {
    console.log('🔍 MindFileGenerationLoader state:', { isLoading, message });
  }, [isLoading, message]);

  if (!isLoading) {
    console.log('❌ MindFileGenerationLoader: isLoading is false, not rendering');
    return null;
  }

  console.log('✅ MindFileGenerationLoader: Rendering loader with message:', message);

  return (
    <div className="fixed inset-0 z-[99999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center backdrop-blur-sm">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-neon-purple/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-neon-blue/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-md mx-auto px-4">
        {/* Processing animation */}
        <div className="relative mb-8">
          {/* Rotating outer ring */}
          <div className="absolute inset-0 animate-spin">
            <div className="w-32 h-32 border-4 border-transparent border-t-neon-blue border-r-neon-purple rounded-full"></div>
          </div>
          
          {/* Inner pulsing logo */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center shadow-glow-lg animate-pulse">
              <Cpu className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* Brand */}
        <h1 className="text-3xl font-bold text-gradient mb-3 animate-fade-in">
          Phygital
        </h1>

        {/* Status message */}
        <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4 mb-4 w-full">
          <div className="flex items-center justify-center mb-3">
            <Zap className="w-5 h-5 text-neon-blue mr-2 animate-pulse" />
            <p className="text-slate-200 font-medium text-center">
              {message}
            </p>
          </div>
          
          {/* Progress steps */}
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-neon-green rounded-full mr-2 animate-pulse"></div>
              <span>Processing design image...</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-neon-blue rounded-full mr-2 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <span>Generating AR tracking data...</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-neon-purple rounded-full mr-2 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              <span>Creating .mind file...</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <p className="text-slate-400 text-sm text-center mb-6">
          This may take 10-30 seconds depending on image complexity
        </p>

        {/* Animated loading bar */}
        <div className="w-full max-w-xs h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink animate-loading-bar"></div>
        </div>

        {/* Tech indicator */}
        <div className="flex items-center space-x-2 mt-6 text-xs text-slate-500">
          <QrCode className="w-3 h-3" />
          <span>Powered by MindAR Image Tracking</span>
        </div>
      </div>
    </div>
  );
};

export default MindFileGenerationLoader;

