/**
 * Register Page Component - Clean Modern Design
 * Professional registration with excellent UX
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Sparkles, Check, X } from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import GoogleAuthButton from '../../components/Auth/GoogleAuthButton'

const RegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
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

  // Password strength indicators
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, checks: [] }
    
    const checks = [
      { label: 'At least 6 characters', valid: pwd.length >= 6 },
      { label: 'One uppercase letter', valid: /[A-Z]/.test(pwd) },
      { label: 'One lowercase letter', valid: /[a-z]/.test(pwd) },
      { label: 'One number', valid: /\d/.test(pwd) }
    ]
    
    const strength = checks.filter(c => c.valid).length
    return { strength, checks }
  }

  const passwordStrength = getPasswordStrength(password)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [])

  const onSubmit = async (data) => {
    try {
      setIsLoading(true)
      const result = await registerUser({
        username: data.username,
        email: data.email,
        password: data.password
      })
      
      if (!result.success) {
        if (result.fieldErrors) {
          if (result.fieldErrors.email) {
            setError('email', { type: 'manual', message: result.fieldErrors.email })
          }
          if (result.fieldErrors.username) {
            setError('username', { type: 'manual', message: result.fieldErrors.username })
          }
        }
        setError('root', { type: 'manual', message: result.error })
      }
    } catch (error) {
      setError('root', { type: 'manual', message: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-48 w-96 h-96 bg-neon-purple/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 -left-48 w-96 h-96 bg-neon-pink/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header Section */}
        <div className="text-center mb-8">
          {/* Logo/Brand */}
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-pink blur-xl opacity-50"></div>
              <div className="relative w-16 h-16 bg-gradient-to-br from-neon-purple via-neon-pink to-neon-blue rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2">
              Start Your Journey
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              Create your account and unlock the phygital world
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

        {/* Register Form Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' },
                    maxLength: { value: 30, message: 'Username cannot exceed 30 characters' },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Only letters, numbers, and underscores allowed'
                    }
                  })}
                  type="text"
                  autoComplete="username"
                  className={`w-full pl-12 pr-4 py-3 bg-slate-900/50 border ${
                    errors.username ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple transition-all`}
                  placeholder="your_username"
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>

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
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                      message: 'Password must contain uppercase, lowercase, and number'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`w-full pl-12 pr-12 py-3 bg-slate-900/50 border ${
                    errors.password ? 'border-red-500' : password && passwordStrength.strength === 4 ? 'border-green-500' : 'border-slate-700'
                  } rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple transition-all`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3 space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          passwordStrength.strength >= level
                            ? passwordStrength.strength <= 2
                              ? 'bg-red-500'
                              : passwordStrength.strength === 3
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {passwordStrength.checks.map((check, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {check.valid ? (
                          <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-slate-600 flex-shrink-0" />
                        )}
                        <span className={check.valid ? 'text-green-400' : 'text-slate-500'}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {errors.password && !password && (
                <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  {...register('confirmPassword', {
                    required: 'Please confirm your password',
                    validate: value => value === password || 'Passwords do not match'
                  })}
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`w-full pl-12 pr-12 py-3 bg-slate-900/50 border ${
                    errors.confirmPassword ? 'border-red-500' : 'border-slate-700'
                  } rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-pink/50 focus:border-neon-pink transition-all`}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* User Certification & Agreement */}
            <div className="flex items-start gap-3 p-4 bg-slate-900/30 border border-slate-700/30 rounded-lg">
              <input
                {...register('terms', { required: 'You must accept the User Certification & Agreement' })}
                type="checkbox"
                id="terms"
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-neon-blue focus:ring-neon-blue focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="terms" className="text-sm text-slate-300 cursor-pointer flex-1">
                I certify and agree to all of the following (required to create an account):{' '}
                <Link to="/certification" className="text-neon-blue hover:text-neon-cyan font-semibold underline" target="_blank">
                  View Certification & Agreement
                </Link>
              </label>
            </div>
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
              className="w-full py-3.5 px-6 bg-gradient-to-r from-neon-purple to-neon-pink text-white font-semibold rounded-xl shadow-lg hover:shadow-neon-purple/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  Create Account
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

          {/* Google Sign Up */}
          <div className="mt-6">
            <GoogleAuthButton mode="signup" />
          </div>

          {/* Divider */}
          <div className="mt-8 pt-6 border-t border-slate-700/50">
            <p className="text-center text-sm text-slate-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-neon-purple hover:text-neon-pink font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Join thousands of creators in the phygital revolution
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
