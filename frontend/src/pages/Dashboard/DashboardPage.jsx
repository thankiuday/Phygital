/**
 * Dashboard Page Component
 * Main dashboard showing user's setup progress, analytics, and quick actions
 * Provides overview of user's Phygital account status
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import ProfessionalButton from '../../components/UI/ProfessionalButton'
import ProfessionalCard from '../../components/UI/ProfessionalCard'
import { getCampaignTypeDisplayName } from '../../utils/campaignTypeNames'
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
  Clock,
  TrendingUp,
  PlayCircle,
  Link as LinkIcon,
  Power,
  PowerOff,
  Sparkles,
  FileText
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
      link: '/phygitalized/qr-link',
      color: 'bg-neon-blue'
    },
    {
      title: 'Manage Campaigns',
      description: 'View QR codes, update videos, manage campaigns',
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

  // Campaign Statistics Functions
  const getTotalCampaignStats = () => {
    if (!user?.projects || user.projects.length === 0) {
      return {
        totalScans: 0,
        totalVideoViews: 0,
        totalLinkClicks: 0,
        totalARStarts: 0
      }
    }

    return user.projects.reduce((acc, project) => {
      const analytics = project.analytics || {}
      return {
        totalScans: acc.totalScans + (analytics.totalScans || 0),
        totalVideoViews: acc.totalVideoViews + (analytics.videoViews || 0),
        totalLinkClicks: acc.totalLinkClicks + (analytics.linkClicks || 0),
        totalARStarts: acc.totalARStarts + (analytics.arExperienceStarts || 0)
      }
    }, { totalScans: 0, totalVideoViews: 0, totalLinkClicks: 0, totalARStarts: 0 })
  }

  const getCampaignTypeDistribution = () => {
    if (!user?.projects || user.projects.length === 0) return {}
    
    const distribution = {}
    user.projects.forEach(project => {
      const type = project.campaignType || 'unknown'
      distribution[type] = (distribution[type] || 0) + 1
    })
    return distribution
  }

  const getActiveCampaignsCount = () => {
    if (!user?.projects || user.projects.length === 0) {
      return { active: 0, paused: 0 }
    }

    return user.projects.reduce((acc, project) => {
      if (project.isEnabled !== false) {
        acc.active++
      } else {
        acc.paused++
      }
      return acc
    }, { active: 0, paused: 0 })
  }

  const getTopPerformingCampaign = () => {
    if (!user?.projects || user.projects.length === 0) return null

    return user.projects.reduce((top, project) => {
      const currentScans = project.analytics?.totalScans || 0
      const topScans = top?.analytics?.totalScans || 0
      return currentScans > topScans ? project : top
    }, null)
  }

  const getRecentActivity = () => {
    if (!user?.projects || user.projects.length === 0) return null

    // Get most recently created or updated project
    return user.projects.reduce((recent, project) => {
      const recentDate = new Date(recent.createdAt || 0)
      const projectDate = new Date(project.createdAt || 0)
      return projectDate > recentDate ? project : recent
    }, user.projects[0])
  }

  const campaignStats = getTotalCampaignStats()
  const typeDistribution = getCampaignTypeDistribution()
  const activeCounts = getActiveCampaignsCount()
  const topCampaign = getTopPerformingCampaign()
  const recentCampaign = getRecentActivity()

  // Component to render individual project progress - Anti-flicker button styles
  const actionButtonBase =
    'w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-900';

  const continueButtonClasses = `${actionButtonBase} text-white bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink shadow-glow-blue hover:opacity-90 transition-opacity duration-200`;
  const manageButtonClasses = `${actionButtonBase} text-neon-green border-2 border-green-500 bg-transparent hover:opacity-80 transition-opacity duration-200`;
  const actionArrowClasses = 'h-4 w-4';

  const ProjectProgressCard = ({ project, isLatest = false }) => {
    const projectProgress = getProjectProgress(project)
    const projectStepCompletion = getProjectStepCompletion(project)
    const isComplete = isProjectComplete(project)
    const campaignType = project.campaignType || 'unknown'
    const analytics = project.analytics || {}
    
    return (
      <div className={`card-glass rounded-xl shadow-dark-large border transition-all duration-200 p-4 sm:p-5 ${
        isComplete 
          ? 'border-neon-green/30 bg-green-900/10' 
          : 'border-slate-600/30'
      } ${isLatest ? 'ring-2 ring-neon-blue/30 shadow-glow-blue/20' : ''} hover:border-neon-blue/50 hover:shadow-glow-blue/10`}>
        
        {/* Campaign Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div className="flex items-center min-w-0 flex-1">
            <div className={`p-2.5 rounded-lg mr-3 flex-shrink-0 ${
              isComplete 
                ? 'bg-gradient-to-br from-neon-green to-green-600 shadow-glow-green' 
                : 'bg-gradient-to-br from-slate-700 to-slate-800'
            }`}>
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-white" />
              ) : (
                <Clock className="h-5 w-5 text-slate-300" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-100 truncate text-sm sm:text-base">
                  {project.name || `Campaign ${project.id}`}
                </h3>
                {isLatest && (
                  <span className="text-xs bg-gradient-to-r from-neon-blue to-neon-purple text-white px-2 py-0.5 rounded-full whitespace-nowrap font-medium">
                    Latest
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-slate-400 truncate">
                  {new Date(project.createdAt).toLocaleDateString()}
                </p>
                {campaignType !== 'unknown' && (
                  <span className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded">
                    {getCampaignTypeDisplayName(campaignType)}
                  </span>
                )}
                {project.isEnabled === false && (
                  <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-600/30">
                    Paused
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* What You Can Add Section - Informative Cards */}
        <div className="mb-4 p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-600/30">
          <h4 className="text-sm font-semibold text-slate-100 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon-purple" />
            Enhance Your QR Code
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            Add rich content to make your QR code more engaging and informative
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex flex-col items-center p-2.5 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-neon-blue/50 transition-all">
              <PlayCircle className="h-4 w-4 text-neon-green mb-1.5" />
              <span className="text-xs text-slate-300 text-center font-medium">Videos</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-neon-purple/50 transition-all">
              <FileText className="h-4 w-4 text-neon-purple mb-1.5" />
              <span className="text-xs text-slate-300 text-center font-medium">Documents</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-neon-cyan/50 transition-all">
              <Share2 className="h-4 w-4 text-neon-cyan mb-1.5" />
              <span className="text-xs text-slate-300 text-center font-medium">Social Links</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-neon-orange/50 transition-all">
              <LinkIcon className="h-4 w-4 text-neon-orange mb-1.5" />
              <span className="text-xs text-slate-300 text-center font-medium">Custom Links</span>
            </div>
          </div>
        </div>

        {/* Campaign Analytics (if available) */}
        {(analytics.totalScans > 0 || analytics.videoViews > 0 || analytics.linkClicks > 0) && (
          <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
            {analytics.totalScans > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Eye className="h-3.5 w-3.5 text-neon-blue" />
                  <span className="text-sm font-bold text-slate-100">{analytics.totalScans}</span>
                </div>
                <span className="text-xs text-slate-400">Scans</span>
              </div>
            )}
            {analytics.videoViews > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <PlayCircle className="h-3.5 w-3.5 text-neon-green" />
                  <span className="text-sm font-bold text-slate-100">{analytics.videoViews}</span>
                </div>
                <span className="text-xs text-slate-400">Views</span>
              </div>
            )}
            {analytics.linkClicks > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <LinkIcon className="h-3.5 w-3.5 text-neon-purple" />
                  <span className="text-sm font-bold text-slate-100">{analytics.linkClicks}</span>
                </div>
                <span className="text-xs text-slate-400">Clicks</span>
              </div>
            )}
          </div>
        )}

        {/* Campaign Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {setupSteps.map((step) => {
            const Icon = step.icon
            const isCompleted = projectStepCompletion[step.id]
            
            return (
              <div
                key={step.id}
                className={`flex items-center p-2 rounded-lg text-xs transition-all ${
                  isCompleted 
                    ? 'bg-green-900/20 text-neon-green border border-green-600/30' 
                    : 'bg-slate-700/50 text-slate-400 border border-slate-600/30'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                ) : (
                  <Icon className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                )}
                <span className="truncate">{step.title}</span>
              </div>
            )
          })}
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-700/50 flex justify-start">
          {isComplete ? (
            <Link 
              to="/projects" 
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-neon-green to-green-500 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Manage Campaign
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to={`/projects?edit=${project._id || project.id}`}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-glow-blue flex items-center justify-center gap-2"
            >
              Continue Campaign
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-mesh">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent mb-2">
              Welcome back, {user?.username}!
            </h1>
            <p className="text-sm sm:text-base text-neon-cyan">
              Here's an overview of your Phygital account
            </p>
          </div>

        </div>
      </div>

      {/* Campaigns Section */}
      <div className="card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8 mb-8">
        <div className="mb-6 pb-4 border-b border-slate-600/30">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">
            {projectStats.total > 0 ? 'Your Campaigns' : 'Create Your First Campaign'}
          </h2>
          <p className="text-sm sm:text-base text-slate-300">
            {projectStats.total > 0 
              ? `You have ${projectStats.total} campaign${projectStats.total !== 1 ? 's' : ''} (${projectStats.complete} complete). Create new campaigns or continue working on existing ones.`
              : 'Complete these steps to create your first Phygital campaign'
            }
          </p>
        </div>

        {projectStats.total > 0 ? (
          <>
            {/* Latest Campaign (Always Visible) */}
            {user?.projects && user.projects.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-slate-100 mb-4">Latest Campaign</h3>
                <ProjectProgressCard 
                  project={user.projects[user.projects.length - 1]} 
                  isLatest={true}
                />
              </div>
            )}

            {/* View All Campaigns Toggle */}
            {user?.projects && user.projects.length > 1 && (
              <div className="mb-4">
                <button
                  onClick={() => setShowAllProjects(!showAllProjects)}
                  className="flex items-center text-sm text-neon-blue hover:text-neon-cyan transition-colors duration-200"
                >
                  {showAllProjects ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Hide All Campaigns
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      View All Campaigns ({user.projects.length})
                    </>
                  )}
                </button>
              </div>
            )}

            {/* All Campaigns (Expandable) */}
            {showAllProjects && user?.projects && user.projects.length > 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-100">All Campaigns</h3>
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

            {/* Campaign Insights Statistics */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Scans */}
              <div className="card-glass rounded-xl shadow-dark-large border border-slate-600/30 p-4 sm:p-5 hover:border-neon-blue/50 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-neon-blue to-blue-600 rounded-lg shadow-glow-blue">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Total Scans</span>
                </div>
                <div className="mb-1">
                  <p className="text-2xl sm:text-3xl font-bold text-slate-100">
                    {campaignStats.totalScans.toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-slate-400">Across all campaigns</p>
              </div>

              {/* Total Video Views */}
              <div className="card-glass rounded-xl shadow-dark-large border border-slate-600/30 p-4 sm:p-5 hover:border-neon-green/50 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-neon-green to-green-600 rounded-lg shadow-glow-green">
                    <PlayCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Video Views</span>
                </div>
                <div className="mb-1">
                  <p className="text-2xl sm:text-3xl font-bold text-slate-100">
                    {(campaignStats.totalVideoViews + campaignStats.totalARStarts).toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-slate-400">Videos + AR experiences</p>
              </div>

              {/* Active Campaigns */}
              <div className="card-glass rounded-xl shadow-dark-large border border-slate-600/30 p-4 sm:p-5 hover:border-neon-purple/50 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-neon-purple to-purple-600 rounded-lg shadow-glow-purple">
                    <Power className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Active</span>
                </div>
                <div className="mb-1">
                  <p className="text-2xl sm:text-3xl font-bold text-slate-100">
                    {activeCounts.active}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {activeCounts.paused > 0 ? `${activeCounts.paused} paused` : 'All active'}
                </p>
              </div>

              {/* Campaign Types */}
              <div className="card-glass rounded-xl shadow-dark-large border border-slate-600/30 p-4 sm:p-5 hover:border-neon-orange/50 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-neon-orange to-orange-600 rounded-lg shadow-glow-orange">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Types</span>
                </div>
                <div className="mb-1">
                  <p className="text-2xl sm:text-3xl font-bold text-slate-100">
                    {Object.keys(typeDistribution).length}
                  </p>
                </div>
                <p className="text-xs text-slate-400">
                  {Object.keys(typeDistribution).length > 0 
                    ? Object.keys(typeDistribution).slice(0, 2).map(type => getCampaignTypeDisplayName(type)).join(', ') 
                    : 'No campaigns'}
                </p>
              </div>
            </div>

            {/* Top Performing Campaign & Quick Actions */}
            {(topCampaign || recentCampaign) && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Performing Campaign */}
                {topCampaign && topCampaign.analytics?.totalScans > 0 && (
                  <div className="card-glass rounded-xl shadow-dark-large border border-slate-600/30 p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">Top Performing</h3>
                          <p className="text-xs text-slate-400">Most scans</p>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <h4 className="text-base font-bold text-slate-100 mb-1 truncate">
                        {topCampaign.name || 'Unnamed Campaign'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {topCampaign.campaignType ? getCampaignTypeDisplayName(topCampaign.campaignType) : 'Campaign'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-neon-blue">
                          {topCampaign.analytics?.totalScans || 0}
                        </p>
                        <p className="text-xs text-slate-400">Total scans</p>
                      </div>
                      <Link
                        to="/projects"
                        className="px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                )}

                {/* Quick Action Card */}
                <div className="card-glass rounded-xl shadow-dark-large border border-slate-600/30 p-4 sm:p-5 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-neon-green to-green-600 rounded-lg">
                        <ArrowRight className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-100">Quick Actions</h3>
                        <p className="text-xs text-slate-400">Get started</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Link
                      to="/phygitalized/qr-link"
                      className="block w-full px-4 py-2.5 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity text-center"
                    >
                      Create Your AR Experience
                    </Link>
                    <Link
                      to="/projects"
                      className="block w-full px-4 py-2.5 border-2 border-neon-green text-neon-green text-sm font-semibold rounded-lg hover:bg-neon-green/10 transition-colors text-center"
                    >
                      Manage All Campaigns
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* First Campaign Setup */
          <>
            {/* Show progress bar for first campaign */}
            {progress > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">Campaign Progress</span>
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
                    className={`card-glass rounded-xl shadow-dark-large border transition-all duration-200 p-4 sm:p-5 ${
                      stepCompletion[step.id]
                        ? 'border-neon-green/30 bg-green-900/10'
                        : 'border-slate-600/30 hover:border-neon-blue/50'
                    }`}
                  >
                    <div className="flex items-center mb-3">
                      <div className={`p-2.5 rounded-lg mr-3 ${
                        stepCompletion[step.id] 
                          ? 'bg-gradient-to-br from-neon-green to-green-600 shadow-glow-green' 
                          : 'bg-gradient-to-br from-slate-700 to-slate-800'
                      }`}>
                        {stepCompletion[step.id] ? (
                          <CheckCircle className="h-5 w-5 text-white" />
                        ) : (
                          <Icon className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-100 text-sm sm:text-base">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-300 mb-4">
                      {step.description}
                    </p>
                    {!stepCompletion[step.id] && (
                      <Link
                        to={step.link}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-3 py-2 text-sm font-semibold text-neon-blue hover:text-white bg-blue-900/20 hover:bg-gradient-to-r hover:from-neon-blue hover:to-neon-purple border border-blue-600/30 hover:border-transparent rounded-lg transition-all duration-200"
                      >
                        Complete
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 p-4 sm:p-5 card-glass rounded-xl border border-neon-blue/30 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start sm:items-center flex-1 min-w-0">
                  <div className="p-2 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg mr-3 flex-shrink-0 mt-0.5 sm:mt-0 shadow-glow-blue">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-sm text-slate-100 flex-1 font-medium">
                    Start creating your first Phygital project by completing the steps above.
                  </p>
                </div>
                <Link
                  to="/upload"
                  className="px-4 py-2.5 bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-glow-blue inline-flex items-center justify-center whitespace-nowrap flex-shrink-0"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Overall Analytics Overview */}
      {isSetupComplete() && projectStats.total > 0 && (
        <div className="card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8 mb-8">
          <div className="mb-6 pb-4 border-b border-slate-600/30">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">Overall Performance</h2>
            <p className="text-sm sm:text-base text-slate-300">Aggregated statistics across all your campaigns</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="card-glass rounded-xl border border-slate-600/30 p-4 sm:p-5 hover:border-neon-blue/50 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-gradient-to-br from-neon-blue to-blue-600 rounded-lg shadow-glow-blue">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Total Scans</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1">
                {campaignStats.totalScans.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">All campaigns combined</p>
            </div>

            <div className="card-glass rounded-xl border border-slate-600/30 p-4 sm:p-5 hover:border-neon-green/50 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-gradient-to-br from-neon-green to-green-600 rounded-lg shadow-glow-green">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Total Views</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1">
                {(campaignStats.totalVideoViews + campaignStats.totalARStarts).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Videos + AR experiences</p>
            </div>

            <div className="card-glass rounded-xl border border-slate-600/30 p-4 sm:p-5 hover:border-neon-purple/50 transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-gradient-to-br from-neon-purple to-purple-600 rounded-lg shadow-glow-purple">
                  <MousePointer className="h-5 w-5 text-white" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Link Clicks</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1">
                {campaignStats.totalLinkClicks.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Total interactions</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8 mb-8">
        <div className="mb-6 pb-4 border-b border-slate-600/30">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">Quick Actions</h2>
          <p className="text-sm sm:text-base text-slate-300">Common tasks and shortcuts</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={index}
                to={action.link}
                className="card-glass rounded-xl border border-slate-600/30 p-4 sm:p-5 hover:border-neon-blue/50 hover:shadow-glow-blue/10 transition-all duration-200 group block"
              >
                <div className="flex items-start sm:items-center mb-3">
                  <div className={`p-2.5 rounded-lg mr-3 flex-shrink-0 ${action.color} shadow-glow-blue/20`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-slate-100 group-hover:text-neon-blue transition-colors duration-200 text-sm sm:text-base flex-1 min-w-0">
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

      {/* Recent Campaigns */}
      {isSetupComplete() && user?.projects && user.projects.length > 0 && (
        <div className="card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8 mb-8">
          <div className="mb-6 pb-4 border-b border-slate-600/30">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">Recent Campaigns</h2>
            <p className="text-sm sm:text-base text-slate-300">Your latest campaign creations</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {user.projects.slice(0, 3).map((project, index) => (
              <div key={index} className="card-glass rounded-xl border border-slate-600/30 p-4 sm:p-5 hover:border-neon-blue/50 hover:shadow-glow-blue/10 transition-all duration-200">
                <div className="flex items-center mb-3">
                  <div className="p-2.5 bg-gradient-to-br from-neon-blue to-neon-purple rounded-lg mr-3 shadow-glow-blue">
                    <QrCode className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-100 truncate text-sm sm:text-base">
                      {project.name || `Campaign ${index + 1}`}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {project.analytics?.totalScans > 0 && (
                  <div className="mb-3 p-2 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Scans</span>
                      <span className="text-sm font-bold text-neon-blue">{project.analytics.totalScans}</span>
                    </div>
                  </div>
                )}
                <Link
                  to="/projects"
                  className="inline-flex items-center text-sm text-neon-blue hover:text-neon-cyan transition-colors duration-200 font-medium"
                >
                  Manage Campaign
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
          
          {user.projects.length > 3 && (
            <div className="mt-6 text-center">
              <Link
                to="/projects"
                className="inline-flex items-center text-sm text-slate-400 hover:text-neon-blue transition-colors duration-200 font-medium"
              >
                View all {user.projects.length} campaigns
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {isSetupComplete() && (
        <div className="card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 pb-4 border-b border-slate-600/30">
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 mb-2">Recent Activity</h2>
            <p className="text-sm sm:text-base text-slate-300">Your latest interactions and updates</p>
          </div>
          
          <div className="space-y-3">
            {user?.analytics?.lastScanAt && (
              <div className="flex items-center p-3 sm:p-4 card-glass rounded-xl border border-slate-600/30 hover:border-neon-blue/50 transition-all duration-200">
                <div className="p-2.5 bg-gradient-to-br from-neon-blue to-blue-600 rounded-lg mr-3 shadow-glow-blue">
                  <Eye className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">
                    Last QR scan
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(user.analytics.lastScanAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            
            {user?.analytics?.lastVideoViewAt && (
              <div className="flex items-center p-3 sm:p-4 card-glass rounded-xl border border-slate-600/30 hover:border-neon-green/50 transition-all duration-200">
                <div className="p-2.5 bg-gradient-to-br from-neon-green to-green-600 rounded-lg mr-3 shadow-glow-green">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">
                    Last video view
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(user.analytics.lastVideoViewAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            
            {user?.uploadedFiles?.video?.uploadedAt && (
              <div className="flex items-center p-3 sm:p-4 card-glass rounded-xl border border-slate-600/30 hover:border-neon-purple/50 transition-all duration-200">
                <div className="p-2.5 bg-gradient-to-br from-neon-purple to-purple-600 rounded-lg mr-3 shadow-glow-purple">
                  <Upload className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">
                    Video uploaded
                  </p>
                  <p className="text-xs text-slate-400">
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
