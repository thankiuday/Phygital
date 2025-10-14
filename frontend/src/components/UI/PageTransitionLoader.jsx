/**
 * Page Transition Loader Component
 * Shows Phygital branding during page transitions
 * Displays logo and loading animation
 */

import React from 'react';
import { QrCode } from 'lucide-react';

const PageTransitionLoader = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-neon-purple/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-neon-blue/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with animation */}
        <div className="relative mb-8">
          {/* Outer glow ring */}
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className="w-24 h-24 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl"></div>
          </div>
          
          {/* Main logo */}
          <div className="relative w-24 h-24 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center shadow-glow-lg animate-pulse">
            <QrCode className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Brand name */}
        <h1 className="text-4xl font-bold text-gradient mb-4 animate-fade-in">
          Phygital
        </h1>

        {/* Loading text */}
        <p className="text-slate-400 text-sm mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Loading your experience...
        </p>

        {/* Animated loading bar */}
        <div className="w-64 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink animate-loading-bar"></div>
        </div>

        {/* Loading dots */}
        <div className="flex space-x-2 mt-6">
          <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default PageTransitionLoader;

