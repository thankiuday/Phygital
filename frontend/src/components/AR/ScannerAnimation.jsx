/**
 * Scanner Animation Component
 * Provides reusable scanner animation effects
 */

import React, { useEffect, useState } from 'react';

const ScannerAnimation = ({ 
  isActive = false, 
  duration = 2000, 
  onComplete,
  className = "",
  children 
}) => {
  const [scanProgress, setScanProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setScanProgress(0);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setScanProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        onComplete?.();
      }
    };

    requestAnimationFrame(animate);
  }, [isActive, duration, onComplete]);

  return (
    <div className={`relative ${className}`}>
      {children}
      
      {/* Scanner Overlay */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner Brackets - Responsive sizing */}
          <div className="absolute top-1 left-1 w-4 h-4 sm:w-6 sm:h-6">
            <div className="absolute top-0 left-0 w-3 h-0.5 sm:w-4 sm:h-0.5 bg-white rounded-sm opacity-90 shadow-lg"></div>
            <div className="absolute top-0 left-0 w-0.5 h-3 sm:w-0.5 sm:h-4 bg-white rounded-sm opacity-90 shadow-lg"></div>
          </div>
          <div className="absolute top-1 right-1 w-4 h-4 sm:w-6 sm:h-6">
            <div className="absolute top-0 right-0 w-3 h-0.5 sm:w-4 sm:h-0.5 bg-white rounded-sm opacity-90 shadow-lg"></div>
            <div className="absolute top-0 right-0 w-0.5 h-3 sm:w-0.5 sm:h-4 bg-white rounded-sm opacity-90 shadow-lg"></div>
          </div>
          <div className="absolute bottom-1 left-1 w-4 h-4 sm:w-6 sm:h-6">
            <div className="absolute bottom-0 left-0 w-3 h-0.5 sm:w-4 sm:h-0.5 bg-white rounded-sm opacity-90 shadow-lg"></div>
            <div className="absolute bottom-0 left-0 w-0.5 h-3 sm:w-0.5 sm:h-4 bg-white rounded-sm opacity-90 shadow-lg"></div>
          </div>
          <div className="absolute bottom-1 right-1 w-4 h-4 sm:w-6 sm:h-6">
            <div className="absolute bottom-0 right-0 w-3 h-0.5 sm:w-4 sm:h-0.5 bg-white rounded-sm opacity-90 shadow-lg"></div>
            <div className="absolute bottom-0 right-0 w-0.5 h-3 sm:w-0.5 sm:h-4 bg-white rounded-sm opacity-90 shadow-lg"></div>
          </div>

          {/* Scanning Line - Enhanced visibility */}
          <div 
            className="absolute left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-95"
            style={{
              top: `${scanProgress * 100}%`,
              transform: 'translateY(-50%)',
              boxShadow: '0 0 15px rgba(59, 130, 246, 0.9), 0 0 30px rgba(59, 130, 246, 0.6)',
            }}
          />

          {/* Scanning Pulse Effect - More subtle */}
          <div 
            className="absolute inset-0 border-2 border-blue-400 rounded-lg opacity-60"
            style={{
              transform: `scale(${1 + scanProgress * 0.05})`,
              boxShadow: `0 0 ${25 + scanProgress * 40}px rgba(59, 130, 246, ${0.4 + scanProgress * 0.3})`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ScannerAnimation;
