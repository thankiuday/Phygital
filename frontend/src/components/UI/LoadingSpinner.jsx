/**
 * Logo Loader Component
 * Reusable loading component with Phygital branding
 * Replaces the old simple spinner with branded logo loader
 */

import React from 'react'
import Logo from './Logo'

const LogoLoader = ({ size = 'md', className = '', showText = false, text = 'Loading...' }) => {
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-xl'
  }

  const currentTextSize = textSizeClasses[size] || textSizeClasses.md

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Logo with animation */}
      <Logo size={size} showText={false} linkTo={null} showGlow={true} />

      {/* Optional loading text */}
      {showText && (
        <p className={`mt-3 ${currentTextSize} text-slate-400 animate-pulse`}>
          {text}
        </p>
      )}

      {/* Animated loading dots */}
      <div className="flex space-x-1 mt-2">
        <div className="w-1 h-1 bg-neon-blue rounded-full animate-bounce"></div>
        <div className="w-1 h-1 bg-neon-purple rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-1 h-1 bg-neon-pink rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  )
}

// Legacy LoadingSpinner component for backward compatibility
const LoadingSpinner = ({ size = 'md', className = '' }) => {
  return <LogoLoader size={size} className={className} />
}

export default LoadingSpinner
export { LogoLoader }
