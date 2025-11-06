/**
 * Admin Projects Page
 * View all projects across all users with comprehensive analytics
 */

import React, { useState, useEffect } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import ProjectDetailModal from '../../components/Admin/ProjectDetailModal'
import {
  FolderKanban,
  Search,
  User,
  Calendar,
  Eye,
  Video,
  MousePointer,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  ChevronDown,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  CheckCircle,
  XCircle,
  ExternalLink,
  Filter,
  RefreshCw
} from 'lucide-react'

const ProjectsPage = () => {
  const { adminApi } = useAdmin()
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [enabledFilter, setEnabledFilter] = useState('')
  const [sortBy, setSortBy] = useState('scans')
  const [sortOrder, setSortOrder] = useState('desc')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 })
  const [selectedProject, setSelectedProject] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [pagination.page, searchTerm, statusFilter, enabledFilter, sortBy, sortOrder])

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(enabledFilter && { enabled: enabledFilter }),
        sortBy,
        sortOrder
      })
      const data = await adminApi('get', `/projects?${params}`)
      setProjects(data.data.projects)
      setPagination(prev => ({ ...prev, ...data.data.pagination }))
    } catch (err) {
      console.error('Failed to fetch projects:', err)
      setError('Failed to load projects')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetails = (project) => {
    setSelectedProject(project)
    setIsModalOpen(true)
  }

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc')
    }
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1 sm:mb-2">All Projects</h1>
        <p className="text-sm sm:text-base text-slate-300">View all projects across all users with comprehensive analytics</p>
      </div>

      {/* Search, Filters and Sort */}
      <div className="space-y-4">
        {/* Search */}
        <div className="card">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects, users, or emails..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="input pl-9 sm:pl-10 w-full text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Status Filter */}
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <label className="text-sm font-medium text-slate-300">Status</label>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="input w-full text-sm sm:text-base"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Enabled Filter */}
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <label className="text-sm font-medium text-slate-300">Enabled</label>
            </div>
            <select
              value={enabledFilter}
              onChange={(e) => {
                setEnabledFilter(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="input w-full text-sm sm:text-base"
            >
              <option value="">All Projects</option>
              <option value="true">Enabled Only</option>
              <option value="false">Disabled Only</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-slate-400" />
              <label className="text-sm font-medium text-slate-300">Sort By</label>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="input appearance-none pr-10 cursor-pointer text-sm sm:text-base w-full"
                >
                  <option value="scans">Total Scans</option>
                  <option value="views">Video Views</option>
                  <option value="clicks">Link Clicks</option>
                  <option value="arStarts">AR Starts</option>
                  <option value="conversion">Conversion Rate</option>
                  <option value="lastActivity">Last Activity</option>
                  <option value="date">Creation Date</option>
                  <option value="name">Project Name</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              
              <button
                onClick={() => {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="flex items-center justify-center px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-neon-blue/30 hover:bg-slate-700/50 transition-all text-slate-300 hover:text-slate-100"
                title={sortOrder === 'desc' ? 'High to Low' : 'Low to High'}
              >
                {sortOrder === 'desc' ? (
                  <ArrowDown className="h-4 w-4" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="card">
        {error ? (
          <div className="flex items-center space-x-3 text-neon-red">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300">No projects found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => {
                const scans = project.analytics?.recentScans || project.analytics?.totalScans || 0
                const videoViews = project.analytics?.recentVideoViews || project.analytics?.videoViews || 0
                const linkClicks = project.analytics?.recentLinkClicks || project.analytics?.linkClicks || 0
                const arStarts = project.analytics?.recentArStarts || project.analytics?.arStarts || 0
                const conversionRate = parseFloat(project.analytics?.overallConversion || 0)
                
                return (
                  <div
                    key={`${project.userId}-${project.id}`}
                    className="p-4 sm:p-5 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-neon-blue/30 transition-all flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-100 truncate">{project.name}</h3>
                          {/* Status Badge */}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                            project.status === 'active' ? 'bg-green-900/30 text-neon-green' :
                            project.status === 'completed' ? 'bg-blue-900/30 text-neon-blue' :
                            'bg-slate-700/30 text-slate-400'
                          }`}>
                            {project.status || 'active'}
                          </span>
                          {/* Enabled Badge */}
                          {project.isEnabled === false && (
                            <XCircle className="h-4 w-4 text-neon-red flex-shrink-0" title="Disabled" />
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-400">
                          <User className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="truncate">{project.username}</span>
                        </div>
                      </div>
                      <div className="p-2 bg-neon-purple/20 rounded-lg flex-shrink-0">
                        <FolderKanban className="h-4 w-4 text-neon-purple" />
                      </div>
                    </div>

                    {/* Analytics Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Eye className="h-3 w-3 text-neon-blue" />
                          <span className="text-xs text-slate-400">Scans</span>
                        </div>
                        <p className="text-lg font-bold text-slate-100">{scans.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Video className="h-3 w-3 text-neon-green" />
                          <span className="text-xs text-slate-400">Views</span>
                        </div>
                        <p className="text-lg font-bold text-slate-100">{videoViews.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <MousePointer className="h-3 w-3 text-neon-purple" />
                          <span className="text-xs text-slate-400">Clicks</span>
                        </div>
                        <p className="text-lg font-bold text-slate-100">{linkClicks.toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-900/50 rounded p-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Zap className="h-3 w-3 text-neon-pink" />
                          <span className="text-xs text-slate-400">AR</span>
                        </div>
                        <p className="text-lg font-bold text-slate-100">{arStarts.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="space-y-2 mb-4 text-xs sm:text-sm">
                      {/* Conversion Rate */}
                      {conversionRate > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Conversion Rate</span>
                          <span className="font-semibold text-neon-green">{conversionRate.toFixed(1)}%</span>
                        </div>
                      )}
                      
                      {/* Top Country */}
                      {project.topCountry && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Top Country
                          </span>
                          <span className="text-slate-100 font-medium">{project.topCountry}</span>
                        </div>
                      )}
                      
                      {/* Device Breakdown */}
                      {project.deviceBreakdown?.total > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            {parseFloat(project.deviceBreakdown.mobile || 0) > parseFloat(project.deviceBreakdown.desktop || 0) ? (
                              <Smartphone className="h-3 w-3" />
                            ) : (
                              <Monitor className="h-3 w-3" />
                            )}
                            Devices
                          </span>
                          <span className="text-slate-100 font-medium">
                            {parseFloat(project.deviceBreakdown.mobile || 0).toFixed(0)}% Mobile
                          </span>
                        </div>
                      )}
                      
                      {/* Last Activity */}
                      {project.lastActivity && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Last Activity
                          </span>
                          <span className="text-slate-100 font-medium">
                            {new Date(project.lastActivity).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {/* File Status */}
                      <div className="flex items-center gap-3 pt-2 border-t border-slate-700/50">
                        <div className="flex items-center gap-1">
                          {project.hasDesign ? (
                            <CheckCircle className="h-3 w-3 text-neon-green" />
                          ) : (
                            <XCircle className="h-3 w-3 text-neon-red" />
                          )}
                          <span className="text-slate-400 text-xs">Design</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {project.hasVideo ? (
                            <CheckCircle className="h-3 w-3 text-neon-green" />
                          ) : (
                            <XCircle className="h-3 w-3 text-neon-red" />
                          )}
                          <span className="text-slate-400 text-xs">Video</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {project.hasMindTarget ? (
                            <CheckCircle className="h-3 w-3 text-neon-green" />
                          ) : (
                            <XCircle className="h-3 w-3 text-neon-red" />
                          )}
                          <span className="text-slate-400 text-xs">AR Target</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handleViewDetails(project)}
                      className="mt-auto w-full px-4 py-2 bg-gradient-to-r from-neon-blue to-neon-purple text-white rounded-lg font-medium text-sm hover:shadow-glow-blue transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View Details
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-6 pt-4 border-t border-slate-700/50">
                <p className="text-xs sm:text-sm text-slate-300 text-center sm:text-left">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} projects
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="p-2 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800/50"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <span className="text-xs sm:text-sm text-slate-300">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="p-2 text-slate-300 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-800/50"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedProject(null)
          }}
        />
      )}
    </div>
  )
}

export default ProjectsPage
