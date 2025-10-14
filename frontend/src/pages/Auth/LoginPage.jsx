/**
 * Login Page Component
 * Handles user authentication with email and password
 * Includes form validation and error handling
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm()

  // Redirect if already authenticated (when page loads)
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, []) // Only run on mount, not when isAuthenticated changes (to avoid conflict with login function)

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
    <div className="min-h-screen flex items-center justify-center bg-dark-mesh py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 bg-button-gradient rounded-lg flex items-center justify-center shadow-glow">
            <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-100">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-neon-blue hover:text-neon-cyan transition-colors duration-200"
            >
              create a new account
            </Link>
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
                  className={`input pl-11 sm:pl-12 ${errors.email ? 'input-error' : ''}`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-neon-red">{errors.email.message}</p>
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
                  className={`input pl-11 sm:pl-12 pr-11 sm:pr-12 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-20"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 hover:text-slate-300" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 hover:text-slate-300" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-neon-red">{errors.password.message}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errors.root && (
            <div className="bg-red-900/20 border border-neon-red/30 rounded-md p-4">
              <p className="text-sm text-neon-red">{errors.root.message}</p>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </button>
          </div>

          {/* Forgot Password */}
          <div className="text-center">
            <Link
              to="/forgot-password"
              className="text-sm text-neon-blue hover:text-neon-cyan transition-colors duration-200"
            >
              Forgot your password?
            </Link>
          </div>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-slate-800/50 border border-slate-600/50 rounded-md">
          <h3 className="text-sm font-medium text-neon-blue mb-2">Demo Credentials</h3>
          <p className="text-xs text-slate-300">
            Email: demo@phygital.com<br />
            Password: demo123
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
