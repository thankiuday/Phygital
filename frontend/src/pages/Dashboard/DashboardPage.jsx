/**
 * Dashboard Page Component
 * Main dashboard showing user's setup progress, analytics, and quick actions
 * Provides overview of user's Phygital account status
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import BackButton from '../../components/UI/BackButton'
import ProfessionalButton from '../../components/UI/ProfessionalButton'
import ProfessionalCard from '../../components/UI/ProfessionalCard'
import { 
  Upload, 
  QrCode, 
  BarChart3, 
  CheckCircle, 
  AlertCircle,
  ArrowRight,
  Eye,
  MousePointer,
  Share2,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock
} from 'lucide-react'

const DashboardPage = () => {
  const { user, isSetupComplete, getSetupProgress, getProjectStats, isProjectComplete } = useAuth()
  const [showAllProjects, setShowAllProjects] = useState(false)
  
  // Auto-refresh data when navigating to this page
  useDataRefresh()

  // Get project statistics
  const projectStats = getProjectStats()
  
  // Check completion status for current project (global uploads + settings)
  const getStepCompletion = () => {
    return {
      design: !!user?.uploadedFiles?.design?.url,
      video: !!user?.uploadedFiles?.video?.url,
      qr: !!(user?.qrPosition?.x !== 0 || user?.qrPosition?.y !== 0),
      social: Object.values(user?.socialLinks || {}).some(link => link)
    }
  }

  const stepCompletion = getStepCompletion()

  // Calculate progress for a specific project based on actual DB schema
  const getProjectProgress = (project) => {
    if (!project) return 0
    
    let completedSteps = 0
    const totalSteps = 4
    
    // Based on actual DB schema from your data
    const hasDesign = project.uploadedFiles?.design?.url
    const hasVideo = project.uploadedFiles?.video?.url
    const hasQR = project.uploadedFiles?.mindTarget?.generated || (project.qrPosition?.x !== 0 || project.qrPosition?.y !== 0)
    // Fix: Check project-specific social links instead of global ones
    const hasSocial = project.socialLinks ? Object.values(project.socialLinks).some(link => link && link.trim() !== '') : false
    
    if (hasDesign) completedSteps++
    if (hasVideo) completedSteps++
    if (hasQR) completedSteps++
    if (hasSocial) completedSteps++
    
    return Math.round((completedSteps / totalSteps) * 100)
  }

  // Get project step completion for a specific project based on actual DB schema
  const getProjectStepCompletion = (project) => {
    if (!project) return { design: false, video: false, qr: false, social: false }
    
    // Based on actual DB schema from your data
    return {
      design: !!project.uploadedFiles?.design?.url,
      video: !!project.uploadedFiles?.video?.url,
      qr: !!project.uploadedFiles?.mindTarget?.generated || !!(project.qrPosition?.x !== 0 || project.qrPosition?.y !== 0),
      // Fix: Check project-specific social links instead of global ones
      social: project.socialLinks ? Object.values(project.socialLinks).some(link => link && link.trim() !== '') : false
    }
  }

  const setupSteps = [
    {
      id: 'design',
      title: 'Upload Design',
      description: 'Upload your design image',
      completed: stepCompletion.design,
      icon: Upload,
      link: '/upload'
    },
    {
      id: 'video',
      title: 'Upload Video',
      description: 'Add your explanatory video',
      completed: stepCompletion.video,
      icon: Upload,
      link: '/upload'
    },
    {
      id: 'qr',
      title: 'Generate QR Code',
      description: 'Create and position your QR code',
      completed: stepCompletion.qr,
      icon: QrCode,
      link: '/projects'
    },
    {
      id: 'social',
      title: 'Add Social Links',
      description: 'Connect your social media',
      completed: stepCompletion.social,
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
      title: 'Manage Projects',
      description: 'View QR codes, update videos, manage projects',
      icon: QrCode,
      link: '/projects',
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

  // Component to render individual project progress
  const ProjectProgressCard = ({ project, isLatest = false }) => {
    const projectProgress = getProjectProgress(project)
    const projectStepCompletion = getProjectStepCompletion(project)
    const isComplete = isProjectComplete(project)
    
    // Debug logging based on actual DB schema
    console.log('Project Progress Debug:', {
      projectName: project?.name,
      projectProgress,
      projectStepCompletion,
      isComplete,
      // Actual project fields from DB
      projectDesign: !!project.uploadedFiles?.design?.url,
      projectVideo: !!project.uploadedFiles?.video?.url,
      projectMindTarget: !!project.uploadedFiles?.mindTarget?.generated,
      projectQRPosition: !!(project.qrPosition?.x !== 0 || project.qrPosition?.y !== 0),
      // Global fields
      globalSocial: Object.values(user?.socialLinks || {}).some(link => link),
      // Full project structure
      projectStructure: {
        uploadedFiles: project.uploadedFiles,
        qrPosition: project.qrPosition
      }
    })
    
    return (
      <div className={`p-4 rounded-lg border-2 transition-all duration-200 ${
        isComplete 
          ? 'border-neon-green/30 bg-green-900/20' 
          : 'border-slate-600/50 bg-slate-800/50'
      } ${isLatest ? 'ring-2 ring-neon-blue/30' : ''}`}>
        
        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${
              isComplete ? 'bg-green-900/30' : 'bg-slate-700'
            }`}>
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-neon-green" />
              ) : (
                <Clock className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-slate-100 truncate">
                {project.name || `Project ${project.id}`}
                {isLatest && <span className="ml-2 text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded">Latest</span>}
              </h3>
              <p className="text-xs text-slate-400">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-lg sm:text-sm font-medium text-slate-100">{projectProgress}%</div>
            <div className="text-xs text-slate-400">
              {isComplete ? 'Complete' : `${projectProgress}/100`}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="progress-bar">
            <div 
              className={`progress-bar-fill ${
                isComplete ? 'bg-neon-green' : 'bg-gradient-to-r from-neon-blue to-neon-purple'
              }`}
              style={{ width: `${projectProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Project Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {setupSteps.map((step) => {
            const Icon = step.icon
            const isCompleted = projectStepCompletion[step.id]
            
            return (
              <div
                key={step.id}
                className={`flex items-center p-2 rounded text-xs ${
                  isCompleted 
                    ? 'bg-green-900/20 text-neon-green' 
                    : 'bg-slate-700/50 text-slate-400'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-3 w-3 mr-2" />
                ) : (
                  <Icon className="h-3 w-3 mr-2" />
                )}
                <span className="truncate">{step.title}</span>
              </div>
            )
          })}
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          {isComplete ? (
            <Link
              to="/projects"
              className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-neon-green hover:text-neon-cyan bg-green-900/20 hover:bg-green-900/30 border border-green-600/30 hover:border-green-500/50 rounded-lg transition-all duration-200"
            >
              Manage Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-neon-blue hover:text-neon-cyan bg-blue-900/20 hover:bg-blue-900/30 border border-blue-600/30 hover:border-blue-500/50 rounded-lg transition-all duration-200"
            >
              Continue Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        {/* Mobile Back Button - Top Left */}
        <div className="flex justify-start mb-4 sm:hidden">
          <BackButton to="/" variant="ghost" text="Back" className="text-sm" />
        </div>
        
        <div className="text-center sm:text-left mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Here's an overview of your Phygital account
          </p>
        </div>

        {/* Desktop Back Button - Right Aligned */}
        <div className="hidden sm:flex justify-end mb-4">
          <BackButton to="/" variant="ghost" />
        </div>
      </div>

      {/* Projects Section */}
      <div className="card mb-8">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-100">
            {projectStats.total > 0 ? 'Your Projects' : 'Create Your First Project'}
          </h2>
          <p className="text-slate-300">
            {projectStats.total > 0 
              ? `You have ${projectStats.total} project${projectStats.total !== 1 ? 's' : ''} (${projectStats.complete} complete). Create new projects or continue working on existing ones.`
              : 'Complete these steps to create your first Phygital project'
            }
          </p>
        </div>

        {projectStats.total > 0 ? (
          <>
            {/* Latest Project (Always Visible) */}
            {user?.projects && user.projects.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-100 mb-4">Latest Project</h3>
                <ProjectProgressCard 
                  project={user.projects[user.projects.length - 1]} 
                  isLatest={true}
                />
              </div>
            )}

            {/* View All Projects Toggle */}
            {user?.projects && user.projects.length > 1 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="flex items-center text-sm text-neon-blue hover:text-neon-cyan transition-colors duration-200"
                >
                  {showAllProjects ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide All Projects
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      View All Projects ({user.projects.length})
                    </>
                  )}
                </button>
              </div>
            )}

            {/* All Projects (Expandable) */}
            {showAllProjects && user?.projects && user.projects.length > 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-100">All Projects</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.projects.slice(0, -1).map((project, index) => (
                    <ProjectProgressCard 
                      key={project.id || index} 
                      project={project}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-neon-green mr-3 flex-shrink-0" />
                  <p className="text-sm text-neon-green">
                    {projectStats.complete > 0
                      ? `Great! You have ${projectStats.complete} complete project${projectStats.complete !== 1 ? 's' : ''}. Ready to create more!`
                      : 'You have projects started. Complete them or create new ones.'
                    }
                  </p>
                </div>
                <Link
                  to="/upload"
                  className="btn-primary text-sm px-4 py-2 w-full sm:w-auto"
                >
                  {projectStats.complete > 0 ? 'Create New Project' : 'Continue Project'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        ) : (
          /* First Project Setup */
          <>
            {/* Show progress bar for first project */}
            {progress > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">Project Progress</span>
                  <span className="text-sm font-medium text-slate-300">{progress}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {setupSteps.map((step) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.id}
                    className={`p-4 sm:p-6 rounded-lg border-2 transition-colors duration-200 ${
                      stepCompletion[step.id]
                        ? 'border-neon-green/30 bg-green-900/20'
                        : 'border-slate-600/50 bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <div className={`p-2 rounded-lg mr-3 ${
                        stepCompletion[step.id] ? 'bg-green-900/30' : 'bg-slate-700'
                      }`}>
                        {stepCompletion[step.id] ? (
                          <CheckCircle className="h-5 w-5 text-neon-green" />
                        ) : (
                          <Icon className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <h3 className="font-medium text-slate-100 text-sm sm:text-base">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-300 mb-4">
                      {step.description}
                    </p>
                    {!stepCompletion[step.id] && (
                      <Link
                        to={step.link}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-2 text-sm font-medium text-neon-blue hover:text-neon-cyan bg-blue-900/20 hover:bg-blue-900/30 border border-blue-600/30 hover:border-blue-500/50 rounded-lg transition-all duration-200"
                      >
                        Complete
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center">
                  <Upload className="h-5 w-5 text-neon-blue mr-3 flex-shrink-0" />
                  <p className="text-sm text-neon-blue">
                    Start creating your first Phygital project by completing the steps above.
                  </p>
                </div>
                <Link
                  to="/upload"
                  className="btn-primary text-sm px-4 py-2 w-full sm:w-auto"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={index}
                to={action.link}
                className="p-4 sm:p-6 rounded-lg border border-slate-600/30 hover:border-neon-blue/30 hover:shadow-dark-large transition-all duration-200 group block"
              >
                <div className="flex items-center mb-3">
                  <div className={`p-2 rounded-lg mr-3 ${action.color} shadow-glow-${action.color.split('-')[1]}`}>
                    <Icon className="h-5 w-5 text-slate-900" />
                  </div>
                  <h3 className="font-medium text-slate-100 group-hover:text-neon-blue transition-colors duration-200 text-sm sm:text-base">
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                  to="/projects"
                  className="text-sm text-neon-blue hover:text-neon-cyan transition-colors duration-200"
                >
                  Manage Project →
                </Link>
              </div>
            ))}
          </div>
          
          {user.projects.length > 3 && (
            <div className="mt-4 text-center">
              <Link
                to="/projects"
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
    </div>
  )
}

export default DashboardPage
