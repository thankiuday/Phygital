/**
 * Logo Loader Component
 * Reusable loading component with Phygital branding
 * Replaces the old simple spinner with branded logo loader
 */

import React from 'react'
import { QrCode } from 'lucide-react'

const LogoLoader = ({ size = 'md', className = '', showText = false, text = 'Loading...' }) => {
  const sizeClasses = {
    sm: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4',
      text: 'text-xs'
    },
    md: {
      container: 'w-10 h-10',
      icon: 'w-5 h-5',
      text: 'text-sm'
    },
    lg: {
      container: 'w-16 h-16',
      icon: 'w-8 h-8',
      text: 'text-base'
    },
    xl: {
      container: 'w-24 h-24',
      icon: 'w-12 h-12',
      text: 'text-lg'
    }
  }

  const currentSize = sizeClasses[size] || sizeClasses.md

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Logo with animation */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className={`absolute inset-0 animate-ping opacity-20 rounded-xl`}>
          <div className={`${currentSize.container} bg-gradient-to-br from-neon-blue to-neon-purple`}></div>
        </div>

        {/* Main logo */}
        <div className={`${currentSize.container} bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl flex items-center justify-center shadow-glow animate-pulse`}>
          <QrCode className={`${currentSize.icon} text-white`} />
        </div>
      </div>

      {/* Optional loading text */}
      {showText && (
        <p className={`mt-3 ${currentSize.text} text-slate-400 animate-pulse`}>
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
