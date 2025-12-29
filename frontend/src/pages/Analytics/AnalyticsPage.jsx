/**
 * Analytics Page Component - Redesigned
 * Comprehensive campaign-type-aware analytics dashboard with real-time updates
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { analyticsAPI } from '../../utils/api'
import CampaignTypeTabs from '../../components/Analytics/CampaignTypeTabs'
import MetricCard from '../../components/Analytics/MetricCard'
import TimeTrendChart from '../../components/Analytics/TimeTrendChart'
import EngagementFunnel from '../../components/Analytics/EngagementFunnel'
import LinkPerformanceChart from '../../components/Analytics/LinkPerformanceChart'
import DeviceBreakdown from '../../components/Analytics/DeviceBreakdown'
import VideoAnalytics from '../../components/Analytics/VideoAnalytics'
import ARAnalytics from '../../components/Analytics/ARAnalytics'
import DocumentAnalytics from '../../components/Analytics/DocumentAnalytics'
import LocationAnalytics from '../../components/Analytics/LocationAnalytics'
import {
  aggregateByCampaignType,
  calculateEngagementFunnel,
  calculateDeviceBreakdown,
  calculateBrowserBreakdown,
  getTopPerformingLinks,
  groupByTimePeriod,
  filterByDateRange
} from '../../utils/analyticsCalculations'
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
  MapPin,
  FileText,
  Sparkles,
  Home,
  ChevronRight,
  Info
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import toast from 'react-hot-toast'

// Component to render individual project analytics card
const ProjectAnalyticsCard = ({ project, user, analytics, isLatest = false, selectedPeriod }) => {
  const navigate = useNavigate()
  
  const projectId = project.id
  const filteredProjectData = analytics?.projects?.find(p => p.projectId === projectId)
  
  const rawProjectAnalytics = filteredProjectData || project.analytics || {
    totalScans: 0,
    videoViews: 0,
    linkClicks: 0,
    averageTimeSpent: 0
  }
  
  const projectAnalytics = {
    totalScans: rawProjectAnalytics.totalScans,
    videoViews: rawProjectAnalytics.videoViews,
    linkClicks: rawProjectAnalytics.linkClicks,
    averageTimeSpent: rawProjectAnalytics.averageTimeSpent || 0
  }
  
  // Check if it's a QR links campaign (only 'qr-links', not 'qr-link')
  const isQRLinksCampaign = project.campaignType === 'qr-links'
  // Check if it's a QR link campaign (singular - only show QR Scans)
  const isQRLinkCampaign = project.campaignType === 'qr-link'

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
    <div 
      className={`group relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer 
        backdrop-blur-sm
        ${
          isComplete 
            ? 'border-neon-green/30 bg-green-900/20 hover:border-neon-green/60 hover:bg-green-900/30' 
            : 'border-slate-600/50 bg-slate-800/50 hover:border-neon-purple/60 hover:bg-slate-800/70'
        } 
        ${isLatest ? 'ring-2 ring-neon-blue/30' : ''}
        hover:scale-[1.02] hover:shadow-xl hover:shadow-neon-purple/20
        active:scale-[0.98]
      `}
      onClick={() => navigate(`/analytics/campaign/${project.id}`)}
    >
      {/* View Details Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-neon-purple/20 border border-neon-purple/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-xs font-medium text-neon-purple">View Details</span>
        <ChevronRight className="w-4 h-4 text-neon-purple" />
      </div>

      {/* Click Hint */}
      <div className="absolute bottom-4 right-4 text-xs text-slate-500 italic opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        Click to view details
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center flex-1 min-w-0">
          <div className={`p-3 rounded-xl mr-4 flex-shrink-0 ${
            isComplete ? 'bg-green-900/30 border border-neon-green/30' : 'bg-slate-700/50 border border-slate-600/30'
          }`}>
            {isComplete ? (
              <CheckCircle className="h-6 w-6 text-neon-green" />
            ) : (
              <Clock className="h-6 w-6 text-slate-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-100 mb-1 truncate">
              {project.name || `Project ${project.id}`}
              {isLatest && <span className="ml-2 text-xs bg-neon-blue/20 text-neon-blue px-2 py-1 rounded-full">Latest</span>}
            </h3>
            <p className="text-sm text-slate-400 truncate">
              {project.campaignType ? project.campaignType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Campaign'} • Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="text-right ml-4 flex-shrink-0">
          <div className="text-lg font-bold text-slate-100">{projectProgress}%</div>
          <div className="text-xs text-slate-400">
            {isComplete ? 'Complete' : 'In Progress'}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isComplete 
                ? 'bg-gradient-to-r from-neon-green to-emerald-400' 
                : 'bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink'
            }`}
            style={{ width: `${projectProgress}%` }}
          ></div>
        </div>
      </div>

      {/* For QR link campaigns (singular), only show QR Scans */}
      {isQRLinkCampaign ? (
        <div className="grid grid-cols-1 gap-3">
          <div className="text-center p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/30 group-hover:border-neon-blue/30 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-neon-blue" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.totalScans}</div>
            <div className="text-xs text-slate-400">QR Scans</div>
          </div>
        </div>
      ) : isQRLinksCampaign ? (
        /* For QR links campaigns (plural), show QR Scans and Avg. Time Spent */
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/30 group-hover:border-neon-blue/30 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-neon-blue" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.totalScans}</div>
            <div className="text-xs text-slate-400">QR Scans</div>
          </div>
          
          <div className="text-center p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/30 group-hover:border-neon-green/30 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-neon-green" />
            </div>
            <div className="text-2xl font-bold text-slate-100">
              {Math.floor((projectAnalytics.averageTimeSpent || 0) / 60)}:{((projectAnalytics.averageTimeSpent || 0) % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-slate-400">Avg. Time Spent (min:sec)</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="text-center p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/30 group-hover:border-neon-blue/30 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <Eye className="h-5 w-5 text-neon-blue" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.totalScans}</div>
            <div className="text-xs text-slate-400">QR Scans</div>
          </div>
          
          <div className="text-center p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/30 group-hover:border-neon-green/30 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <Video className="h-5 w-5 text-neon-green" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.videoViews}</div>
            <div className="text-xs text-slate-400">Video Views</div>
          </div>
          
          <div className="text-center p-4 bg-slate-800/30 backdrop-blur-sm rounded-lg border border-slate-700/30 group-hover:border-neon-purple/30 transition-colors">
            <div className="flex items-center justify-center mb-2">
              <Share2 className="h-5 w-5 text-neon-purple" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{projectAnalytics.linkClicks}</div>
            <div className="text-xs text-slate-400">Link Clicks</div>
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-slate-600/30 pt-6">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/analytics/campaign/${project.id}`);
          }}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neon-blue hover:text-neon-cyan transition-colors duration-200 rounded-lg hover:bg-slate-700/30"
        >
          <div className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            View More Analytics
          </div>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

const AnalyticsPage = () => {
  console.log('🚀 AnalyticsPage component rendering...')
  
  const { user, getProjectStats, loadUser } = useAuth()
  const [analytics, setAnalytics] = useState({})
  const [events, setEvents] = useState({ events: {} })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedCampaignType, setSelectedCampaignType] = useState('all')
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  
  console.log('✅ AnalyticsPage hooks initialized', { userId: user?._id })
  
  // Auto-refresh data when navigating to this page
  useDataRefresh()

  // Calculate campaign type counts
  const campaignCounts = useMemo(() => {
    if (!user?.projects) return {}
    const counts = { all: user.projects.length }
    user.projects.forEach(project => {
      const type = project.campaignType || 'unknown'
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  }, [user?.projects])

  // Filter projects by campaign type
  const filteredProjects = useMemo(() => {
    if (!user?.projects) return []
    if (selectedCampaignType === 'all') return user.projects
    return user.projects.filter(p => p.campaignType === selectedCampaignType)
  }, [user?.projects, selectedCampaignType])

  // Use refs to track if we're already fetching to prevent concurrent calls
  const isFetchingRef = useRef(false)
  const lastFetchTimeRef = useRef(0)
  const mountedRef = useRef(true)
  const initialLoadDoneRef = useRef(false)
  const filtersInitializedRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch analytics data - memoized with useCallback
  const fetchAnalytics = useCallback(async (silent = false) => {
    console.log('📊 fetchAnalytics called', { silent, isFetching: isFetchingRef.current, userId: user?._id })
    // Check if user is available
    if (!user?._id) {
      console.warn('⚠️ Cannot fetch analytics: user._id not available', { user })
      if (mountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
      return
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return
    }

    // Throttle: don't fetch more than once per 2 seconds for silent refreshes
    const now = Date.now()
    if (now - lastFetchTimeRef.current < 2000 && silent) {
      return
    }

    isFetchingRef.current = true
    lastFetchTimeRef.current = now

    try {
      if (!silent) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }

      console.log('📊 Fetching analytics...', { userId: user._id, period: selectedPeriod, campaignType: selectedCampaignType })

      // Fetch dashboard analytics with timeout
      const analyticsPromise = analyticsAPI.getDashboardAnalytics(user._id, selectedPeriod)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      )
      
      const analyticsResponse = await Promise.race([analyticsPromise, timeoutPromise])
      console.log('✅ Dashboard analytics fetched:', analyticsResponse.data)
      
      const analyticsData = analyticsResponse.data?.data || analyticsResponse.data || {}
      
      if (mountedRef.current) {
        setAnalytics(analyticsData)
        setLastRefresh(Date.now())
        // Clear loading state immediately after analytics fetch completes
        // Don't wait for events fetch - it's non-blocking
        if (!silent) {
          console.log('✅ Clearing loading state after analytics fetch')
          setIsLoading(false)
        }
      }
      
      // Return analytics data for promise chaining
      const returnData = analyticsData

      // Fetch detailed events for charts (non-blocking, don't wait for it)
      // Start the fetch but don't await it - let it complete in background
      Promise.resolve().then(async () => {
        try {
          const eventsPromise = analyticsAPI.getEvents(user._id, {
            campaignType: selectedCampaignType,
            period: selectedPeriod
          })
          const eventsTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Events request timeout')), 10000)
          )
          
          const eventsResponse = await Promise.race([eventsPromise, eventsTimeoutPromise])
          console.log('✅ Events fetched:', eventsResponse.data)
          
          if (mountedRef.current) {
            setEvents(eventsResponse.data?.data || eventsResponse.data)
          }
        } catch (eventsError) {
          console.warn('⚠️ Failed to fetch detailed events:', eventsError)
          // Continue without events - charts will show empty states
          // Set empty events object so charts don't break
          if (mountedRef.current) {
            setEvents({ events: {} })
          }
        }
      })

      // Don't call loadUser() here - it causes infinite loops
      // User data is already up-to-date from the context
      // LastRefresh is already set above after analytics fetch
      
      if (!silent && mountedRef.current) {
        toast.success('Analytics updated', { icon: '✅', duration: 2000 })
      }
      
      // Return analytics data
      return returnData
    } catch (error) {
      console.error('❌ Failed to fetch analytics:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      
      // Set empty analytics object so page can still render
      if (mountedRef.current) {
        setAnalytics({})
        setEvents({ events: {} })
      }
      
      if (!silent && mountedRef.current) {
        toast.error('Failed to load analytics')
      }
      return null
    } finally {
      // Always clear loading states
      if (mountedRef.current) {
        setIsLoading(false)
        setIsRefreshing(false)
      }
      isFetchingRef.current = false
      console.log('✅ Analytics fetch finally block - loading cleared')
    }
  }, [user?._id, selectedPeriod, selectedCampaignType])


  // Initial load - only run once when user is available
  useEffect(() => {
    console.log('🔍 AnalyticsPage useEffect triggered', { userId: user?._id, initialLoadDone: initialLoadDoneRef.current })
    if (user?._id && !initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true
      console.log('🔄 Initial analytics load triggered')
      fetchAnalytics(false).then(() => {
        // Mark filters as initialized AFTER initial load completes
        filtersInitializedRef.current = true
        console.log('✅ Initial load complete, filters initialized')
      }).catch((error) => {
        console.error('❌ Initial load failed:', error)
        // Still mark as initialized so page can render
        filtersInitializedRef.current = true
        setIsLoading(false)
      })
    } else if (!user?._id) {
      console.log('⏳ Waiting for user data...', { user })
      setIsLoading(false)
      initialLoadDoneRef.current = false // Reset if user is lost
      filtersInitializedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]) // Only depend on user._id to prevent re-triggers

  // When filters change, fetch again (but only after initial load completes)
  useEffect(() => {
    // Skip if initial load hasn't completed yet
    if (!user?._id || !initialLoadDoneRef.current || !filtersInitializedRef.current) {
      console.log('⏸️ Skipping filter change - initial load not complete')
      return
    }
    
    console.log('🔄 Filter change detected, fetching analytics...')
    fetchAnalytics(false) // Not silent when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, selectedCampaignType]) // Only depend on filters

  // Real-time auto-refresh every 5 seconds (more frequent for live updates)
  useEffect(() => {
    if (!user?._id) return

    const refreshInterval = setInterval(() => {
      if (mountedRef.current && !isFetchingRef.current) {
        fetchAnalytics(true) // Silent refresh
      }
    }, 5000) // Refresh every 5 seconds for real-time feel

    return () => clearInterval(refreshInterval)
  }, [user?._id, fetchAnalytics])


  // Get time since last refresh
  const getTimeSinceRefresh = () => {
    const seconds = Math.floor((Date.now() - lastRefresh) / 1000)
    if (seconds < 10) return 'Just now'
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  // Get aggregated analytics for selected campaign type
  const aggregatedAnalytics = useMemo(() => {
    return aggregateByCampaignType(user?.projects || [], selectedCampaignType)
  }, [user?.projects, selectedCampaignType])

  // Prepare chart data from events
  const chartData = useMemo(() => {
    if (!events?.events) return null

    const scanEvents = filterByDateRange(events.events.scan || [], 
      selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90)
    const videoEvents = filterByDateRange(events.events.videoView || [], 
      selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90)
    const linkClickEvents = filterByDateRange(events.events.linkClick || [], 
      selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90)
    const arEvents = filterByDateRange(events.events.arExperienceStart || [], 
      selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90)
    const errorEvents = filterByDateRange(events.events.arExperienceError || [], 
      selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90)

    return {
      scanTrend: groupByTimePeriod(scanEvents, 'day'),
      videoTrend: groupByTimePeriod(videoEvents, 'day'),
      linkTrend: groupByTimePeriod(linkClickEvents, 'day'),
      arTrend: groupByTimePeriod(arEvents, 'day'),
      deviceBreakdown: calculateDeviceBreakdown(scanEvents),
      browserBreakdown: calculateBrowserBreakdown(scanEvents),
      topLinks: getTopPerformingLinks(linkClickEvents, 10),
      videoEvents,
      arEvents,
      errorEvents,
      linkClickEvents
    }
  }, [events, selectedPeriod])

  // Calculate engagement funnel
  const engagementFunnel = useMemo(() => {
    return calculateEngagementFunnel(aggregatedAnalytics, selectedCampaignType)
  }, [aggregatedAnalytics, selectedCampaignType])

  const periods = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ]

  // Safety check: if we have analytics data, don't show loader even if isLoading is true
  useEffect(() => {
    const hasAnalyticsData = analytics !== null && analytics !== undefined && typeof analytics === 'object'
    if (hasAnalyticsData && isLoading) {
      console.log('⚠️ Safety: Clearing loading state because analytics data exists')
      setIsLoading(false)
    }
  }, [analytics, isLoading])

  // Show loading only if we're actually loading, user is available, AND we don't have analytics yet
  // Add timeout fallback to prevent infinite loading
  const [forceShow, setForceShow] = useState(false)
  
  useEffect(() => {
    const hasAnalyticsData = analytics !== null && analytics !== undefined && typeof analytics === 'object'
    if (isLoading && user?._id && !hasAnalyticsData) {
      const timeout = setTimeout(() => {
        console.log('⏱️ Force showing content after 3s timeout')
        setForceShow(true)
        setIsLoading(false)
        // Set empty analytics if still null after timeout
        if (!analytics) {
          setAnalytics({})
        }
      }, 3000)
      
      return () => clearTimeout(timeout)
    } else {
      setForceShow(false)
    }
  }, [isLoading, user?._id, analytics])

  // Don't show loader if we have analytics data OR if forceShow is true OR if loading has been cleared
  // Also check if analytics is an object (even if empty) - that means fetch completed
  const hasAnalyticsData = analytics !== null && analytics !== undefined && typeof analytics === 'object'
  const shouldShowLoader = isLoading && user?._id && !hasAnalyticsData && !forceShow
  
  console.log('📊 AnalyticsPage render check:', { 
    isLoading, 
    hasAnalyticsData, 
    forceShow, 
    shouldShowLoader, 
    userId: user?._id,
    analytics: analytics ? 'exists' : 'null',
    initialLoadDone: initialLoadDoneRef.current,
    error
  })
  
  // Show error state if there's an error
  if (error) {
    console.log('❌ Showing error state')
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-100 mb-4">Error Loading Analytics</h1>
            <p className="text-slate-300 mb-4">{error.message || 'An error occurred'}</p>
            <button 
              onClick={() => {
                setError(null)
                window.location.reload()
              }} 
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  if (shouldShowLoader) {
    console.log('⏳ Showing loader...')
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
          <p className="ml-4 text-slate-400">Loading analytics...</p>
        </div>
      </div>
    )
  }
  
  console.log('📊 Rendering analytics page content')

  // If user is not loaded, show a message
  if (!user?._id) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-slate-300 mb-4">Loading user data...</p>
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    )
  }

  // Calculate quick stats
  const totalCampaigns = filteredProjects.length
  const activeCampaigns = filteredProjects.filter(p => p.status !== 'inactive' && p.status !== 'draft').length

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 py-2 sm:py-4 lg:py-6 xl:py-8">
      {/* Breadcrumb Navigation - Hidden on mobile to save space */}
      <nav className="mb-2 sm:mb-4 lg:mb-6 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-400 hidden sm:flex">
        <a href="/dashboard" className="hover:text-slate-200 transition-colors flex items-center gap-1">
          <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </a>
        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <span className="text-slate-200">Analytics</span>
      </nav>

      {/* Header - Clean and balanced mobile design */}
      <div className="mb-4 sm:mb-6 lg:mb-8">
        {/* Title Section */}
        <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3 mb-4 sm:mb-5">
          <div className="p-2 sm:p-2.5 lg:p-3 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-neon-blue/30 flex-shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-neon-blue" />
          </div>
          <div className="text-center sm:text-left sm:flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent leading-tight">
              Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Campaign performance insights
            </p>
          </div>
        </div>

        {/* Quick Stats - Clean cards on mobile */}
        {filteredProjects.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-600/30 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm sm:text-base">Total Campaigns</span>
                <span className="text-slate-100 font-bold text-lg sm:text-xl">{totalCampaigns}</span>
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-neon-green/30 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm sm:text-base">Active</span>
                <span className="text-neon-green font-bold text-lg sm:text-xl">{activeCampaigns}</span>
              </div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="mb-3 sm:mb-4">
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="input w-full text-sm sm:text-base px-4 py-2.5 sm:py-3 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 transition-all touch-manipulation min-h-[44px] appearance-none pr-10 cursor-pointer hover:border-slate-500/50"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Real-time indicator - Hidden on mobile */}
        <div className="hidden sm:flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
            <span className="hidden lg:inline">Live updates every 5 seconds</span>
            <span className="lg:hidden">Live updates</span>
          </div>
          <span className="text-slate-400">Last updated: {getTimeSinceRefresh()}</span>
        </div>

        {/* Campaign Type Tabs */}
        {user?.projects && user.projects.length > 0 && (
          <div className="mb-3 sm:mb-4">
            <CampaignTypeTabs
              selectedType={selectedCampaignType}
              onTypeChange={setSelectedCampaignType}
              campaignCounts={campaignCounts}
            />
          </div>
        )}
      </div>

      {/* Analytics Content */}
      {filteredProjects.length > 0 ? (
        <>
          {/* Overview Metrics - Hidden on mobile to save space, show campaigns first */}
          {/* For qr-link campaigns, hide Video Views and Link Clicks metrics (only show scans) */}
          <div className={`hidden sm:grid gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8 ${
            selectedCampaignType === 'qr-link' 
              ? 'grid-cols-1' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            <MetricCard
              title="Total Scans"
              value={aggregatedAnalytics.totalScans}
              icon={Eye}
              iconColor="text-neon-blue"
              bgColor="bg-blue-900/20"
            />
            {selectedCampaignType !== 'qr-link' && (
              <>
                <MetricCard
                  title="Video Views"
                  value={aggregatedAnalytics.videoViews}
                  icon={Video}
                  iconColor="text-neon-green"
                  bgColor="bg-green-900/20"
                />
                <MetricCard
                  title="Link Clicks"
                  value={aggregatedAnalytics.linkClicks}
                  icon={Share2}
                  iconColor="text-neon-purple"
                  bgColor="bg-purple-900/20"
                />
              </>
            )}
          </div>

          {/* Campaign Type Specific Analytics */}
          {selectedCampaignType === 'qr-links-video' && (
            <div className="mb-6 sm:mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-600/30">
                <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
                  <Video className="w-6 h-6 mr-2 text-neon-green" />
                  Video Analytics
                </h2>
                <VideoAnalytics
                  analytics={aggregatedAnalytics}
                  videoEvents={chartData?.videoEvents || []}
                  period={selectedPeriod}
                />
              </div>
            </div>
          )}

          {selectedCampaignType === 'qr-links-ar-video' && (
            <div className="mb-6 sm:mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-600/30">
                <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
                  <Sparkles className="w-6 h-6 mr-2 text-neon-purple" />
                  AR Experience Analytics
                </h2>
                <ARAnalytics
                  analytics={aggregatedAnalytics}
                  arEvents={chartData?.arEvents || []}
                  errorEvents={chartData?.errorEvents || []}
                  period={selectedPeriod}
                />
              </div>
            </div>
          )}

          {selectedCampaignType === 'qr-links-pdf-video' && (
            <div className="mb-6 sm:mb-8">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-600/30">
                <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-neon-blue" />
                  Document Analytics
                </h2>
                <DocumentAnalytics
                  analytics={aggregatedAnalytics}
                  documentEvents={[]}
                  period={selectedPeriod}
                />
              </div>
            </div>
          )}

          {/* Engagement Funnel */}
          {engagementFunnel.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-600/30 mb-6 sm:mb-8">
              <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-neon-cyan" />
                Engagement Funnel
              </h2>
              <EngagementFunnel steps={engagementFunnel} />
            </div>
          )}

          {/* Time Trends */}
          {chartData && chartData.scanTrend && chartData.scanTrend.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-600/30 mb-6 sm:mb-8">
              <h2 className="text-xl font-semibold text-slate-100 mb-6">Activity Trends</h2>
              <TimeTrendChart
                data={chartData.scanTrend.map((scan, index) => ({
                  date: scan.date,
                  count: scan.count,
                  videoViews: selectedCampaignType !== 'qr-link' ? (chartData.videoTrend[index]?.count || 0) : undefined
                }))}
                series={[
                  { dataKey: 'count', name: 'QR Scans', color: '#00d4ff' },
                  ...(selectedCampaignType !== 'qr-link' && chartData.videoTrend && chartData.videoTrend.length > 0 
                    ? [{ dataKey: 'videoViews', name: 'Video Views', color: '#10b981' }] 
                    : [])
                ]}
                type="area"
                height={300}
              />
            </div>
          )}

          {/* Link Performance - Hide for qr-link campaigns (they redirect automatically to external URLs, no clickable links) */}
          {selectedCampaignType !== 'qr-link' && chartData && chartData.topLinks.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-600/30 mb-6 sm:mb-8">
              <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
                <Share2 className="w-6 h-6 mr-2 text-neon-purple" />
                Link Performance
              </h2>
              <LinkPerformanceChart
                data={chartData.topLinks.map(link => ({
                  linkType: link.linkType,
                  linkUrl: link.linkUrl,
                  count: link.count
                }))}
                height={300}
              />
            </div>
          )}

          {/* Device & Browser Breakdown */}
          {chartData && chartData.deviceBreakdown && chartData.deviceBreakdown.total > 0 && (
            <div className="mb-6 sm:mb-8">
              <DeviceBreakdown
                deviceData={chartData.deviceBreakdown}
                browserData={chartData.browserBreakdown}
                height={300}
              />
            </div>
          )}

          {/* Geographic Distribution */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-6 border border-slate-600/30 mb-4 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3 sm:mb-6 flex items-center">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 mr-1.5 sm:mr-2 text-neon-cyan" />
              Geographic Distribution
            </h2>
            <LocationAnalytics 
              userId={user._id} 
              projectId={selectedCampaignType !== 'all' ? filteredProjects[0]?.id : null}
              days={selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90}
            />
          </div>

          {/* Campaign Section */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center justify-center sm:justify-start gap-3">
                  <span>Your Campaigns</span>
                  <span className="px-3 py-1 text-sm font-semibold bg-neon-blue/20 text-neon-blue rounded-full border border-neon-blue/30">
                    {filteredProjects.length}
                  </span>
                </h2>
                <p className="text-sm text-slate-400 flex items-center justify-center sm:justify-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span>Click on any campaign card below to view detailed analytics, including video performance, link clicks, and engagement metrics.</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredProjects.map((project, index) => (
                <ProjectAnalyticsCard 
                  key={project.id || index} 
                  project={project}
                  user={user}
                  analytics={analytics}
                  selectedPeriod={selectedPeriod}
                  isLatest={index === filteredProjects.length - 1}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 sm:p-12 border border-slate-600/30">
          <div className="text-center py-8 sm:py-12">
            <div className="mx-auto w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 flex items-center justify-center border border-neon-blue/30">
              <BarChart3 className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-3">
              {selectedCampaignType === 'all' ? 'No Campaigns Yet' : 'No Campaigns of This Type'}
            </h3>
            <p className="text-slate-300 mb-8 max-w-md mx-auto text-base">
              {selectedCampaignType === 'all' 
                ? 'Create your first Phygital campaign to start tracking analytics and see detailed insights about your audience engagement.'
                : `You don't have any ${selectedCampaignType.replace(/-/g, ' ')} campaigns yet. Create one to see analytics here.`
              }
            </p>
            <a
              href="/upload"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base font-semibold hover:scale-105 transition-transform"
            >
              <Sparkles className="w-5 h-5" />
              Create Campaign
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPage















