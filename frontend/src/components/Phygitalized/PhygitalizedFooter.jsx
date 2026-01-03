/**
 * Phygitalized Footer Component
 * Simple footer with logo and "Powered by Phygital.zone" text
 * Clickable - redirects to https://phygital.zone/
 * Used on all phygitalized landing pages
 */

import React from 'react';
import Logo from '../UI/Logo';

const PhygitalizedFooter = () => {
  const handleClick = () => {
    window.open('https://phygital.zone/', '_blank', 'noopener,noreferrer');
  };

  return (
    <footer 
      className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-t backdrop-blur-md cursor-pointer transition-all duration-200 hover:opacity-80"
      style={{
        backgroundColor: 'var(--theme-card, rgba(30, 41, 59, 0.6))',
        borderColor: 'var(--theme-border, rgba(148, 163, 184, 0.2))'
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label="Visit Phygital.zone"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Logo 
            size="sm" 
            showText={false} 
            linkTo={null}
            showGlow={false}
          />
        </div>
        
        {/* Powered by text */}
        <div 
          className="text-xs sm:text-sm text-slate-300 sm:text-slate-400 font-medium text-center sm:text-left"
          style={{
            color: 'var(--theme-text-secondary, rgba(148, 163, 184, 0.8))'
          }}
        >
          Powered by <span className="font-semibold" style={{ color: 'var(--theme-primary, #3B82F6)' }}>Phygital.zone</span>
        </div>
      </div>
    </footer>
  );
};

export default PhygitalizedFooter;

