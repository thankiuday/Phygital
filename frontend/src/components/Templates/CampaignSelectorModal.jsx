/**
 * Campaign Selector Modal Component
 * Allows user to select which campaigns to apply template to
 */

import React, { useState, useMemo } from 'react'
import { X, Check, Search, Filter } from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'

const CampaignSelectorModal = ({ template, projects, isOpen, isApplying, onClose, onApply }) => {
  const [selectedProjects, setSelectedProjects] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [campaignTypeFilter, setCampaignTypeFilter] = useState('all')

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects.filter(p => p.phygitalizedData || p.campaignType)

    // Filter by campaign type
    if (campaignTypeFilter !== 'all') {
      filtered = filtered.filter(p => p.campaignType === campaignTypeFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.campaignType?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [projects, campaignTypeFilter, searchQuery])

  const toggleProject = (projectId) => {
    setSelectedProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  const handleApply = () => {
    if (selectedProjects.length === 0) {
      return
    }
    onApply(selectedProjects)
  }

  const getCurrentTemplate = (project) => {
    return project.phygitalizedData?.templateId || 'default'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-800 rounded-xl border border-slate-600/50 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Apply Template</h2>
            <p className="text-sm text-slate-400 mt-1">
              Select campaigns to apply "{template.name}" template
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={isApplying}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-700/50 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
            />
          </div>

          {/* Campaign Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={campaignTypeFilter}
              onChange={(e) => setCampaignTypeFilter(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/30 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
            >
              <option value="all">All Campaign Types</option>
              <option value="qr-link">QR-Link</option>
              <option value="qr-links">QR-Links</option>
              <option value="qr-links-video">QR-Links-Video</option>
              <option value="qr-links-pdf-video">QR-Links-PDF-Video</option>
              <option value="qr-links-ar-video">QR-Links-AR-Video</option>
            </select>
          </div>
        </div>

        {/* Campaign List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isApplying ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredProjects.length > 0 ? (
            <div className="space-y-2">
              {filteredProjects.map((project) => {
                const isSelected = selectedProjects.includes(project.id)
                const currentTemplate = getCurrentTemplate(project)
                const isCurrentTemplate = currentTemplate === template.id

                return (
                  <div
                    key={project.id}
                    onClick={() => toggleProject(project.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-neon-purple/20 border-neon-purple/50'
                        : 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-neon-purple border-neon-purple'
                          : 'border-slate-500'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-100 truncate">{project.name}</h3>
                          {isCurrentTemplate && (
                            <span className="px-2 py-0.5 bg-neon-green/20 text-neon-green text-xs rounded">
                              Current
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-slate-400 mb-2 line-clamp-1">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Type: {project.campaignType || 'N/A'}</span>
                          {currentTemplate !== 'default' && (
                            <span>Current: {currentTemplate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">No campaigns found matching your filters</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700/50">
          <div className="text-sm text-slate-400">
            {selectedProjects.length > 0 ? (
              <span>{selectedProjects.length} campaign(s) selected</span>
            ) : (
              <span>Select campaigns to apply template</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
              disabled={isApplying}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedProjects.length === 0 || isApplying}
              className="px-6 py-2 bg-gradient-to-r from-neon-purple to-neon-pink text-white rounded-lg font-medium hover:shadow-glow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApplying ? 'Applying...' : `Apply to ${selectedProjects.length} Campaign(s)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CampaignSelectorModal

