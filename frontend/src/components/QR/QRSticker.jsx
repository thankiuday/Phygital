/**
 * QR Sticker Component
 * Displays QR codes with gradient borders, "SCAN ME" text below, and shadow effects
 * Matches the design style shown in the reference image
 */

import React from 'react';

const QRSticker = ({ 
  qrCodeUrl, 
  variant = 'blue', // 'green-blue', 'blue', 'yellow-orange', 'orange-pink', 'purple'
  size = 'medium', // 'small', 'medium', 'large'
  className = ''
}) => {
  // Gradient color variants matching the image
  const gradients = {
    'green-blue': {
      border: 'linear-gradient(to right, #4ade80, #22d3ee)',
      text: 'linear-gradient(to right, #4ade80, #22d3ee)'
    },
    'blue': {
      border: 'linear-gradient(to right, #22d3ee, #3b82f6)',
      text: 'linear-gradient(to right, #22d3ee, #3b82f6)'
    },
    'yellow-orange': {
      border: 'linear-gradient(to right, #fbbf24, #f97316)',
      text: 'linear-gradient(to right, #fbbf24, #f97316)'
    },
    'orange-pink': {
      border: 'linear-gradient(to right, #f97316, #ec4899)',
      text: 'linear-gradient(to right, #f97316, #ec4899)'
    },
    'purple': {
      border: 'linear-gradient(to right, #00d4ff, #a855f7, #ec4899)',
      text: 'linear-gradient(to right, #00d4ff, #a855f7, #ec4899)'
    }
  };

  // Size configurations
  const sizes = {
    small: {
      qrSize: 'w-32 h-32',
      textSize: 'text-lg',
      padding: 'p-3',
      borderPadding: '3px'
    },
    medium: {
      qrSize: 'w-48 h-48',
      textSize: 'text-xl',
      padding: 'p-4',
      borderPadding: '4px'
    },
    large: {
      qrSize: 'w-64 h-64',
      textSize: 'text-2xl',
      padding: 'p-5',
      borderPadding: '5px'
    }
  };

  const selectedGradient = gradients[variant] || gradients.blue;
  const selectedSize = sizes[size] || sizes.medium;

  if (!qrCodeUrl) {
    return null;
  }

  return (
    <div className={`qr-sticker-container flex flex-col items-center ${className}`}>
      {/* QR Code with Gradient Border */}
      <div 
        className="relative inline-block rounded-2xl shadow-lg"
        style={{
          background: selectedGradient.border,
          padding: selectedSize.borderPadding
        }}
      >
        {/* White background for QR code */}
        <div className="bg-white rounded-xl p-4 flex flex-col items-center">
          <img
            src={qrCodeUrl}
            alt="QR Code"
            className={`${selectedSize.qrSize} object-contain`}
          />
          {/* "SCAN ME" text inside border, below QR code */}
          <div className={`scan-me-text text-center mt-3 ${selectedSize.textSize} font-bold`}>
            <span 
              style={{
                background: selectedGradient.text,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                display: 'inline-block'
              }}
            >
              SCAN ME
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRSticker;

