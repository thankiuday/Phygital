/**
 * Analytics Page Component
 * Displays user analytics and engagement metrics
 * Shows charts and detailed statistics
 */

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { analyticsAPI } from '../../utils/api'
import { 
  BarChart3, 
  Eye, 
  MousePointer, 
  TrendingUp,
  Calendar,
  Download
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'

const AnalyticsPage = () => {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  useEffect(() => {
    if (user?._id) {
      fetchAnalytics()
    }
  }, [user, selectedPeriod])

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">
              Analytics Dashboard
            </h1>
            <p className="text-slate-300 mt-2">
              Track your QR code performance and user engagement
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="input"
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

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-neon-blue/20 rounded-lg mr-4 shadow-glow-blue">
              <Eye className="h-6 w-6 text-neon-blue" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Total Scans</p>
              <p className="text-2xl font-bold text-slate-100">
                {analytics?.overview?.totalScans || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-neon-green/20 rounded-lg mr-4 shadow-glow-green">
              <BarChart3 className="h-6 w-6 text-neon-green" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Video Views</p>
              <p className="text-2xl font-bold text-slate-100">
                {analytics?.overview?.totalVideoViews || 0}
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
                {analytics?.overview?.totalLinkClicks || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-3 bg-neon-orange/20 rounded-lg mr-4 shadow-glow-orange">
              <TrendingUp className="h-6 w-6 text-neon-orange" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">Engagement Rate</p>
              <p className="text-2xl font-bold text-slate-100">
                {analytics?.overview?.engagementRate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-slate-100">
              Recent Activity
            </h2>
          </div>
          
          <div className="space-y-4">
            {analytics?.recentActivity?.lastScanAt && (
              <div className="flex items-center p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <div className="p-2 bg-neon-blue/20 rounded-lg mr-3 shadow-glow-blue">
                  <Eye className="h-4 w-4 text-neon-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Last QR scan
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(analytics.recentActivity.lastScanAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            
            {analytics?.recentActivity?.lastVideoViewAt && (
              <div className="flex items-center p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                <div className="p-2 bg-neon-green/20 rounded-lg mr-3 shadow-glow-green">
                  <BarChart3 className="h-4 w-4 text-neon-green" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Last video view
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(analytics.recentActivity.lastVideoViewAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold text-slate-100">
              Performance Insights
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-900/20 border border-neon-blue/30 rounded-lg">
              <h3 className="text-sm font-medium text-neon-blue mb-2">
                Scan to View Conversion
              </h3>
              <p className="text-2xl font-bold text-neon-blue">
                {analytics?.overview?.totalScans > 0 
                  ? Math.round((analytics.overview.totalVideoViews / analytics.overview.totalScans) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-slate-300">
                Users who watched your video after scanning
              </p>
            </div>

            <div className="p-4 bg-green-900/20 border border-neon-green/30 rounded-lg">
              <h3 className="text-sm font-medium text-neon-green mb-2">
                Social Engagement
              </h3>
              <p className="text-2xl font-bold text-neon-green">
                {analytics?.overview?.totalScans > 0 
                  ? Math.round((analytics.overview.totalLinkClicks / analytics.overview.totalScans) * 100)
                  : 0}%
              </p>
              <p className="text-xs text-slate-300">
                Users who clicked your social links
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Chart Placeholder */}
      <div className="card mt-8">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-100">
            Activity Trends
          </h2>
          <p className="text-slate-300">
            Daily activity over the selected period
          </p>
        </div>
        
        <div className="h-64 flex items-center justify-center bg-slate-800/50 rounded-lg border border-slate-600/30">
          <div className="text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <p className="text-slate-300">
              Chart visualization would be implemented here
            </p>
            <p className="text-sm text-slate-400">
              Using Chart.js or similar library
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
