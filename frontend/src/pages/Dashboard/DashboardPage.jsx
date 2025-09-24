/**
 * Dashboard Page Component
 * Main dashboard showing user's setup progress, analytics, and quick actions
 * Provides overview of user's Phygital account status
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import BackButton from '../../components/UI/BackButton'
import { 
  Upload, 
  QrCode, 
  BarChart3, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Eye,
  MousePointer,
  Share2
} from 'lucide-react'

const DashboardPage = () => {
  const { user, isSetupComplete, getSetupProgress } = useAuth()

  const setupSteps = [
    {
      id: 'design',
      title: 'Upload Design',
      description: 'Upload your design image',
      completed: !!user?.uploadedFiles?.design?.url,
      icon: Upload,
      link: '/upload'
    },
    {
      id: 'video',
      title: 'Upload Video',
      description: 'Add your explanatory video',
      completed: !!user?.uploadedFiles?.video?.url,
      icon: Upload,
      link: '/upload'
    },
    {
      id: 'qr',
      title: 'Generate QR Code',
      description: 'Create and position your QR code',
      completed: !!(user?.qrPosition?.x !== 0 || user?.qrPosition?.y !== 0),
      icon: QrCode,
      link: '/qrcode'
    },
    {
      id: 'social',
      title: 'Add Social Links',
      description: 'Connect your social media',
      completed: Object.values(user?.socialLinks || {}).some(link => link),
      icon: Share2,
      link: '/upload'
    }
  ]

  const quickActions = [
    {
      title: 'Upload Content',
      description: 'Add new designs and videos',
      icon: Upload,
      link: '/upload',
      color: 'bg-neon-blue'
    },
    {
      title: 'View QR Code',
      description: 'Download your QR code',
      icon: QrCode,
      link: '/qrcode',
      color: 'bg-neon-green'
    },
    {
      title: 'Analytics',
      description: 'Check your performance',
      icon: BarChart3,
      link: '/analytics',
      color: 'bg-neon-purple'
    },
    {
      title: 'Profile',
      description: 'Update your settings',
      icon: CheckCircle,
      link: '/profile',
      color: 'bg-neon-orange'
    }
  ]

  const progress = getSetupProgress()

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        {/* Mobile Back Button - Top Left */}
        <div className="flex justify-start mb-4 sm:hidden">
          <BackButton to="/" variant="ghost" text="Back" className="text-sm" />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-100">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2">
              Here's an overview of your Phygital account
            </p>
          </div>
          {/* Desktop Back Button */}
          <BackButton to="/" variant="ghost" className="hidden sm:flex" />
        </div>
      </div>

      {/* Setup Progress */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-100">
            {progress === 100 ? 'Account Setup Complete' : 'Setup Progress'}
          </h2>
          <p className="text-slate-300">
            {progress === 100 
              ? 'Your account is fully set up! You can start new projects or update existing content.'
              : 'Complete these steps to get your Phygital experience ready'
            }
          </p>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">
              Progress
            </span>
            <span className="text-sm font-medium text-slate-300">
              {progress}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {setupSteps.map((step) => {
            const Icon = step.icon
            return (
              <div
                key={step.id}
                className={`p-4 rounded-lg border-2 transition-colors duration-200 ${
                  step.completed
                    ? 'border-neon-green/30 bg-green-900/20'
                    : 'border-slate-600/50 bg-slate-800/50'
                }`}
              >
                <div className="flex items-center mb-2">
                  <div className={`p-2 rounded-lg mr-3 ${
                    step.completed ? 'bg-green-900/30' : 'bg-slate-700'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 text-neon-green" />
                    ) : (
                      <Icon className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <h3 className="font-medium text-slate-100">
                    {step.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-300 mb-3">
                  {step.description}
                </p>
                {!step.completed && (
                  <Link
                    to={step.link}
                    className="inline-flex items-center text-sm text-neon-blue hover:text-neon-cyan transition-colors duration-200"
                  >
                    Complete
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>

        {!isSetupComplete() && (
          <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-neon-yellow mr-2" />
              <p className="text-sm text-neon-yellow">
                Complete your setup to start using Phygital. Your personalized page will be available at{' '}
                <span className="font-mono bg-yellow-900/30 px-2 py-1 rounded">
                  phygital-{user?.username}.vercel.app
                </span>
              </p>
            </div>
          </div>
        )}

        {isSetupComplete() && (
          <div className="mt-6 p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-neon-green mr-2" />
                <p className="text-sm text-neon-green">
                  Your account setup is complete! Ready to create new projects.
                </p>
              </div>
              <Link
                to="/upload"
                className="btn-primary text-sm px-4 py-2"
              >
                Start New Project
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Analytics Overview */}
      {isSetupComplete() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-900/30 rounded-lg mr-4">
                <Eye className="h-6 w-6 text-neon-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">Total Scans</p>
                <p className="text-2xl font-bold text-slate-100">
                  {user?.analytics?.totalScans || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-green-900/30 rounded-lg mr-4">
                <BarChart3 className="h-6 w-6 text-neon-green" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">Video Views</p>
                <p className="text-2xl font-bold text-slate-100">
                  {user?.analytics?.videoViews || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-neon-purple/20 rounded-lg mr-4 shadow-glow-purple">
                <MousePointer className="h-6 w-6 text-neon-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300">Link Clicks</p>
                <p className="text-2xl font-bold text-slate-100">
                  {user?.analytics?.linkClicks || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-100">
            Quick Actions
          </h2>
          <p className="text-slate-300">
            Common tasks and shortcuts
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={index}
                to={action.link}
                className="p-4 rounded-lg border border-slate-600/30 hover:border-neon-blue/30 hover:shadow-dark-large transition-all duration-200 group"
              >
                <div className="flex items-center mb-3">
                  <div className={`p-2 rounded-lg mr-3 ${action.color} shadow-glow-${action.color.split('-')[1]}`}>
                    <Icon className="h-5 w-5 text-slate-900" />
                  </div>
                  <h3 className="font-medium text-slate-100 group-hover:text-neon-blue transition-colors duration-200">
                    {action.title}
                  </h3>
                </div>
                <p className="text-sm text-slate-300">
                  {action.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Projects */}
      {isSetupComplete() && user?.projects && user.projects.length > 0 && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-slate-100">
              Recent Projects
            </h2>
            <p className="text-slate-300">
              Your latest project creations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.projects.slice(0, 3).map((project, index) => (
              <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30 hover:border-neon-blue/30 transition-all duration-200">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-neon-blue/20 rounded-lg mr-3 shadow-glow-blue">
                    <QrCode className="h-4 w-4 text-neon-blue" />
                  </div>
                  <h3 className="font-medium text-slate-100">
                    {project.name || `Project ${index + 1}`}
                  </h3>
                </div>
                <p className="text-sm text-slate-400 mb-2">
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
                <Link
                  to="/qrcode"
                  className="text-sm text-neon-blue hover:text-neon-cyan transition-colors duration-200"
                >
                  View QR Code →
                </Link>
              </div>
            ))}
          </div>
          
          {user.projects.length > 3 && (
            <div className="mt-4 text-center">
              <Link
                to="/history"
                className="text-sm text-slate-400 hover:text-neon-blue transition-colors duration-200"
              >
                View all {user.projects.length} projects →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {isSetupComplete() && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-slate-100">
              Recent Activity
            </h2>
            <p className="text-slate-300">
              Your latest interactions and updates
            </p>
          </div>
          
          <div className="space-y-4">
            {user?.analytics?.lastScanAt && (
              <div className="flex items-center p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <div className="p-2 bg-neon-blue/20 rounded-lg mr-3 shadow-glow-blue">
                  <Eye className="h-4 w-4 text-neon-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Last QR scan
                  </p>
                  <p className="text-xs text-slate-300">
                    {new Date(user.analytics.lastScanAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            
            {user?.analytics?.lastVideoViewAt && (
              <div className="flex items-center p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <div className="p-2 bg-neon-green/20 rounded-lg mr-3 shadow-glow-green">
                  <BarChart3 className="h-4 w-4 text-neon-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Last video view
                  </p>
                  <p className="text-xs text-slate-300">
                    {new Date(user.analytics.lastVideoViewAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            
            {user?.uploadedFiles?.video?.uploadedAt && (
              <div className="flex items-center p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <div className="p-2 bg-neon-purple/20 rounded-lg mr-3 shadow-glow-purple">
                  <Upload className="h-4 w-4 text-neon-purple" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Video uploaded
                  </p>
                  <p className="text-xs text-slate-300">
                    {new Date(user.uploadedFiles.video.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardPage
