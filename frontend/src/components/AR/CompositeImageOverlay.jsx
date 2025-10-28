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
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [isVisible, onAnimationComplete]);

  if (!isVisible || (!projectData?.compositeDesignUrl && !projectData?.designUrl)) {
    return null;
  }

  return (
    <div className="absolute inset-0 w-full h-full flex items-center justify-center z-30 animate-fade-in">
      {/* Composite Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
        {/* Composite Design Image - Responsive sizing with proper container fit */}
        <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl h-full flex items-center justify-center">
          <img
            src={projectData.compositeDesignUrl || projectData.designUrl}
            alt="AR Target"
            className="w-full h-auto rounded-xl shadow-2xl animate-fade-in"
            loading="eager"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(59, 130, 246, 0.4))',
              maxHeight: '90%',
              maxWidth: '95%',
              objectFit: 'contain',
              width: 'auto',
              height: 'auto'
            }}
          />
          
          {/* Scanner Animation Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner Brackets - Responsive sizing */}
            <div className="absolute top-1 left-1 w-6 h-6 sm:w-8 sm:h-8">
              <div className="absolute top-0 left-0 w-4 h-0.5 sm:w-6 sm:h-0.5 bg-white rounded-sm opacity-90 shadow-lg"></div>
              <div className="absolute top-0 left-0 w-0.5 h-4 sm:w-0.5 sm:h-6 bg-white rounded-sm opacity-90 shadow-lg"></div>
            </div>
            <div className="absolute top-1 right-1 w-6 h-6 sm:w-8 sm:h-8">
              <div className="absolute top-0 right-0 w-4 h-0.5 sm:w-6 sm:h-0.5 bg-white rounded-sm opacity-90 shadow-lg"></div>
              <div className="absolute top-0 right-0 w-0.5 h-4 sm:w-0.5 sm:h-6 bg-white rounded-sm opacity-90 shadow-lg"></div>
            </div>
            <div className="absolute bottom-1 left-1 w-6 h-6 sm:w-8 sm:h-8">
              <div className="absolute bottom-0 left-0 w-4 h-0.5 sm:w-6 sm:h-0.5 bg-white rounded-sm opacity-90 shadow-lg"></div>
              <div className="absolute bottom-0 left-0 w-0.5 h-4 sm:w-0.5 sm:h-6 bg-white rounded-sm opacity-90 shadow-lg"></div>
            </div>
            <div className="absolute bottom-1 right-1 w-6 h-6 sm:w-8 sm:h-8">
              <div className="absolute bottom-0 right-0 w-4 h-0.5 sm:w-6 sm:h-0.5 bg-white rounded-sm opacity-90 shadow-lg"></div>
              <div className="absolute bottom-0 right-0 w-0.5 h-4 sm:w-0.5 sm:h-6 bg-white rounded-sm opacity-90 shadow-lg"></div>
            </div>

            {/* Scanning Line */}
            {showScanLine && (
              <div 
                className="absolute left-0 right-0 h-0.5 sm:h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-90"
                style={{
                  top: `${scanProgress * 100}%`,
                  transform: 'translateY(-50%)',
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.9), 0 0 30px rgba(59, 130, 246, 0.6)',
                }}
              />
            )}

            {/* Scanning Pulse Effect */}
            <div 
              className="absolute inset-0 border-2 border-blue-400 rounded-xl opacity-70"
              style={{
                transform: `scale(${1 + scanProgress * 0.05})`,
                boxShadow: `0 0 ${30 + scanProgress * 50}px rgba(59, 130, 246, ${0.4 + scanProgress * 0.3})`,
              }}
            />
          </div>
        </div>

        {/* Instructions Text - Responsive and smaller */}
        <div className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 text-center w-full max-w-sm px-4">
          <div className="bg-black/70 backdrop-blur-md rounded-lg px-3 py-2 sm:px-4 sm:py-3 border border-blue-400/40">
            <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <p className="text-white text-xs sm:text-sm font-medium">
                Point camera at this image
              </p>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <p className="text-blue-300 text-xs">
              Keep in frame to activate AR
            </p>
          </div>
        </div>

        {/* Top Status - Smaller and less intrusive */}
        <div className="absolute top-2 sm:top-4 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
            <p className="text-white text-xs font-medium flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span>AR Ready</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompositeImageOverlay;
