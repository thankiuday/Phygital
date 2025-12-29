/**
 * Protected Route Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  console.log('🔒 ProtectedRoute check:', { isAuthenticated, isLoading, path: location.pathname, hash: location.hash })

  // Show loading while checking authentication
  if (isLoading) {
    console.log('⏳ ProtectedRoute: Showing loading...')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('🚫 ProtectedRoute: Not authenticated, redirecting to login')
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  console.log('✅ ProtectedRoute: Authenticated, rendering children')
  return children
}

export default ProtectedRoute
