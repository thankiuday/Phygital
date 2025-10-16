/**
 * Profile Page Component
 * User profile management and account settings
 * Allows updating profile information and changing password
 */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { authAPI } from '../../utils/api'
import BackButton from '../../components/UI/BackButton'
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  BarChart3
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import toast from 'react-hot-toast'

const ProfilePage = () => {
  const { user, updateUser } = useAuth()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile
  } = useForm({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || ''
    }
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch
  } = useForm()

  const newPassword = watch('newPassword')

  const onProfileSubmit = async (data) => {
    try {
      setIsUpdating(true)
      const response = await authAPI.updateProfile(data)
      updateUser(response.data.data.user)
      toast.success('Profile updated successfully!')
    } catch (error) {
      toast.error('Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  }

  const onPasswordSubmit = async (data) => {
    try {
      setIsChangingPassword(true)
      await authAPI.changePassword(data.currentPassword, data.newPassword)
      resetPassword()
      toast.success('Password changed successfully!')
    } catch (error) {
      toast.error('Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-mesh">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          {/* Mobile Back Button - Top Left */}
          <div className="flex justify-start mb-6 sm:hidden">
            <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              {/* User Avatar */}
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center shadow-glow">
                <span className="text-white text-lg sm:text-xl font-bold">
                  {user?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100">
                  {user?.username}
                </h1>
                <p className="text-sm sm:text-base text-slate-300 mt-1">
                  {user?.email}
                </p>
              </div>
            </div>
            {/* Desktop Back Button */}
            <BackButton to="/dashboard" variant="ghost" className="hidden sm:flex" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Profile Information */}
          <div className="xl:col-span-2 space-y-6 lg:space-y-8">
          {/* Basic Information */}
          <div className="card-elevated">
            <div className="card-header">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-neon-blue/30 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-neon-blue" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
                  Basic Information
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-300 ml-11">
                Update your username and email address
              </p>
            </div>

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-slate-200">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-200" />
                  </div>
                  <input
                    {...registerProfile('username', {
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
                    className={`input pl-12 w-full ${profileErrors.username ? 'input-error' : ''}`}
                    placeholder="Enter your username"
                  />
                </div>
                {profileErrors.username && (
                  <p className="text-sm text-neon-red flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {profileErrors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-200" />
                  </div>
                  <input
                    {...registerProfile('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    type="email"
                    className={`input pl-12 w-full ${profileErrors.email ? 'input-error' : ''}`}
                    placeholder="Enter your email"
                  />
                </div>
                {profileErrors.email && (
                  <p className="text-sm text-neon-red flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {profileErrors.email.message}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-700">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 text-base font-medium"
                >
                  {isUpdating ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Save className="h-5 w-5 text-white" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password */}
          <div className="card-elevated">
            <div className="card-header">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-neon-purple/30 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-neon-purple" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-slate-100">
                  Change Password
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-300 ml-11">
                Update your account password
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-200">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-200" />
                  </div>
                  <input
                    {...registerPassword('currentPassword', {
                      required: 'Current password is required'
                    })}
                    type={showCurrentPassword ? 'text' : 'password'}
                    className={`input pl-12 pr-12 w-full ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-slate-300 transition-colors"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-200" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-200" />
                    )}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-neon-red flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-medium text-slate-200">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-200" />
                  </div>
                  <input
                    {...registerPassword('newPassword', {
                      required: 'New password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters'
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
                      }
                    })}
                    type={showNewPassword ? 'text' : 'password'}
                    className={`input pl-12 pr-12 w-full ${passwordErrors.newPassword ? 'input-error' : ''}`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-slate-300 transition-colors"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-200" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-200" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="text-sm text-neon-red flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-200">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-200" />
                  </div>
                  <input
                    {...registerPassword('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: value => value === newPassword || 'Passwords do not match'
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`input pl-12 pr-12 w-full ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center hover:text-slate-300 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-200" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-200" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-neon-red flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-700">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-6 text-base font-medium"
                >
                  {isChangingPassword ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Lock className="h-5 w-5 text-white" />
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Information Sidebar */}
        <div className="space-y-6 lg:space-y-8">
          <div className="card-elevated">
            <div className="card-header">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-slate-600/70 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-100" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-100">
                  Account Information
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-300">Member Since</span>
                <span className="text-sm text-slate-100">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-300">Account Status</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neon-green/20 text-neon-green border border-neon-green/30">
                  Active
                </span>
              </div>

              <div className="py-3">
                <p className="text-sm font-medium text-slate-300 mb-2">Personalized URL</p>
                <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                  <p className="text-sm text-slate-100 font-mono break-all">
                    phygital-{user?.username}.vercel.app
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-elevated">
            <div className="card-header">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-neon-cyan/30 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-neon-cyan" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-100">
                  Quick Stats
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-300">Total Scans</span>
                <span className="text-xl sm:text-2xl font-bold text-neon-blue">
                  {user?.analytics?.totalScans || 0}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                <span className="text-sm font-medium text-slate-300">Video Views</span>
                <span className="text-xl sm:text-2xl font-bold text-neon-purple">
                  {user?.analytics?.videoViews || 0}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-sm font-medium text-slate-300">Link Clicks</span>
                <span className="text-xl sm:text-2xl font-bold text-neon-green">
                  {user?.analytics?.linkClicks || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="card-elevated border-neon-red/30">
            <div className="card-header">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-neon-red/30 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-neon-red" />
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-neon-red">
                  Danger Zone
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-neon-red/30 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <AlertCircle className="h-5 w-5 text-neon-red mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-neon-red mb-1">
                      Delete Account
                    </h3>
                    <p className="text-sm text-slate-300">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                  </div>
                </div>
                <button className="btn-danger w-full sm:w-auto text-sm py-2.5 px-4">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
