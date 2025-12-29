/**
 * Campaign Analytics Detail Page
 * Displays comprehensive analytics for a specific campaign
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { analyticsAPI } from '../../utils/api'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import LocationAnalytics from '../../components/Analytics/LocationAnalytics'
import {
  ArrowLeft,
  Eye,
  Clock,
  MousePointer,
  Video,
  FileText,
  Share2,
  MapPin,
  TrendingUp,
  BarChart3,
  Calendar,
  Home,
  ChevronRight,
  ChevronLeft,
  Play,
  CheckCircle2,
  Percent
} from 'lucide-react'
import toast from 'react-hot-toast'

const CampaignAnalyticsPage = () => {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  // Helper function to format platform names for display
  const formatPlatformName = (platform) => {
    const platformMap = {
      'contactNumber': 'Phone Number',
      'whatsappNumber': 'WhatsApp',
      'instagram': 'Instagram',
      'facebook': 'Facebook',
      'twitter': 'Twitter',
      'linkedin': 'LinkedIn',
      'website': 'Website',
      'tiktok': 'TikTok'
    }
    return platformMap[platform] || platform.charAt(0).toUpperCase() + platform.slice(1).replace(/([A-Z])/g, ' $1')
  }

  useEffect(() => {
    const fetchCampaignAnalytics = async () => {
      if (!projectId) {
        toast.error('Project ID is required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await analyticsAPI.getCampaignAnalytics(projectId, selectedPeriod)
        
        if (response.data?.status === 'success') {
          setAnalytics(response.data.data)
        } else {
          toast.error('Failed to load campaign analytics')
        }
      } catch (error) {
        console.error('Error fetching campaign analytics:', error)
        toast.error('Failed to load campaign analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaignAnalytics()
  }, [projectId, selectedPeriod])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">Campaign Not Found</h1>
          <button
            onClick={() => navigate('/analytics')}
            className="px-4 py-2 bg-neon-purple text-white rounded-lg hover:bg-neon-purple/80 transition-colors"
          >
            Back to Analytics
          </button>
        </div>
      </div>
    )
  }

  const { campaign, metrics, averageTimeSpent, videoAnalytics, socialMediaBreakdown, linkBreakdown, locationBreakdown, dailyTrends } = analytics

  // Get campaign status and type for badge and filtering
  const getCampaignInfo = () => {
    if (!user?.projects) return { status: null, type: null }
    const project = user.projects.find(p => p.id === projectId)
    return {
      status: project?.status || 'active',
      type: project?.campaignType || campaign?.campaignType || null
    }
  }

  const campaignInfo = getCampaignInfo()
  const campaignStatus = campaignInfo.status
  const campaignType = campaignInfo.type
  // Check if it's a QR links campaign (only links, no videos or documents)
  // Handles both 'qr-link' and 'qr-links' types, but excludes 'qr-links-video', 'qr-links-pdf-video', etc.
  const isQRLinkCampaign = campaignType === 'qr-link' || campaignType === 'qr-links'
  const statusColors = {
    active: 'bg-neon-green/20 text-neon-green border-neon-green/30',
    draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    inactive: 'bg-slate-600/20 text-slate-500 border-slate-600/30'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <a href="/dashboard" className="hover:text-slate-200 transition-colors flex items-center gap-1">
            <Home className="w-4 h-4" />
            <span>Dashboard</span>
          </a>
          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => navigate('/analytics')}
            className="hover:text-slate-200 transition-colors"
          >
            Analytics
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-200 truncate max-w-xs">{campaign.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => navigate('/analytics')}
                  className="p-2 rounded-lg bg-slate-800/50 border border-slate-600/30 hover:bg-slate-700/50 hover:border-neon-blue/50 transition-all"
                  title="Back to Analytics"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-300" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-100">{campaign.name}</h1>
                    {campaignStatus && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColors[campaignStatus] || statusColors.active}`}>
                        {campaignStatus.charAt(0).toUpperCase() + campaignStatus.slice(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400">
                    {campaign.campaignType?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Campaign'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2.5 bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 transition-all appearance-none pr-10 cursor-pointer hover:border-slate-500/50"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Overview Metrics - For QR link campaigns, show Total Page Views, Scans, and Avg. Time Spent */}
        <div className={`grid gap-4 mb-8 ${
          isQRLinkCampaign 
            ? 'grid-cols-1 md:grid-cols-3' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'
        }`}>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 hover:border-neon-blue/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-neon-blue/20 border border-neon-blue/30">
                <Eye className="w-5 h-5 text-neon-blue" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-100 mb-1">{metrics.totalPageViews}</div>
            <div className="text-sm text-slate-400">Total Page Views</div>
          </div>

          {/* Show scans metric for QR link campaigns */}
          {isQRLinkCampaign && (
            <>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 hover:border-neon-cyan/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/30">
                    <BarChart3 className="w-5 h-5 text-neon-cyan" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">{metrics.totalScans || 0}</div>
                <div className="text-sm text-slate-400">Total Scans</div>
              </div>

              {/* Avg. Time Spent for QR link campaigns */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 hover:border-neon-green/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-neon-green/20 border border-neon-green/30">
                    <Clock className="w-5 h-5 text-neon-green" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">
                  {Math.floor((averageTimeSpent || 0) / 60)}:{((averageTimeSpent || 0) % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-slate-400">Avg. Time Spent (min:sec)</div>
              </div>
            </>
          )}

          {/* Show all metrics for non-QR link campaigns (including qr-links-ar-video, qr-links-pdf-video, etc.) */}
          {!isQRLinkCampaign && (
            <>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 hover:border-neon-cyan/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-neon-cyan/20 border border-neon-cyan/30">
                    <BarChart3 className="w-5 h-5 text-neon-cyan" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">{metrics.totalScans || 0}</div>
                <div className="text-sm text-slate-400">Total Scans</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 hover:border-neon-green/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-neon-green/20 border border-neon-green/30">
                    <Clock className="w-5 h-5 text-neon-green" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">
                  {Math.floor(averageTimeSpent / 60)}:{(averageTimeSpent % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm text-slate-400">Avg. Time Spent (min:sec)</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 hover:border-neon-purple/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-neon-purple/20 border border-neon-purple/30">
                    <MousePointer className="w-5 h-5 text-neon-purple" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">
                  {metrics.totalLinkClicks + metrics.totalSocialClicks}
                </div>
                <div className="text-sm text-slate-400">Total Clicks</div>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 hover:border-neon-pink/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-neon-pink/20 border border-neon-pink/30">
                    <Video className="w-5 h-5 text-neon-pink" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">{videoAnalytics.totalPlays}</div>
                <div className="text-sm text-slate-400">Video Plays</div>
              </div>
            </>
          )}
        </div>

        {/* Video Analytics - Hide for QR link campaigns */}
        {!isQRLinkCampaign && videoAnalytics && videoAnalytics.totalPlays > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-600/30 mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
              <Video className="w-6 h-6 mr-2 text-neon-pink" />
              Video Analytics
            </h2>
            
            {/* Main Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Total Plays */}
              <div className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-pink/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-neon-pink/20 border border-neon-pink/30">
                    <Play className="w-5 h-5 text-neon-pink" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">{videoAnalytics.totalPlays}</div>
                <div className="text-sm text-slate-400">Total Plays</div>
              </div>

              {/* Completion Rate */}
              <div className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-purple/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-neon-purple/20 border border-neon-purple/30">
                    <Percent className="w-5 h-5 text-neon-purple" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">{videoAnalytics.completionRate}%</div>
                <div className="text-sm text-slate-400">Completion Rate</div>
              </div>

              {/* Total Completions */}
              <div className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-green/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-neon-green/20 border border-neon-green/30">
                    <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-100 mb-1">{videoAnalytics.totalCompletions}</div>
                <div className="text-sm text-slate-400">Completions</div>
              </div>
            </div>

            {/* Progress Milestones */}
            <div>
              <h3 className="text-lg font-medium text-slate-200 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-neon-cyan" />
                Progress Milestones
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {Object.entries(videoAnalytics.milestones).map(([milestone, count]) => (
                  <div 
                    key={milestone} 
                    className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-cyan/30 transition-colors text-center"
                  >
                    <div className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1">{count}</div>
                    <div className="text-xs sm:text-sm text-slate-400">{milestone}% Reached</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Social Media Breakdown - Show for all campaigns (including QR links) */}
        {Object.keys(socialMediaBreakdown).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
              <Share2 className="w-6 h-6 mr-2 text-neon-purple" />
              Social Media Clicks
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(socialMediaBreakdown).map(([platform, count]) => (
                <div key={platform} className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-purple/30 transition-colors">
                  <div className="text-2xl font-bold text-slate-100">{count}</div>
                  <div className="text-sm text-slate-400">{formatPlatformName(platform)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link Breakdown - Show for all campaigns (including QR links) */}
        {Object.keys(linkBreakdown).length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
              <MousePointer className="w-6 h-6 mr-2 text-neon-blue" />
              Link Performance
            </h2>
            
            <div className="space-y-3">
              {Object.entries(linkBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([link, count]) => (
                  <div key={link} className="flex items-center justify-between bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-blue/30 transition-colors">
                    <div className="flex-1">
                      <div className="text-slate-100 font-medium">{formatPlatformName(link)}</div>
                    </div>
                    <div className="text-xl font-bold text-neon-blue">{count}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Document Analytics - Hide for QR link campaigns */}
        {!isQRLinkCampaign && (metrics.totalDocumentViews > 0 || metrics.totalDocumentDownloads > 0) && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-2 text-neon-orange" />
              Document Analytics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-orange/30 transition-colors">
                <div className="text-2xl font-bold text-slate-100">{metrics.totalDocumentViews}</div>
                <div className="text-sm text-slate-400">Total Views</div>
              </div>
              <div className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-orange/30 transition-colors">
                <div className="text-2xl font-bold text-slate-100">{metrics.totalDocumentDownloads}</div>
                <div className="text-sm text-slate-400">Total Downloads</div>
              </div>
            </div>
          </div>
        )}

        {/* Location Analytics - Use LocationAnalytics component for better visualization */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-slate-600/30 mb-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
            <MapPin className="w-6 h-6 mr-2 text-neon-cyan" />
            Geographic Distribution
          </h2>
          <LocationAnalytics 
            userId={user?._id} 
            projectId={projectId}
            days={selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90}
          />
        </div>

        {/* Daily Trends */}
        {dailyTrends && dailyTrends.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-600/30 mb-8">
            <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center">
              <TrendingUp className="w-6 h-6 mr-2 text-neon-cyan" />
              Daily Trends
            </h2>
            
            <div className="space-y-4">
              {dailyTrends.map((trend) => (
                <div key={trend.date} className="bg-slate-700/30 backdrop-blur-sm rounded-lg p-4 border border-slate-600/20 hover:border-neon-cyan/30 transition-colors">
                  <div className="text-sm font-medium text-slate-300 mb-3">
                    {new Date(trend.date).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className={`grid gap-4 ${
                    isQRLinkCampaign 
                      ? 'grid-cols-2' 
                      : 'grid-cols-2 md:grid-cols-5'
                  }`}>
                    <div>
                      <div className="text-lg font-bold text-slate-100">{trend.pageViews || 0}</div>
                      <div className="text-xs text-slate-400">Page Views</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-100">{trend.scans || 0}</div>
                      <div className="text-xs text-slate-400">Scans</div>
                    </div>
                    {!isQRLinkCampaign && (
                      <>
                        <div>
                          <div className="text-lg font-bold text-slate-100">{trend.videoViews || 0}</div>
                          <div className="text-xs text-slate-400">Video Views</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-100">{trend.linkClicks || 0}</div>
                          <div className="text-xs text-slate-400">Link Clicks</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-slate-100">{trend.socialClicks || 0}</div>
                          <div className="text-xs text-slate-400">Social Clicks</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CampaignAnalyticsPage

