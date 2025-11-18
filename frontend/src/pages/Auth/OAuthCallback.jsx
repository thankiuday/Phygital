/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth
 * Extracts token from URL and completes authentication
 */

import React, { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import toast from 'react-hot-toast'

const OAuthCallback = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { handleOAuthCallback } = useAuth()

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token')
      const error = searchParams.get('error')

      // Handle error from backend
      if (error) {
        console.error('OAuth error:', error)
        
        let errorMessage = 'Authentication failed. Please try again.'
        if (error === 'auth_failed') {
          errorMessage = 'Google authentication failed. Please try again.'
        } else if (error === 'server_error') {
          errorMessage = 'Server error occurred. Please try again later.'
        }
        
        toast.error(errorMessage)
        navigate('/login', { replace: true })
        return
      }

      // Handle successful authentication
      if (token) {
        try {
          await handleOAuthCallback(token)
          toast.success('Successfully signed in with Google!')
          navigate('/dashboard', { replace: true })
        } catch (error) {
          console.error('Error processing OAuth callback:', error)
          toast.error('Failed to complete authentication. Please try again.')
          navigate('/login', { replace: true })
        }
      } else {
        // No token and no error - something went wrong
        toast.error('Authentication failed. No token received.')
        navigate('/login', { replace: true })
      }
    }

    processCallback()
  }, [searchParams, navigate, handleOAuthCallback])

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl"></div>
      </div>

      {/* Loading Content */}
      <div className="relative z-10 text-center">
        <div className="mb-8">
          <LoadingSpinner size="lg" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">
          Completing Sign In
        </h2>
        <p className="text-slate-400">
          Please wait while we authenticate your account...
        </p>
      </div>
    </div>
  )
}

export default OAuthCallback

