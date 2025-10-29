/**
 * Logo Component
 * Reusable Phygital logo with brand image
 * Used across navbar, footer, and loaders for consistent branding
 */

import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ 
  size = 'md', 
  showText = true, 
  showGlow = false,
  linkTo = '/',
  className = '' 
}) => {
  const sizeClasses = {
    sm: {
      container: 'h-6',
      text: 'text-base',
    },
    md: {
      container: 'h-8',
      text: 'text-xl',
    },
    lg: {
      container: 'h-10',
      text: 'text-2xl',
    },
    xl: {
      container: 'h-16',
      text: 'text-3xl',
    },
    '2xl': {
      container: 'h-24',
      text: 'text-4xl',
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  const LogoContent = () => (
    <div className={`flex items-center gap-2 sm:gap-3 ${className}`}>
      {/* Logo Image */}
      <div className={`relative ${showGlow ? 'animate-pulse' : ''}`}>
        {/* Optional outer glow ring */}
        {showGlow && (
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className={`${currentSize.container} aspect-square rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple`}></div>
          </div>
        )}
        
        {/* Main logo image */}
        <img 
          src="/icons/PhygitalLogo.png" 
          alt="Phygital Logo" 
          className={`${currentSize.container} w-auto object-contain transition-transform hover:scale-105 ${showGlow ? 'drop-shadow-[0_0_15px_rgba(0,212,255,0.5)]' : 'drop-shadow-lg'}`}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <span className={`${currentSize.text} font-bold text-gradient whitespace-nowrap`}>
          Phygital
        </span>
      )}
    </div>
  );

  // If linkTo is provided, wrap in Link component
  if (linkTo) {
    return (
      <Link to={linkTo} className="inline-block">
        <LogoContent />
      </Link>
    );
  }

  // Otherwise, just return the logo content
  return <LogoContent />;
};

export default Logo;
