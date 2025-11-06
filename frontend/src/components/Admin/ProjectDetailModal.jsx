/**
 * Project Detail Modal Component
 * Comprehensive project analytics and details view
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import AnalyticsChart from './AnalyticsChart'
import LoadingSpinner from '../UI/LoadingSpinner'
import {
  X,
  Eye,
  Video,
  MousePointer,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  MapPin,
  Share2,
  Calendar,
  FileText,
  Settings,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target
} from 'lucide-react'

const ProjectDetailModal = ({ project, isOpen, onClose }) => {
  const { adminApi } = useAdmin()
  const [activeTab, setActiveTab] = useState('overview')
  const [detailedData, setDetailedData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [days, setDays] = useState(30)

  useEffect(() => {
    if (isOpen && project) {
      fetchDetailedData()
    }
  }, [isOpen, project, days])

  const fetchDetailedData = async () => {
    if (!project) return
    
    try {
      setIsLoading(true)
      const data = await adminApi('get', `/projects/${project.userId}/${project.id}/detailed?days=${days}`)
      setDetailedData(data.data)
    } catch (error) {
      console.error('Failed to fetch project details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !project) return null

  // Process daily breakdown for charts
  const dailyChartData = useMemo(() => {
    if (!detailedData?.analytics?.dailyBreakdown) return { dates: [], series: [] }
    
    const dateMap = new Map()
    const eventTypes = new Set()
    
    detailedData.analytics.dailyBreakdown.forEach(item => {
      const date = item._id.date
      const eventType = item._id.eventType
      eventTypes.add(eventType)
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {})
      }
      dateMap.get(date)[eventType] = item.count
    })
    
    const dates = Array.from(dateMap.keys()).sort()
    const series = Array.from(eventTypes).map(eventType => ({
      name: eventType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      data: dates.map(date => dateMap.get(date)[eventType] || 0)
    }))
    
    return { dates, series }
  }, [detailedData?.analytics?.dailyBreakdown])

  // Process hourly breakdown
  const hourlyChartData = useMemo(() => {
    if (!detailedData?.analytics?.hourlyBreakdown) return { hours: [], series: [] }
    
    const hourMap = new Map()
    const eventTypes = new Set()
    
    detailedData.analytics.hourlyBreakdown.forEach(item => {
      const hour = item._id.hour
      const eventType = item._id.eventType
      eventTypes.add(eventType)
      
      if (!hourMap.has(hour)) {
        hourMap.set(hour, {})
      }
      hourMap.get(hour)[eventType] = item.count
    })
    
    const hours = Array.from({ length: 24 }, (_, i) => i)
    const series = Array.from(eventTypes).map(eventType => ({
      name: eventType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      data: hours.map(hour => hourMap.get(hour)?.[eventType] || 0)
    }))
    
    return { 
      hours: hours.map(h => `${h.toString().padStart(2, '0')}:00`), 
      series 
    }
  }, [detailedData?.analytics?.hourlyBreakdown])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'engagement', label: 'Engagement', icon: Target },
    { id: 'activity', label: 'Activity', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const getEventCount = (eventType) => {
    const event = detailedData?.analytics?.summary?.find(e => e._id === eventType)
    return event?.count || 0
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-slate-900 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-7xl sm:w-full border border-slate-700/50">
          {/* Header */}
          <div className="bg-slate-800/95 px-4 sm:px-6 py-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100">{project.name}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  by {project.username} • Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="input text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-slate-800/50 border-b border-slate-700/50 px-4 sm:px-6">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'border-neon-blue text-neon-blue'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="bg-slate-900 p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Eye className="h-4 w-4 text-neon-blue" />
                          <span className="text-sm text-slate-400">Scans</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-100">{getEventCount('scan').toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Video className="h-4 w-4 text-neon-green" />
                          <span className="text-sm text-slate-400">Video Views</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-100">{getEventCount('videoView').toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <MousePointer className="h-4 w-4 text-neon-purple" />
                          <span className="text-sm text-slate-400">Link Clicks</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-100">{getEventCount('linkClick').toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="h-4 w-4 text-neon-pink" />
                          <span className="text-sm text-slate-400">AR Starts</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-100">{getEventCount('arExperienceStart').toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Project Info */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">Project Information</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Status</span>
                            <span className={`px-2 py-1 rounded text-sm font-medium ${
                              project.status === 'active' ? 'bg-green-900/30 text-neon-green' :
                              project.status === 'completed' ? 'bg-blue-900/30 text-neon-blue' :
                              'bg-slate-700/30 text-slate-400'
                            }`}>
                              {project.status || 'active'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Enabled</span>
                            {project.isEnabled !== false ? (
                              <CheckCircle className="h-5 w-5 text-neon-green" />
                            ) : (
                              <XCircle className="h-5 w-5 text-neon-red" />
                            )}
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Owner</span>
                            <span className="text-slate-100">{project.username}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Created</span>
                            <span className="text-slate-100">{new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Last Updated</span>
                            <span className="text-slate-100">{new Date(project.updatedAt || project.createdAt).toLocaleDateString()}</span>
                          </div>
                          {project.lastActivity && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Last Activity</span>
                              <span className="text-slate-100">{new Date(project.lastActivity).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">File Status</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Design Image</span>
                            {project.hasDesign ? (
                              <CheckCircle className="h-5 w-5 text-neon-green" />
                            ) : (
                              <XCircle className="h-5 w-5 text-neon-red" />
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Video</span>
                            {project.hasVideo ? (
                              <CheckCircle className="h-5 w-5 text-neon-green" />
                            ) : (
                              <XCircle className="h-5 w-5 text-neon-red" />
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">MindAR Target</span>
                            {project.hasMindTarget ? (
                              <CheckCircle className="h-5 w-5 text-neon-green" />
                            ) : (
                              <XCircle className="h-5 w-5 text-neon-red" />
                            )}
                          </div>
                        </div>
                        {project.description && (
                          <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <p className="text-sm text-slate-400 mb-1">Description</p>
                            <p className="text-slate-300">{project.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && detailedData && (
                  <div className="space-y-6">
                    {/* Daily Trends */}
                    <AnalyticsChart
                      type="area"
                      title="Daily Activity Trends"
                      subtitle={`Last ${days} days`}
                      series={dailyChartData.series}
                      options={{
                        xaxis: {
                          categories: dailyChartData.dates
                        }
                      }}
                      height={300}
                    />

                    {/* Hourly Patterns */}
                    <AnalyticsChart
                      type="area"
                      title="Peak Hours Analysis"
                      subtitle="Activity by hour of day"
                      series={hourlyChartData.series}
                      options={{
                        xaxis: {
                          categories: hourlyChartData.hours
                        }
                      }}
                      height={300}
                    />

                    {/* Geographic & Device Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {detailedData.analytics.geography.countries?.length > 0 && (
                        <AnalyticsChart
                          type="donut"
                          title="Top Countries"
                          series={detailedData.analytics.geography.countries.map(c => c.count)}
                          options={{
                            labels: detailedData.analytics.geography.countries.map(c => c._id),
                            legend: { position: 'bottom' }
                          }}
                          height={300}
                        />
                      )}

                      {detailedData.analytics.devices.types?.length > 0 && (
                        <AnalyticsChart
                          type="pie"
                          title="Device Types"
                          series={detailedData.analytics.devices.types.map(d => d.count)}
                          options={{
                            labels: detailedData.analytics.devices.types.map(d => d._id || 'Unknown'),
                            legend: { position: 'bottom' }
                          }}
                          height={300}
                        />
                      )}

                      {detailedData.analytics.devices.browsers?.length > 0 && (
                        <AnalyticsChart
                          type="donut"
                          title="Browsers"
                          series={detailedData.analytics.devices.browsers.map(b => b.count)}
                          options={{
                            labels: detailedData.analytics.devices.browsers.map(b => b._id || 'Unknown'),
                            legend: { position: 'bottom' }
                          }}
                          height={300}
                        />
                      )}
                    </div>

                    {/* Top Cities */}
                    {detailedData.analytics.geography.cities?.length > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-4">
                          <MapPin className="h-5 w-5 text-slate-400" />
                          <h3 className="text-lg font-semibold text-slate-100">Top Cities</h3>
                        </div>
                        <div className="space-y-2">
                          {detailedData.analytics.geography.cities.slice(0, 10).map((city, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                            >
                              <span className="text-slate-300">
                                {city._id.city}
                                {city._id.country && (
                                  <span className="text-sm text-slate-500 ml-2">({city._id.country})</span>
                                )}
                              </span>
                              <span className="font-bold text-neon-blue">{city.count.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Engagement Tab */}
                {activeTab === 'engagement' && detailedData && (
                  <div className="space-y-6">
                    {/* Funnel */}
                    <AnalyticsChart
                      type="bar"
                      title="Engagement Funnel"
                      subtitle="User journey through engagement stages"
                      series={[{
                        name: 'Count',
                        data: [
                          detailedData.analytics.engagement.funnel.scans,
                          detailedData.analytics.engagement.funnel.videoViews,
                          detailedData.analytics.engagement.funnel.linkClicks,
                          detailedData.analytics.engagement.funnel.arStarts
                        ]
                      }]}
                      options={{
                        xaxis: {
                          categories: ['Scans', 'Video Views', 'Link Clicks', 'AR Starts']
                        },
                        plotOptions: {
                          bar: {
                            borderRadius: 4,
                            dataLabels: { position: 'top' }
                          }
                        },
                        dataLabels: {
                          enabled: true,
                          formatter: (val) => val.toLocaleString()
                        }
                      }}
                      height={300}
                    />

                    {/* Conversion Rates */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <p className="text-sm text-slate-400 mb-2">Scan → Video</p>
                        <p className="text-3xl font-bold text-neon-blue">
                          {detailedData.analytics.engagement.funnel.scanToVideoConversion}%
                        </p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <p className="text-sm text-slate-400 mb-2">Video → Link</p>
                        <p className="text-3xl font-bold text-neon-purple">
                          {detailedData.analytics.engagement.funnel.videoToLinkConversion}%
                        </p>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <p className="text-sm text-slate-400 mb-2">Link → AR</p>
                        <p className="text-3xl font-bold text-neon-pink">
                          {detailedData.analytics.engagement.funnel.linkToArConversion}%
                        </p>
                      </div>
                    </div>

                    {/* Video Completion */}
                    {detailedData.analytics.engagement.videoCompletion.totalViews > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">Video Completion Metrics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-slate-400">Total Views</p>
                            <p className="text-xl font-bold text-slate-100">
                              {detailedData.analytics.engagement.videoCompletion.totalViews.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Completion Rate</p>
                            <p className="text-xl font-bold text-neon-green">
                              {detailedData.analytics.engagement.videoCompletion.completionRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Avg Completion</p>
                            <p className="text-xl font-bold text-slate-100">
                              {parseFloat(detailedData.analytics.engagement.videoCompletion.averageCompletionRate || 0).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-400">Completed Views</p>
                            <p className="text-xl font-bold text-slate-100">
                              {detailedData.analytics.engagement.videoCompletion.completedViews.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Social Media */}
                    {detailedData.analytics.socialMedia?.length > 0 && (
                      <AnalyticsChart
                        type="bar"
                        title="Social Media Clicks"
                        subtitle="Link clicks by platform"
                        series={[{
                          name: 'Clicks',
                          data: detailedData.analytics.socialMedia.map(sm => sm.count)
                        }]}
                        options={{
                          xaxis: {
                            categories: detailedData.analytics.socialMedia.map(sm => sm._id || 'Unknown')
                          },
                          plotOptions: {
                            bar: {
                              borderRadius: 4
                            }
                          },
                          dataLabels: {
                            enabled: true
                          }
                        }}
                        height={300}
                      />
                    )}
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h3 className="text-lg font-semibold text-slate-100 mb-4">Recent Activity Timeline</h3>
                      {detailedData?.analytics?.summary?.length > 0 ? (
                        <div className="space-y-3">
                          {detailedData.analytics.summary.map((event, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-slate-100 capitalize">
                                  {event._id.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                                {event.lastOccurrence && (
                                  <p className="text-sm text-slate-400 mt-1">
                                    Last: {new Date(event.lastOccurrence).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <span className="text-xl font-bold text-neon-blue">{event.count.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400">No activity data available</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* QR Position */}
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">QR Code Position</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-slate-400">X Position</span>
                            <span className="text-slate-100">{project.qrPosition?.x || 0}px</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Y Position</span>
                            <span className="text-slate-100">{project.qrPosition?.y || 0}px</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Width</span>
                            <span className="text-slate-100">{project.qrPosition?.width || 100}px</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Height</span>
                            <span className="text-slate-100">{project.qrPosition?.height || 100}px</span>
                          </div>
                        </div>
                      </div>

                      {/* Social Links */}
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <h3 className="text-lg font-semibold text-slate-100 mb-4">Social Links</h3>
                        <div className="space-y-2">
                          {['instagram', 'facebook', 'twitter', 'linkedin', 'website'].map(platform => (
                            <div key={platform} className="flex justify-between">
                              <span className="text-slate-400 capitalize">{platform}</span>
                              {project.socialLinks?.[platform] ? (
                                <a
                                  href={project.socialLinks[platform]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-neon-blue hover:underline"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="text-slate-500">Not set</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetailModal

