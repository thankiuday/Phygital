/**
 * Admin Dashboard Page
 * Comprehensive system-wide dashboard with analytics, charts, and insights
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import AnalyticsChart from '../../components/Admin/AnalyticsChart'
import {
  Users,
  FolderKanban,
  Eye,
  MousePointer,
  Video,
  Mail,
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowRight,
  AlertCircle,
  Settings,
  Globe,
  Smartphone,
  Monitor,
  Zap,
  MapPin,
  Share2,
  Activity
} from 'lucide-react'

const AdminDashboard = () => {
  const { adminApi } = useAdmin()
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetchStats()
  }, [days])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await adminApi('get', `/stats?days=${days}`)
      setStats(data.data)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
      setError('Failed to load statistics')
    } finally {
      setIsLoading(false)
    }
  }

  // Process daily breakdown for charts
  const dailyChartData = useMemo(() => {
    if (!stats?.dailyBreakdown) return { dates: [], series: [] }
    
    const dateMap = new Map()
    const eventTypes = new Set()
    
    stats.dailyBreakdown.forEach(item => {
      const date = item._id.date
      const eventType = item._id.eventType
      eventTypes.add(eventType)
      
      if (!dateMap.has(date)) {
        dateMap.set(date, {})
      }
      dateMap.get(date)[eventType] = item.count
    })
    
    // Sort dates properly (YYYY-MM-DD format sorts correctly as strings)
    const dates = Array.from(dateMap.keys()).sort((a, b) => {
      // Ensure proper chronological sorting
      return a.localeCompare(b)
    })
    const series = Array.from(eventTypes).map(eventType => ({
      name: eventType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      data: dates.map(date => dateMap.get(date)[eventType] || 0)
    }))
    
    return { dates, series }
  }, [stats?.dailyBreakdown])

  // Process hourly breakdown
  const hourlyChartData = useMemo(() => {
    if (!stats?.hourlyBreakdown) return { hours: [], series: [] }
    
    const hourMap = new Map()
    const eventTypes = new Set()
    
    stats.hourlyBreakdown.forEach(item => {
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
  }, [stats?.hourlyBreakdown])

  const formatChange = (change) => {
    if (!change || change === '0') return null
    const numChange = parseFloat(change)
    const isPositive = numChange >= 0
    return {
      value: Math.abs(numChange).toFixed(1),
      isPositive,
      Icon: isPositive ? TrendingUp : TrendingDown
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <div className="flex items-center space-x-3 text-neon-red">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const overview = stats?.overview || {}
  const analytics = overview?.analytics || {}
  const users = overview?.users || {}

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1 sm:mb-2">Dashboard</h1>
          <p className="text-sm sm:text-base text-slate-300">System-wide statistics and analytics overview</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="input text-sm sm:text-base"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Users */}
        <Link to="/admin/users" className="card hover:border-neon-blue/50 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">Total Users</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                {(users?.total || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{users?.active || 0} active</span>
                {users?.recentChange && formatChange(users.recentChange) && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className={`flex items-center gap-1 ${
                      formatChange(users.recentChange)?.isPositive ? 'text-neon-green' : 'text-neon-red'
                    }`}>
                      {formatChange(users.recentChange)?.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatChange(users.recentChange)?.value}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-blue-900/30 border border-blue-600/30">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-neon-blue" />
            </div>
          </div>
        </Link>

        {/* Total Projects */}
        <Link to="/admin/projects" className="card hover:border-neon-purple/50 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">Total Projects</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                {(overview?.projects?.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Across all users</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-900/30 border border-purple-600/30">
              <FolderKanban className="h-5 w-5 sm:h-6 sm:w-6 text-neon-purple" />
            </div>
          </div>
        </Link>

        {/* Total Scans */}
        <Link to="/admin/analytics" className="card hover:border-neon-green/50 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">Total Scans</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                {(analytics?.scans?.period || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{(analytics?.scans?.total || 0).toLocaleString()} all-time</span>
                {analytics?.scans?.change && formatChange(analytics.scans.change) && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className={`flex items-center gap-1 ${
                      formatChange(analytics.scans.change)?.isPositive ? 'text-neon-green' : 'text-neon-red'
                    }`}>
                      {formatChange(analytics.scans.change)?.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatChange(analytics.scans.change)?.value}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-green-900/30 border border-green-600/30">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-neon-green" />
            </div>
          </div>
        </Link>

        {/* Video Views */}
        <Link to="/admin/analytics" className="card hover:border-neon-pink/50 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">Video Views</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                {(analytics?.videoViews?.period || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{(analytics?.videoViews?.total || 0).toLocaleString()} all-time</span>
                {analytics?.videoViews?.change && formatChange(analytics.videoViews.change) && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className={`flex items-center gap-1 ${
                      formatChange(analytics.videoViews.change)?.isPositive ? 'text-neon-green' : 'text-neon-red'
                    }`}>
                      {formatChange(analytics.videoViews.change)?.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatChange(analytics.videoViews.change)?.value}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-pink-900/30 border border-pink-600/30">
              <Video className="h-5 w-5 sm:h-6 sm:w-6 text-neon-pink" />
            </div>
          </div>
        </Link>

        {/* Link Clicks */}
        <Link to="/admin/analytics" className="card hover:border-neon-cyan/50 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">Link Clicks</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                {(analytics?.linkClicks?.period || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{(analytics?.linkClicks?.total || 0).toLocaleString()} all-time</span>
                {analytics?.linkClicks?.change && formatChange(analytics.linkClicks.change) && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className={`flex items-center gap-1 ${
                      formatChange(analytics.linkClicks.change)?.isPositive ? 'text-neon-green' : 'text-neon-red'
                    }`}>
                      {formatChange(analytics.linkClicks.change)?.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatChange(analytics.linkClicks.change)?.value}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-cyan-900/30 border border-cyan-600/30">
              <MousePointer className="h-5 w-5 sm:h-6 sm:w-6 text-neon-cyan" />
            </div>
          </div>
        </Link>

        {/* AR Starts */}
        <Link to="/admin/analytics" className="card hover:border-neon-purple/50 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">AR Starts</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                {(analytics?.arStarts?.period || 0).toLocaleString()}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{(analytics?.arStarts?.total || 0).toLocaleString()} all-time</span>
                {analytics?.arStarts?.change && formatChange(analytics.arStarts.change) && (
                  <>
                    <span className="text-slate-500">•</span>
                    <span className={`flex items-center gap-1 ${
                      formatChange(analytics.arStarts.change)?.isPositive ? 'text-neon-green' : 'text-neon-red'
                    }`}>
                      {formatChange(analytics.arStarts.change)?.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {formatChange(analytics.arStarts.change)?.value}%
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-purple-900/30 border border-purple-600/30">
              <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-neon-purple" />
            </div>
          </div>
        </Link>

        {/* Contact Messages */}
        <Link to="/admin/contacts" className="card hover:border-neon-orange/50 transition-all duration-200 cursor-pointer">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">Contact Messages</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                {(overview?.contacts?.total || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">{overview?.contacts?.new || 0} new</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-900/30 border border-orange-600/30">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-neon-orange" />
            </div>
          </div>
        </Link>

        {/* Conversion Rate */}
        <div className="card">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-400 mb-1">Overall Conversion</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
                {parseFloat(stats?.engagement?.funnel?.overallConversion || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400">Scan to engagement</p>
            </div>
            <div className="p-3 rounded-lg bg-green-900/30 border border-green-600/30">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-neon-green" />
            </div>
          </div>
        </div>
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Trends */}
        <div className="card">
          <AnalyticsChart
            type="area"
            title="Daily Activity Trends"
            subtitle={`Last ${days} days`}
            series={dailyChartData.series}
            options={{
              xaxis: {
                categories: dailyChartData.dates
              },
              stroke: {
                curve: 'smooth',
                width: 2
              },
              fill: {
                type: 'gradient',
                gradient: {
                  shadeIntensity: 1,
                  opacityFrom: 0.7,
                  opacityTo: 0.3
                }
              }
            }}
            height={300}
          />
        </div>

        {/* Peak Hours Analysis */}
        <div className="card">
          <AnalyticsChart
            type="area"
            title="Peak Hours Analysis"
            subtitle="Activity by hour of day"
            series={hourlyChartData.series}
            options={{
              xaxis: {
                categories: hourlyChartData.hours
              },
              stroke: {
                curve: 'smooth',
                width: 2
              },
              fill: {
                type: 'gradient',
                gradient: {
                  shadeIntensity: 1,
                  opacityFrom: 0.7,
                  opacityTo: 0.3
                }
              }
            }}
            height={300}
          />
        </div>
      </div>

      {/* Geographic & Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stats?.geography?.countries?.length > 0 && (
          <div className="card">
            <AnalyticsChart
              type="donut"
              title="Top Countries"
              series={stats.geography.countries.map(c => c.count)}
              options={{
                labels: stats.geography.countries.map(c => c._id || 'Unknown'),
                legend: { position: 'bottom' }
              }}
              height={300}
            />
          </div>
        )}

        {stats?.devices?.types?.length > 0 && (
          <div className="card">
            <AnalyticsChart
              type="pie"
              title="Device Types"
              series={stats.devices.types.map(d => d.count)}
              options={{
                labels: stats.devices.types.map(d => d._id || 'Unknown'),
                legend: { position: 'bottom' }
              }}
              height={300}
            />
          </div>
        )}

        {stats?.devices?.browsers?.length > 0 && (
          <div className="card">
            <AnalyticsChart
              type="donut"
              title="Top Browsers"
              series={stats.devices.browsers.map(b => b.count)}
              options={{
                labels: stats.devices.browsers.map(b => b._id || 'Unknown'),
                legend: { position: 'bottom' }
              }}
              height={300}
            />
          </div>
        )}
      </div>

      {/* Engagement Funnel */}
      {stats?.engagement?.funnel && (
        <div className="card">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Engagement Funnel</h2>
            <p className="text-sm text-slate-400">User journey through engagement stages</p>
          </div>
          <AnalyticsChart
            type="bar"
            series={[{
              name: 'Count',
              data: [
                stats.engagement.funnel.scans,
                stats.engagement.funnel.videoViews,
                stats.engagement.funnel.linkClicks,
                stats.engagement.funnel.arStarts
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Scan → Video</p>
              <p className="text-xl font-bold text-neon-blue">
                {parseFloat(stats.engagement.funnel.scanToVideoConversion || 0).toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Video → Link</p>
              <p className="text-xl font-bold text-neon-purple">
                {parseFloat(stats.engagement.funnel.videoToLinkConversion || 0).toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Link → AR</p>
              <p className="text-xl font-bold text-neon-pink">
                {parseFloat(stats.engagement.funnel.linkToArConversion || 0).toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">Overall</p>
              <p className="text-xl font-bold text-neon-green">
                {parseFloat(stats.engagement.funnel.overallConversion || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Projects & Users */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Projects */}
        {stats?.topProjects?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-100">Top Projects</h2>
                <Link
                  to="/admin/projects"
                  className="text-sm text-neon-blue hover:underline flex items-center gap-1"
                >
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              {stats.topProjects.slice(0, 5).map((project, index) => (
                <div
                  key={`${project.userId}-${project.projectId}`}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-neon-blue">#{index + 1}</span>
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {project.projectName || `Project ${project.projectId}`}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 truncate">by {project.username}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-slate-100">{project.totalEvents}</p>
                    <p className="text-xs text-slate-400">events</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Users */}
        {stats?.topUsers?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-100">Top Users</h2>
                <Link
                  to="/admin/users"
                  className="text-sm text-neon-blue hover:underline flex items-center gap-1"
                >
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              {stats.topUsers.slice(0, 5).map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-neon-blue">#{index + 1}</span>
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {user.username || user.email}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm font-bold text-slate-100">{user.totalEvents}</p>
                    <p className="text-xs text-slate-400">events</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Social Media & Geographic Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Social Media Clicks */}
        {stats?.socialMedia?.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-semibold text-slate-100">Social Media Clicks</h2>
            </div>
            <AnalyticsChart
              type="bar"
              series={[{
                name: 'Clicks',
                data: stats.socialMedia.map(sm => sm.count)
              }]}
              options={{
                xaxis: {
                  categories: stats.socialMedia.map(sm => sm._id || 'Unknown')
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
              height={250}
            />
          </div>
        )}

        {/* Top Cities */}
        {stats?.geography?.cities?.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-semibold text-slate-100">Top Cities</h2>
            </div>
            <div className="space-y-2">
              {stats.geography.cities.slice(0, 8).map((city, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                >
                  <span className="text-slate-300 text-sm">
                    {city._id.city}
                    {city._id.country && (
                      <span className="text-slate-500 ml-2">({city._id.country})</span>
                    )}
                  </span>
                  <span className="font-bold text-neon-blue">{city.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-slate-100">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link
            to="/admin/users"
            className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-neon-blue" />
              <span className="font-medium text-slate-100 group-hover:text-neon-blue transition-colors">
                Manage Users
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-neon-blue transition-colors" />
          </Link>
          <Link
            to="/admin/contacts"
            className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-neon-orange" />
              <span className="font-medium text-slate-100 group-hover:text-neon-orange transition-colors">
                View Contacts ({overview?.contacts?.new || 0} new)
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-neon-orange transition-colors" />
          </Link>
          <Link
            to="/admin/analytics"
            className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-neon-green" />
              <span className="font-medium text-slate-100 group-hover:text-neon-green transition-colors">
                View Analytics
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-neon-green transition-colors" />
          </Link>
          <Link
            to="/admin/settings"
            className="flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all duration-200 group"
          >
            <div className="flex items-center space-x-3">
              <Settings className="h-5 w-5 text-neon-purple" />
              <span className="font-medium text-slate-100 group-hover:text-neon-purple transition-colors">
                Site Settings
              </span>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-neon-purple transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
