/**
 * Loading Screen Component
 * Shows loading state with animated website logo
 */

import React from 'react';
import { QrCode } from 'lucide-react';

const LoadingScreen = ({ 
  librariesLoaded, 
  projectData, 
  showDebug, 
  setShowDebug, 
  DebugPanel 
}) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center p-4">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-neon-purple/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-neon-blue/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 text-center text-white max-w-md w-full">
        {/* Animated Website Logo */}
        <div className="relative mb-8">
          {/* Outer glow ring */}
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className="w-24 h-24 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl mx-auto"></div>
          </div>
          
          {/* Main logo */}
          <div className="relative w-24 h-24 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center shadow-glow-lg animate-pulse mx-auto">
            <QrCode className="w-12 h-12 text-white" />
          </div>
        </div>
        
        {/* Loading Text */}
        <h2 className="text-4xl font-bold text-gradient mb-4 animate-fade-in">Phygital</h2>
        <p className="text-sm sm:text-base text-slate-400 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Loading AR Experience...
        </p>

        {/* Animated loading bar */}
        <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden mx-auto mb-6">
          <div className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink animate-loading-bar"></div>
        </div>

        {/* Loading dots */}
        <div className="flex space-x-2 justify-center">
          <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
