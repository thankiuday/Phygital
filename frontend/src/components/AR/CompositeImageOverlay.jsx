/**
 * Composite Image Overlay Component
 * Displays the project composite image with scanner animation
 * Shows when AR page loads and target is not detected
 */

import React, { useEffect, useState } from 'react';

const CompositeImageOverlay = ({ 
  projectData, 
  isVisible, 
  onAnimationComplete 
}) => {
  const [scanProgress, setScanProgress] = useState(0);
  const [showScanLine, setShowScanLine] = useState(false);

  // Scanner animation effect
  useEffect(() => {
    if (!isVisible) return;

    const animationDuration = 2000; // 2 seconds
    const frameRate = 60;
    const totalFrames = (animationDuration / 1000) * frameRate;
    let currentFrame = 0;

    const animate = () => {
      currentFrame++;
      const progress = Math.min(currentFrame / totalFrames, 1);
      setScanProgress(progress);
      
      // Show scan line when animation starts
      if (progress > 0.1) {
        setShowScanLine(true);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Animation complete
        setTimeout(() => {
          setScanProgress(0);
          setShowScanLine(false);
          onAnimationComplete?.();
        }, 500);
      }
    };

    const timeoutId = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isVisible, onAnimationComplete]);

  if (!isVisible || (!projectData?.compositeDesignUrl && !projectData?.designUrl)) {
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center z-30">
      {/* Composite Image Container */}
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Composite Design Image */}
        <div className="relative max-w-sm w-full mx-4">
          <img
            src={projectData.compositeDesignUrl || projectData.designUrl}
            alt="AR Target"
            className="w-full h-auto rounded-lg shadow-2xl"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(59, 130, 246, 0.3))',
            }}
          />
          
          {/* Scanner Animation Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8">
              <div className="absolute top-0 left-0 w-6 h-0.5 bg-white rounded-sm opacity-80"></div>
              <div className="absolute top-0 left-0 w-0.5 h-6 bg-white rounded-sm opacity-80"></div>
            </div>
            <div className="absolute top-0 right-0 w-8 h-8">
              <div className="absolute top-0 right-0 w-6 h-0.5 bg-white rounded-sm opacity-80"></div>
              <div className="absolute top-0 right-0 w-0.5 h-6 bg-white rounded-sm opacity-80"></div>
            </div>
            <div className="absolute bottom-0 left-0 w-8 h-8">
              <div className="absolute bottom-0 left-0 w-6 h-0.5 bg-white rounded-sm opacity-80"></div>
              <div className="absolute bottom-0 left-0 w-0.5 h-6 bg-white rounded-sm opacity-80"></div>
            </div>
            <div className="absolute bottom-0 right-0 w-8 h-8">
              <div className="absolute bottom-0 right-0 w-6 h-0.5 bg-white rounded-sm opacity-80"></div>
              <div className="absolute bottom-0 right-0 w-0.5 h-6 bg-white rounded-sm opacity-80"></div>
            </div>

            {/* Scanning Line */}
            {showScanLine && (
              <div 
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-90"
                style={{
                  top: `${scanProgress * 100}%`,
                  transform: 'translateY(-50%)',
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
                }}
              />
            )}

            {/* Scanning Pulse Effect */}
            <div 
              className="absolute inset-0 border-2 border-blue-400 rounded-lg opacity-60"
              style={{
                transform: `scale(${1 + scanProgress * 0.1})`,
                boxShadow: `0 0 ${20 + scanProgress * 30}px rgba(59, 130, 246, ${0.3 + scanProgress * 0.4})`,
              }}
            />
          </div>
        </div>

        {/* Instructions Text */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-blue-400/30">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <p className="text-white text-sm font-medium">
                Point your camera at this image
              </p>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <p className="text-blue-300 text-xs">
              Keep the image in the frame to activate AR experience
            </p>
          </div>
        </div>

        {/* Top Instructions */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
            <p className="text-white text-xs font-medium">
              📱 AR Target Detected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompositeImageOverlay;
