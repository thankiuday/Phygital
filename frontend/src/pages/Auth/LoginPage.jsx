/**
 * Login Page Component - Clean Modern Design
 * Professional authentication with excellent UX
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import GoogleAuthButton from '../../components/Auth/GoogleAuthButton'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // Auth mode: 'login' for existing users, 'create' for new users
  const [authMode, setAuthMode] = useState(() => {
    // Restore from sessionStorage if available, default to 'login'
    const saved = sessionStorage.getItem('authMode')
    return saved === 'create' ? 'create' : 'login'
  })
  const { smartAuth, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Save authMode to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('authMode', authMode)
  }, [authMode])
  
  // Clear sessionStorage on successful login
  useEffect(() => {
    if (isAuthenticated) {
      sessionStorage.removeItem('authMode')
    }
  }, [isAuthenticated])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch
  } = useForm()

  const termsAccepted = watch('terms')

  // Navigate to dashboard on successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  const onSubmit = async (data) => {
    try {
      setIsLoading(true)
      
      // Get terms acceptance status
      const termsChecked = Boolean(data.terms)
      
      // If in create mode and user hasn't accepted terms, require it
      if (authMode === 'create' && !termsChecked) {
        setError('terms', {
          type: 'manual',
          message: 'You must accept the User Certification & Agreement to create an account'
        })
        setIsLoading(false)
        return
      }

      // Call smart-auth endpoint - backend handles both login and registration
      // Pass termsAccepted only if in create mode
      const result = await smartAuth(data.email, data.password, authMode === 'create' && termsChecked)
      
      if (!result.success) {
        // Check if account already exists (user tried to create but account exists)
        if (result.accountExists) {
          setError('root', {
            type: 'manual',
            message: result.error || 'Account already exists. Please sign in instead.'
          })
          // Optionally auto-switch to login mode
          setAuthMode('login')
        } else if (result.userNotFound && authMode === 'login') {
          // User tried to sign in but account doesn't exist
          setError('root', {
            type: 'manual',
            message: result.error || 'Account not found. Would you like to create an account?'
          })
          // Optionally suggest switching to create mode
        } else {
          // Other errors (wrong password, etc.)
          setError('root', {
            type: 'manual',
            message: result.error
          })
        }
      }
      // Success is handled by useEffect that watches isAuthenticated
    } catch (error) {
      console.error('Login page error:', error)
      setError('root', {
        type: 'manual',
        message: 'An unexpected error occurred'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          {/* Logo/Brand */}
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple blur-xl opacity-50"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-neon-blue via-neon-purple to-neon-pink rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2">
              {authMode === 'create' ? 'Create Your Account' : 'Welcome Back'}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              {authMode === 'create' ? 'Sign up to start your creative journey' : 'Sign in to continue your creative journey'}
            </p>
          </div>

          {/* Phygital Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-full backdrop-blur-sm">
            <span className="text-xs sm:text-sm font-semibold">
              <span className="text-gradient bg-gradient-to-r from-neon-blue to-neon-cyan bg-clip-text text-transparent">Your Vision</span>
              <span className="text-slate-500 mx-2">•</span>
              <span className="text-gradient bg-gradient-to-r from-neon-purple to-neon-pink bg-clip-text text-transparent">Our Innovation</span>
            </span>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Mode Selector - Two Buttons */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-900/50 rounded-xl border border-slate-700/50">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-blue/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('create')}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                authMode === 'create'
                  ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white shadow-lg shadow-neon-blue/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
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
                  className={`w-full pl-12 pr-4 py-3 bg-slate-900/50 border ${
                    errors.email ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue transition-all`}
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
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
                  className={`w-full pl-12 pr-12 py-3 bg-slate-900/50 border ${
                    errors.password ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue transition-all`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password Link - Only show in login mode */}
            {authMode === 'login' && (
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-neon-blue hover:text-neon-cyan transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            {/* Certification Checkbox - Show only in create mode */}
            {authMode === 'create' && (
              <div className="flex items-start gap-3 p-4 bg-slate-900/30 border border-slate-700/30 rounded-lg">
                <input
                  {...register('terms', { 
                    required: authMode === 'create' ? 'You must accept the User Certification & Agreement' : false 
                  })}
                  type="checkbox"
                  id="terms"
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-neon-blue focus:ring-neon-blue focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-slate-300 cursor-pointer flex-1">
                  I certify and agree to all of the following (required to create an account):{' '}
                  <Link to="/certification" className="text-neon-blue hover:text-neon-cyan font-semibold underline" target="_blank" onClick={(e) => e.stopPropagation()}>
                    View Certification & Agreement
                  </Link>
                </label>
              </div>
            )}
            {errors.terms && (
              <p className="text-sm text-red-400">{errors.terms.message}</p>
            )}

            {/* Error Message */}
            {errors.root && (
              <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{errors.root.message}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-xl shadow-lg hover:shadow-neon-blue/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  {authMode === 'create' ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider with "OR" */}
          <div className="mt-8 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-slate-800/50 text-slate-400">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In */}
          <div className="mt-6">
            <GoogleAuthButton mode={authMode === 'create' ? "signup" : "signin"} />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Protected by industry-standard encryption
        </p>
      </div>
    </div>
  )
}

export default LoginPage
