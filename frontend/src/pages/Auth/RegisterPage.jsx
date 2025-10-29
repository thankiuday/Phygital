/**
 * Register Page Component
 * Handles user registration with form validation
 * Includes username, email, and password fields
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const { register: registerUser, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError
  } = useForm()

  const password = watch('password')

  // Real-time password validation
  const getPasswordRequirements = (pwd) => {
    return {
      minLength: (pwd?.length || 0) >= 6,
      hasUppercase: /[A-Z]/.test(pwd || ''),
      hasLowercase: /[a-z]/.test(pwd || ''),
      hasNumber: /\d/.test(pwd || '')
    }
  }

  const passwordRequirements = getPasswordRequirements(password)
  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean)

  // Redirect if already authenticated (when page loads)
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, []) // Only run on mount, not when isAuthenticated changes

  const onSubmit = async (data) => {
    try {
      setIsLoading(true)
      const result = await registerUser({
        username: data.username,
        email: data.email,
        password: data.password
      })
      
      if (!result.success) {
        // Set field-specific errors if available
        if (result.fieldErrors) {
          if (result.fieldErrors.email) {
            setError('email', {
              type: 'manual',
              message: result.fieldErrors.email
            })
          }
          if (result.fieldErrors.username) {
            setError('username', {
              type: 'manual',
              message: result.fieldErrors.username
            })
          }
        }
        
        // Also set root error for general display
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
            <User className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-slate-100">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Or{' '}
            <Link
              to="/login"
              className="font-medium text-neon-blue hover:text-neon-cyan transition-colors duration-200"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                </div>
                <input
                  {...register('username', {
                    required: 'Username is required',
                    minLength: {
                      value: 3,
                      message: 'Username must be at least 3 characters'
                    },
                    maxLength: {
                      value: 30,
                      message: 'Username cannot exceed 30 characters'
                    },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Username can only contain letters, numbers, and underscores'
                    }
                  })}
                  type="text"
                  autoComplete="username"
                  className={`input pl-11 sm:pl-12 ${errors.username ? 'input-error' : ''}`}
                  placeholder="Choose a username"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-neon-red">{errors.username.message}</p>
              )}
            </div>

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
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pl-11 sm:pl-12 pr-11 sm:pr-12 ${errors.password ? 'input-error' : allRequirementsMet && password ? 'border-neon-green' : ''}`}
                  placeholder="Create a password"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
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
              
              {/* Password Requirements Indicator */}
              {(passwordFocused || password) && !errors.password && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-slate-400 font-medium">Password must contain:</p>
                  <div className="space-y-1.5">
                    {/* Minimum Length */}
                    <div className={`flex items-center text-xs transition-colors duration-200 ${
                      passwordRequirements.minLength ? 'text-neon-green' : 'text-slate-400'
                    }`}>
                      {passwordRequirements.minLength ? (
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      At least 6 characters
                    </div>

                    {/* Uppercase Letter */}
                    <div className={`flex items-center text-xs transition-colors duration-200 ${
                      passwordRequirements.hasUppercase ? 'text-neon-green' : 'text-slate-400'
                    }`}>
                      {passwordRequirements.hasUppercase ? (
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      One uppercase letter (A-Z)
                    </div>

                    {/* Lowercase Letter */}
                    <div className={`flex items-center text-xs transition-colors duration-200 ${
                      passwordRequirements.hasLowercase ? 'text-neon-green' : 'text-slate-400'
                    }`}>
                      {passwordRequirements.hasLowercase ? (
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      One lowercase letter (a-z)
                    </div>

                    {/* Number */}
                    <div className={`flex items-center text-xs transition-colors duration-200 ${
                      passwordRequirements.hasNumber ? 'text-neon-green' : 'text-slate-400'
                    }`}>
                      {passwordRequirements.hasNumber ? (
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      One number (0-9)
                    </div>
                  </div>

                  {/* Success Message */}
                  {allRequirementsMet && (
                    <div className="flex items-center text-xs text-neon-green font-medium mt-2 animate-fade-in">
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Strong password! ✓
                    </div>
                  )}
                </div>
              )}

              {/* Show error message only when there's an error and field is not focused */}
              {errors.password && !passwordFocused && (
                <p className="mt-2 text-sm text-neon-red">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                </div>
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pl-11 sm:pl-12 pr-11 sm:pr-12 ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center z-20"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 hover:text-slate-300" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500 hover:text-slate-300" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-neon-red">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errors.root && (
            <div className="bg-red-900/20 border border-neon-red/30 rounded-md p-4">
              <p className="text-sm text-neon-red">{errors.root.message}</p>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                {...register('terms', {
                  required: 'You must accept the terms and conditions'
                })}
                type="checkbox"
                className="focus:ring-neon-blue h-4 w-4 text-neon-blue border-slate-600 rounded bg-slate-800"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-slate-300">
                I agree to the{' '}
                <Link to="/terms" className="text-neon-blue hover:text-neon-cyan" target="_blank">
                  Terms and Conditions
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-neon-blue hover:text-neon-cyan" target="_blank">
                  Privacy Policy
                </Link>
              </label>
              {errors.terms && (
                <p className="mt-1 text-sm text-neon-red">{errors.terms.message}</p>
              )}
            </div>
          </div>

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
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage
