/**
 * Analytics Page Component
 * Displays user analytics and engagement metrics
 * Shows charts and detailed statistics
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { analyticsAPI } from '../../utils/api'
import BackButton from '../../components/UI/BackButton'
import { 
  BarChart3, 
  Eye, 
  MousePointer, 
  TrendingUp,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  QrCode,
  Video,
  Share2,
  Clock,
  CheckCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

const AnalyticsPage = () => {
  const { user, getProjectStats, isProjectComplete, loadUser } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [showAllProjects, setShowAllProjects] = useState(false)

  // Initial load
  useEffect(() => {
    if (user?._id) {
      fetchAnalytics()
    }
  }, [user?._id, selectedPeriod])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const response = await analyticsAPI.getDashboardAnalytics(user._id, selectedPeriod)
      setAnalytics(response.data.data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      await loadUser()
      await fetchAnalytics()
    } finally {
      setIsLoading(false)
    }
  }

  // Get project statistics
  const projectStats = getProjectStats()

  // Calculate aggregated analytics from all projects
  const getAggregatedAnalytics = () => {
    if (!user?.projects) {
      return {
        totalScans: analytics?.overview?.totalScans || 0,
        totalVideoViews: analytics?.overview?.totalVideoViews || 0,
        totalLinkClicks: analytics?.overview?.totalLinkClicks || 0,
        totalARStarts: analytics?.overview?.totalARStarts || 0
      }
    }

    return user.projects.reduce((totals, project) => {
      const projectAnalytics = project.analytics || {}
      return {
        totalScans: totals.totalScans + (projectAnalytics.totalScans || 0),
        totalVideoViews: totals.totalVideoViews + (projectAnalytics.videoViews || 0),
        totalLinkClicks: totals.totalLinkClicks + (projectAnalytics.linkClicks || 0),
        totalARStarts: totals.totalARStarts + (projectAnalytics.arExperienceStarts || 0)
      }
    }, {
      totalScans: 0,
      totalVideoViews: 0,
      totalLinkClicks: 0,
      totalARStarts: 0
    })
  }

  const aggregatedAnalytics = getAggregatedAnalytics()

  // Calculate project progress for analytics display
  const getProjectProgress = (project) => {
    if (!project) return 0
    
    let completedSteps = 0
    const totalSteps = 4
    
    const hasDesign = project.uploadedFiles?.design?.url
    const hasVideo = project.uploadedFiles?.video?.url
    const hasQR = project.uploadedFiles?.mindTarget?.generated || (project.qrPosition?.x !== 0 || project.qrPosition?.y !== 0)
    const hasSocial = Object.values(user?.socialLinks || {}).some(link => link)
    
    if (hasDesign) completedSteps++
    if (hasVideo) completedSteps++
    if (hasQR) completedSteps++
    if (hasSocial) completedSteps++
    
    return Math.round((completedSteps / totalSteps) * 100)
  }

  const periods = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ]

  // Component to render individual project analytics
  const ProjectAnalyticsCard = ({ project, isLatest = false }) => {
    const projectProgress = getProjectProgress(project)
    const isComplete = isProjectComplete(project)
    
    // Get project-specific analytics from the actual DB structure
    const projectAnalytics = project.analytics || {
      totalScans: 0,
      videoViews: 0,
      linkClicks: 0,
      arExperienceStarts: 0
    }
    
    return (
      <div className={`p-6 rounded-lg border-2 transition-all duration-200 ${
        isComplete 
          ? 'border-neon-green/30 bg-green-900/20' 
          : 'border-slate-600/50 bg-slate-800/50'
      } ${isLatest ? 'ring-2 ring-neon-blue/30' : ''}`}>
        
        {/* Project Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className={`p-3 rounded-lg mr-4 ${
              isComplete ? 'bg-green-900/30' : 'bg-slate-700'
            }`}>
              {isComplete ? (
                <CheckCircle className="h-6 w-6 text-neon-green" />
              ) : (
                <Clock className="h-6 w-6 text-slate-300" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                {project.name || `Project ${project.id}`}
                {isLatest && <span className="ml-2 text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded">Latest</span>}
              </h3>
              <p className="text-sm text-slate-400">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-100">{projectProgress}%</div>
            <div className="text-xs text-slate-400">
              {isComplete ? 'Complete' : 'In Progress'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="progress-bar">
            <div 
              className={`progress-bar-fill ${
                isComplete ? 'bg-neon-green' : 'bg-gradient-to-r from-neon-blue to-neon-purple'
              }`}
              style={{ width: `${projectProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Analytics Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-neon-blue" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.totalScans}</div>
            <div className="text-xs text-slate-400">QR Scans</div>
          </div>
          
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Video className="h-5 w-5 text-neon-green" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.videoViews}</div>
            <div className="text-xs text-slate-400">Video Views</div>
          </div>
          
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Share2 className="h-5 w-5 text-neon-purple" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.linkClicks}</div>
            <div className="text-xs text-slate-400">Link Clicks</div>
          </div>
          
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <QrCode className="h-5 w-5 text-neon-orange" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.arExperienceStarts}</div>
            <div className="text-xs text-slate-400">AR Starts</div>
          </div>
        </div>

        {/* Conversion Rates */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <h4 className="text-sm font-medium text-neon-blue mb-2">Scan to View Rate</h4>
            <p className="text-xl font-bold text-neon-blue">
              {projectAnalytics.totalScans > 0 
                ? Math.round((projectAnalytics.videoViews / projectAnalytics.totalScans) * 100)
                : 0}%
            </p>
            <p className="text-xs text-slate-300">Users who watched video after scanning</p>
          </div>
          
          <div className="p-4 bg-green-900/20 border border-green-600/30 rounded-lg">
            <h4 className="text-sm font-medium text-neon-green mb-2">Social Engagement</h4>
            <p className="text-xl font-bold text-neon-green">
              {projectAnalytics.totalScans > 0 
                ? Math.round((projectAnalytics.linkClicks / projectAnalytics.totalScans) * 100)
                : 0}%
            </p>
            <p className="text-xs text-slate-300">Users who clicked social links</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Mobile Back Button - Top Left */}
        <div className="flex justify-start mb-4 sm:hidden">
          <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm" />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
              Project Analytics
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2">
              Track performance and engagement for each of your projects
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              onClick={handleRefresh}
              className="btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="input text-sm sm:text-base"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            {/* Desktop Back Button */}
            <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm sm:text-base hidden sm:flex" />
          </div>
        </div>
      </div>

      {/* Project Analytics Section */}
      {projectStats.total > 0 ? (
        <>
          {/* Overall Summary */}
          <div className="card mb-8">
            <div className="card-header">
              <h2 className="text-xl font-semibold text-slate-100">
                Overall Summary
              </h2>
              <p className="text-slate-300">
                Combined analytics across all your projects
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Eye className="h-6 w-6 text-neon-blue" />
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {aggregatedAnalytics.totalScans}
                </div>
                <div className="text-sm text-slate-400">Total QR Scans</div>
              </div>
              
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Video className="h-6 w-6 text-neon-green" />
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {aggregatedAnalytics.totalVideoViews}
                </div>
                <div className="text-sm text-slate-400">Total Video Views</div>
              </div>
              
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <Share2 className="h-6 w-6 text-neon-purple" />
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {aggregatedAnalytics.totalLinkClicks}
                </div>
                <div className="text-sm text-slate-400">Total Link Clicks</div>
              </div>
              
              <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  <QrCode className="h-6 w-6 text-neon-orange" />
                </div>
                <div className="text-2xl font-bold text-slate-100">
                  {projectStats.total}
                </div>
                <div className="text-sm text-slate-400">Total Projects</div>
              </div>
            </div>
          </div>

          {/* Latest Project Analytics */}
          {user?.projects && user.projects.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-100 mb-6">Latest Project Analytics</h3>
              <ProjectAnalyticsCard 
                project={user.projects[user.projects.length - 1]} 
                isLatest={true}
              />
            </div>
          )}

          {/* View All Projects Toggle */}
          {user?.projects && user.projects.length > 1 && (
            <div className="mb-6">
              <button
                onClick={() => setShowAllProjects(!showAllProjects)}
                className="flex items-center text-sm text-neon-blue hover:text-neon-cyan transition-colors duration-200"
              >
                {showAllProjects ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Hide All Project Analytics
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    View All Project Analytics ({user.projects.length})
                  </>
                )}
              </button>
            </div>
          )}

          {/* All Projects Analytics (Expandable) */}
          {showAllProjects && user?.projects && user.projects.length > 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-100">All Project Analytics</h3>
              <div className="grid grid-cols-1 gap-6">
                {user.projects.slice(0, -1).map((project, index) => (
                  <ProjectAnalyticsCard 
                    key={project.id || index} 
                    project={project}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* No Projects State */
        <div className="card">
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-16 w-16 text-slate-400 mb-4" />
            <h3 className="text-xl font-semibold text-slate-100 mb-2">No Projects Yet</h3>
            <p className="text-slate-300 mb-6">
              Create your first Phygital project to start tracking analytics
            </p>
            <a
              href="/upload"
              className="btn-primary inline-flex items-center"
            >
              Create Your First Project
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPage
