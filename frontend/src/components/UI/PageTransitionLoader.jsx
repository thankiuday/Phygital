/**
 * Page Transition Loader Component
 * Shows Phygital branding during page transitions
 * Displays logo and loading animation
 */

import React from 'react';
import Logo from './Logo';

const PageTransitionLoader = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center" style={{ backgroundColor: '#0f172a' }}>
      {/* Dark mesh background */}
      <div className="absolute inset-0 bg-dark-mesh opacity-100"></div>
      
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 -top-48 -left-48 bg-neon-purple/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute w-96 h-96 -bottom-48 -right-48 bg-neon-blue/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with animation */}
        <div className="mb-8">
          <Logo size="2xl" showText={false} linkTo={null} showGlow={true} />
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

        {/* Loading dots - slower animation */}
        <div className="flex space-x-2 mt-6">
          <div className="w-2 h-2 bg-neon-blue rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '1s' }}></div>
          <div className="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1s' }}></div>
          <div className="w-2 h-2 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default PageTransitionLoader;

