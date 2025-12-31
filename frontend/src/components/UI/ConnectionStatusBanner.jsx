/**
 * Connection Status Banner Component
 * Displays connection status at the top of the page when backend is unavailable
 */

import React, { useState, useEffect } from 'react'
import { X, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { subscribeToConnectionStatus, getConnectionStatus } from '../../utils/connectionStatus'
import api from '../../utils/api'
import LoadingSpinner from './LoadingSpinner'

const ConnectionStatusBanner = () => {
  const [status, setStatus] = useState(getConnectionStatus())
  const [isRetrying, setIsRetrying] = useState(false)
  const [isVisible, setIsVisible] = useState(status !== 'connected')

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = subscribeToConnectionStatus((newStatus) => {
      setStatus(newStatus)
      setIsVisible(newStatus !== 'connected')
      
      // Auto-hide after 5 seconds if connection restored
      if (newStatus === 'connected') {
        setTimeout(() => {
          setIsVisible(false)
        }, 5000)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      // Try to hit the health endpoint
      await api.get('/health')
      // If successful, status will be updated by the interceptor
    } catch (error) {
      // Error is already handled by interceptors
    } finally {
      setIsRetrying(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          bgColor: 'bg-green-900/20',
          borderColor: 'border-green-600/50',
          textColor: 'text-green-400',
          icon: Wifi,
          message: 'Connected',
          showRetry: false
        }
      case 'reconnecting':
        return {
          bgColor: 'bg-yellow-900/20',
          borderColor: 'border-yellow-600/50',
          textColor: 'text-yellow-400',
          icon: RefreshCw,
          message: 'Reconnecting...',
          showRetry: false
        }
      case 'disconnected':
      default:
        return {
          bgColor: 'bg-orange-900/20',
          borderColor: 'border-orange-600/50',
          textColor: 'text-orange-400',
          icon: WifiOff,
          message: 'Service is currently starting up. Please try again in a moment.',
          showRetry: true
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div 
      className={`fixed top-16 left-0 right-0 z-30 transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 ${config.bgColor} border-b ${config.borderColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Icon className={`w-5 h-5 ${config.textColor} flex-shrink-0 ${status === 'reconnecting' ? 'animate-spin' : ''}`} />
            <p className={`text-sm font-medium ${config.textColor} flex-1`}>
              {config.message}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {config.showRetry && (
              <button
                onClick={handleRetry}
                disabled={isRetrying}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  isRetrying
                    ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                    : 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/50 hover:border-orange-600/70'
                }`}
              >
                {isRetrying ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleClose}
              className={`p-1.5 rounded-lg transition-colors ${config.textColor} hover:bg-black/20`}
              aria-label="Close banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConnectionStatusBanner

