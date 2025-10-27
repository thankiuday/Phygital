/**
 * Logo Component
 * Reusable Phygital logo with gradient and QR code icon
 * Used across navbar, footer, and loaders for consistent branding
 */

import React from 'react';
import { QrCode } from 'lucide-react';
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
      container: 'w-6 h-6',
      icon: 'w-3 h-3',
      text: 'text-base',
      rounded: 'rounded-lg'
    },
    md: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-xl',
      rounded: 'rounded-lg'
    },
    lg: {
      container: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-2xl',
      rounded: 'rounded-xl'
    },
    xl: {
      container: 'w-16 h-16',
      icon: 'w-8 h-8',
      text: 'text-3xl',
      rounded: 'rounded-2xl'
    },
    '2xl': {
      container: 'w-24 h-24',
      icon: 'w-12 h-12',
      text: 'text-4xl',
      rounded: 'rounded-2xl'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  const LogoContent = () => (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Logo Box */}
      <div className="relative">
        {/* Optional outer glow ring */}
        {showGlow && (
          <div className="absolute inset-0 animate-ping opacity-20">
            <div className={`${currentSize.container} bg-gradient-to-br from-neon-blue to-neon-purple ${currentSize.rounded}`}></div>
          </div>
        )}
        
        {/* Main logo */}
        <div className={`${currentSize.container} bg-gradient-to-br from-neon-blue to-neon-purple ${currentSize.rounded} flex items-center justify-center ${showGlow ? 'shadow-glow-lg animate-pulse' : 'shadow-lg'} transition-transform hover:scale-105`}>
          <QrCode className={`${currentSize.icon} text-white`} />
        </div>
      </div>

      {/* Brand Text */}
      {showText && (
        <span className={`${currentSize.text} font-bold text-gradient`}>
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

