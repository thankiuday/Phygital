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
          {/* Corner Brackets */}
          <div className="absolute top-2 left-2 w-6 h-6">
            <div className="absolute top-0 left-0 w-4 h-0.5 bg-white rounded-sm opacity-80"></div>
            <div className="absolute top-0 left-0 w-0.5 h-4 bg-white rounded-sm opacity-80"></div>
          </div>
          <div className="absolute top-2 right-2 w-6 h-6">
            <div className="absolute top-0 right-0 w-4 h-0.5 bg-white rounded-sm opacity-80"></div>
            <div className="absolute top-0 right-0 w-0.5 h-4 bg-white rounded-sm opacity-80"></div>
          </div>
          <div className="absolute bottom-2 left-2 w-6 h-6">
            <div className="absolute bottom-0 left-0 w-4 h-0.5 bg-white rounded-sm opacity-80"></div>
            <div className="absolute bottom-0 left-0 w-0.5 h-4 bg-white rounded-sm opacity-80"></div>
          </div>
          <div className="absolute bottom-2 right-2 w-6 h-6">
            <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-white rounded-sm opacity-80"></div>
            <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-white rounded-sm opacity-80"></div>
          </div>

          {/* Scanning Line */}
          <div 
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-90"
            style={{
              top: `${scanProgress * 100}%`,
              transform: 'translateY(-50%)',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
            }}
          />

          {/* Scanning Pulse Effect */}
          <div 
            className="absolute inset-0 border-2 border-blue-400 rounded-lg opacity-60"
            style={{
              transform: `scale(${1 + scanProgress * 0.1})`,
              boxShadow: `0 0 ${20 + scanProgress * 30}px rgba(59, 130, 246, ${0.3 + scanProgress * 0.4})`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ScannerAnimation;
