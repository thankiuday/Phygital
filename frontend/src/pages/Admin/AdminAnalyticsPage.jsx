/**
 * Admin Analytics Page
 * Comprehensive site-wide analytics dashboard with visualizations
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import AnalyticsChart from '../../components/Admin/AnalyticsChart'
import { SkeletonCard, SkeletonStatCard, SkeletonChart, SkeletonListItem, Skeleton } from '../../components/UI/Skeleton'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Video,
  MousePointer,
  Users,
  Calendar,
  AlertCircle,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  Clock,
  MapPin,
  Share2,
  Activity,
  Target,
  Zap
} from 'lucide-react'

// Skeleton Loading Component for Admin Analytics
const AdminAnalyticsSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton width="200px" height="2rem" />
          <Skeleton width="300px" height="1rem" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton width="150px" height="2.5rem" />
          <Skeleton width="48px" height="2.5rem" />
        </div>
      </div>

      {/* Location Filters Skeleton */}
      <SkeletonCard>
        <div className="flex items-center justify-between mb-4">
          <Skeleton width="150px" height="1.5rem" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Skeleton width="80px" height="1rem" className="mb-2" />
            <Skeleton width="100%" height="2.5rem" />
          </div>
          <div>
            <Skeleton width="80px" height="1rem" className="mb-2" />
            <Skeleton width="100%" height="2.5rem" />
          </div>
          <div>
            <Skeleton width="100px" height="1rem" className="mb-2" />
            <Skeleton width="100%" height="2.5rem" />
          </div>
        </div>
      </SkeletonCard>

      {/* Overview Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 gap-6">
        <SkeletonChart height="350px" />
        <SkeletonChart height="300px" />
        <SkeletonChart height="300px" />
      </div>

      {/* Geographic Analytics Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart height="350px" />
        <SkeletonCard>
          <Skeleton width="120px" height="1.5rem" className="mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        </SkeletonCard>
      </div>

      {/* Villages Skeleton */}
      <SkeletonCard>
        <Skeleton width="180px" height="1.5rem" className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      </SkeletonCard>

      {/* Device Analytics Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <SkeletonChart key={i} height="300px" />
        ))}
      </div>

      {/* Top Users Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard>
          <Skeleton width="150px" height="1.5rem" className="mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        </SkeletonCard>
        <SkeletonCard>
          <Skeleton width="150px" height="1.5rem" className="mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonListItem key={i} />
            ))}
          </div>
        </SkeletonCard>
      </div>
    </div>
  )
}

const AdminAnalyticsPage = () => {
  const { adminApi } = useAdmin()
  const [analytics, setAnalytics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [days, setDays] = useState(30)
  const [locationFilter, setLocationFilter] = useState({
    country: '',
    city: '',
    village: ''
  })

  useEffect(() => {
    fetchAnalytics()
  }, [days, locationFilter])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Build query params
      const params = new URLSearchParams({ days: days.toString() })
      if (locationFilter.country) params.append('country', locationFilter.country)
      if (locationFilter.city) params.append('city', locationFilter.city)
      if (locationFilter.village) params.append('village', locationFilter.village)
      
      const data = await adminApi('get', `/analytics?${params.toString()}`)
      
      // Debug: Log received data
      console.log('🔍 Frontend received geography data:', data.data?.geography)
      
      setAnalytics(data.data)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
      setError('Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }
  
  const clearFilters = () => {
    setLocationFilter({ country: '', city: '', village: '' })
  }
  
  // Get unique values for filters
  const getUniqueCountries = () => {
    if (!analytics?.geography?.countries) return []
    return [...new Set(analytics.geography.countries.map(c => c._id).filter(Boolean))]
  }
  
  const getUniqueCities = () => {
    if (!analytics?.geography?.cities) return []
    return [...new Set(analytics.geography.cities.map(c => c._id.city).filter(Boolean))]
  }
  
  const getUniqueVillages = () => {
    if (!analytics?.geography?.villages) return []
    return [...new Set(analytics.geography.villages.map(v => v._id.village).filter(Boolean))]
  }

  // Helper function to get event count
  const getEventCount = (eventType) => {
    const event = analytics?.summary?.find(e => e._id === eventType)
    return event?.count || 0
  }

  // Process daily breakdown for charts
  const dailyChartData = useMemo(() => {
    if (!analytics?.dailyBreakdown) return { dates: [], series: [] }
    
    const dateMap = new Map()
    const eventTypes = new Set()
    
    analytics.dailyBreakdown.forEach(item => {
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
  }, [analytics?.dailyBreakdown])

  // Process hourly breakdown
  const hourlyChartData = useMemo(() => {
    if (!analytics?.hourlyBreakdown) return { hours: [], series: [] }
    
    const hourMap = new Map()
    const eventTypes = new Set()
    
    analytics.hourlyBreakdown.forEach(item => {
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
  }, [analytics?.hourlyBreakdown])

  // Process weekly pattern
  const weeklyChartData = useMemo(() => {
    if (!analytics?.weeklyPattern) return { days: [], series: [] }
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayMap = new Map()
    const eventTypes = new Set()
    
    analytics.weeklyPattern.forEach(item => {
      const dayOfWeek = item._id.dayOfWeek - 1 // MongoDB dayOfWeek is 1-7
      const eventType = item._id.eventType
      eventTypes.add(eventType)
      
      if (!dayMap.has(dayOfWeek)) {
        dayMap.set(dayOfWeek, {})
      }
      dayMap.get(dayOfWeek)[eventType] = item.count
    })
    
    const days = Array.from({ length: 7 }, (_, i) => dayNames[i])
    const series = Array.from(eventTypes).map(eventType => ({
      name: eventType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      data: Array.from({ length: 7 }, (_, i) => dayMap.get(i)?.[eventType] || 0)
    }))
    
    return { days, series }
  }, [analytics?.weeklyPattern])

  if (isLoading) {
    return <AdminAnalyticsSkeleton />
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

  if (!analytics) {
    return (
      <div className="card">
        <p className="text-slate-400">No analytics data available</p>
      </div>
    )
  }

  const statsCards = [
    {
      title: 'Total Scans',
      value: getEventCount('scan'),
      icon: Eye,
      color: 'neon-blue',
      comparison: analytics.comparison?.scans
    },
    {
      title: 'Video Views',
      value: getEventCount('videoView'),
      icon: Video,
      color: 'neon-green',
      comparison: analytics.comparison?.videoViews
    },
    {
      title: 'Link Clicks',
      value: getEventCount('linkClick'),
      icon: MousePointer,
      color: 'neon-purple',
      comparison: analytics.comparison?.linkClicks
    },
    {
      title: 'AR Experiences',
      value: getEventCount('arExperienceStart'),
      icon: Zap,
      color: 'neon-pink',
      comparison: analytics.comparison?.arStarts
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Site Analytics</h1>
          <p className="text-slate-300">Comprehensive platform-wide analytics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="input"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Location Filters */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-neon-blue" />
            Location Filters
          </h3>
          {(locationFilter.country || locationFilter.city || locationFilter.village) && (
            <button
              onClick={clearFilters}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Country</label>
            <select
              value={locationFilter.country}
              onChange={(e) => setLocationFilter(prev => ({ ...prev, country: e.target.value, city: '', village: '' }))}
              className="input w-full"
            >
              <option value="">All Countries</option>
              {getUniqueCountries().map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">City</label>
            <select
              value={locationFilter.city}
              onChange={(e) => setLocationFilter(prev => ({ ...prev, city: e.target.value, village: '' }))}
              className="input w-full"
              disabled={!locationFilter.country}
            >
              <option value="">All Cities</option>
              {getUniqueCities().map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Village/Area</label>
            <select
              value={locationFilter.village}
              onChange={(e) => setLocationFilter(prev => ({ ...prev, village: e.target.value }))}
              className="input w-full"
              disabled={!locationFilter.city}
            >
              <option value="">All Villages/Areas</option>
              {getUniqueVillages().map(village => (
                <option key={village} value={village}>{village}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statsCards.map((card, index) => {
          const Icon = card.icon
          const colorClasses = {
            'neon-blue': 'bg-blue-900/30 text-neon-blue',
            'neon-green': 'bg-green-900/30 text-neon-green',
            'neon-purple': 'bg-purple-900/30 text-neon-purple',
            'neon-pink': 'bg-pink-900/30 text-neon-pink'
          }
          const change = card.comparison?.change || 0
          const isPositive = change >= 0
          
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[card.color] || 'bg-slate-700/30 text-slate-300'}`}>
                  <Icon className="h-6 w-6" />
                </div>
                {card.comparison && (
                  <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-neon-green' : 'text-neon-red'}`}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span>{Math.abs(change).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-slate-100">{card.value.toLocaleString()}</p>
                {card.comparison && (
                  <p className="text-xs text-slate-500 mt-1">
                    Previous: {card.comparison.previous.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time Series Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>

      {/* Weekly Pattern */}
      <AnalyticsChart
        type="bar"
        title="Weekly Activity Pattern"
        subtitle="Activity by day of week"
        series={weeklyChartData.series}
        options={{
          xaxis: {
            categories: weeklyChartData.days
          }
        }}
        height={300}
      />

      {/* Geographic Analytics */}
      {(analytics.geography?.countries?.length > 0 || analytics.geography?.cities?.length > 0 || analytics.geography?.villages?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Countries */}
          {analytics.geography.countries?.length > 0 && (
            <AnalyticsChart
              type="donut"
              title="Top Countries"
              subtitle="Activity by country"
              series={analytics.geography.countries.map(c => c.count)}
              options={{
                labels: analytics.geography.countries.map(c => c._id),
                legend: {
                  position: 'bottom'
                }
              }}
              height={350}
            />
          )}

          {/* Top Cities */}
          {analytics.geography.cities?.length > 0 && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-slate-400" />
                <h2 className="text-xl font-semibold text-slate-100">Top Cities</h2>
              </div>
              <div className="space-y-3">
                {analytics.geography.cities.slice(0, 10).map((city, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-100">
                        {city._id.city}
                        {city._id.country && (
                          <span className="text-sm text-slate-400 ml-2">({city._id.country})</span>
                        )}
                      </p>
                      {city._id.state && (
                        <p className="text-xs text-slate-500">{city._id.state}</p>
                      )}
                    </div>
                    <span className="text-lg font-bold text-neon-blue">{city.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Villages/Areas Analytics */}
      {analytics.geography?.villages?.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-100">Top Villages/Areas</h2>
            <span className="text-sm text-slate-400">({analytics.geography.villages.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.geography.villages.slice(0, 12).map((village, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 truncate">
                    {village._id.village}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {village._id.city}, {village._id.country}
                  </p>
                </div>
                <span className="ml-2 text-sm font-bold text-neon-green">{village.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Device Analytics */}
      {(analytics.devices?.types?.length > 0 || analytics.devices?.browsers?.length > 0 || analytics.devices?.operatingSystems?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device Types */}
          {analytics.devices.types?.length > 0 && (
            <AnalyticsChart
              type="pie"
              title="Device Types"
              series={analytics.devices.types.map(d => d.count)}
              options={{
                labels: analytics.devices.types.map(d => d._id || 'Anonymous'),
                legend: {
                  position: 'bottom'
                }
              }}
              height={300}
            />
          )}

          {/* Browsers */}
          {analytics.devices.browsers?.length > 0 && (
            <AnalyticsChart
              type="donut"
              title="Browser Distribution"
              series={analytics.devices.browsers.map(b => b.count)}
              options={{
                labels: analytics.devices.browsers.map(b => b._id || 'Anonymous'),
                legend: {
                  position: 'bottom'
                }
              }}
              height={300}
            />
          )}

          {/* Operating Systems */}
          {analytics.devices.operatingSystems?.length > 0 && (
            <AnalyticsChart
              type="pie"
              title="Operating Systems"
              series={analytics.devices.operatingSystems.map(os => os.count)}
              options={{
                labels: analytics.devices.operatingSystems.map(os => os._id || 'Anonymous'),
                legend: {
                  position: 'bottom'
                }
              }}
              height={300}
            />
          )}
        </div>
      )}

      {/* Engagement Metrics */}
      {analytics.engagement && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engagement Funnel */}
          <AnalyticsChart
            type="bar"
            title="Engagement Funnel"
            subtitle="Conversion through engagement stages"
            series={[
              {
                name: 'Count',
                data: [
                  analytics.engagement.funnel.scans,
                  analytics.engagement.funnel.videoViews,
                  analytics.engagement.funnel.linkClicks,
                  analytics.engagement.funnel.arStarts
                ]
              }
            ]}
            options={{
              xaxis: {
                categories: ['Scans', 'Video Views', 'Link Clicks', 'AR Starts']
              },
              plotOptions: {
                bar: {
                  borderRadius: 4,
                  dataLabels: {
                    position: 'top'
                  }
                }
              },
              dataLabels: {
                enabled: true,
                formatter: (val) => val.toLocaleString()
              }
            }}
            height={300}
          />

          {/* Engagement Stats */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Target className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-semibold text-slate-100">Engagement Metrics</h2>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-lg">
                <p className="text-sm text-slate-400 mb-2">Conversion Rates</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Scan → Video</span>
                    <span className="font-bold text-neon-blue">
                      {parseFloat(analytics.engagement.funnel.scanToVideoConversion).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Video → Link</span>
                    <span className="font-bold text-neon-purple">
                      {parseFloat(analytics.engagement.funnel.videoToLinkConversion).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Link → AR</span>
                    <span className="font-bold text-neon-pink">
                      {parseFloat(analytics.engagement.funnel.linkToArConversion).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
              
              {analytics.engagement.videoCompletion && (
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-400 mb-2">Video Completion</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Total Views</span>
                      <span className="font-bold text-slate-100">
                        {analytics.engagement.videoCompletion.totalViews.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Completion Rate</span>
                      <span className="font-bold text-neon-green">
                        {parseFloat(analytics.engagement.videoCompletion.completionRate || 0).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Avg Completion</span>
                      <span className="font-bold text-slate-100">
                        {parseFloat(analytics.engagement.videoCompletion.averageCompletionRate || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {analytics.engagement.sessions && (
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-sm text-slate-400 mb-2">Session Metrics</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Total Sessions</span>
                      <span className="font-bold text-slate-100">
                        {analytics.engagement.sessions.totalSessions.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Avg Duration</span>
                      <span className="font-bold text-neon-blue">
                        {parseFloat(analytics.engagement.sessions.averageSessionDuration || 0).toFixed(1)} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Bounce Rate</span>
                      <span className="font-bold text-neon-red">
                        {parseFloat(analytics.engagement.sessions.bounceRate || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Social Media Analytics */}
      {analytics.socialMedia?.length > 0 && (
        <AnalyticsChart
          type="bar"
          title="Social Media Clicks"
          subtitle="Link clicks by platform"
          series={[
            {
              name: 'Clicks',
              data: analytics.socialMedia.map(sm => sm.count)
            }
          ]}
          options={{
            xaxis: {
              categories: analytics.socialMedia.map(sm => sm._id || 'Anonymous')
            },
            plotOptions: {
              bar: {
                borderRadius: 4,
                horizontal: false
              }
            },
            dataLabels: {
              enabled: true
            }
          }}
          height={300}
        />
      )}

      {/* Top Campaigns */}
      {analytics.topProjects?.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="h-5 w-5 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-100">Top Campaigns by Engagement</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Campaign</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Scans</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Video Views</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Link Clicks</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">AR Starts</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topProjects.map((project, index) => (
                  <tr key={index} className="border-b border-slate-700/30 hover:bg-slate-800/50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-slate-100">{project.projectName || 'Unnamed Campaign'}</p>
                        <p className="text-sm text-slate-400">{project.username}</p>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-slate-300">{project.scans.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-slate-300">{project.videoViews.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-slate-300">{project.linkClicks.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-slate-300">{project.arStarts.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 font-bold text-neon-blue">{project.totalEvents.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Users */}
      {analytics.topUsers?.length > 0 && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-5 w-5 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-100">Top Active Users</h2>
          </div>
          <div className="space-y-3">
            {analytics.topUsers.map((user, index) => (
              <div
                key={user.userId}
                className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-neon-blue/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-neon-blue">{index + 1}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">{user.username}</p>
                    <p className="text-sm text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-100">{user.eventCount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">events</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminAnalyticsPage
