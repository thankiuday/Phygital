/**
 * Admin Protected Route Component
 * Protects admin routes and redirects to login if not authenticated
 * Also blocks mobile device access
 */

import React, { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../UI/LoadingSpinner'
import { isMobileDevice } from '../../utils/deviceDetection'
import { Smartphone, AlertTriangle, ArrowRight } from 'lucide-react'

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAdmin()
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setIsMobile(isMobileDevice())
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-mesh">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  // Block mobile devices
  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-mesh py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="mx-auto h-16 w-16 bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <Smartphone className="h-8 w-8 text-neon-red" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-neon-orange" />
              <h2 className="text-2xl font-bold text-slate-100">Mobile Access Restricted</h2>
            </div>
            <p className="text-base text-slate-300 mb-2">
              The admin panel is not available on mobile devices for security reasons.
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Please access the admin panel from a desktop or laptop computer.
            </p>
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-slate-400 mb-2">
                For the best experience and security, use:
              </p>
              <ul className="text-sm text-slate-300 space-y-1 text-left max-w-xs mx-auto">
                <li>• Desktop computer</li>
                <li>• Laptop computer</li>
                <li>• Tablet in landscape mode (may have limited functionality)</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('/')}
              className="btn-primary w-full inline-flex items-center justify-center"
            >
              Return to Homepage
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return children
}

export default AdminProtectedRoute

