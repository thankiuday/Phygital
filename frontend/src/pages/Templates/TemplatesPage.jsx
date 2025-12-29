/**
 * Templates Page Component
 * Browse and apply themed templates to campaign landing pages
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Palette, Search, Filter, Sparkles } from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import TemplateCard from '../../components/Templates/TemplateCard'
import TemplatePreviewModal from '../../components/Templates/TemplatePreviewModal'
import CampaignSelectorModal from '../../components/Templates/CampaignSelectorModal'
import { getAllTemplates, getFestivalTemplates, getNonFestivalTemplates } from '../../config/templates'
import { templatesAPI } from '../../utils/api'
import toast from 'react-hot-toast'

const TemplatesPage = () => {
  const { user, loadUser } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all') // 'all', 'festival', 'non-festival'
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedTemplateConfig, setSelectedTemplateConfig] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [projects, setProjects] = useState([])
  const [applyingTemplate, setApplyingTemplate] = useState(false)

  useEffect(() => {
    // Load templates from config
    const allTemplates = getAllTemplates()
    setTemplates(allTemplates)
    setLoading(false)

    // Load user projects to show which templates are applied
    if (user?._id) {
      loadProjects()
    }
  }, [user?._id])

  const loadProjects = async () => {
    try {
      if (!user?._id) return
      
      // Fetch user projects from user object (projects are already loaded in auth context)
      if (user?.projects && Array.isArray(user.projects)) {
        setProjects(user.projects.filter(p => p.phygitalizedData || p.campaignType))
      }
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let filtered = templates

    // Filter by category
    if (categoryFilter === 'festival') {
      filtered = getFestivalTemplates()
    } else if (categoryFilter === 'non-festival') {
      filtered = getNonFestivalTemplates()
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [templates, categoryFilter, searchQuery])

  const handleTemplateClick = (template) => {
    setSelectedTemplate(template)
    setShowPreviewModal(true)
  }

  const handleApplyTemplate = (template, templateConfig) => {
    setSelectedTemplate(template)
    setSelectedTemplateConfig(templateConfig || {})
    setShowPreviewModal(false)
    setShowCampaignModal(true)
  }

  const handleCampaignSelect = async (projectIds) => {
    if (!selectedTemplate) return

    setApplyingTemplate(true)
    try {
      // Log what we're sending
      console.log('📤 Applying template with config:', {
        templateId: selectedTemplate.id,
        projectIds,
        templateConfig: selectedTemplateConfig,
        hasCustomBackgroundColor: !!selectedTemplateConfig?.customBackgroundColor,
        customBackgroundColor: selectedTemplateConfig?.customBackgroundColor
      })
      
      const response = await templatesAPI.applyTemplate({
        templateId: selectedTemplate.id,
        projectIds,
        templateConfig: selectedTemplateConfig || {}
      })

      if (response.data?.success) {
        toast.success(`Template applied to ${projectIds.length} campaign(s) successfully!`)
        setShowCampaignModal(false)
        setSelectedTemplate(null)
        // Reload user data to get updated projects
        await loadUser()
        await loadProjects()
      } else {
        throw new Error(response.data?.message || 'Failed to apply template')
      }
    } catch (error) {
      console.error('Failed to apply template:', error)
      toast.error(error.response?.data?.message || 'Failed to apply template')
    } finally {
      setApplyingTemplate(false)
    }
  }

  const getTemplateUsage = (templateId) => {
    return projects.filter(p => p.phygitalizedData?.templateId === templateId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-xl flex items-center justify-center">
              <Palette className="w-6 h-6 text-neon-purple" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-100">Templates</h1>
              <p className="text-slate-400 mt-1">Choose a theme for your campaign landing pages</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600/30 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple/50"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 bg-slate-800/50 border border-slate-600/30 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-purple/50 focus:border-neon-purple/50"
              >
                <option value="all">All Templates</option>
                <option value="festival">Festival</option>
                <option value="non-festival">Non-Festival</option>
              </select>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => {
              const appliedCampaigns = getTemplateUsage(template.id)
              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  appliedCampaigns={appliedCampaigns}
                  onClick={() => handleTemplateClick(template)}
                  onApply={() => handleApplyTemplate(template)}
                />
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No templates found matching your search</p>
          </div>
        )}

        {/* Preview Modal */}
        {showPreviewModal && selectedTemplate && (
          <TemplatePreviewModal
            template={selectedTemplate}
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false)
              setSelectedTemplate(null)
            }}
            onApply={(templateConfig) => handleApplyTemplate(selectedTemplate, templateConfig)}
          />
        )}

        {/* Campaign Selector Modal */}
        {showCampaignModal && selectedTemplate && (
          <CampaignSelectorModal
            template={selectedTemplate}
            projects={projects}
            isOpen={showCampaignModal}
            isApplying={applyingTemplate}
            onClose={() => {
              setShowCampaignModal(false)
              setSelectedTemplate(null)
              setSelectedTemplateConfig(null)
            }}
            onApply={(projectIds) => handleCampaignSelect(projectIds)}
          />
        )}
      </div>
    </div>
  )
}

export default TemplatesPage

