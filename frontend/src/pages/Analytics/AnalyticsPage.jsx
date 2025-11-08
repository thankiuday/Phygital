/**
 * Analytics Page Component
 * Displays user analytics and engagement metrics
 * Shows charts and detailed statistics
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { analyticsAPI } from '../../utils/api'
import LocationAnalytics from '../../components/Analytics/LocationAnalytics'
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
  MapPin
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

// Component to render individual project analytics
const ProjectAnalyticsCard = ({ project, user, analytics, isLatest = false, selectedPeriod }) => {
  const [showLocationAnalytics, setShowLocationAnalytics] = useState(false)
  
  // Get project-specific analytics
  const projectId = project.id  // Use project.id (timestamp ID), not _id (MongoDB ObjectId)
  const filteredProjectData = analytics?.projects?.find(p => p.projectId === projectId)
  
  const rawProjectAnalytics = filteredProjectData || project.analytics || {
    totalScans: 0,
    videoViews: 0,
    linkClicks: 0,
    arExperienceStarts: 0
  }
  
  const projectAnalytics = {
    totalScans: rawProjectAnalytics.totalScans,
    videoViews: rawProjectAnalytics.videoViews,
    linkClicks: rawProjectAnalytics.linkClicks,
    arExperienceStarts: rawProjectAnalytics.arExperienceStarts
  }

  // Calculate project progress
  const getProjectProgress = (project) => {
    if (!project) return 0
    let completedSteps = 0
    const totalSteps = 4
    const hasDesign = project.uploadedFiles?.design?.url
    const hasVideo = project.uploadedFiles?.video?.url
    const hasQR = project.uploadedFiles?.mindTarget?.generated || (project.qrPosition?.x !== 0 || project.qrPosition?.y !== 0)
    const hasSocial = project.socialLinks ? Object.values(project.socialLinks).some(link => link && link.trim() !== '') : false
    if (hasDesign) completedSteps++
    if (hasVideo) completedSteps++
    if (hasQR) completedSteps++
    if (hasSocial) completedSteps++
    return Math.round((completedSteps / totalSteps) * 100)
  }

  const isProjectComplete = (project) => {
    if (!project) return false
    const hasDesign = project.uploadedFiles?.design?.url
    const hasVideo = project.uploadedFiles?.video?.url
    const hasQR = project.uploadedFiles?.mindTarget?.generated || (project.qrPosition?.x !== 0 || project.qrPosition?.y !== 0)
    const hasSocial = project.socialLinks ? Object.values(project.socialLinks).some(link => link && link.trim() !== '') : false
    return hasDesign && hasVideo && hasQR && hasSocial
  }

  const projectProgress = getProjectProgress(project)
  const isComplete = isProjectComplete(project)
  
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
              {filteredProjectData && <span className="ml-2 text-xs bg-neon-cyan/20 text-neon-cyan px-2 py-1 rounded">Filtered</span>}
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
            {projectAnalytics.videoViews > 0 
              ? Math.round((projectAnalytics.linkClicks / projectAnalytics.videoViews) * 100)
              : 0}%
          </p>
          <p className="text-xs text-slate-300">Users who clicked social links after viewing</p>
        </div>
      </div>

      {/* Location Analytics Toggle */}
      <div className="mt-6 border-t border-slate-600/30 pt-6">
        <button
          onClick={(e) => {
            e.preventDefault();
            setShowLocationAnalytics(!showLocationAnalytics);
          }}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neon-blue hover:text-neon-cyan transition-colors duration-200 rounded-lg hover:bg-slate-700/30"
        >
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            View Location Analytics
          </div>
          {showLocationAnalytics ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Expandable Location Analytics */}
      {showLocationAnalytics && (
        <div className="mt-4">
          <LocationAnalytics
            userId={user._id}
            projectId={String(projectId)}
            days={selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90}
          />
        </div>
      )}
    </div>
  )
}

const AnalyticsPage = () => {
  const { user, getProjectStats, isProjectComplete, loadUser } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  
  // Auto-refresh data when navigating to this page
  useDataRefresh()

  // Initial load and period change
  useEffect(() => {
    if (user?._id) {
      fetchAnalytics()
    }
  }, [user?._id, selectedPeriod])

  // Auto-refresh analytics every 10 seconds while on the page (silent refresh)
  useEffect(() => {
    if (!user?._id) return

    const refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing analytics (silent)...')
      fetchAnalytics(true) // Silent refresh to avoid loading flicker
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(refreshInterval)
  }, [user?._id, selectedPeriod])

  const fetchAnalytics = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const response = await analyticsAPI.getDashboardAnalytics(user._id, selectedPeriod)
      setAnalytics(response.data.data)
      setLastRefresh(Date.now())
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  // Manual refresh function
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered')
    fetchAnalytics(false)
  }

  // Get time since last refresh
  const getTimeSinceRefresh = () => {
    const seconds = Math.floor((Date.now() - lastRefresh) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  // Get project statistics
  const projectStats = getProjectStats()

  // Calculate aggregated analytics - ALWAYS SUM ALL PROJECTS (not filtered by period)
  // The overall summary should show total counts across all projects regardless of time filter
  const getAggregatedAnalytics = () => {
    // Always calculate from all user projects to get true totals
    if (!user?.projects || user.projects.length === 0) {
      return {
        totalScans: 0,
        totalVideoViews: 0,
        totalLinkClicks: 0,
        totalARStarts: 0
      }
    }
    
    // Sum analytics from all projects
    const totals = user.projects.reduce((acc, project) => {
      const projectAnalytics = project.analytics || {}
      return {
        totalScans: acc.totalScans + (projectAnalytics.totalScans || 0),
        totalVideoViews: acc.totalVideoViews + (projectAnalytics.videoViews || 0),
        totalLinkClicks: acc.totalLinkClicks + (projectAnalytics.linkClicks || 0),
        totalARStarts: acc.totalARStarts + (projectAnalytics.arExperienceStarts || 0)
      }
    }, {
      totalScans: 0,
      totalVideoViews: 0,
      totalLinkClicks: 0,
      totalARStarts: 0
    })
    
    return totals
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
    // Fix: Check project-specific social links instead of global user social links
    const hasSocial = project.socialLinks ? Object.values(project.socialLinks).some(link => link && link.trim() !== '') : false
    
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
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent">
              Project Analytics
            </h1>
            <p className="text-sm sm:text-base text-neon-cyan mt-2">
              Track performance and engagement for each of your projects
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
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
          </div>
        </div>
      </div>

      {/* Project Analytics Section */}
      {projectStats.total > 0 ? (
        <>
          {/* Overall Summary */}
          <div className="card mb-8">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100">
                    Overall Summary
                  </h2>
                  <p className="text-slate-300">
                    Combined analytics across all your projects
                  </p>
                </div>
                <div className="text-sm px-3 py-1 bg-neon-blue/20 text-neon-blue rounded-full border border-neon-blue/30">
                  {periods.find(p => p.value === selectedPeriod)?.label}
                </div>
              </div>
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

          {/* Geographic Analytics Section */}
          <div className="card mb-8">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <MapPin className="h-6 w-6 mr-2 text-primary-400" />
                    Geographic Distribution
                  </h2>
                  <p className="text-slate-300">
                    See where your QR codes are being scanned around the world
                  </p>
                </div>
              </div>
            </div>
            
            <LocationAnalytics 
              userId={user._id} 
              days={selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90}
            />
          </div>

          {/* Latest Project Analytics */}
          {user?.projects && user.projects.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-100 mb-6">Latest Project Analytics</h3>
              <ProjectAnalyticsCard 
                project={user.projects[user.projects.length - 1]} 
                user={user}
                analytics={analytics}
                selectedPeriod={selectedPeriod}
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
                    user={user}
                    analytics={analytics}
                    selectedPeriod={selectedPeriod}
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
