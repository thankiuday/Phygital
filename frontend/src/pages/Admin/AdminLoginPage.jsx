/**
 * Admin Login Page Component
 * Handles admin authentication
 * Mobile devices are restricted from accessing the admin panel
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAdmin } from '../../contexts/AdminContext'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Smartphone, AlertTriangle } from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import { isMobileDevice } from '../../utils/deviceDetection'

const AdminLoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { login, isAuthenticated } = useAdmin()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm()

  // Check for mobile device on mount
  useEffect(() => {
    setIsMobile(isMobileDevice())
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Show mobile restriction message
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

  const onSubmit = async (data) => {
    try {
      setIsLoading(true)
      const result = await login(data.email, data.password)
      
      if (!result.success) {
        setError('root', {
          type: 'manual',
          message: result.error
        })
      }
    } catch (error) {
      setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-mesh py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 bg-button-gradient rounded-lg flex items-center justify-center shadow-glow">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-slate-100">
            Admin Login
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300">
            Sign in to access the admin panel
          </p>
        </div>

        {/* Form */}
        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                </div>
                <input
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  type="email"
                  autoComplete="email"
                  className={`input pl-10 sm:pl-12 w-full ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter admin email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs sm:text-sm text-neon-red">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                </div>
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pl-10 sm:pl-12 pr-10 sm:pr-12 w-full ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-20 hover:opacity-70 transition-opacity"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 hover:text-slate-300" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 hover:text-slate-300" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs sm:text-sm text-neon-red">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errors.root && (
            <div className="bg-red-900/20 border border-neon-red/30 rounded-md p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-neon-red">{errors.root.message}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  Sign in as Admin
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform duration-200" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AdminLoginPage

