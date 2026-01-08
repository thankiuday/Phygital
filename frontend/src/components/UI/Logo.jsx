/**
 * Logo Component
 * Reusable Phygital logo with Cloudinary image or gradient QR code icon fallback
 * Used across navbar, footer, and loaders for consistent branding
 */

import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getLogoUrlWithFallback } from '../../config/logo';

const Logo = ({ 
  size = 'md', 
  showText = true, 
  showGlow = false,
  linkTo = '/',
  className = '' 
}) => {
  const sizeClasses = {
    sm: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-base',
      rounded: 'rounded-lg'
    },
    md: {
      container: 'w-12 h-12',
      icon: 'w-6 h-6',
      text: 'text-xl',
      rounded: 'rounded-lg'
    },
    lg: {
      container: 'w-16 h-16',
      icon: 'w-8 h-8',
      text: 'text-2xl',
      rounded: 'rounded-xl'
    },
    xl: {
      container: 'w-20 h-20',
      icon: 'w-10 h-10',
      text: 'text-3xl',
      rounded: 'rounded-2xl'
    },
    '2xl': {
      container: 'w-32 h-32',
      icon: 'w-16 h-16',
      text: 'text-4xl',
      rounded: 'rounded-2xl'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;
  const logoUrl = getLogoUrlWithFallback();
  const [imageError, setImageError] = useState(false);

  // Debug: Log the logo URL being used
  React.useEffect(() => {
    console.log('🔍 Logo component initialized with URL:', logoUrl);
  }, [logoUrl]);

  const LogoContent = () => {
    // Always try to show image (has default URL), fallback to icon if error
    const showImage = !imageError;
    const showIcon = imageError;

    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {/* Logo Box */}
        <div className={`relative ${currentSize.container}`} style={{ backgroundColor: 'transparent' }}>
          {/* Optional outer glow ring */}
          {showGlow && (
            <div className="absolute inset-0 animate-ping opacity-20">
              <div className={`${currentSize.container} bg-gradient-to-br from-neon-blue to-neon-purple ${currentSize.rounded}`}></div>
            </div>
          )}
          
          {/* Image logo */}
          {showImage && (
            <img
              src={logoUrl}
              alt="Phygital Logo"
              className={`w-full h-full ${currentSize.rounded} object-contain ${showGlow ? 'shadow-glow-lg animate-pulse' : ''} transition-transform hover:scale-105`}
              style={{
                imageRendering: 'high-quality',
                display: 'block',
                backgroundColor: 'transparent',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none'
              }}
              onError={(e) => {
                console.error('❌ Logo image failed to load:', logoUrl);
                console.error('Error details:', e);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('✅ Logo image loaded successfully:', logoUrl);
              }}
            />
          )}
          
          {/* Fallback icon logo */}
          {showIcon && (
            <div 
              className={`absolute inset-0 ${currentSize.container} bg-gradient-to-br from-neon-blue to-neon-purple ${currentSize.rounded} flex items-center justify-center ${showGlow ? 'shadow-glow-lg animate-pulse' : 'shadow-lg'} transition-transform hover:scale-105`}
            >
              <QrCode className={`${currentSize.icon} text-white`} />
            </div>
          )}
        </div>

        {/* Brand Text */}
        {showText && (
          <span className={`${currentSize.text} font-bold text-gradient`}>
            Phygital
          </span>
        )}
      </div>
    );
  };

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
