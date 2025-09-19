/**
 * Profile Page Component
 * User profile management and account settings
 * Allows updating profile information and changing password
 */

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { authAPI } from '../../utils/api'
import { 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Save,
  AlertCircle
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">
          Profile Settings
        </h1>
        <p className="text-slate-300 mt-2">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                Basic Information
              </h2>
              <p className="text-slate-300">
                Update your username and email address
              </p>
            </div>

            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <div>
                <label htmlFor="username" className="label">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <User className="h-5 w-5 text-slate-600" />
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
                    className={`input pl-10 ${profileErrors.username ? 'input-error' : ''}`}
                    placeholder="Enter your username"
                  />
                </div>
                {profileErrors.username && (
                  <p className="mt-1 text-sm text-neon-red">
                    {profileErrors.username.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Mail className="h-5 w-5 text-slate-600" />
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
                    className={`input pl-10 ${profileErrors.email ? 'input-error' : ''}`}
                    placeholder="Enter your email"
                  />
                </div>
                {profileErrors.email && (
                  <p className="mt-1 text-sm text-neon-red">
                    {profileErrors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="btn-primary flex items-center"
              >
                {isUpdating ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                Change Password
              </h2>
              <p className="text-slate-300">
                Update your account password
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="label">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-slate-600" />
                  </div>
                  <input
                    {...registerPassword('currentPassword', {
                      required: 'Current password is required'
                    })}
                    type={showCurrentPassword ? 'text' : 'password'}
                    className={`input pl-10 pr-10 ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-600 hover:text-slate-800" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-600 hover:text-slate-800" />
                    )}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <p className="mt-1 text-sm text-neon-red">
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="newPassword" className="label">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-slate-600" />
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
                    className={`input pl-10 pr-10 ${passwordErrors.newPassword ? 'input-error' : ''}`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-600 hover:text-slate-800" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-600 hover:text-slate-800" />
                    )}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-neon-red">
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                    <Lock className="h-5 w-5 text-slate-600" />
                  </div>
                  <input
                    {...registerPassword('confirmPassword', {
                      required: 'Please confirm your password',
                      validate: value => value === newPassword || 'Passwords do not match'
                    })}
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`input pl-10 pr-10 ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-10"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-slate-600 hover:text-slate-800" />
                    ) : (
                      <Eye className="h-5 w-5 text-slate-600 hover:text-slate-800" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-neon-red">
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isChangingPassword}
                className="btn-primary flex items-center"
              >
                {isChangingPassword ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Account Information */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                Account Information
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Member Since</p>
                <p className="text-sm text-slate-100">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-slate-300">Account Status</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neon-green/20 text-neon-green border border-neon-green/30">
                  Active
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300">Personalized URL</p>
                <p className="text-sm text-slate-100 font-mono">
                  phygital-{user?.username}.vercel.app
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                Quick Stats
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Total Scans</p>
                <p className="text-2xl font-bold text-neon-blue">
                  {user?.analytics?.totalScans || 0}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-slate-300">Video Views</p>
                <p className="text-2xl font-bold text-neon-purple">
                  {user?.analytics?.videoViews || 0}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-300">Link Clicks</p>
                <p className="text-2xl font-bold text-neon-green">
                  {user?.analytics?.linkClicks || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card border-neon-red/30">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-neon-red">
                Danger Zone
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-red-900/20 border border-neon-red/30 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertCircle className="h-5 w-5 text-neon-red mr-2" />
                  <h3 className="text-sm font-medium text-neon-red">
                    Delete Account
                  </h3>
                </div>
                <p className="text-sm text-slate-300 mb-3">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <button className="btn-danger text-sm">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
