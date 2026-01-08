/**
 * Campaigns Page Component
 * Comprehensive campaign management interface
 * Combines campaign list, QR code generation, video updates, and deletion
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSearchParams, useLocation } from 'react-router-dom'
import { uploadAPI, generateQRCode, downloadFile, api, phygitalizedAPI } from '../../utils/api'
import { getCampaignTypeDisplayName } from '../../utils/campaignTypeNames'
import { countryCodes, validatePhoneNumber as validatePhone, parsePhoneNumber, filterPhoneInput as filterPhone, formatPhoneNumber } from '../../utils/countryCodes'
import SocialLinksInput from '../../components/Phygitalized/SocialLinksInput'
import { 
  Video, 
  Calendar,
  Edit3,
  X,
  Upload,
  FolderOpen,
  QrCode,
  Download,
  Share2,
  Copy,
  CheckCircle,
  ExternalLink,
  Eye,
  Grid,
  List,
  Image,
  Save,
  Phone,
  MessageCircle,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Globe,
  AlertCircle,
  Trash2,
  Search,
  Filter,
  TrendingUp,
  Sparkles,
  MoreVertical,
  Plus,
  FileText,
  Palette
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { getAllTemplates } from '../../config/templates'
import { templatesAPI } from '../../utils/api'
import TemplateCard from '../../components/Templates/TemplateCard'
import TemplatePreviewModal from '../../components/Templates/TemplatePreviewModal'
import CampaignUpgradeModal from '../../components/Projects/CampaignUpgradeModal'

const ProjectsPage = () => {
  const { user, loadUser, updateUser, refreshUserData } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  
  // Get edit parameter from URL
  const urlParams = new URLSearchParams(location.search)
  const editParam = urlParams.get('edit')

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState(() => {
    // On mobile, always use grid. On desktop, load from localStorage or default to 'grid'
    const isMobile = window.innerWidth < 640 // sm breakpoint
    if (isMobile) {
      return 'grid'
    }
    const saved = localStorage.getItem('campaignsViewMode')
    return saved === 'grid' || saved === 'list' ? saved : 'grid'
  })
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest', 'name', 'scans'
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'paused'
  const [campaignTypeFilter, setCampaignTypeFilter] = useState('all') // 'all', 'qr-link', 'qr-links-ar-video', etc.
  
  
  // QR Code state
  const [expandedProjectId, setExpandedProjectId] = useState(null)
  const [qrCodeUrls, setQrCodeUrls] = useState({}) // Map of projectId -> qrCodeUrl
  const [loadingQR, setLoadingQR] = useState({}) // Map of projectId -> boolean
  const [copiedUrl, setCopiedUrl] = useState(null)
  
  // Toggle status state
  const [togglingStatus, setTogglingStatus] = useState({}) // Map of projectId -> boolean
  const [togglingTargetImage, setTogglingTargetImage] = useState({}) // Map of projectId -> boolean
  
  // Template selection state
  const [selectedProjectForTemplate, setSelectedProjectForTemplate] = useState(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [applyingTemplate, setApplyingTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedTemplateConfig, setSelectedTemplateConfig] = useState(null)
  const [showTemplatePreviewModal, setShowTemplatePreviewModal] = useState(false)
  const [templates, setTemplates] = useState([])
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [editFormData, setEditFormData] = useState({
    // Single file fields (for backward compatibility with other campaign types)
    video: null,
    pdf: null,
    document: null,
    // Array fields for multiple file uploads (for qr-links-video and qr-links-pdf-video)
    videos: [],
    pdfFiles: [],
    documents: [],
    // File removal flags
    removeVideo: false,
    removePdf: false,
    removeDocument: false,
    // Files to remove (array indices)
    videosToRemove: [],
    documentsToRemove: [],
    socialLinks: {
      instagram: '',
      facebook: '',
      twitter: '',
      linkedin: '',
      website: '',
      contactNumber: '',
      whatsappNumber: ''
    }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [phoneErrors, setPhoneErrors] = useState({
    contactNumber: '',
    whatsappNumber: ''
  })
  const [countryCodes_state, setCountryCodesState] = useState({
    contactNumber: '+1',
    whatsappNumber: '+1'
  })

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [pendingUpgradeType, setPendingUpgradeType] = useState(null)
  const [upgradingCampaign, setUpgradingCampaign] = useState(null)
  const [isUpgrading, setIsUpgrading] = useState(false)

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false)
  const [selectedProjects, setSelectedProjects] = useState([])
  const [isBatchDeleting, setIsBatchDeleting] = useState(false)

  // Handle country code change
  const handleCountryCodeChange = (field, newCountryCode) => {
    setCountryCodesState(prev => ({ ...prev, [field]: newCountryCode }));
    
    // Revalidate the phone number with new country code
    if (editFormData.socialLinks[field]) {
      const validation = validatePhone(editFormData.socialLinks[field], newCountryCode);
      setPhoneErrors(prev => ({ ...prev, [field]: validation.error }));
    }
  };

  // Get available upgrades for a campaign type
  const getAvailableUpgrades = (currentType) => {
    const upgrades = []
    
    if (currentType === 'qr-link') {
      upgrades.push('qr-links', 'qr-links-video', 'qr-links-pdf-video', 'qr-links-ar-video')
    } else if (currentType === 'qr-links') {
      upgrades.push('qr-links-video', 'qr-links-pdf-video', 'qr-links-ar-video')
    } else if (currentType === 'qr-links-video') {
      upgrades.push('qr-links-pdf-video', 'qr-links-ar-video')
    } else if (currentType === 'qr-links-pdf-video') {
      upgrades.push('qr-links-ar-video')
    }
    
    return upgrades
  }

  // Detect if upgrade is needed based on action
  const detectUpgradeNeeded = (currentType, action) => {
    if (currentType === 'qr-link' && action === 'add-second-link') {
      return 'qr-links'
    }
    if (currentType === 'qr-link' && action === 'add-video') {
      return 'qr-links-video'
    }
    if (currentType === 'qr-links' && action === 'add-video') {
      return 'qr-links-video'
    }
    if (currentType === 'qr-links-video' && action === 'add-pdf') {
      return 'qr-links-pdf-video'
    }
    return null
  }

  // Check if campaign is incomplete (has draft data)
  const isCampaignIncomplete = (project) => {
    if (!project) return false
    
    // FIRST: Check if project is actually complete (has finalDesign)
    // This is the most reliable indicator that campaign is complete
    if (project.uploadedFiles?.finalDesign?.url) {
      // Campaign is complete - clear draft and return false
      const draftKey = `phygital_campaign_draft_${project.id || 'new'}`
      localStorage.removeItem(draftKey) // Clean up completed campaign drafts
      return false
    }
    
    // Check for draft in localStorage
    const draftKey = `phygital_campaign_draft_${project.id || 'new'}`
    const draftStr = localStorage.getItem(draftKey)
    if (!draftStr) return false
    
    try {
      const draft = JSON.parse(draftStr)
      
      // Check if draft has finalDesign - campaign is complete
      if (draft.levelData?.finalDesign) {
        // Campaign complete - clear draft
        localStorage.removeItem(draftKey)
        return false
      }
      
      // Check if draft is expired (30 days)
      const DRAFT_EXPIRY_DAYS = 30
      const expiryTime = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000
      if (Date.now() - draft.timestamp > expiryTime) {
        localStorage.removeItem(draftKey)
        return false
      }
      
      // Check if campaign is actually incomplete based on draft data
      // For AR video campaigns, all 6 levels must be complete
      if (project.campaignType === 'qr-links-ar-video') {
        const requiredLevels = 6
        const isComplete = draft.completedLevels?.length >= requiredLevels && 
                          draft.levelData?.finalDesign
        if (isComplete) {
          localStorage.removeItem(draftKey) // Clean up
          return false
        }
        return draft.completedLevels?.length < requiredLevels || draft.currentLevel < requiredLevels
      }
      
      // For other campaign types, check if they have required data
      // Basic check: if draft has data but campaign isn't fully set up
      const hasIncompleteData = (draft.levelData?.design && !project.uploadedFiles?.design) ||
                                (draft.levelData?.qrPosition && !project.qrPosition) ||
                                (draft.levelData?.video && !project.uploadedFiles?.video)
      
      // If finalDesign exists in draft or project, campaign is complete
      if (draft.levelData?.finalDesign || project.uploadedFiles?.finalDesign) {
        localStorage.removeItem(draftKey)
        return false
      }
      
      return hasIncompleteData || (draft.currentLevel < 6 && draft.completedLevels?.length < 6)
    } catch (error) {
      console.error('Error checking draft:', error)
      return false
    }
  }

  // Handle resume campaign
  const handleResumeCampaign = (project) => {
    if (!project) return
    
    // Navigate to upload page with project ID
    window.location.href = `/#/upload?projectId=${project.id}&resume=true`
  }

  // Handle upgrade request - shows upgrade modal
  const handleUpgradeRequest = (project, newCampaignType) => {
    setUpgradingCampaign(project)
    setPendingUpgradeType(newCampaignType)
    setShowUpgradeModal(true)
  }

  // Handle upgrade confirmation - executes the upgrade
  const handleUpgradeConfirm = async () => {
    if (!upgradingCampaign || !pendingUpgradeType) return

    try {
      setIsUpgrading(true)

      // Handle AR Video upgrade separately (redirect to LevelBasedUpload)
      if (pendingUpgradeType === 'qr-links-ar-video') {
        await handleARVideoUpgrade(upgradingCampaign)
        return
      }

      // Handle simple upgrades (in edit modal)
      await handleSimpleUpgrade(upgradingCampaign, pendingUpgradeType)
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error(error.response?.data?.message || 'Failed to upgrade campaign')
    } finally {
      setIsUpgrading(false)
      setShowUpgradeModal(false)
      setUpgradingCampaign(null)
      setPendingUpgradeType(null)
    }
  }

  // Handle simple upgrades (QR Link -> QR Links, QR Links -> QR Links Video, etc.)
  const handleSimpleUpgrade = async (project, newCampaignType) => {
    try {
      const projectId = project.id
      
      // Prepare upgrade data based on current campaign data
      const userProject = user?.projects?.find(p => p.id === projectId)
      const upgradeData = {
        currentType: project.campaignType,
        existingData: {
          links: userProject?.phygitalizedData?.links || [],
          socialLinks: userProject?.phygitalizedData?.socialLinks || userProject?.socialLinks || {},
          videos: userProject?.uploadedFiles?.videos || [],
          documents: userProject?.uploadedFiles?.documents || []
        }
      }

      // Call backend upgrade API
      const response = await phygitalizedAPI.upgradeCampaign(projectId, newCampaignType, upgradeData)
      
      if (response.data?.success) {
        toast.success(`Campaign upgraded from ${project.campaignType} to ${newCampaignType}!`)
        
        // Refresh user data and projects
        await refreshUserData()
        await loadUser()
        await loadProjects()
        
        // Generate QR code for all upgrades (any type other than qr-link)
        if (newCampaignType && newCampaignType !== 'qr-link') {
          try {
            // Get landing page URL for the new campaign type
            const landingPageUrl = getLandingPageUrlForType(newCampaignType, projectId)
            
            if (landingPageUrl) {
              // Generate QR code
              const qrCodeDataUrl = await generateQRCode(landingPageUrl, {
                size: 512,
                margin: 2
              })
              
              // Create a clean suffix for filename based on campaign type
              const typeSuffix = newCampaignType.replace('qr-links-', '').replace('-', '-') || 'upgraded'
              
              // Download QR code automatically
              const downloadSuccess = downloadQRCodeFile(qrCodeDataUrl, project.name, typeSuffix)
              
              if (downloadSuccess) {
                toast.success('New QR code downloaded!')
              } else {
                toast.error('Failed to download QR code')
              }
            }
          } catch (error) {
            // Don't block upgrade success - just show error toast
            toast.error('Upgrade successful, but QR code download failed. Please generate manually.')
          }
        }
        
        // Close edit modal if open
        if (showEditModal) {
          setShowEditModal(false)
          setEditingProject(null)
        }
      }
    } catch (error) {
      console.error('Simple upgrade error:', error)
      throw error
    }
  }

  // Handle AR Video upgrade - redirects to LevelBasedUpload
  const handleARVideoUpgrade = async (project) => {
    try {
      const projectId = project.id
      
      // Get upgrade data from backend
      const response = await uploadAPI.getUpgradeToArData(projectId)
      
      if (response.data?.success) {
        // Navigate to upload page with upgrade params
        const upgradeParams = new URLSearchParams({
          upgrade: 'true',
          projectId: projectId,
          fromType: project.campaignType
        })
        window.location.href = `/#/upload?${upgradeParams.toString()}`
      }
    } catch (error) {
      console.error('AR Video upgrade error:', error)
      throw error
    }
  }

  // Handle edit project - moved here to avoid hoisting issues
  const handleEditProject = useCallback((project) => {
    setEditingProject(project)

    // Initialize form data with current project data
    const userProject = user?.projects?.find(p => p.id === project.id)

    // ✅ Phygitalized campaigns: use phygitalizedData instead of legacy project.socialLinks/video
    if (userProject?.campaignType?.startsWith('qr-') || project?.campaignType?.startsWith('qr-')) {
      const campaignType = userProject?.campaignType || project?.campaignType
      
      // Initialize file arrays from existing project data
      let existingVideos = []
      let existingDocuments = []
      
      if (campaignType === 'qr-links-pdf-video') {
        // Load existing documents and videos arrays
        existingDocuments = userProject?.uploadedFiles?.documents || []
        existingVideos = userProject?.uploadedFiles?.videos || []
      } else if (campaignType === 'qr-links-video') {
        // Load existing videos array
        existingVideos = userProject?.uploadedFiles?.videos || []
        // Fallback to single video for backward compatibility
        if (existingVideos.length === 0 && userProject?.uploadedFiles?.video?.url) {
          existingVideos = [userProject.uploadedFiles.video]
        }
      }
      
      setEditFormData({
        // Single file fields (for backward compatibility)
        video: null,
        pdf: null,
        document: null,
        // Array fields for multiple file uploads
        videos: [],
        pdfFiles: [],
        documents: [],
        // Existing files (for display in modal)
        existingVideos: existingVideos,
        existingDocuments: existingDocuments,
        // File removal flags (for single file removal)
        removeVideo: false,
        removePdf: false,
        removeDocument: false,
        // Files to remove (array indices for multiple files)
        videosToRemove: [],
        documentsToRemove: [],
        // Editable data
        links: userProject?.phygitalizedData?.links || [],
        socialLinks: userProject?.phygitalizedData?.socialLinks || {}
      })
      setShowEditModal(true)
      return
    }

    // Parse phone numbers to extract country code and number
    const existingContact = userProject?.socialLinks?.contactNumber || '';
    const existingWhatsApp = userProject?.socialLinks?.whatsappNumber || '';
    
    const parsedContact = parsePhoneNumber(existingContact);
    const parsedWhatsApp = parsePhoneNumber(existingWhatsApp);

    const initialSocialLinks = {
      instagram: userProject?.socialLinks?.instagram || '',
      facebook: userProject?.socialLinks?.facebook || '',
      twitter: userProject?.socialLinks?.twitter || '',
      linkedin: userProject?.socialLinks?.linkedin || '',
      website: userProject?.socialLinks?.website || '',
      contactNumber: parsedContact.phoneNumber,
      whatsappNumber: parsedWhatsApp.phoneNumber
    }

    // Set country codes
    setCountryCodesState({
      contactNumber: parsedContact.countryCode,
      whatsappNumber: parsedWhatsApp.countryCode
    });

    setEditFormData({
      video: null, // Will be set when user selects a new video
      socialLinks: initialSocialLinks
    })

    setShowEditModal(true)
  }, [user])

  // Helper function to generate personalized URL using urlCode when available
  const getPersonalizedUrl = (project) => {
    const baseUrl = window.location.origin
    // Prefer urlCode if available, fallback to username
    const userIdentifier = user?.urlCode || user?.username
    // Prefer project urlCode if available, fallback to project id
    const projectIdentifier = project?.urlCode || project?.id
    return `${baseUrl}/user/${userIdentifier}?project=${projectIdentifier}`
  }

  // Helper function to generate landing page URL based on campaign type
  const getLandingPageUrlForType = (campaignType, projectId) => {
    const baseUrl = window.location.origin
    
    if (!projectId) return null

    switch (campaignType) {
      case 'qr-links':
        return `${baseUrl}/#/phygitalized/links/${projectId}`
      
      case 'qr-links-video':
        return `${baseUrl}/#/phygitalized/video/${projectId}`
      
      case 'qr-links-pdf-video':
        return `${baseUrl}/#/phygitalized/pdf-video/${projectId}`
      
      case 'qr-links-ar-video':
        // AR video uses different URL structure
        const userId = user?._id || user?.id
        if (!userId) {
          return null
        }
        return `${baseUrl}/#/ar/user/${userId}/project/${projectId}`
      
      default:
        return null
    }
  }

  // Helper function to generate landing page URL for phygitalized campaigns
  const getLandingPageUrl = (project) => {
    const baseUrl = window.location.origin
    const projectId = project?.id

    if (!projectId) return null

    // Check campaign type and generate appropriate landing page URL
    const campaignType = project?.campaignType


    switch (campaignType) {
      case 'qr-link':
        // For qr-link, return the redirect page URL (branded redirect page)
        // This allows users to test the "Powered by Phygital.zone" page before redirect
        return `${baseUrl}/#/phygitalized/redirect/${projectId}`
      
      case 'qr-links':
        return `${baseUrl}/#/phygitalized/links/${projectId}`
      
      case 'qr-links-video':
        return `${baseUrl}/#/phygitalized/video/${projectId}`
      
      case 'qr-links-pdf-video':
        return `${baseUrl}/#/phygitalized/pdf-video/${projectId}`
      
      case 'qr-links-ar-video':
        // QR Links AR Video Experience page - full-screen camera with content display
        // Format: /ar/user/:userId/project/:projectId (using generic AR experience route)
        const userId = user?._id || user?.id
        if (!userId) {
          return null
        }
        const arUrl = `${baseUrl}/#/ar/user/${userId}/project/${projectId}`
        return arUrl
      
      default:
        // Check if it's a QR Links AR Video campaign by checking phygitalizedData structure
        // This handles cases where campaignType might not be set correctly
        if (project?.phygitalizedData?.videoUrl && project?.phygitalizedData?.compositeDesignUrl) {
          // Likely a QR Links AR Video campaign - check if it has AR-specific data
          const userId = user?._id || user?.id
          if (userId) {
            const arUrl = `${baseUrl}/#/ar/user/${userId}/project/${projectId}`
            return arUrl
          }
        }
        // For legacy campaigns, use personalized URL
        return getPersonalizedUrl(project)
    }
  }

  // Save view mode preference and ensure mobile always uses grid
  useEffect(() => {
    const isMobile = window.innerWidth < 640 // sm breakpoint
    if (isMobile) {
      // Force grid view on mobile
      if (viewMode !== 'grid') {
        setViewMode('grid')
      }
    } else {
      // Save preference on desktop
      localStorage.setItem('campaignsViewMode', viewMode)
    }
  }, [viewMode])
  
  // Handle window resize to switch to grid on mobile
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640 // sm breakpoint
      if (isMobile && viewMode !== 'grid') {
        setViewMode('grid')
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [viewMode])

  // Filter and sort projects
  const getFilteredAndSortedProjects = () => {
    let filtered = [...projects]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(query) ||
        (project.description && project.description.toLowerCase().includes(query)) ||
        (project.campaignType && project.campaignType.toLowerCase().includes(query))
      )
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(project => project.isEnabled !== false)
    } else if (statusFilter === 'paused') {
      filtered = filtered.filter(project => project.isEnabled === false)
    }

    // Apply campaign type filter
    if (campaignTypeFilter !== 'all') {
      filtered = filtered.filter(project => project.campaignType === campaignTypeFilter)
    }

    // Sort projects
    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      case 'name':
        return filtered.sort((a, b) => a.name.localeCompare(b.name))
      case 'scans':
        return filtered.sort((a, b) => (b.analytics?.totalScans || 0) - (a.analytics?.totalScans || 0))
      default:
        return filtered
    }
  }

  // Legacy function for backward compatibility
  const getSortedProjects = () => getFilteredAndSortedProjects()

  // Calculate stats
  const stats = React.useMemo(() => {
    const totalCampaigns = projects.length
    const activeCampaigns = projects.filter(p => p.isEnabled !== false).length
    const totalScans = projects.reduce((sum, p) => sum + (p.analytics?.totalScans || 0), 0)
    const pausedCampaigns = totalCampaigns - activeCampaigns
    
    return {
      total: totalCampaigns,
      active: activeCampaigns,
      paused: pausedCampaigns,
      scans: totalScans
    }
  }, [projects])

  // Get unique campaign types for filter
  const campaignTypes = React.useMemo(() => {
    const types = new Set(projects.map(p => p.campaignType).filter(Boolean))
    return Array.from(types)
  }, [projects])

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCampaignTypeFilter('all')
  }

  const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || campaignTypeFilter !== 'all'

  // Test backend connectivity
  const testBackendConnection = async () => {
    try {
      const response = await api.get('/health');
      return true;
    } catch (error) {
      // Backend not available
      return false;
    }
  };

  // Load projects - memoized to prevent infinite loops
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)

      // Test backend connectivity first
      const isConnected = await testBackendConnection();
      if (!isConnected) {
        toast.error('Cannot connect to backend server. Please check if the backend is running.');
        return;
      }

      const response = await uploadAPI.getProjects()
      const projectsData = response.data.data?.projects || []

      // Enhance projects with user data
      const enhancedProjects = projectsData.map(project => {
        const userProject = user?.projects?.find(p => p.id === project.id)
        

        return {
          ...project,
          // Include all fields from userProject, especially campaignType and phygitalizedData
          campaignType: userProject?.campaignType || project?.campaignType,
          phygitalizedData: userProject?.phygitalizedData || project?.phygitalizedData,
          // Check for video in multiple locations (support different campaign types)
          hasVideo: !!(
            userProject?.uploadedFiles?.video?.url || 
            (userProject?.uploadedFiles?.videos && userProject.uploadedFiles.videos.length > 0) ||
            userProject?.phygitalizedData?.videoUrl ||
            (Array.isArray(userProject?.phygitalizedData?.videos) && userProject.phygitalizedData.videos.length > 0)
          ),
          videoUrl: userProject?.uploadedFiles?.video?.url || 
                   (userProject?.uploadedFiles?.videos?.[0]?.url || userProject?.uploadedFiles?.videos?.[0]) ||
                   userProject?.phygitalizedData?.videoUrl ||
                   (Array.isArray(userProject?.phygitalizedData?.videos) && userProject.phygitalizedData.videos.length > 0 
                     ? (userProject.phygitalizedData.videos[0]?.url || userProject.phygitalizedData.videos[0]) 
                     : null),
          hasDesign: !!(userProject?.uploadedFiles?.design?.url),
          designUrl: userProject?.uploadedFiles?.design?.url,
          hasCompositeDesign: !!(userProject?.uploadedFiles?.compositeDesign?.url),
          compositeDesignUrl: userProject?.uploadedFiles?.compositeDesign?.url,
          hasMindTarget: !!(userProject?.uploadedFiles?.mindTarget?.url),
          isEnabled: userProject?.isEnabled !== false, // Default to true if not set
          analytics: userProject?.analytics || {
            totalScans: 0,
            videoViews: 0,
            linkClicks: 0,
            arExperienceStarts: 0
          },
          // Include social links from user project data
          socialLinks: userProject?.socialLinks || {}
        };
      })

      setProjects(enhancedProjects)
    } catch (error) {
      console.error('Failed to load projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Refresh projects when page gains focus (e.g., after redirect from upgrade)
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to ensure any pending updates are processed
      setTimeout(() => {
        loadProjects();
      }, 100);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadProjects]);

  // Handle auto-edit from URL parameter - use ref to prevent unnecessary re-runs
  const editProcessedRef = useRef(false);
  
  useEffect(() => {
    const editProjectId = searchParams.get('edit') || editParam;
    
    // Only process if we have an edit ID, projects are loaded, and we haven't processed this edit yet
    if (editProjectId && projects.length > 0 && !editProcessedRef.current) {
      const projectToEdit = projects.find(p => 
        p.id === editProjectId || 
        p.id === parseInt(editProjectId) || 
        p.id === editProjectId.toString()
      );
      
      if (projectToEdit) {
        editProcessedRef.current = true; // Mark as processed
        
        // Add a small delay to ensure everything is ready
        setTimeout(() => {
          handleEditProject(projectToEdit);
          setSearchParams({}); // Clear the URL parameter
        }, 100);
      }
    }
  }, [projects.length, searchParams, setSearchParams, handleEditProject, editParam]);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Toggle project QR code section
  const toggleProjectExpansion = async (project) => {
    const projectId = project.id
    
    if (expandedProjectId === projectId) {
      setExpandedProjectId(null)
    } else {
      setExpandedProjectId(projectId)
      
      // Generate QR code if not already generated
      if (!qrCodeUrls[projectId]) {
        await generateQRCodeForProject(project)
      }
    }
  }

  // Generate QR code for a project
  const generateQRCodeForProject = async (project) => {
    const projectId = project.id
    
    try {
      setLoadingQR(prev => ({ ...prev, [projectId]: true }))
      
      // For QR-Link campaigns, use the saved QR code URL if available
      if (project.campaignType === 'qr-link' && project.phygitalizedData?.qrCodeUrl) {
        setQrCodeUrls(prev => ({
          ...prev,
          [projectId]: project.phygitalizedData.qrCodeUrl
        }))
        return
      }
      
      const personalizedUrl = getPersonalizedUrl(project)
      
      // Generate QR code using the standalone function
      const qrCodeDataUrl = await generateQRCode(personalizedUrl, {
        size: 512,
        margin: 2
      })
      
      setQrCodeUrls(prev => ({
        ...prev,
        [projectId]: qrCodeDataUrl
      }))
      
    } catch (error) {
      console.error('Failed to generate QR code:', error)
      toast.error('Failed to generate QR code')
    } finally {
      setLoadingQR(prev => ({ ...prev, [projectId]: false }))
    }
  }

  // Helper function to download QR code file
  const downloadQRCodeFile = (qrCodeDataUrl, projectName, suffix = '') => {
    try {
      const link = document.createElement('a')
      link.href = qrCodeDataUrl
      const filename = suffix 
        ? `qr-code-${projectName.replace(/\s+/g, '-').toLowerCase()}-${suffix}.png`
        : `${projectName.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return true
    } catch (error) {
      console.error('Download error:', error)
      return false
    }
  }

  // Download QR code
  const handleDownloadQR = async (project) => {
    const projectId = project.id
    const qrUrl = qrCodeUrls[projectId]
    
    if (!qrUrl) {
      toast.error('QR code not available')
      return
    }

    try {
      const success = downloadQRCodeFile(qrUrl, project.name)
      if (success) {
      toast.success('QR code downloaded!')
      } else {
        toast.error('Failed to download QR code')
      }
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download QR code')
    }
  }

  // Download composite design (design with QR code overlay)
  const handleDownloadComposite = async (project) => {
    if (!project.hasCompositeDesign) {
      toast.error('Composite design not available for this project')
      return
    }

    try {
      // Download from Cloudinary URL
      const response = await fetch(project.compositeDesignUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Detect file extension from URL or blob type
      let extension = 'jpg' // Default to jpg
      if (project.compositeDesignUrl) {
        const urlExtension = project.compositeDesignUrl.split('.').pop().split('?')[0].toLowerCase()
        if (['jpg', 'jpeg', 'png'].includes(urlExtension)) {
          extension = urlExtension === 'jpeg' ? 'jpg' : urlExtension
        }
      } else if (blob.type) {
        // Fallback to blob MIME type
        extension = blob.type.includes('png') ? 'png' : 'jpg'
      }
      
      // Format filename as: Phygital_username_projecttitle.jpg/jpeg
      const sanitizedProjectName = project.name.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `Phygital_${user?.username || 'user'}_${sanitizedProjectName}.${extension}`
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url)
      
      toast.success('Composite design downloaded!')
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Failed to download composite design')
    }
  }

  // Copy URL to clipboard
  const copyUrlToClipboard = async (project) => {
    const personalizedUrl = getPersonalizedUrl(project)
    
    try {
      await navigator.clipboard.writeText(personalizedUrl)
      setCopiedUrl(project.id)
      toast.success('URL copied to clipboard!')
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      toast.error('Failed to copy URL')
    }
  }

  // Share URL
  const handleShareUrl = async (project) => {
    const personalizedUrl = getPersonalizedUrl(project)
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${project.name} - Phygital Experience`,
          text: `Check out my interactive ${project.name} project!`,
          url: personalizedUrl
        })
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyUrlToClipboard(project)
        }
      }
    } else {
      copyUrlToClipboard(project)
    }
  }



  // Handle video drop for edit modal
  const onVideoDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    // Validate file type - only MP4 allowed
    if (file.type !== 'video/mp4') {
      toast.error('Only MP4 video files are supported. Please convert your video to MP4 format.')
      return
    }
    
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
      toast.error(`Video file size must be less than 50MB. Your file is ${fileSizeMB}MB. Please compress your video.`)
      return
    }

    setEditFormData(prev => ({ ...prev, video: file }))
    toast.success('Video file selected successfully!')
  }, [])

  // Handle social links input change
  const handleSocialLinkChange = (field, value) => {
    // Filter phone inputs to only allow digits
    if (field === 'contactNumber' || field === 'whatsappNumber') {
      value = filterPhone(value);
      
      // Validate with country code
      const countryCode = countryCodes_state[field];
      const validation = validatePhone(value, countryCode);
      setPhoneErrors(prev => ({ ...prev, [field]: validation.error }));
    }
    
    setEditFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [field]: value
      }
    }))
  }

  // Save project changes
  const handleSaveProject = async () => {
    if (!editingProject) return
    
    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.warn('Save operation already in progress')
      return
    }

    // ✅ Phygitalized save flow (skip legacy phone validation + upload routes)
    if (editingProject?.campaignType?.startsWith('qr-')) {
      try {
        // Disable button immediately
        setIsSaving(true)
        setUploadProgress(0)

        const projectId = editingProject.id
        const campaignType = editingProject.campaignType
        const variation = campaignType

        // Delete removed files first (Cloudinary + DB cleanup)
        setUploadProgress(5)
        if (editFormData.removeVideo) {
          await phygitalizedAPI.deleteCampaignFile(projectId, 'video')
          setUploadProgress(8)
        }
        if (editFormData.removePdf) {
          await phygitalizedAPI.deleteCampaignFile(projectId, 'pdf')
          setUploadProgress(10)
        }
        if (editFormData.removeDocument) {
          await phygitalizedAPI.deleteCampaignFile(projectId, 'document')
          setUploadProgress(12)
        }

        const fileUrlsPayload = {}
        
        // Get current project data to preserve existing links
        // Note: user object should already be fresh, but we use it as-is
        const userProject = user?.projects?.find(p => p.id === projectId)
        let existingLinks = userProject?.phygitalizedData?.links || []
        
        // Fallback: Check for original link URL if links array is empty or for qr-links campaigns
        // This handles cases where the upgrade didn't properly add the original link
        if (existingLinks.length === 0 || campaignType === 'qr-links') {
          const originalLinkUrl = userProject?.phygitalizedData?.linkUrl || 
                                  userProject?.targetUrl ||
                                  userProject?.phygitalizedData?.redirectUrl
          
          if (originalLinkUrl) {
            // Normalize URL for comparison (same logic as below)
            const normalizeUrl = (url) => {
              try {
                const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
                return urlObj.hostname + urlObj.pathname.replace(/\/$/, '')
              } catch {
                return url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
              }
            }
            
            const normalizedOriginal = normalizeUrl(originalLinkUrl)
            
            // Check if original link exists in array
            const originalExists = existingLinks.some(link => {
              if (!link || !link.url) return false
              return normalizeUrl(link.url) === normalizedOriginal
            })
            
            // Add original link if it doesn't exist
            if (!originalExists) {
              const originalLink = {
                label: 'Link 1',
                url: originalLinkUrl.startsWith('http://') || originalLinkUrl.startsWith('https://') 
                  ? originalLinkUrl 
                  : `https://${originalLinkUrl}`
              }
              
              // Put original link first
              existingLinks = [originalLink, ...existingLinks]
            }
          }
        }
        
        // For QR Links campaigns, combine social links with custom links (same as QRLinksPage)
        let finalLinks = []
        if (campaignType === 'qr-links' || campaignType === 'qr-links-video' || campaignType === 'qr-links-pdf-video') {
          // Convert social links to links array format (exclude contactNumber and whatsappNumber)
          const contactInfoKeys = new Set(['contactNumber', 'whatsappNumber'])
          const socialLinksArray = Object.entries(editFormData.socialLinks || {})
            .filter(([key, value]) => {
              // Exclude contact info keys and empty values
              if (contactInfoKeys.has(key)) return false
              return value && typeof value === 'string' && value.trim() !== ''
            })
            .map(([key, value]) => ({
              label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
              url: value.startsWith('http://') || value.startsWith('https://')
                ? value
                : `https://${value}`
            }))
          
          // Get custom links from form data (should include existing links that were initialized)
          const customLinksFromForm = (editFormData.links || []).map(l => ({
            label: l.label || 'Link',
            url: (l.url || '').startsWith('http://') || (l.url || '').startsWith('https://')
              ? l.url
              : `https://${l.url}`
          }))
          
          // Normalize URLs for comparison (remove trailing slashes, convert to lowercase)
          const normalizeUrl = (url) => {
            try {
              const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
              return urlObj.hostname + urlObj.pathname.replace(/\/$/, '')
            } catch {
              return url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
            }
          }
          
          // Use a Map to deduplicate by URL
          const linksMap = new Map()
          
          // IMPORTANT: Add existing links FIRST to preserve them (these come from the upgrade)
          existingLinks.forEach(link => {
            const normalized = normalizeUrl(link.url || '')
            if (normalized && !linksMap.has(normalized)) {
              linksMap.set(normalized, {
                label: link.label || 'Link',
                url: (link.url || '').startsWith('http://') || (link.url || '').startsWith('https://')
                  ? link.url
                  : `https://${link.url}`
              })
            }
          })
          
          // Then add custom links from form (these can add new links or update existing ones)
          customLinksFromForm.forEach(link => {
            const normalized = normalizeUrl(link.url)
            if (normalized) {
              linksMap.set(normalized, link) // Overwrite if duplicate (form data takes precedence)
            }
          })
          
          // Finally, add social links (these take precedence if duplicate - user's active choice)
          socialLinksArray.forEach(link => {
            const normalized = normalizeUrl(link.url)
            if (normalized) {
              linksMap.set(normalized, link) // Overwrite if duplicate
            }
          })
          
          // Convert back to array - preserve order: existing links first, then custom, then social
          finalLinks = Array.from(linksMap.values())
        } else {
          // For other campaign types, just use custom links
          finalLinks = (editFormData.links || []).map(l => ({
            label: l.label || 'Link',
            url: (l.url || '').startsWith('http://') || (l.url || '').startsWith('https://')
              ? l.url
              : `https://${l.url}`
          }))
        }
        
        const phygitalizedDataPayload = {
          links: finalLinks,
          socialLinks: editFormData.socialLinks || {}
        }

        // Helper function to delete files from Cloudinary
        const deleteFileFromCloudinary = async (file) => {
          if (!file || !file.filename) return
          try {
            // Determine resource type based on file type/format/URL
            let resourceType = 'auto'
            
            // Check format field first
            if (file.format) {
              const format = file.format.toLowerCase()
              if (format === 'pdf' || format === 'doc' || format === 'docx' || format === 'txt') {
                resourceType = 'raw'
              } else if (['mp4', 'mov', 'avi', 'webm', 'mkv', 'flv', 'wmv'].includes(format)) {
                resourceType = 'video'
              } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(format)) {
                resourceType = 'image'
              }
            }
            
            // Fallback: check URL or filename extension
            if (resourceType === 'auto') {
              const urlOrFilename = file.url || file.filename || ''
              if (urlOrFilename.match(/\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i)) {
                resourceType = 'video'
              } else if (urlOrFilename.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i)) {
                resourceType = 'image'
              } else {
                resourceType = 'raw' // Default for PDFs and other documents
              }
            }
            
            await uploadAPI.deleteFile(file.filename, resourceType)
          } catch (error) {
            // Continue even if deletion fails - file will be removed from DB
          }
        }

        // Handle multiple file uploads for qr-links-video and qr-links-pdf-video
        if (campaignType === 'qr-links-video') {
          // Delete removed videos from Cloudinary
          if (editFormData.videosToRemove?.length > 0 && editFormData.existingVideos) {
            for (const index of editFormData.videosToRemove) {
              const fileToDelete = editFormData.existingVideos[index]
              if (fileToDelete) {
                await deleteFileFromCloudinary(fileToDelete)
              }
            }
          }

          // Filter out removed videos from existing array
          const remainingVideos = (editFormData.existingVideos || []).filter((_, index) => 
            !(editFormData.videosToRemove || []).includes(index)
          )

          // Upload new videos if any
          let newlyUploadedVideos = []
          if (editFormData.videos?.length > 0) {
            setUploadProgress(10) // Show progress when starting video upload
            const formData = new FormData()
            editFormData.videos.forEach(file => {
              formData.append('videos', file)
            })
            setUploadProgress(30) // Progress update before upload
            try {
              const uploadResponse = await uploadAPI.uploadVideos(formData, projectId, 'qr-links-video')
              if (uploadResponse.data?.status === 'success' && uploadResponse.data?.data?.videos) {
                newlyUploadedVideos = uploadResponse.data.data.videos
                setUploadProgress(60) // Progress after upload
              } else {
                throw new Error('Failed to upload videos: Invalid response')
              }
            } catch (uploadError) {
              console.error('Video upload error:', uploadError)
              throw new Error(`Failed to upload videos: ${uploadError.response?.data?.message || uploadError.message}`)
            }
          }

          // Combine remaining existing videos with newly uploaded ones
          const finalVideos = [...remainingVideos, ...newlyUploadedVideos]
          if (finalVideos.length > 0) {
            fileUrlsPayload.videos = finalVideos
            
            // Set phygitalizedDataPayload.videoUrl to the first video URL for landing page display
            // Handle both object format (with .url property) and string format
            const firstVideo = finalVideos[0]
            const firstVideoUrl = typeof firstVideo === 'string' ? firstVideo : firstVideo?.url
            if (firstVideoUrl) {
              phygitalizedDataPayload.videoUrl = firstVideoUrl
              // Also set fileUrl for backward compatibility
              phygitalizedDataPayload.fileUrl = firstVideoUrl
              phygitalizedDataPayload.fileType = 'video'
            }
          } else if (remainingVideos.length === 0 && newlyUploadedVideos.length === 0) {
            // If all videos were removed, set empty array
            fileUrlsPayload.videos = []
          }
          
          // Handle single video replacement for backward compatibility
          const file = editFormData.video || editFormData.document || editFormData.pdf
          if (file) {
            setUploadProgress(65)
            const mime = file.type || ''
            const fileTypeForUpload = mime.startsWith('video/') ? 'video' : (mime === 'application/pdf' ? 'pdf' : 'document')
            const up = await phygitalizedAPI.uploadFile(variation, projectId, file, fileTypeForUpload)
            const url = up.data?.data?.file?.url
            if (url) {
              phygitalizedDataPayload.fileUrl = url
              phygitalizedDataPayload.fileType = fileTypeForUpload === 'video' ? 'video' : 'document'
              const key = fileTypeForUpload === 'video' ? 'video' : (fileTypeForUpload === 'pdf' ? 'pdf' : 'document')
              fileUrlsPayload[key] = {
                url,
                filename: file.name,
                originalName: file.name,
                size: file.size,
                format: file.type,
                uploadedAt: new Date()
              }
              setUploadProgress(70)
            }
          }
        }

        if (campaignType === 'qr-links-pdf-video') {
          // Delete removed documents from Cloudinary
          if (editFormData.documentsToRemove?.length > 0 && editFormData.existingDocuments) {
            setUploadProgress(15)
            for (const index of editFormData.documentsToRemove) {
              const fileToDelete = editFormData.existingDocuments[index]
              if (fileToDelete) {
                await deleteFileFromCloudinary(fileToDelete)
              }
            }
            setUploadProgress(18)
          }

          // Delete removed videos from Cloudinary
          if (editFormData.videosToRemove?.length > 0 && editFormData.existingVideos) {
            setUploadProgress(20)
            for (const index of editFormData.videosToRemove) {
              const fileToDelete = editFormData.existingVideos[index]
              if (fileToDelete) {
                await deleteFileFromCloudinary(fileToDelete)
              }
            }
            setUploadProgress(22)
          }

          // Filter out removed documents from existing array
          const remainingDocuments = (editFormData.existingDocuments || []).filter((_, index) => 
            !(editFormData.documentsToRemove || []).includes(index)
          )

          // Filter out removed videos from existing array
          const remainingVideos = (editFormData.existingVideos || []).filter((_, index) => 
            !(editFormData.videosToRemove || []).includes(index)
          )

          // Upload new documents if any
          let newlyUploadedDocuments = []
          if (editFormData.pdfFiles?.length > 0) {
            setUploadProgress(40)
            const formData = new FormData()
            editFormData.pdfFiles.forEach(file => {
              formData.append('documents', file)
            })
            try {
              const uploadResponse = await uploadAPI.uploadDocuments(formData, projectId)
              if (uploadResponse.data?.status === 'success' && uploadResponse.data?.data?.documents) {
                newlyUploadedDocuments = uploadResponse.data.data.documents
                setUploadProgress(50)
              } else {
                throw new Error('Failed to upload documents: Invalid response')
              }
            } catch (uploadError) {
              console.error('Document upload error:', uploadError)
              throw new Error(`Failed to upload documents: ${uploadError.response?.data?.message || uploadError.message}`)
            }
          }

          // Upload new videos if any
          let newlyUploadedVideos = []
          if (editFormData.videos?.length > 0) {
            setUploadProgress(55)
            const formData = new FormData()
            editFormData.videos.forEach(file => {
              formData.append('videos', file)
            })
            try {
              const uploadResponse = await uploadAPI.uploadVideos(formData, projectId, 'qr-links-pdf-video')
              if (uploadResponse.data?.status === 'success' && uploadResponse.data?.data?.videos) {
                newlyUploadedVideos = uploadResponse.data.data.videos
                setUploadProgress(65)
              } else {
                throw new Error('Failed to upload videos: Invalid response')
              }
            } catch (uploadError) {
              console.error('Video upload error:', uploadError)
              throw new Error(`Failed to upload videos: ${uploadError.response?.data?.message || uploadError.message}`)
            }
          }

          // Combine remaining existing files with newly uploaded ones
          const finalDocuments = [...remainingDocuments, ...newlyUploadedDocuments]
          const finalVideos = [...remainingVideos, ...newlyUploadedVideos]

          if (finalDocuments.length > 0) {
            fileUrlsPayload.documents = finalDocuments
          } else if (remainingDocuments.length === 0 && newlyUploadedDocuments.length === 0) {
            // If all documents were removed, set empty array
            fileUrlsPayload.documents = []
          }

          if (finalVideos.length > 0) {
            fileUrlsPayload.videos = finalVideos
          } else if (remainingVideos.length === 0 && newlyUploadedVideos.length === 0) {
            // If all videos were removed, set empty array
            fileUrlsPayload.videos = []
          }
          
          // Handle single file replacements for backward compatibility
          if (editFormData.pdf) {
            setUploadProgress(70)
            const upPdf = await phygitalizedAPI.uploadFile(variation, projectId, editFormData.pdf, 'pdf')
            const pdfUrl = upPdf.data?.data?.file?.url
            if (pdfUrl) {
              phygitalizedDataPayload.pdfUrl = pdfUrl
              fileUrlsPayload.pdf = {
                url: pdfUrl,
                filename: editFormData.pdf.name,
                originalName: editFormData.pdf.name,
                size: editFormData.pdf.size,
                format: editFormData.pdf.type,
                uploadedAt: new Date()
              }
              setUploadProgress(75)
            }
          }
          if (editFormData.video) {
            setUploadProgress(editFormData.pdf ? 76 : 70)
            const upVideo = await phygitalizedAPI.uploadFile(variation, projectId, editFormData.video, 'video')
            const videoUrl = upVideo.data?.data?.file?.url
            if (videoUrl) {
              phygitalizedDataPayload.videoUrl = videoUrl
              fileUrlsPayload.video = {
                url: videoUrl,
                filename: editFormData.video.name,
                originalName: editFormData.video.name,
                size: editFormData.video.size,
                format: editFormData.video.type,
                uploadedAt: new Date()
              }
              setUploadProgress(80)
            }
          }
        }

        if (campaignType === 'qr-links-ar-video') {
          if (editFormData.video) {
            setUploadProgress(70)
            const upVideo = await phygitalizedAPI.uploadFile(variation, projectId, editFormData.video, 'video')
            const videoUrl = upVideo.data?.data?.file?.url
            if (videoUrl) {
              phygitalizedDataPayload.videoUrl = videoUrl
              fileUrlsPayload.video = {
                url: videoUrl,
                filename: editFormData.video.name,
                originalName: editFormData.video.name,
                size: editFormData.video.size,
                format: editFormData.video.type,
                uploadedAt: new Date()
              }
              setUploadProgress(80)
            }
          }
        }

        // Update campaign data (final step)
        setUploadProgress(85)
        await phygitalizedAPI.updateCampaign(projectId, {
          campaignType,
          phygitalizedData: phygitalizedDataPayload,
          fileUrls: fileUrlsPayload
        })
        setUploadProgress(90)

        setUploadProgress(95)
        toast.success('Campaign updated successfully!')
        setShowEditModal(false)
        setEditingProject(null)
        setEditFormData({
          video: null,
          pdf: null,
          document: null,
          videos: [],
          pdfFiles: [],
          documents: [],
          existingVideos: [],
          existingDocuments: [],
          removeVideo: false,
          removePdf: false,
          removeDocument: false,
          videosToRemove: [],
          documentsToRemove: [],
          socialLinks: {
            instagram: '',
            facebook: '',
            twitter: '',
            linkedin: '',
            website: '',
            contactNumber: '',
            whatsappNumber: ''
          }
        })
        await loadUser()
        await loadProjects()
        setUploadProgress(100)
      } catch (err) {
        console.error('❌ Phygitalized update failed:', err)
        toast.error('Failed to update campaign')
      } finally {
        setIsSaving(false)
        setUploadProgress(0)
      }
      return
    }

    // Validate phone numbers with country codes before saving
    const contactValidation = validatePhone(editFormData.socialLinks.contactNumber, countryCodes_state.contactNumber);
    const whatsappValidation = validatePhone(editFormData.socialLinks.whatsappNumber, countryCodes_state.whatsappNumber);
    
    if (contactValidation.error || whatsappValidation.error) {
      setPhoneErrors({
        contactNumber: contactValidation.error,
        whatsappNumber: whatsappValidation.error
      });
      toast.error('Please fix the phone number errors before saving');
      return;
    }

    try {
      setIsSaving(true)
      setUploadProgress(0)

      // Format phone numbers with country codes
      const formattedSocialLinks = {
        ...editFormData.socialLinks,
        contactNumber: editFormData.socialLinks.contactNumber 
          ? formatPhoneNumber(editFormData.socialLinks.contactNumber, countryCodes_state.contactNumber)
          : '',
        whatsappNumber: editFormData.socialLinks.whatsappNumber 
          ? formatPhoneNumber(editFormData.socialLinks.whatsappNumber, countryCodes_state.whatsappNumber)
          : ''
      };

      // Update social links first (always update to allow clearing fields)
      let socialLinksUpdated = false

      try {

        const response = await uploadAPI.updateProjectSocialLinks(editingProject.id, formattedSocialLinks);

        setUploadProgress(50)
        socialLinksUpdated = true
      } catch (error) {
        console.error('Failed to update social links:', error)
        // Don't throw error here, continue with other updates
      }

      // Update video if a new one was selected
      let videoUpdated = false
      if (editFormData.video) {
        const formData = new FormData()
        formData.append('video', editFormData.video)

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 5
          })
        }, 300)

        try {

          await uploadAPI.updateProjectVideo(editingProject.id, formData)
          clearInterval(progressInterval)
          setUploadProgress(100)
          videoUpdated = true
        } catch (error) {
          clearInterval(progressInterval)
          console.error('❌ Failed to update video:', error)
          console.error('❌ Video update error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          })
          // Don't throw error here, continue with refresh
        }

        // Update progress based on what was successful
        if (socialLinksUpdated && videoUpdated) {
          setUploadProgress(100)
        } else if (socialLinksUpdated || videoUpdated) {
          setUploadProgress(75)
        }
      }

      // Close modal and prepare for refresh
      setShowEditModal(false)
      setEditingProject(null)
      setEditFormData({
        video: null,
        pdf: null,
        document: null,
        videos: [],
        pdfFiles: [],
        documents: [],
        existingVideos: [],
        existingDocuments: [],
        removeVideo: false,
        removePdf: false,
        removeDocument: false,
        videosToRemove: [],
        documentsToRemove: [],
        socialLinks: {
          instagram: '',
          facebook: '',
          twitter: '',
          linkedin: '',
          website: '',
          contactNumber: '',
          whatsappNumber: ''
        }
      })

      // Show success message and refresh
      if (socialLinksUpdated || videoUpdated) {
        toast.success('Project updated successfully!')
      } else {
        toast.success('Project updated! Please refresh page to see changes.')
      }

      // Update projects state immediately with the new data
      setProjects(prevProjects =>
        prevProjects.map(project =>
          project.id === editingProject.id
            ? { ...project, socialLinks: editFormData.socialLinks }
            : project
        )
      );

      // Also update the user context
      if (user && user.projects && updateUser) {
        const updatedUser = {
          ...user,
          projects: user.projects.map(p =>
            p.id === editingProject.id
              ? { ...p, socialLinks: editFormData.socialLinks }
              : p
          )
        };
        updateUser(updatedUser);
      }

      // Refresh user data from backend to ensure consistency
      try {
        await refreshUserData();
      } catch (error) {
        console.error('⚠️ Failed to refresh user data from backend:', error);
      }

      // Then refresh from backend
      setTimeout(async () => {
        await loadUser();
        await loadProjects();
      }, 1000);

      // Close modal
      setShowEditModal(false);
      setEditingProject(null);
      setEditFormData({
        video: null,
        socialLinks: {
          instagram: '',
          facebook: '',
          twitter: '',
          linkedin: '',
          website: '',
          contactNumber: '',
          whatsappNumber: ''
        }
      });

    } catch (error) {
      console.error('Failed to update project:', error)
      toast.error('Failed to update project')
    } finally {
      setIsSaving(false)
      setUploadProgress(0)
    }
  }

  // Close edit modal
  const closeEditModal = () => {
    setShowEditModal(false)
    setEditingProject(null)
    setEditFormData({
      video: null,
      pdf: null,
      document: null,
      videos: [],
      pdfFiles: [],
      documents: [],
      existingVideos: [],
      existingDocuments: [],
      removeVideo: false,
      removePdf: false,
      removeDocument: false,
      videosToRemove: [],
      documentsToRemove: [],
      socialLinks: {
        instagram: '',
        facebook: '',
        twitter: '',
        linkedin: '',
        website: '',
        contactNumber: '',
        whatsappNumber: ''
      }
    })
    setUploadProgress(0)
  }




  // Handle delete project
  const handleDeleteProject = (project) => {
    setProjectToDelete(project)
    setShowDeleteModal(true)
  }

  // Confirm project deletion
  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      setIsDeleting(true)
      
      const response = await uploadAPI.deleteProject(projectToDelete.id)
      
      if (response.data.success) {
        toast.success('Campaign deleted successfully! All content has been removed.')
        
        setShowDeleteModal(false)
        setProjectToDelete(null)
        await loadProjects() // Refresh the list
        await loadUser() // Refresh user data
      } else {
        toast.error('Failed to delete campaign')
      }
    } catch (error) {
      console.error('Delete project error:', error)
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        toast.error('Campaign not found or already deleted')
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to delete this campaign')
      } else if (error.response?.status >= 500) {
        toast.error('Server error occurred. Some content may not have been deleted.')
      } else {
        toast.error('Failed to delete campaign. Please try again.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  // Close delete modal
  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setProjectToDelete(null)
  }

  // Toggle select mode
  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    setSelectedProjects([])
  }

  // Toggle project selection
  const toggleProjectSelection = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
  }

  // Select all projects
  const selectAllProjects = () => {
    setSelectedProjects(filteredProjects.map(p => p.id))
  }

  // Deselect all projects
  const deselectAllProjects = () => {
    setSelectedProjects([])
  }

  // Batch delete confirmation state
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false)

  // Handle batch delete confirmation
  const handleBatchDeleteClick = () => {
    if (selectedProjects.length === 0) return
    setShowBatchDeleteModal(true)
  }

  // Confirm batch delete
  const confirmBatchDelete = async () => {
    if (selectedProjects.length === 0) return

    try {
      setIsBatchDeleting(true)
      setShowBatchDeleteModal(false)
      
      // Call batch delete API
      const response = await uploadAPI.deleteProjectsBatch(selectedProjects)
      
      if (response.data.success) {
        const count = selectedProjects.length
        toast.success(`${count} campaign${count > 1 ? 's' : ''} deleted successfully!`)
        
        // Exit select mode and clear selection
        setSelectMode(false)
        setSelectedProjects([])
        
        // Refresh projects list
        await loadProjects()
        await loadUser()
      } else {
        toast.error('Failed to delete campaigns')
      }
    } catch (error) {
      console.error('Batch delete error:', error)
      const errorMessage = error.response?.data?.message || 'Failed to delete campaigns'
      toast.error(errorMessage)
    } finally {
      setIsBatchDeleting(false)
    }
  }

  // Toggle campaign active/paused status
  const handleToggleProjectStatus = async (project) => {
    const projectId = project.id
    const newStatus = !project.isEnabled
    
    // Optimistically update UI immediately
    setProjects(prevProjects => 
      prevProjects.map(p => 
        p.id === projectId 
          ? { ...p, isEnabled: newStatus }
          : p
      )
    )
    
    try {
      setTogglingStatus(prev => ({ ...prev, [projectId]: true }))
      
      const response = await uploadAPI.toggleProjectStatus(projectId, newStatus)
      
      // Check for both success formats
      if (response.data.success || response.data.status === 'success') {
        toast.success(`Campaign ${newStatus ? 'activated' : 'paused'} successfully`)
        // Refresh user data first, then reload projects to get updated state
        await loadUser()
        await loadProjects()
      } else {
        // Revert optimistic update on failure
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p.id === projectId 
              ? { ...p, isEnabled: !newStatus }
              : p
          )
        )
        toast.error('Failed to update campaign status')
      }
    } catch (error) {
      console.error('Toggle status error:', error)
      // Revert optimistic update on error
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === projectId 
            ? { ...p, isEnabled: !newStatus }
            : p
        )
      )
      toast.error(error.response?.data?.message || 'Failed to update campaign status')
    } finally {
      setTogglingStatus(prev => ({ ...prev, [projectId]: false }))
    }
  }

  // Toggle project target image requirement
  const handleToggleTargetImage = async (project) => {
    const projectId = project.id
    const newRequirement = !project.requiresTargetImage
    
    // Optimistically update UI immediately
    setProjects(prevProjects => 
      prevProjects.map(p => 
        p.id === projectId 
          ? { ...p, requiresTargetImage: newRequirement }
          : p
      )
    )
    
    try {
      setTogglingTargetImage(prev => ({ ...prev, [projectId]: true }))
      
      const response = await uploadAPI.toggleTargetImageRequirement(projectId, newRequirement)
      
      // Check for both success formats
      if (response.data.success || response.data.status === 'success') {
        toast.success(`Target image ${newRequirement ? 'required' : 'not required'} successfully`)
        // Refresh user data first, then reload projects to get updated state
        await loadUser()
        await loadProjects()
      } else {
        // Revert optimistic update on failure
        setProjects(prevProjects => 
          prevProjects.map(p => 
            p.id === projectId 
              ? { ...p, requiresTargetImage: !newRequirement }
              : p
          )
        )
        toast.error('Failed to toggle target image requirement')
      }
    } catch (error) {
      console.error('Toggle target image error:', error)
      // Revert optimistic update on error
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === projectId 
            ? { ...p, requiresTargetImage: !newRequirement }
            : p
        )
      )
      toast.error(error.response?.data?.message || 'Failed to toggle target image requirement')
    } finally {
      setTogglingTargetImage(prev => ({ ...prev, [projectId]: false }))
    }
  }

  // Handle change template button click
  const handleChangeTemplate = (project) => {
    setSelectedProjectForTemplate(project)
    const allTemplates = getAllTemplates()
    setTemplates(allTemplates)
    setShowTemplateModal(true)
  }

  // Handle template preview click
  const handleTemplateClick = (template) => {
    setSelectedTemplate(template)
    setShowTemplatePreviewModal(true)
  }

  // Handle apply template to project
  const handleApplyTemplateToProject = async (template, templateConfig) => {
    if (!selectedProjectForTemplate) return
    
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Apply "${template.name}" template to "${selectedProjectForTemplate.name}" campaign?`
    )
    if (!confirmed) return
    
    setApplyingTemplate(true)
    try {
      const response = await templatesAPI.applyTemplate({
        templateId: template.id,
        projectIds: [selectedProjectForTemplate.id],
        templateConfig: templateConfig || {}
      })
      
      if (response.data?.success) {
        toast.success(`Template applied successfully!`)
        setShowTemplateModal(false)
        setShowTemplatePreviewModal(false)
        setSelectedProjectForTemplate(null)
        setSelectedTemplate(null)
        setSelectedTemplateConfig(null)
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

  // Close template modal
  const closeTemplateModal = () => {
    setShowTemplateModal(false)
    setSelectedProjectForTemplate(null)
    setSelectedTemplate(null)
    setSelectedTemplateConfig(null)
    setShowTemplatePreviewModal(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-mesh flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-slate-400">Loading campaigns...</p>
        </div>
      </div>
    )
  }

  const filteredProjects = getFilteredAndSortedProjects()

  return (
    <div className="min-h-screen bg-dark-mesh">
      {/* Enhanced Header Section */}
      <div className="relative overflow-hidden">
        {/* Consistent background - removed gradient overlay for uniform appearance */}
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 sm:pt-12 sm:pb-8">
          {/* Title Section */}
          <div className="mb-6 sm:mb-8 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gradient bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink bg-clip-text text-transparent mb-2 sm:mb-3 animate-fade-in-up">
              Campaign Management
            </h1>
            <p className="text-base sm:text-lg text-slate-300 animate-fade-in-up" style={{animationDelay: '0.1s'}}>
              Manage your campaigns, QR codes, and videos all in one place
            </p>
          </div>

          {/* Stats Cards */}
          {projects.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
              <div className="card-glass rounded-xl p-4 sm:p-5 border border-slate-600/30 hover:border-neon-blue/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-cyan rounded-lg flex items-center justify-center shadow-glow-blue">
                    <Sparkles className="w-5 h-5 text-slate-900" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-100">{stats.total}</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Total Campaigns</p>
              </div>

              <div className="card-glass rounded-xl p-4 sm:p-5 border border-slate-600/30 hover:border-neon-green/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-neon-green to-emerald-500 rounded-lg flex items-center justify-center shadow-glow-green">
                    <CheckCircle className="w-5 h-5 text-slate-900" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-100">{stats.active}</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Active</p>
              </div>

              <div className="card-glass rounded-xl p-4 sm:p-5 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-500 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-slate-100" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-100">{stats.paused}</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Paused</p>
              </div>

              <div className="card-glass rounded-xl p-4 sm:p-5 border border-slate-600/30 hover:border-neon-purple/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-pink rounded-lg flex items-center justify-center shadow-glow-purple">
                    <TrendingUp className="w-5 h-5 text-slate-900" />
                  </div>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-100">{stats.scans.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Total Scans</p>
              </div>
            </div>
          )}

          {/* Search and Filters Section */}
          {projects.length > 0 && (
            <div className="space-y-4 sm:space-y-5 mb-6 animate-fade-in-up" style={{animationDelay: '0.3s'}}>
              {/* Search Bar - Full width on all screens */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaigns by name, description, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-10 sm:pr-4 py-3.5 sm:py-3 bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 transition-all duration-200 shadow-glow-blue/0 focus:shadow-glow-blue text-base sm:text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 touch-manipulation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Professional Filter Controls - Redesigned for Desktop */}
              <div className="space-y-4 sm:space-y-0">
                {/* Main Filters Row - Elegant Desktop Layout */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6">
                  {/* Left Section - Status Filters */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    {/* Mobile: Dropdown */}
                    <div className="flex-1 sm:hidden">
                      <label className="block text-xs font-semibold text-slate-400 mb-2">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 transition-all touch-manipulation min-h-[44px] hover:border-slate-500/60 hover:bg-slate-800/80"
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                      </select>
                    </div>

                    {/* Desktop: Buttons */}
                    <div className="hidden sm:flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-600/30">
                        <Filter className="w-4 h-4 text-neon-blue" />
                        <span className="text-sm font-semibold text-slate-300">Status</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStatusFilter('all')}
                          className={`px-5 sm:px-6 py-2.5 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation ${
                            statusFilter === 'all'
                              ? 'bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-blue text-slate-900 shadow-glow-blue scale-105'
                              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-600/40 hover:border-neon-blue/50 hover:scale-105'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setStatusFilter('active')}
                          className={`px-5 sm:px-6 py-2.5 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation ${
                            statusFilter === 'active'
                              ? 'bg-gradient-to-r from-neon-green via-emerald-500 to-neon-green text-slate-900 shadow-glow-green scale-105'
                              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-600/40 hover:border-neon-green/50 hover:scale-105'
                          }`}
                        >
                          Active
                        </button>
                        <button
                          onClick={() => setStatusFilter('paused')}
                          className={`px-5 sm:px-6 py-2.5 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation ${
                            statusFilter === 'paused'
                              ? 'bg-slate-600/80 text-slate-100 border-2 border-slate-500/60 scale-105'
                              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-600/40'
                          }`}
                        >
                          Paused
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Type, Sort, View Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 lg:gap-5">

                    {/* Campaign Type Filter */}
                    {campaignTypes.length > 0 && (
                      <div className="flex-1 sm:flex-initial">
                        <label className="block text-xs font-semibold text-slate-400 mb-2 sm:hidden">Campaign Type</label>
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-semibold text-slate-300 whitespace-nowrap hidden sm:inline-flex items-center px-2">
                            Type
                          </span>
                          <select
                            value={campaignTypeFilter}
                            onChange={(e) => setCampaignTypeFilter(e.target.value)}
                            className="w-full sm:w-auto sm:min-w-[150px] px-4 py-2.5 sm:py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 transition-all touch-manipulation min-h-[44px] sm:min-h-0 hover:border-slate-500/60 hover:bg-slate-800/80"
                          >
                            <option value="all">All Types</option>
                            {campaignTypes.map(type => (
                              <option key={type} value={type}>
                                {type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Sort Dropdown */}
                    <div className="flex-1 sm:flex-initial">
                      <label className="block text-xs font-semibold text-slate-400 mb-2 sm:hidden">Sort By</label>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-slate-300 whitespace-nowrap hidden sm:inline-flex items-center px-2">
                          Sort
                        </span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-full sm:w-auto sm:min-w-[170px] px-4 py-2.5 sm:py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-neon-blue/50 focus:border-neon-blue/50 transition-all touch-manipulation min-h-[44px] sm:min-h-0 hover:border-slate-500/60 hover:bg-slate-800/80"
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="name">Name (A-Z)</option>
                          <option value="scans">Most Scans</option>
                        </select>
                      </div>
                    </div>

                    {/* Select Mode Toggle */}
                    <div className="flex-1 sm:flex-initial">
                      <button
                        onClick={toggleSelectMode}
                        className={`w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2.5 rounded-xl sm:rounded-lg text-sm font-semibold transition-all duration-200 border flex items-center justify-center gap-2 touch-manipulation min-h-[44px] sm:min-h-[38px] ${
                          selectMode
                            ? 'bg-gradient-to-r from-neon-orange to-orange-500 text-slate-900 shadow-glow-orange hover:from-orange-400 hover:to-orange-400 border-orange-500/50'
                            : 'bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-slate-100 border-slate-600/40 hover:border-slate-500/60'
                        }`}
                        title={selectMode ? 'Exit select mode' : 'Select campaigns'}
                      >
                        <CheckCircle className={`w-4 h-4 ${selectMode ? '' : 'hidden sm:block'}`} />
                        <span className="hidden sm:inline">{selectMode ? 'Cancel Select' : 'Select'}</span>
                        <span className="sm:hidden">{selectMode ? 'Cancel' : 'Select'}</span>
                      </button>
                    </div>

                    {/* View Mode Toggle - Hidden on mobile, visible on desktop */}
                    <div className="hidden sm:flex sm:flex-initial">
                      <div className="flex bg-slate-800/60 rounded-lg p-1 border border-slate-600/40 gap-1">
                        <button
                          onClick={() => setViewMode('list')}
                          disabled={selectMode}
                          className={`px-3.5 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-2 touch-manipulation min-h-[38px] ${
                            viewMode === 'list'
                              ? 'bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-blue text-slate-900 shadow-glow-blue font-semibold scale-105'
                              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/60'
                          } ${selectMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="List view"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('grid')}
                          disabled={selectMode}
                          className={`px-3.5 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-2 touch-manipulation min-h-[38px] ${
                            viewMode === 'grid'
                              ? 'bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-blue text-slate-900 shadow-glow-blue font-semibold scale-105'
                              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/60'
                          } ${selectMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Grid view"
                        >
                          <Grid className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                      <div className="flex-1 sm:flex-initial">
                        <label className="block text-xs font-semibold text-slate-400 mb-2 sm:hidden">Actions</label>
                        <button
                          onClick={clearFilters}
                          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2.5 bg-slate-700/60 hover:bg-slate-600/70 text-slate-300 hover:text-slate-100 rounded-xl sm:rounded-lg text-sm font-semibold transition-all duration-200 border border-slate-600/40 hover:border-slate-500/60 flex items-center justify-center gap-2 touch-manipulation min-h-[44px] sm:min-h-[38px] hover:scale-105"
                        >
                          <X className="w-4 h-4" />
                          <span className="hidden sm:inline">Clear</span>
                          <span className="sm:hidden">Clear Filters</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Results Count */}
                {hasActiveFilters && (
                  <div className="text-sm text-slate-400 pt-2 border-t border-slate-700/30">
                    Showing {filteredProjects.length} of {projects.length} campaign{projects.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

        {/* Projects List */}
        {projects.length === 0 ? (
          <div className="text-center py-16 sm:py-20 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-2xl mb-6 shadow-glow-blue/30">
              <FolderOpen className="w-10 h-10 sm:w-12 sm:h-12 text-neon-blue" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-3">No campaigns yet</h3>
            <p className="text-base sm:text-lg text-slate-400 mb-6 max-w-md mx-auto">
              Start creating your first Phygital campaign and bring your content to life!
            </p>
            <button className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Your First Campaign
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 sm:py-20 animate-fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-700/20 to-slate-600/20 rounded-2xl mb-6">
              <Search className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-100 mb-3">No campaigns match your filters</h3>
            <p className="text-base sm:text-lg text-slate-400 mb-6 max-w-md mx-auto">
              Try adjusting your search or filter criteria to find what you're looking for.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 rounded-xl text-sm font-medium transition-all duration-200 border border-slate-600/30 inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 auto-rows-fr'
              : 'space-y-3 sm:space-y-4'
            }>
              {filteredProjects.map((project, index) => (
                <div 
                  key={project.id}
                  className={`animate-fade-in-up ${viewMode === 'grid' ? 'flex' : ''}`}
                  style={{animationDelay: `${index * 0.05}s`}}
                >
                  <ProjectCard
                    project={project}
                    user={user}
                    isTogglingStatus={togglingStatus[project.id]}
                    onDownloadComposite={() => handleDownloadComposite(project)}
                    onShare={() => handleShareUrl(project)}
                    onEdit={() => handleEditProject(project)}
                    onDelete={() => handleDeleteProject(project)}
                    onToggleStatus={() => handleToggleProjectStatus(project)}
                    onChangeTemplate={handleChangeTemplate}
                    formatDate={formatDate}
                    viewMode={viewMode}
                    getLandingPageUrl={getLandingPageUrl}
                    isCampaignIncomplete={isCampaignIncomplete}
                    onResumeCampaign={handleResumeCampaign}
                    selectMode={selectMode}
                    isSelected={selectedProjects.includes(project.id)}
                    onToggleSelect={() => toggleProjectSelection(project.id)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Sticky Action Bar for Multi-Select (Mobile) */}
        {selectMode && selectedProjects.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 shadow-lg">
            <div className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  {selectedProjects.length} campaign{selectedProjects.length > 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleSelectMode}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg transition-all duration-200 border border-slate-600/40 min-h-[44px] touch-manipulation"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchDeleteClick}
                  disabled={isBatchDeleting}
                  className="px-4 py-2.5 text-sm font-semibold text-slate-100 bg-gradient-to-r from-neon-red to-red-500 hover:from-red-400 hover:to-red-400 rounded-lg transition-all duration-200 shadow-glow-red min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBatchDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Action Bar for Multi-Select (Desktop) */}
        {selectMode && selectedProjects.length > 0 && (
          <div className="hidden sm:block fixed top-20 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm font-semibold text-slate-100">
                    {selectedProjects.length} campaign{selectedProjects.length > 1 ? 's' : ''} selected
                  </p>
                  {selectedProjects.length < filteredProjects.length ? (
                    <button
                      onClick={selectAllProjects}
                      className="px-3 py-1.5 text-xs font-medium text-neon-blue hover:text-neon-cyan transition-colors"
                    >
                      Select All
                    </button>
                  ) : (
                    <button
                      onClick={deselectAllProjects}
                      className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Deselect All
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={toggleSelectMode}
                    className="px-4 py-2 text-sm font-semibold text-slate-300 bg-slate-800/60 hover:bg-slate-700/60 rounded-lg transition-all duration-200 border border-slate-600/40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBatchDeleteClick}
                    disabled={isBatchDeleting}
                    className="px-5 py-2 text-sm font-semibold text-slate-100 bg-gradient-to-r from-neon-red to-red-500 hover:from-red-400 hover:to-red-400 rounded-lg transition-all duration-200 shadow-glow-red disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isBatchDeleting ? 'Deleting...' : `Delete ${selectedProjects.length}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Batch Delete Confirmation Modal */}
      {showBatchDeleteModal && selectedProjects.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="card-glass rounded-2xl shadow-dark-large max-w-md w-full border border-red-600/30 animate-fade-in-up">
            <div className="px-6 py-5 border-b border-slate-600/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-neon-red to-red-600 rounded-lg flex items-center justify-center shadow-glow-red">
                    <Trash2 className="w-5 h-5 text-slate-100" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100">
                    Delete {selectedProjects.length} Campaign{selectedProjects.length > 1 ? 's' : ''}
                  </h3>
                </div>
                <button
                  onClick={() => setShowBatchDeleteModal(false)}
                  disabled={isBatchDeleting}
                  className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 p-1 hover:bg-slate-700/50 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-5">
              <p className="text-slate-300 mb-4 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-100">{selectedProjects.length}</span> campaign{selectedProjects.length > 1 ? 's' : ''}? This action cannot be undone and will permanently remove all content.
              </p>
              <div className="bg-red-900/10 border border-red-600/20 rounded-xl p-4 mb-4">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-2 flex-shrink-0"></div>
                    <span>All campaigns and their data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-2 flex-shrink-0"></div>
                    <span>All uploaded files (designs, videos, composites, documents)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-2 flex-shrink-0"></div>
                    <span>All analytics and scan history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-2 flex-shrink-0"></div>
                    <span>All QR codes and social links</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="px-6 py-5 border-t border-slate-600/30 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={isBatchDeleting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/30"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={isBatchDeleting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-100 bg-gradient-to-r from-neon-red to-red-500 hover:from-red-400 hover:to-red-400 rounded-xl transition-all duration-200 shadow-glow-red disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isBatchDeleting ? 'Deleting...' : `Delete ${selectedProjects.length} Campaign${selectedProjects.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        editingProject?.campaignType?.startsWith('qr-') ? (
          <PhygitalizedEditModal
            project={editingProject}
            formData={editFormData}
            isSaving={isSaving}
            onChange={setEditFormData}
            onSave={handleSaveProject}
            onClose={closeEditModal}
            onUpgradeRequest={handleUpgradeRequest}
            getAvailableUpgrades={getAvailableUpgrades}
          />
        ) : (
          <EditProjectModal
            project={editingProject}
            formData={editFormData}
            isSaving={isSaving}
            uploadProgress={uploadProgress}
            onVideoDrop={onVideoDrop}
            onSocialLinkChange={handleSocialLinkChange}
            onSave={handleSaveProject}
            onClose={closeEditModal}
            phoneErrors={phoneErrors}
            countryCodes_state={countryCodes_state}
            handleCountryCodeChange={handleCountryCodeChange}
          />
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && projectToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-up">
          <div className="card-glass rounded-2xl shadow-dark-large max-w-md w-full border border-red-600/30 animate-fade-in-up">
            <div className="px-6 py-5 border-b border-slate-600/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-neon-red to-red-600 rounded-lg flex items-center justify-center shadow-glow-red">
                    <Trash2 className="w-5 h-5 text-slate-100" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100">
                    Delete Campaign
                  </h3>
                </div>
                <button
                  onClick={closeDeleteModal}
                  disabled={isDeleting}
                  className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 p-1 hover:bg-slate-700/50 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-5">
              <p className="text-slate-300 mb-4 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-100">"{projectToDelete.name}"</span>? This action cannot be undone and will permanently remove:
              </p>
              <div className="bg-red-900/10 border border-red-600/20 rounded-xl p-4 mb-4">
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-2 flex-shrink-0"></div>
                    <span>The campaign and all its data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-2 flex-shrink-0"></div>
                    <span>All uploaded files (design, video, composite, documents)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-2 flex-shrink-0"></div>
                    <span>All analytics and scan history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-red mt-2 flex-shrink-0"></div>
                    <span>All QR codes and social links</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="px-6 py-5 border-t border-slate-600/30 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/30"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProject}
                disabled={isDeleting}
                className="px-5 py-2.5 text-sm font-semibold text-slate-900 bg-gradient-to-r from-neon-red to-red-500 hover:from-red-400 hover:to-red-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 flex items-center justify-center shadow-glow-red hover:scale-105 active:scale-95 disabled:hover:scale-100"
              >
                {isDeleting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Campaign
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && selectedProjectForTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-slate-800 rounded-xl border border-slate-600/50 shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Change Template</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Select a template for "{selectedProjectForTemplate.name}"
                </p>
              </div>
              <button
                onClick={closeTemplateModal}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                disabled={applyingTemplate}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      appliedCampaigns={[]}
                      onClick={() => handleTemplateClick(template)}
                      onApply={() => handleTemplateClick(template)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">No templates available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Modal */}
      {showTemplatePreviewModal && selectedTemplate && selectedProjectForTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          isOpen={showTemplatePreviewModal}
          onClose={() => {
            setShowTemplatePreviewModal(false)
            setSelectedTemplate(null)
            setSelectedTemplateConfig(null)
          }}
          onApply={(templateConfig) => {
            setSelectedTemplateConfig(templateConfig || {})
            handleApplyTemplateToProject(selectedTemplate, templateConfig)
          }}
        />
      )}

      {/* Campaign Upgrade Modal */}
      {showUpgradeModal && upgradingCampaign && pendingUpgradeType && (
        <CampaignUpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false)
            setUpgradingCampaign(null)
            setPendingUpgradeType(null)
          }}
          currentType={upgradingCampaign.campaignType}
          newType={pendingUpgradeType}
          onConfirm={handleUpgradeConfirm}
          isUpgrading={isUpgrading}
          existingData={upgradingCampaign}
        />
      )}
    </div>
  )
}

// Project Card Component
const ProjectCard = ({
  project,
  user,
  isTogglingStatus,
  onDownloadComposite,
  onShare,
  onEdit,
  onDelete,
  onToggleStatus,
  onChangeTemplate,
  formatDate,
  viewMode,
  getLandingPageUrl,
  isCampaignIncomplete,
  onResumeCampaign,
  selectMode = false,
  isSelected = false,
  onToggleSelect
}) => {
  const personalizedUrl = `${window.location.origin}/user/${user?.username}?project=${project.id}`
  const landingPageUrl = getLandingPageUrl ? getLandingPageUrl(project) : null

  return (
    <div className={`group card-glass rounded-xl shadow-dark-large border transition-all duration-300 w-full relative flex flex-col ${
      viewMode === 'list' 
        ? 'hover:shadow-glow-blue/10' 
        : 'hover:scale-[1.02] hover:shadow-glow-blue/20 min-h-[500px]'
    } ${
      selectMode
        ? isSelected
          ? 'border-neon-orange/50 bg-gradient-to-br from-neon-orange/10 to-orange-500/10 shadow-glow-orange/20'
          : 'border-slate-600/30'
        : project.isEnabled
          ? 'border-slate-600/30 hover:border-neon-blue/50'
          : 'border-red-600/30 hover:border-red-500/50 opacity-90'
    }`}>
      {/* Selection Checkbox */}
      {selectMode && (
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect && onToggleSelect();
            }}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200 ${
              isSelected
                ? 'bg-neon-orange border-neon-orange shadow-glow-orange'
                : 'bg-slate-800/80 border-slate-500 hover:border-neon-orange/50'
            }`}
          >
            {isSelected && <CheckCircle className="w-4 h-4 text-slate-900" />}
          </button>
        </div>
      )}

      <div className={`${viewMode === 'list' ? 'p-4 sm:p-5' : 'p-5 sm:p-6'} ${selectMode ? 'pr-12 sm:pr-14' : ''} flex flex-col flex-1`}>
        {/* Project Header - Responsive Layout */}
        <div className={`${viewMode === 'list' ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-0' : 'mb-5'}`}>
          <div className={`flex items-start gap-4 flex-1 min-w-0 ${viewMode === 'list' ? 'sm:flex-1' : ''}`}>
            {/* Campaign Icon */}
            <div className={`flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 ${
              viewMode === 'list' 
                ? 'w-12 h-12 sm:w-14 sm:h-14' 
                : 'w-14 h-14 sm:w-16 sm:h-16'
            } ${
              project.isEnabled
                ? 'bg-gradient-to-br from-neon-blue to-neon-purple shadow-glow-blue group-hover:scale-110'
                : 'bg-gradient-to-br from-slate-600 to-slate-700'
            }`}>
              <Video className={`text-slate-100 ${viewMode === 'list' ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-7 h-7 sm:w-8 sm:h-8'}`} />
            </div>
            
            {/* Campaign Info */}
            <div className="flex-1 min-w-0">
              <div className={`flex items-start justify-between gap-2 ${viewMode === 'list' ? 'mb-2' : 'mb-2'}`}>
                <div className="flex-1 min-w-0">
                  <h2 className={`font-bold text-slate-100 mb-1 truncate group-hover:text-neon-blue transition-colors ${
                    viewMode === 'list' ? 'text-lg sm:text-xl' : 'text-lg sm:text-xl'
                  }`}>
                    {project.name}
                  </h2>
                  {project.description && (
                    <p className={`text-slate-400 ${viewMode === 'list' ? 'text-sm line-clamp-1 sm:line-clamp-2' : 'text-sm line-clamp-2'}`}>
                      {project.description}
                    </p>
                  )}
                </div>
                {!project.isEnabled && (
                  <span className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold bg-red-900/40 text-neon-red border border-red-600/50 rounded-lg">
                    Paused
                  </span>
                )}
              </div>

              {/* Campaign Type Badge */}
              {project.campaignType && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 border border-slate-600/30 rounded-lg mb-3">
                  <Sparkles className="w-3 h-3 text-neon-purple" />
                  <span className="text-xs font-medium text-slate-300">
                    {getCampaignTypeDisplayName(project.campaignType)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* List View: Stats and Actions on the right */}
          {viewMode === 'list' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-1.5 text-sm">
                  <QrCode className="w-4 h-4 text-neon-blue" />
                  <span className="text-neon-blue font-semibold">{project.analytics?.totalScans || 0}</span>
                  <span className="text-slate-400 hidden sm:inline">scans</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">{formatDate(project.createdAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Project Status Toggle */}
        {viewMode !== 'list' && (
          <div className="mb-5 p-4 bg-slate-800/50 rounded-xl border border-slate-600/30 hover:border-slate-500/50 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100 mb-1">
                  {project.isEnabled ? 'Campaign is Active' : 'Campaign is Paused'}
                </p>
                <p className="text-xs text-slate-400">
                  {project.isEnabled 
                    ? 'Your QR code is live and can be scanned by anyone' 
                    : 'Your QR code is paused and cannot be scanned'
                  }
                </p>
              </div>
              <button
                onClick={onToggleStatus}
                disabled={isTogglingStatus}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 flex-shrink-0 ${
                  project.isEnabled 
                    ? 'bg-neon-green focus:ring-neon-green shadow-glow-green' 
                    : 'bg-slate-600 focus:ring-slate-500'
                } ${isTogglingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                title={project.isEnabled ? 'Click to pause this campaign' : 'Click to activate this campaign'}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 shadow-md ${
                    project.isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* List View: Status Toggle and Actions Row */}
        {viewMode === 'list' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 pt-3 border-t border-slate-700/50">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${project.isEnabled ? 'text-neon-green' : 'text-slate-400'}`}>
                  {project.isEnabled ? 'Active' : 'Paused'}
                </span>
                <button
                  onClick={onToggleStatus}
                  disabled={isTogglingStatus}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 flex-shrink-0 ${
                    project.isEnabled 
                      ? 'bg-neon-green focus:ring-neon-green shadow-glow-green' 
                      : 'bg-slate-600 focus:ring-slate-500'
                  } ${isTogglingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                  title={project.isEnabled ? 'Click to pause this campaign' : 'Click to activate this campaign'}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
                      project.isEnabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {project.hasVideo && (
                <div className="flex items-center gap-1.5 text-xs text-neon-green">
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Video</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Project Stats - Hidden in list view (shown in header) */}
        {viewMode !== 'list' && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="flex flex-col items-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <Calendar className="w-4 h-4 text-slate-400 mb-1.5" />
              <span className="text-xs text-slate-400 text-center">{formatDate(project.createdAt)}</span>
            </div>
            <div className={`flex flex-col items-center p-3 rounded-lg border ${
              project.hasVideo 
                ? 'bg-green-900/20 border-green-600/30' 
                : 'bg-slate-800/30 border-slate-700/30'
            }`}>
              <Video className={`w-4 h-4 mb-1.5 ${project.hasVideo ? 'text-neon-green' : 'text-slate-400'}`} />
              <span className={`text-xs text-center ${project.hasVideo ? 'text-neon-green font-medium' : 'text-slate-400'}`}>
                {project.hasVideo ? 'Video' : 'No Video'}
              </span>
            </div>
            <div className="flex flex-col items-center p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <QrCode className="w-4 h-4 text-neon-blue mb-1.5" />
              <span className="text-xs text-neon-blue font-semibold">
                {project.analytics?.totalScans || 0}
              </span>
              <span className="text-xs text-slate-400">scans</span>
            </div>
          </div>
        )}

        {/* Action Buttons - Hide in select mode */}
        {!selectMode && (
          <div className={`mt-auto pt-4 ${viewMode === 'list' ? 'mb-0' : ''}`}>
            {viewMode === 'grid' ? (
              // Grid view: 2-column button layout
              <div className="grid grid-cols-2 gap-2.5">
                {/* Resume Button - Show if campaign is incomplete */}
                {isCampaignIncomplete && isCampaignIncomplete(project) && (
                  <button
                    onClick={() => onResumeCampaign && onResumeCampaign(project)}
                    className="w-full px-3 py-2.5 bg-gradient-to-r from-neon-orange to-orange-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-orange-400 hover:to-orange-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-glow-orange hover:scale-105 active:scale-95"
                    title="Resume incomplete campaign"
                  >
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">Resume</span>
                  </button>
                )}
                {landingPageUrl && (
                  <a
                    href={landingPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-3 py-2.5 bg-gradient-to-r from-neon-purple to-purple-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-purple-400 hover:to-purple-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-glow-purple hover:scale-105 active:scale-95"
                    title={project?.campaignType === 'qr-link' ? 'Preview redirect page' : 'View landing page'}
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{project?.campaignType === 'qr-link' ? 'Preview' : 'View'}</span>
                  </a>
                )}
                <button
                  onClick={onEdit}
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-neon-cyan to-cyan-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-glow-cyan hover:scale-105 active:scale-95"
                  title="Edit campaign settings or upgrade to new features"
                >
                  <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate hidden sm:inline">Edit/Upgrade</span>
                  <span className="truncate sm:hidden">Edit</span>
                </button>
                {(project.phygitalizedData || project.campaignType?.startsWith('qr-')) && onChangeTemplate && (
                  <button
                    onClick={() => onChangeTemplate(project)}
                    className="w-full px-3 py-2.5 bg-gradient-to-r from-neon-purple to-purple-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-purple-400 hover:to-purple-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-glow-purple hover:scale-105 active:scale-95"
                    title="Change template theme"
                  >
                    <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">Template</span>
                  </button>
                )}
                <button
                  onClick={onDownloadComposite}
                  disabled={!project.hasCompositeDesign}
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-neon-green to-green-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-green-400 hover:to-green-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-glow-green disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 active:scale-95"
                  title={project.hasCompositeDesign ? 'Download composite design' : 'Composite design not available'}
                >
                  <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Design</span>
                </button>
                <button
                  onClick={onDelete}
                  className="w-full px-3 py-2.5 bg-gradient-to-r from-neon-red to-red-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-red-400 hover:to-red-400 transition-all duration-200 flex items-center justify-center gap-1.5 shadow-glow-red hover:scale-105 active:scale-95 col-span-2"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Delete</span>
                </button>
              </div>
            ) : (
              // List view: Horizontal button layout
              <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:justify-end">
                {isCampaignIncomplete && isCampaignIncomplete(project) && (
                  <button
                    onClick={() => onResumeCampaign && onResumeCampaign(project)}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-neon-orange to-orange-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-orange-400 hover:to-orange-400 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-glow-orange hover:scale-105 active:scale-95"
                    title="Resume incomplete campaign"
                  >
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Resume</span>
                  </button>
                )}
                {landingPageUrl && (
                  <a
                    href={landingPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-neon-purple to-purple-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-purple-400 hover:to-purple-400 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-glow-purple hover:scale-105 active:scale-95"
                    title={project?.campaignType === 'qr-link' ? 'Preview redirect page' : 'View landing page'}
                  >
                    <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{project?.campaignType === 'qr-link' ? 'Preview' : 'View'}</span>
                  </a>
                )}
                <button
                  onClick={onEdit}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-neon-cyan to-cyan-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-400 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-glow-cyan hover:scale-105 active:scale-95"
                  title="Edit campaign settings or upgrade to new features"
                >
                  <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Edit/Upgrade</span>
                  <span className="sm:hidden">Edit</span>
                </button>
                {(project.phygitalizedData || project.campaignType?.startsWith('qr-')) && onChangeTemplate && (
                  <button
                    onClick={() => onChangeTemplate(project)}
                    className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-neon-purple to-purple-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-purple-400 hover:to-purple-400 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-glow-purple hover:scale-105 active:scale-95"
                    title="Change template theme"
                  >
                    <Palette className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Template</span>
                  </button>
                )}
                <button
                  onClick={onDownloadComposite}
                  disabled={!project.hasCompositeDesign}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-neon-green to-green-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-green-400 hover:to-green-400 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-glow-green disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 active:scale-95"
                  title={project.hasCompositeDesign ? 'Download composite design' : 'Composite design not available'}
                >
                  <Image className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Design</span>
                </button>
                <button
                  onClick={onDelete}
                  className="px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-neon-red to-red-500 text-slate-900 text-xs sm:text-sm font-semibold rounded-lg hover:from-red-400 hover:to-red-400 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-glow-red hover:scale-105 active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// Video Update Modal Component
const VideoUpdateModal = ({ project, videoFile, isUploading, onFileChange, onUpload, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
    <div className="card-glass rounded-lg shadow-dark-large max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-600/30">
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-slate-600/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-100 pr-2">
            Update Video for {project?.name}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 flex-shrink-0 touch-manipulation p-1"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
          </button>
        </div>
      </div>
      
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        <div className="mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-slate-300 mb-3 sm:mb-4">
            Select a new video file to replace the existing one for this project.
          </p>
          
          <div className="mb-3 sm:mb-4">
            <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1 sm:mb-2">
              Select Video File
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={onFileChange}
              className="input block w-full text-xs sm:text-sm text-slate-300 file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-neon-blue file:text-slate-900 hover:file:bg-neon-cyan touch-manipulation"
            />
          </div>
          
          {videoFile && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-900/20 border border-neon-green/30 rounded-lg">
              <p className="text-xs sm:text-sm text-neon-green">
                <strong>Selected:</strong> {videoFile.name}
              </p>
              <p className="text-xs text-slate-300">
                Size: {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-slate-600/30 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
        <button
          onClick={onClose}
          className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors w-full sm:w-auto touch-manipulation"
        >
          Cancel
        </button>
        <button
          onClick={onUpload}
          disabled={!videoFile || isUploading}
          className="btn-primary px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto touch-manipulation"
        >
          {isUploading ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Update Video
            </>
          )}
        </button>
      </div>
    </div>
  </div>
)


// Edit Project Modal Component
const EditProjectModal = ({ 
  project, 
  formData, 
  isSaving, 
  uploadProgress, 
  onVideoDrop, 
  onSocialLinkChange, 
  onSave, 
  onClose,
  phoneErrors,
  countryCodes_state,
  handleCountryCodeChange
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/mp4': ['.mp4']
    },
    maxFiles: 1,
    disabled: isSaving
  })

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="card-glass rounded-lg shadow-dark-large max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-600/30">
        {/* Header */}
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-slate-600/30">
          <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-100 pr-2">
              Edit Campaign: {project?.name}
          </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 flex-shrink-0 touch-manipulation p-1"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-6">
          {/* Video Upload Section */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-100 mb-3 flex items-center">
              <Video className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Update Video
            </h4>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-neon-blue bg-neon-blue/10'
                  : 'border-slate-600 hover:border-neon-blue/50 bg-slate-800/30'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input {...getInputProps()} />
              
              {formData.video ? (
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-neon-green mx-auto" />
                  <p className="text-sm sm:text-base text-slate-100 font-medium">
                    {formData.video.name}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400">
                    {(formData.video.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 mx-auto" />
                  <p className="text-sm sm:text-base text-slate-100">
                    {isDragActive ? 'Drop video here' : 'Click or drag to upload video'}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Only MP4 format supported (max 50MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Social Links Section */}
          <div>
            <h4 className="text-sm sm:text-base font-semibold text-slate-100 mb-3 flex items-center">
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Social Links & Contact
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Instagram */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                  <Instagram className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Instagram
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.instagram}
                  onChange={(e) => onSocialLinkChange('instagram', e.target.value)}
                  placeholder="https://instagram.com/username"
                  className="input w-full px-3 py-2 text-sm"
                  disabled={isSaving}
                />
              </div>

              {/* Facebook */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                  <Facebook className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Facebook
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.facebook}
                  onChange={(e) => onSocialLinkChange('facebook', e.target.value)}
                  placeholder="https://facebook.com/username"
                  className="input w-full px-3 py-2 text-sm"
                  disabled={isSaving}
                />
              </div>

              {/* Twitter */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                  <Twitter className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Twitter
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.twitter}
                  onChange={(e) => onSocialLinkChange('twitter', e.target.value)}
                  placeholder="https://twitter.com/username"
                  className="input w-full px-3 py-2 text-sm"
                  disabled={isSaving}
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                  <Linkedin className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  LinkedIn
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.linkedin}
                  onChange={(e) => onSocialLinkChange('linkedin', e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="input w-full px-3 py-2 text-sm"
                  disabled={isSaving}
                />
              </div>

              {/* Website */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                  <Globe className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Website
                </label>
                <input
                  type="url"
                  value={formData.socialLinks.website}
                  onChange={(e) => onSocialLinkChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="input w-full px-3 py-2 text-sm"
                  disabled={isSaving}
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                  <Phone className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  Contact Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCodes_state.contactNumber}
                    onChange={(e) => handleCountryCodeChange('contactNumber', e.target.value)}
                    className="input px-2 py-2 text-xs sm:text-sm flex-shrink-0 w-20 sm:w-24"
                    disabled={isSaving}
                  >
                    {countryCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={formData.socialLinks.contactNumber}
                    onChange={(e) => onSocialLinkChange('contactNumber', e.target.value)}
                    placeholder="9876543210"
                    className={`input flex-1 px-3 py-2 text-sm ${
                      phoneErrors?.contactNumber 
                        ? 'border-neon-red bg-red-900/20' 
                        : formData.socialLinks.contactNumber 
                        ? 'border-neon-green bg-green-900/20' 
                        : ''
                    }`}
                    disabled={isSaving}
                  />
                </div>
                {phoneErrors?.contactNumber && (
                  <div className="mt-1 flex items-start text-xs text-neon-red">
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5" />
                    <span>{phoneErrors.contactNumber}</span>
                  </div>
                )}
                {formData.socialLinks.contactNumber && !phoneErrors?.contactNumber && (
                  <div className="mt-1 flex items-center text-xs text-neon-green">
                    <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>Valid number</span>
                  </div>
                )}
              </div>

              {/* WhatsApp Number */}
              <div className="sm:col-span-2">
                <label className="block text-xs sm:text-sm font-medium text-slate-300 mb-1">
                  <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                  WhatsApp Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCodes_state.whatsappNumber}
                    onChange={(e) => handleCountryCodeChange('whatsappNumber', e.target.value)}
                    className="input px-2 py-2 text-xs sm:text-sm flex-shrink-0 w-20 sm:w-24"
                    disabled={isSaving}
                  >
                    {countryCodes.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={formData.socialLinks.whatsappNumber}
                    onChange={(e) => onSocialLinkChange('whatsappNumber', e.target.value)}
                    placeholder="9876543210"
                    className={`input flex-1 px-3 py-2 text-sm ${
                      phoneErrors?.whatsappNumber 
                        ? 'border-neon-red bg-red-900/20' 
                        : formData.socialLinks.whatsappNumber 
                        ? 'border-neon-green bg-green-900/20' 
                        : ''
                    }`}
                    disabled={isSaving}
                  />
                </div>
                {phoneErrors?.whatsappNumber && (
                  <div className="mt-1 flex items-start text-xs text-neon-red">
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5" />
                    <span>{phoneErrors.whatsappNumber}</span>
                  </div>
                )}
                {formData.socialLinks.whatsappNumber && !phoneErrors?.whatsappNumber && (
                  <div className="mt-1 flex items-center text-xs text-neon-green">
                    <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>Valid number</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upload Progress */}
          {isSaving && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-slate-300">
                <span>Saving changes...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-neon-blue h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-slate-600/30 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2.5 text-sm sm:text-base font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2.5 text-sm sm:text-base font-medium text-slate-900 bg-neon-blue rounded-lg hover:bg-blue-400 transition-colors flex items-center justify-center shadow-glow-blue disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Phygitalized Edit Modal (dynamic by campaignType)
const PhygitalizedEditModal = ({ project, formData, isSaving, onChange, onSave, onClose, onUpgradeRequest, getAvailableUpgrades }) => {
  const campaignType = project?.campaignType || ''
  const [activeTab, setActiveTab] = useState('edit')


  const setField = (patch) => {
    onChange(prev => {
      const updated = { ...prev, ...patch }
      return updated
    })
  }

  const updateLink = (idx, patch) => {
    const next = [...(formData.links || [])]
    next[idx] = { ...(next[idx] || {}), ...patch }
    setField({ links: next })
  }

  const addLink = () => {
    // Check if upgrade is needed (qr-link -> qr-links when adding second link)
    if (campaignType === 'qr-link') {
      const currentLinks = formData.links || []
      const existingLinks = project?.phygitalizedData?.links || []
      const totalLinks = currentLinks.length + existingLinks.length
      
      // If this would be the second link, trigger upgrade
      if (totalLinks >= 1) {
        if (onUpgradeRequest) {
          onUpgradeRequest(project, 'qr-links')
          return
        }
      }
    }
    
    setField({ links: [...(formData.links || []), { label: '', url: '' }] })
  }
  
  const removeLink = (idx) => setField({ links: (formData.links || []).filter((_, i) => i !== idx) })

  const showLinks = campaignType === 'qr-links' || campaignType === 'qr-links-video' || campaignType === 'qr-links-pdf-video'
  const showVideo = campaignType === 'qr-links-video' || campaignType === 'qr-links-pdf-video' || campaignType === 'qr-links-ar-video'
  const showPdf = campaignType === 'qr-links-pdf-video'
  const showDocument = campaignType === 'qr-links-video'

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle PDF drop
  const onPdfDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      return
    }

    // Check if upgrade is needed (qr-links-video -> qr-links-pdf-video)
    if (campaignType === 'qr-links-video') {
      if (onUpgradeRequest) {
        onUpgradeRequest(project, 'qr-links-pdf-video')
        return
      }
    }

    const validFiles = []
    const errors = []
    const existingCount = (formData.existingDocuments || []).length
    const newFilesCount = (formData.pdfFiles || []).length
    const currentTotal = existingCount + newFilesCount
    
    acceptedFiles.forEach(file => {
      // More lenient validation: check extension first, then MIME type
      const fileName = file.name.toLowerCase()
      const isPdfByExtension = fileName.endsWith('.pdf')
      const isPdfByType = file.type === 'application/pdf' || file.type === 'application/x-pdf' || file.type === 'application/acrobat'
      
      if (!isPdfByExtension && !isPdfByType) {
        errors.push(`"${file.name}" is not a PDF file`)
        return
      }
      
      // Check if file is already selected (by name and size)
      const isDuplicate = (formData.pdfFiles || []).some(f => f.name === file.name && f.size === file.size)
      if (isDuplicate) {
        errors.push(`"${file.name}" is already selected`)
        return
      }
      
      // Check file limit (max 5 total)
      if (currentTotal + validFiles.length >= 5) {
        errors.push('Maximum 5 PDF files allowed')
        return
      }
      
      validFiles.push(file)
    })

    if (errors.length > 0) {
      toast.error(errors[0])
    }

    if (validFiles.length === 0) {
      return
    }

    const newPdfFiles = [...(formData.pdfFiles || []), ...validFiles]
    
    setField({ pdfFiles: newPdfFiles })
    
    toast.success(`${validFiles.length} PDF file(s) added`)
  }, [formData, onChange, campaignType, onUpgradeRequest, project])

  // Handle video drop
  const onVideoDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) {
      return
    }

    // Check if upgrade is needed
    if (campaignType === 'qr-link' || campaignType === 'qr-links') {
      if (onUpgradeRequest) {
        const upgradeType = campaignType === 'qr-link' ? 'qr-links-video' : 'qr-links-video';
        onUpgradeRequest(project, upgradeType)
        return
      }
    }

    
    // Use functional update to get latest formData
    onChange(prevFormData => {
      const validFiles = []
      const errors = []
      const maxSize = 50 * 1024 * 1024 // 50MB limit
      const existingCount = (prevFormData.existingVideos || []).length
      const newFilesCount = (prevFormData.videos || []).length
      const currentTotal = existingCount + newFilesCount;
      acceptedFiles.forEach(file => {
        // More lenient validation: check extension first, then MIME type
        const fileName = file.name.toLowerCase()
        const isVideoByExtension = /\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v|mpg|mpeg|3gp)$/i.test(fileName)
        const isVideoByType = file.type && file.type.startsWith('video/')
        
        // Accept if either extension or MIME type indicates video
        // If MIME type is empty/missing, rely on extension
        const isVideo = isVideoByExtension || (file.type && isVideoByType) || (!file.type && isVideoByExtension)
        
        if (!isVideo) {
          console.error('❌ Video validation failed for:', file.name)
          errors.push(`"${file.name}" is not a video file`)
          return
        }
        
        // Check file size (50MB limit)
        if (file.size > maxSize) {
          const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
          errors.push(`"${file.name}" is ${fileSizeMB}MB. Maximum file size is 50MB per video.`)
          return
        }
        
        // Check if file is already selected
        const isDuplicate = (prevFormData.videos || []).some(f => f.name === file.name && f.size === file.size)
        if (isDuplicate) {
          errors.push(`"${file.name}" is already selected`)
          return
        }
        
        // Check file limit (max 5 total)
        if (currentTotal + validFiles.length >= 5) {
          errors.push('Maximum 5 video files allowed')
          return
        }
        
        validFiles.push(file)
      });
      
      if (errors.length > 0) {
        errors.forEach(error => toast.error(error));
        return prevFormData // Return unchanged state on error
      }

      if (validFiles.length === 0) {
        return prevFormData // Return unchanged state if no valid files
      }

      // Update videos array
      const newVideos = [...(prevFormData.videos || []), ...validFiles];
      toast.success(`${validFiles.length} video file(s) added`)
      return {
        ...prevFormData,
        videos: newVideos
      }
    })
  }, [campaignType, onUpgradeRequest, onChange, project, formData])

  // Refs for file inputs (separate from dropzone inputs for "click to browse" buttons)
  const pdfInputRef = useRef(null)
  const videoInputRef = useRef(null)
  
  // Refs for dropzone inputs (used by dropzone's open() function)
  const pdfDropzoneInputRef = useRef(null)
  const videoDropzoneInputRef = useRef(null)
  
  // Track if we're currently processing files to avoid duplicate processing
  const processingPdfRef = useRef(false)
  const processingVideoRef = useRef(false)

  // Functions to open file dialogs
  const openPdfDialog = () => {
    // Click the dropzone input directly - this is more reliable than open() in some browsers
    // The dropzone input is the actual file input that will trigger the dialog
    if (pdfDropzoneInputRef.current) {
      const dropzoneInput = pdfDropzoneInputRef.current
      
      // Ensure input is enabled and accessible
      dropzoneInput.disabled = false
      dropzoneInput.style.pointerEvents = 'auto'
      dropzoneInput.style.opacity = '0'
      dropzoneInput.style.position = 'fixed' // Use fixed instead of absolute for better compatibility
      dropzoneInput.style.width = '1px'
      dropzoneInput.style.height = '1px'
      dropzoneInput.style.top = '0'
      dropzoneInput.style.left = '0'
      dropzoneInput.style.zIndex = '9999'
      dropzoneInput.style.visibility = 'visible'
      // Use requestAnimationFrame to ensure DOM is ready, then click
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (dropzoneInput && dropzoneInput.isConnected) {
            try {
              // Focus first, then click
              dropzoneInput.focus()
              dropzoneInput.click()
              // Check after a short delay if dialog opened
              setTimeout(() => {
              }, 200)
            } catch (error) {
              // Fallback to dropzone's open() function
              if (openPdfDropzone) {
                try {
                  openPdfDropzone()
                } catch (openError) {
                }
              }
            }
          } else {
            // Fallback to dropzone's open() function
            if (openPdfDropzone) {
              try {
                openPdfDropzone()
              } catch (openError) {
              }
            }
          }
        }, 0)
      })
    } else if (openPdfDropzone) {
      // Fallback: use dropzone's open() function
      try {
        openPdfDropzone()
      } catch (error) {
        // Final fallback: click separate input
        if (pdfInputRef.current) {
          pdfInputRef.current.disabled = false
          pdfInputRef.current.style.pointerEvents = 'auto'
          pdfInputRef.current.style.opacity = '0'
          pdfInputRef.current.style.position = 'fixed'
          pdfInputRef.current.style.width = '1px'
          pdfInputRef.current.style.height = '1px'
          pdfInputRef.current.style.top = '0'
          pdfInputRef.current.style.left = '0'
          pdfInputRef.current.style.zIndex = '9999'
          setTimeout(() => {
            if (pdfInputRef.current) {
              pdfInputRef.current.focus()
              pdfInputRef.current.click()
            }
          }, 0)
        }
      }
    } else if (pdfInputRef.current) {
      // Final fallback: click separate input
      pdfInputRef.current.disabled = false
      pdfInputRef.current.style.pointerEvents = 'auto'
      pdfInputRef.current.style.opacity = '0'
      pdfInputRef.current.style.position = 'fixed'
      pdfInputRef.current.style.width = '1px'
      pdfInputRef.current.style.height = '1px'
      pdfInputRef.current.style.top = '0'
      pdfInputRef.current.style.left = '0'
      pdfInputRef.current.style.zIndex = '9999'
      setTimeout(() => {
        if (pdfInputRef.current) {
          pdfInputRef.current.focus()
          pdfInputRef.current.click()
        }
      }, 0)
    } else {
    }
  }

  const openVideoDialog = () => {
    // Click the dropzone input directly - this is more reliable than open() in some browsers
    // The dropzone input is the actual file input that will trigger the dialog
    if (videoDropzoneInputRef.current) {
      const dropzoneInput = videoDropzoneInputRef.current
      
      // Ensure input is enabled and accessible
      dropzoneInput.disabled = false
      dropzoneInput.style.pointerEvents = 'auto'
      dropzoneInput.style.opacity = '0'
      dropzoneInput.style.position = 'fixed' // Use fixed instead of absolute for better compatibility
      dropzoneInput.style.width = '1px'
      dropzoneInput.style.height = '1px'
      dropzoneInput.style.top = '0'
      dropzoneInput.style.left = '0'
      dropzoneInput.style.zIndex = '9999'
      dropzoneInput.style.visibility = 'visible'
      // Use requestAnimationFrame to ensure DOM is ready, then click
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (dropzoneInput && dropzoneInput.isConnected) {
            try {
              // Focus first, then click
              dropzoneInput.focus()
              dropzoneInput.click()
              // Check after a short delay if dialog opened
              setTimeout(() => {
              }, 200)
            } catch (error) {
              // Fallback to dropzone's open() function
              if (openVideoDropzone) {
                try {
                  openVideoDropzone()
                } catch (openError) {
                }
              }
            }
          } else {
            // Fallback to dropzone's open() function
            if (openVideoDropzone) {
              try {
                openVideoDropzone()
              } catch (openError) {
              }
            }
          }
        }, 0)
      })
    } else if (openVideoDropzone) {
      // Fallback: use dropzone's open() function
      try {
        openVideoDropzone()
      } catch (error) {
        // Final fallback: click separate input
        if (videoInputRef.current) {
          videoInputRef.current.disabled = false
          videoInputRef.current.style.pointerEvents = 'auto'
          videoInputRef.current.style.opacity = '0'
          videoInputRef.current.style.position = 'fixed'
          videoInputRef.current.style.width = '1px'
          videoInputRef.current.style.height = '1px'
          videoInputRef.current.style.top = '0'
          videoInputRef.current.style.left = '0'
          videoInputRef.current.style.zIndex = '9999'
          setTimeout(() => {
            if (videoInputRef.current) {
              videoInputRef.current.focus()
              videoInputRef.current.click()
            }
          }, 0)
        }
      }
    } else if (videoInputRef.current) {
      // Final fallback: click separate input
      videoInputRef.current.disabled = false
      videoInputRef.current.style.pointerEvents = 'auto'
      videoInputRef.current.style.opacity = '0'
      videoInputRef.current.style.position = 'fixed'
      videoInputRef.current.style.width = '1px'
      videoInputRef.current.style.height = '1px'
      videoInputRef.current.style.top = '0'
      videoInputRef.current.style.left = '0'
      videoInputRef.current.style.zIndex = '9999'
      setTimeout(() => {
        if (videoInputRef.current) {
          videoInputRef.current.focus()
          videoInputRef.current.click()
        }
      }, 0)
    } else {
    }
  }

  // PDF dropzone - accept all files, validate in onDrop
  const { 
    getRootProps: getPdfRootProps, 
    getInputProps: getPdfInputProps, 
    isDragActive: isPdfDragActive,
    fileRejections: pdfFileRejections,
    open: openPdfDropzone
  } = useDropzone({
    onDrop: onPdfDrop,
    // Accept common document types - we'll validate by extension in onDrop
    accept: {
      'application/pdf': ['.pdf'],
      'application/x-pdf': ['.pdf'],
      'application/acrobat': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 5,
    multiple: true,
    disabled: isSaving,
    noClick: false, // Allow dropzone clicks, but we'll also provide a button
    noKeyboard: false
  })
  
  // Handle PDF file rejections from dropzone
  useEffect(() => {
    if (pdfFileRejections && pdfFileRejections.length > 0) {
      pdfFileRejections.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-invalid-type') {
            // If dropzone rejected due to MIME type, but file has .pdf extension, still try to accept it
            if (file.name.toLowerCase().endsWith('.pdf')) {
              // Call onPdfDrop directly with the file
              const validFiles = [file]
              const existingCount = (formData.existingDocuments || []).length
              const newFilesCount = (formData.pdfFiles || []).length
              const currentTotal = existingCount + newFilesCount
              
              if (currentTotal + validFiles.length >= 5) {
                toast.error('Maximum 5 PDF files allowed')
                return
              }
              
              const isDuplicate = (formData.pdfFiles || []).some(f => f.name === file.name && f.size === file.size)
              if (!isDuplicate) {
                setField({ pdfFiles: [...(formData.pdfFiles || []), ...validFiles] })
                toast.success(`${validFiles.length} PDF file(s) added`)
              }
            } else {
              toast.error(`"${file.name}" is not a PDF file`)
            }
          } else {
            toast.error(`"${file.name}": ${error.message}`)
          }
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFileRejections])

  // Video dropzone - accept all files, validate in onDrop
  const { 
    getRootProps: getVideoRootProps, 
    getInputProps: getVideoInputProps, 
    isDragActive: isVideoDragActive,
    fileRejections: videoFileRejections,
    open: openVideoDropzone
  } = useDropzone({
    onDrop: onVideoDrop,
    // Accept common video types - we'll validate by extension in onDrop
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg', '.3gp'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/webm': ['.webm']
    },
    maxFiles: 5,
    multiple: true,
    disabled: isSaving,
    noClick: false, // Allow dropzone clicks, but we'll also provide a button
    noKeyboard: false
  })
  
  // Get input props from dropzone (for drag-and-drop)
  const pdfInputProps = getPdfInputProps()
  const videoInputProps = getVideoInputProps()
  
  // Handlers for separate file inputs (for "click to browse" buttons)
  const handlePdfInputChange = useCallback((e) => {
    // Don't prevent default - let the event propagate normally
    e.stopPropagation()
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onPdfDrop(files)
      // Reset input AFTER a delay to ensure onChange completes
      setTimeout(() => {
        if (pdfInputRef.current) {
          pdfInputRef.current.value = ''
        }
      }, 100)
    } else {
    }
  }, [formData, onPdfDrop])

  // Set up direct event listener on PDF input ref as fallback
  useEffect(() => {
    const pdfInput = pdfInputRef.current
    
    if (pdfInput) {
      const handleChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handlePdfInputChange(e)
        }
      }
      
      // Add multiple event listeners to catch the event
      pdfInput.addEventListener('change', handleChange, { capture: true })
      pdfInput.addEventListener('change', handleChange, { capture: false })
      pdfInput.addEventListener('input', handleChange, { capture: true })
      
      // Also check if files are set after a delay (in case event fires but we miss it)
      let checkCount = 0
      const maxChecks = 50 // Check for 5 seconds (50 * 100ms)
      const checkFiles = setInterval(() => {
        checkCount++
        const hasFiles = pdfInput.files && pdfInput.files.length > 0
        const inputValue = pdfInput.value
        if (hasFiles) {
          clearInterval(checkFiles)
          const syntheticEvent = { 
            target: pdfInput, 
            preventDefault: () => {}, 
            stopPropagation: () => {},
            currentTarget: pdfInput
          }
          handlePdfInputChange(syntheticEvent)
        } else if (checkCount >= maxChecks) {
          clearInterval(checkFiles)
        }
      }, 100)
      return () => {
        pdfInput.removeEventListener('change', handleChange, { capture: true })
        pdfInput.removeEventListener('change', handleChange, { capture: false })
        pdfInput.removeEventListener('input', handleChange, { capture: true })
        clearInterval(checkFiles)
      }
    }
  }, [handlePdfInputChange])
  
  // Separate useEffect to monitor PDF dropzone input after it's rendered
  useEffect(() => {
    // Use a small delay to ensure the dropzone input is rendered
    const checkDropzoneInput = setInterval(() => {
      const pdfDropzoneInput = pdfDropzoneInputRef.current
      if (pdfDropzoneInput) {
        clearInterval(checkDropzoneInput)
        
        // Set up event listener for the dropzone input
        const handleChange = (e) => {
          if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)
            try {
              onPdfDrop(files)
              setTimeout(() => {
                if (pdfDropzoneInputRef.current) {
                  pdfDropzoneInputRef.current.value = ''
                }
              }, 100)
            } catch (error) {
            }
          }
        }
        
        pdfDropzoneInput.addEventListener('change', handleChange, { capture: true })
        pdfDropzoneInput.addEventListener('change', handleChange, { capture: false })
        
        // Also poll the dropzone input for files (in case onChange doesn't fire)
        let dropzoneCheckCount = 0
        const maxDropzoneChecks = 50
        let lastDropzoneValue = pdfDropzoneInput.value
        const checkDropzoneFiles = setInterval(() => {
          dropzoneCheckCount++
          const hasFiles = pdfDropzoneInput.files && pdfDropzoneInput.files.length > 0
          const currentValue = pdfDropzoneInput.value
          const valueChanged = currentValue !== lastDropzoneValue
          
          if (dropzoneCheckCount <= 5 || valueChanged || hasFiles) {
          }
          
          if (valueChanged) {
            lastDropzoneValue = currentValue
          }
          
          if (hasFiles) {
            clearInterval(checkDropzoneFiles)
            const files = Array.from(pdfDropzoneInput.files)
            try {
              onPdfDrop(files)
              setTimeout(() => {
                if (pdfDropzoneInputRef.current) {
                  pdfDropzoneInputRef.current.value = ''
                }
              }, 100)
            } catch (error) {
            }
          } else if (dropzoneCheckCount >= maxDropzoneChecks) {
            clearInterval(checkDropzoneFiles)
          }
        }, 100)
        return () => {
          pdfDropzoneInput.removeEventListener('change', handleChange, { capture: true })
          pdfDropzoneInput.removeEventListener('change', handleChange, { capture: false })
          clearInterval(checkDropzoneFiles)
        }
      }
    }, 100)
    
    return () => {
      clearInterval(checkDropzoneInput)
    }
  }, [onPdfDrop])
  
  const handleVideoInputChange = useCallback((e) => {
    // Don't prevent default - let the event propagate normally
    e.stopPropagation()
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      onVideoDrop(files)
      // Reset input AFTER a delay to ensure onChange completes
      setTimeout(() => {
        if (videoInputRef.current) {
          videoInputRef.current.value = ''
        }
      }, 100)
    } else {
    }
  }, [formData, onVideoDrop])

  // Set up direct event listener on video input ref as fallback (after handler is defined)
  useEffect(() => {
    const videoInput = videoInputRef.current
    
    if (videoInput && handleVideoInputChange) {
      const handleChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleVideoInputChange(e)
        }
      }
      
      // Add multiple event listeners to catch the event
      videoInput.addEventListener('change', handleChange, { capture: true })
      videoInput.addEventListener('change', handleChange, { capture: false })
      videoInput.addEventListener('input', handleChange, { capture: true })
      
      // Also check if files are set after a delay (in case event fires but we miss it)
      let checkCount = 0
      const maxChecks = 50 // Check for 5 seconds (50 * 100ms)
      let lastInputValue = videoInput.value
      const checkFiles = setInterval(() => {
        checkCount++
        const hasFiles = videoInput.files && videoInput.files.length > 0
        const currentInputValue = videoInput.value
        const valueChanged = currentInputValue !== lastInputValue
        
        if (checkCount <= 5 || valueChanged || hasFiles) {
        }
        
        if (valueChanged) {
          lastInputValue = currentInputValue
        }
        
        if (hasFiles && !processingVideoRef.current) {
          processingVideoRef.current = true
          clearInterval(checkFiles)
          const syntheticEvent = { 
            target: videoInput, 
            preventDefault: () => {}, 
            stopPropagation: () => {},
            currentTarget: videoInput
          }
          try {
            handleVideoInputChange(syntheticEvent)
            // Reset processing flag after a delay
            setTimeout(() => {
              processingVideoRef.current = false
            }, 1000)
          } catch (error) {
            processingVideoRef.current = false
          }
        } else if (checkCount >= maxChecks) {
          clearInterval(checkFiles)
        }
      }, 100)
      return () => {
        videoInput.removeEventListener('change', handleChange, { capture: true })
        videoInput.removeEventListener('change', handleChange, { capture: false })
        videoInput.removeEventListener('input', handleChange, { capture: true })
        clearInterval(checkFiles)
      }
    }
    
    // Also set up listener for the dropzone input (used by dropzone's open() function)
    const videoDropzoneInput = videoDropzoneInputRef.current
    if (videoDropzoneInput) {
      const handleDropzoneChange = (e) => {
        // Process files directly if detected
        if (e.target.files && e.target.files.length > 0 && !processingVideoRef.current) {
          processingVideoRef.current = true
          const files = Array.from(e.target.files)
          try {
            onVideoDrop(files)
            // Reset input after processing
            setTimeout(() => {
              if (videoDropzoneInputRef.current) {
                videoDropzoneInputRef.current.value = ''
              }
              processingVideoRef.current = false
            }, 100)
          } catch (error) {
            processingVideoRef.current = false
          }
        }
      }
      
      videoDropzoneInput.addEventListener('change', handleDropzoneChange, { capture: true })
      videoDropzoneInput.addEventListener('change', handleDropzoneChange, { capture: false })
      videoDropzoneInput.addEventListener('input', handleDropzoneChange, { capture: true })
      
      // Also poll the dropzone input for files (in case onChange doesn't fire)
      let dropzoneCheckCount = 0
      const maxDropzoneChecks = 50
      let lastDropzoneValue = videoDropzoneInput.value
      const checkDropzoneFiles = setInterval(() => {
        dropzoneCheckCount++
        const hasFiles = videoDropzoneInput.files && videoDropzoneInput.files.length > 0
        const currentValue = videoDropzoneInput.value
        const valueChanged = currentValue !== lastDropzoneValue
        
        if (dropzoneCheckCount <= 5 || valueChanged || hasFiles) {
        }
        
        if (valueChanged) {
          lastDropzoneValue = currentValue
        }
        
        if (hasFiles && !processingVideoRef.current) {
          processingVideoRef.current = true
          clearInterval(checkDropzoneFiles)
          const files = Array.from(videoDropzoneInput.files)
          try {
            onVideoDrop(files)
            setTimeout(() => {
              if (videoDropzoneInputRef.current) {
                videoDropzoneInputRef.current.value = ''
              }
              processingVideoRef.current = false
            }, 100)
          } catch (error) {
            processingVideoRef.current = false
          }
        } else if (dropzoneCheckCount >= maxDropzoneChecks) {
          clearInterval(checkDropzoneFiles)
        }
      }, 100)
      return () => {
        videoDropzoneInput.removeEventListener('change', handleDropzoneChange, { capture: true })
        videoDropzoneInput.removeEventListener('change', handleDropzoneChange, { capture: false })
        videoDropzoneInput.removeEventListener('input', handleDropzoneChange, { capture: true })
        clearInterval(checkDropzoneFiles)
      }
    }
  }, [handleVideoInputChange, onVideoDrop])
  
  // Separate useEffect to monitor dropzone input after it's rendered
  useEffect(() => {
    // Use a small delay to ensure the dropzone input is rendered
    const checkDropzoneInput = setInterval(() => {
      const videoDropzoneInput = videoDropzoneInputRef.current
      if (videoDropzoneInput) {
        clearInterval(checkDropzoneInput)
        
        // Set up a one-time polling check when dialog might be opened
        // This will be triggered by the openVideoDialog function
        const monitorDropzoneFiles = () => {
          let checkCount = 0
          const maxChecks = 50
          let lastValue = videoDropzoneInput.value
          const pollInterval = setInterval(() => {
            checkCount++
            const hasFiles = videoDropzoneInput.files && videoDropzoneInput.files.length > 0
            const currentValue = videoDropzoneInput.value
            const valueChanged = currentValue !== lastValue
            
            if (checkCount <= 5 || valueChanged || hasFiles) {
            }
            
            if (valueChanged) {
              lastValue = currentValue
            }
            
            if (hasFiles && !processingVideoRef.current) {
              processingVideoRef.current = true
              clearInterval(pollInterval)
              const files = Array.from(videoDropzoneInput.files)
              try {
                onVideoDrop(files)
                setTimeout(() => {
                  if (videoDropzoneInputRef.current) {
                    videoDropzoneInputRef.current.value = ''
                  }
                  processingVideoRef.current = false
                }, 100)
              } catch (error) {
                processingVideoRef.current = false
              }
            } else if (checkCount >= maxChecks) {
              clearInterval(pollInterval)
            }
          }, 100)
          
          // Clear polling after 5 seconds
          setTimeout(() => {
            clearInterval(pollInterval)
          }, 5000)
        }
        
        // Store the monitor function so openVideoDialog can trigger it
        // For now, we'll just set up the event listener
        const handleChange = (e) => {
          if (e.target.files && e.target.files.length > 0 && !processingVideoRef.current) {
            processingVideoRef.current = true
            const files = Array.from(e.target.files)
            try {
              onVideoDrop(files)
              setTimeout(() => {
                if (videoDropzoneInputRef.current) {
                  videoDropzoneInputRef.current.value = ''
                }
                processingVideoRef.current = false
              }, 100)
            } catch (error) {
              processingVideoRef.current = false
            }
          }
        }
        
        videoDropzoneInput.addEventListener('change', handleChange, { capture: true })
        videoDropzoneInput.addEventListener('change', handleChange, { capture: false })
        
        // Start monitoring when dialog is opened (triggered by user interaction)
        // We'll rely on the existing polling in the main useEffect
      }
    }, 100)
    
    return () => {
      clearInterval(checkDropzoneInput)
    }
  }, [onVideoDrop])
  
  // Handle video file rejections from dropzone
  useEffect(() => {
    if (videoFileRejections && videoFileRejections.length > 0) {
      videoFileRejections.forEach(({ file, errors }) => {
        errors.forEach(error => {
          if (error.code === 'file-invalid-type') {
            // If dropzone rejected due to MIME type, but file has video extension, still try to accept it
            const fileName = file.name.toLowerCase()
            const isVideoExtension = /\.(mp4|mov|avi|webm|mkv|flv|wmv|m4v|mpg|mpeg|3gp)$/i.test(fileName)
            if (isVideoExtension) {
              // Manually process the video file
              onChange(prevFormData => {
                const maxSize = 50 * 1024 * 1024 // 50MB limit
                const existingCount = (prevFormData.existingVideos || []).length
                const newFilesCount = (prevFormData.videos || []).length
                const currentTotal = existingCount + newFilesCount
                
                if (file.size > maxSize) {
                  const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
                  toast.error(`"${file.name}" is ${fileSizeMB}MB. Maximum file size is 50MB per video.`)
                  return prevFormData
                }
                
                const isDuplicate = (prevFormData.videos || []).some(f => f.name === file.name && f.size === file.size)
                if (isDuplicate) {
                  toast.error(`"${file.name}" is already selected`)
                  return prevFormData
                }
                
                if (currentTotal >= 5) {
                  toast.error('Maximum 5 video files allowed')
                  return prevFormData
                }
                
                toast.success(`1 video file(s) added`)
                return {
                  ...prevFormData,
                  videos: [...(prevFormData.videos || []), file]
                }
              })
            } else {
              toast.error(`"${file.name}" is not a video file`)
            }
          } else {
            toast.error(`"${file.name}": ${error.message}`)
          }
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFileRejections])

  // Remove newly selected PDF
  const removePdfFile = (index) => {
    const newPdfFiles = (formData.pdfFiles || []).filter((_, i) => i !== index)
    setField({ pdfFiles: newPdfFiles })
  }

  // Remove newly selected video
  const removeVideoFile = (index) => {
    const newVideos = (formData.videos || []).filter((_, i) => i !== index)
    setField({ videos: newVideos })
  }

  // Mark existing document for removal
  const markDocumentForRemoval = (index) => {
    const toRemove = new Set(formData.documentsToRemove || [])
    if (toRemove.has(index)) {
      toRemove.delete(index)
    } else {
      toRemove.add(index)
    }
    setField({ documentsToRemove: Array.from(toRemove) })
  }

  // Mark existing video for removal
  const markVideoForRemoval = (index) => {
    const toRemove = new Set(formData.videosToRemove || [])
    if (toRemove.has(index)) {
      toRemove.delete(index)
    } else {
      toRemove.add(index)
    }
    setField({ videosToRemove: Array.from(toRemove) })
  }

  // Check if upgrade tab should be shown
  const hasUpgrades = getAvailableUpgrades && getAvailableUpgrades(campaignType).length > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="card-glass rounded-lg shadow-dark-large max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col border border-slate-600/30">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-600/30 flex items-center justify-between flex-shrink-0">
          <h3 className="text-base sm:text-lg font-semibold text-slate-100">Edit Campaign: {project?.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        {hasUpgrades && (
          <div className="flex border-b border-slate-600/30 flex-shrink-0">
            <button
              onClick={() => setActiveTab('edit')}
              disabled={isSaving}
              className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'edit'
                  ? 'bg-neon-purple/20 text-neon-purple border-b-2 border-neon-purple'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Campaign</span>
              <span className="sm:hidden">Edit</span>
            </button>
            <button
              onClick={() => setActiveTab('upgrade')}
              disabled={isSaving}
              className={`flex-1 sm:flex-initial px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'upgrade'
                  ? 'bg-neon-purple/20 text-neon-purple border-b-2 border-neon-purple'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Upgrade Campaign</span>
              <span className="sm:hidden">Upgrade</span>
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 sm:py-6 space-y-6">
            {/* Edit Tab Content */}
            {activeTab === 'edit' && (
              <>
                {/* Contact + Social links (selection UI like upload) */}
                {campaignType === 'qr-link' ? (
                  <div className="card border-neon-purple/30 bg-gradient-to-br from-neon-purple/10 to-neon-pink/10">
                    <div className="card-header">
                      <h4 className="text-sm font-semibold text-slate-100 flex items-center">
                        <Sparkles className="w-4 h-4 mr-2 text-neon-purple" />
                        Upgrade Required
                      </h4>
                      <p className="text-xs text-slate-300">
                        Social links are only available in upgraded campaigns. Upgrade your campaign to add social media links.
                      </p>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          onClose(); // Close edit modal
                          if (onUpgradeRequest) {
                            onUpgradeRequest(project, 'qr-links'); // Suggest minimal upgrade
                          }
                        }}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-semibold text-slate-100 bg-gradient-to-r from-neon-purple/80 to-neon-pink/80 hover:from-neon-purple hover:to-neon-pink rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Upgrade to Multiple Links QR
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <SocialLinksInput
                      value={formData.socialLinks || {}}
                      onChange={(val) => setField({ socialLinks: val })}
                      showSelection={true}
                    />
                  </div>
                )}

                {/* Links editor */}
                {showLinks && (
                  <div className="card">
                    <div className="card-header">
                      <h4 className="text-sm font-semibold text-slate-100 flex items-center">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Links
                      </h4>
                      <p className="text-xs text-slate-300">Add / remove links shown on the landing page</p>
                    </div>

                    <div className="space-y-3">
                      {(formData.links || []).map((l, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-2">
                          <input
                            className="input flex-1"
                            placeholder="Label"
                            value={l.label || ''}
                            onChange={(e) => updateLink(idx, { label: e.target.value })}
                            disabled={isSaving}
                          />
                          <input
                            className="input flex-1 sm:flex-[2]"
                            placeholder="https://..."
                            value={l.url || ''}
                            onChange={(e) => updateLink(idx, { url: e.target.value })}
                            disabled={isSaving}
                          />
                          <button
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex-shrink-0 w-full sm:w-auto justify-center sm:justify-start touch-manipulation"
                            onClick={() => removeLink(idx)}
                            disabled={isSaving}
                          >
                            <X className="w-4 h-4 text-slate-200 mx-auto sm:mx-0" />
                          </button>
                        </div>
                      ))}

                      <button className="btn-secondary w-full sm:w-auto" onClick={addLink} disabled={isSaving}>
                        Add Link
                      </button>
                    </div>
                  </div>
                )}

                {/* File controls */}
                {(showVideo || showPdf || showDocument) && (
                  <div className="card">
                    <div className="card-header">
                      <h4 className="text-sm font-semibold text-slate-100">Files</h4>
                      <p className="text-xs text-slate-300">Add additional files or remove existing ones. Maximum 5 files per type.</p>
                    </div>

                    <div className="space-y-6">
                      {/* PDF Upload Section (for qr-links-pdf-video) */}
                      {showPdf && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-200 flex items-center">
                              <FileText className="w-4 h-4 mr-2 text-neon-orange" />
                              PDF Documents
                              {(() => {
                                const existingCount = (formData.existingDocuments || []).length
                                const newCount = (formData.pdfFiles || []).length
                                const total = existingCount + newCount - (formData.documentsToRemove?.length || 0)
                                return <span className="text-slate-400 ml-2">({total}/5)</span>
                              })()}
                            </label>
                          </div>

                          {/* Existing PDFs */}
                          {(formData.existingDocuments || []).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-slate-400 font-medium">Existing Documents:</p>
                              {(formData.existingDocuments || []).map((doc, index) => {
                                const isMarkedForRemoval = (formData.documentsToRemove || []).includes(index)
                                return (
                                  <div key={index} className={`p-3 bg-slate-800/50 rounded-lg border ${isMarkedForRemoval ? 'border-red-600/50 opacity-60' : 'border-slate-600/30'}`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center flex-1 min-w-0">
                                        <FileText className="w-4 h-4 mr-2 text-neon-orange flex-shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-slate-100 text-sm truncate">{doc.filename || doc.originalName || 'PDF Document'}</p>
                                          {doc.size && <p className="text-xs text-slate-400">{formatFileSize(doc.size)}</p>}
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => markDocumentForRemoval(index)}
                                        disabled={isSaving}
                                        className={`px-2 py-1 text-xs rounded ${isMarkedForRemoval ? 'bg-red-600/20 text-red-400' : 'bg-slate-700/50 text-slate-300 hover:bg-red-600/20 hover:text-red-400'} transition-colors`}
                                      >
                                        {isMarkedForRemoval ? 'Undo' : 'Remove'}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* New PDFs */}
                          {(formData.pdfFiles || []).length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-slate-400 font-medium">New Documents to Upload:</p>
                              {(formData.pdfFiles || []).map((file, index) => (
                                <div key={index} className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center flex-1 min-w-0">
                                      <FileText className="w-4 h-4 mr-2 text-neon-orange flex-shrink-0" />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-slate-100 text-sm truncate">{file.name}</p>
                                        <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => removePdfFile(index)}
                                      disabled={isSaving}
                                      className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                                    >
                                      <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* PDF Dropzone */}
                          <div
                            {...getPdfRootProps({
                        onClick: (e) => {
                          // Prevent form submission if inside a form
                          if (e.target.closest('form')) {
                            e.preventDefault()
                          }
                          // If clicking directly on the container (not on a button), ensure the input gets the click
                          if (e.target === e.currentTarget || !e.target.closest('button')) {
                            // The dropzone input should handle this via getRootProps, but we ensure it's accessible
                            if (pdfDropzoneInputRef.current && !isSaving) {
                              // Let the dropzone handle it naturally, but ensure input is ready
                            }
                          }
                        }
                      })}
                            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors relative ${
                              isPdfDragActive
                                ? 'border-neon-blue bg-neon-blue/10 cursor-copy'
                                : 'border-slate-600/50 hover:border-slate-500/50 bg-slate-800/30 cursor-pointer'
                            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{ position: 'relative' }}
                          >
                            {/* Dropzone input (for drag-and-drop and clicks) */}
                            <input 
                              {...pdfInputProps} 
                              ref={pdfDropzoneInputRef}
                              style={{ 
                                position: 'absolute', 
                                opacity: 0, 
                                width: '100%', 
                                height: '100%', 
                                top: 0,
                                left: 0,
                                pointerEvents: 'auto',
                                zIndex: 1,
                                cursor: 'pointer'
                              }}
                              onChange={(e) => {
                                // Process files directly - the dropzone's onDrop might not fire for programmatic clicks
                                if (e.target.files && e.target.files.length > 0) {
                                  const files = Array.from(e.target.files)
                                  onPdfDrop(files)
                                  // Reset input after processing
                                  setTimeout(() => {
                                    if (pdfDropzoneInputRef.current) {
                                      pdfDropzoneInputRef.current.value = ''
                                    }
                                  }, 100)
                                }
                                // Also call the dropzone's onChange handler for compatibility
                                if (pdfInputProps.onChange) {
                                  pdfInputProps.onChange(e)
                                }
                              }}
                            />
                            {/* Separate input for "click to browse" button (fallback) */}
                            <input
                              ref={pdfInputRef}
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,text/plain"
                              multiple
                              onChange={(e) => {
                                handlePdfInputChange(e)
                              }}
                              onClick={(e) => {
                                // Prevent any form submission
                                e.stopPropagation()
                              }}
                              onFocus={(e) => {
                              }}
                              form="" // Prevent association with any form
                              style={{ 
                                position: 'absolute', 
                                opacity: 0, 
                                width: '1px', 
                                height: '1px', 
                                pointerEvents: 'auto', // Allow pointer events for file selection
                                zIndex: -1,
                                overflow: 'hidden'
                              }}
                              disabled={isSaving}
                            />
                            <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p className="text-sm text-slate-300">
                              {isPdfDragActive ? 'Drop PDF files here' : 'Drag & drop PDF files or click to browse'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">Maximum 5 PDF files ({(formData.existingDocuments || []).length + (formData.pdfFiles || []).length}/5)</p>
                            {!isSaving && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  openPdfDialog()
                                }}
                                className="mt-2 text-xs text-neon-blue hover:text-neon-purple underline cursor-pointer touch-manipulation"
                              >
                                Or click here to select files
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                    {/* Video Upload Section */}
                    {showVideo && (
                      <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-200 flex items-center">
                        <Video className="w-4 h-4 mr-2 text-neon-blue" />
                        Videos
                        {(() => {
                          const existingCount = (formData.existingVideos || []).length
                          const newCount = (formData.videos || []).length
                          const total = existingCount + newCount - (formData.videosToRemove?.length || 0)
                          return <span className="text-slate-400 ml-2">({total}/5)</span>
                        })()}
                      </label>
                    </div>

                    {/* Existing Videos */}
                    {(formData.existingVideos || []).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 font-medium">Existing Videos:</p>
                        {(formData.existingVideos || []).map((video, index) => {
                          const isMarkedForRemoval = (formData.videosToRemove || []).includes(index)
                          return (
                            <div key={index} className={`p-3 bg-slate-800/50 rounded-lg border ${isMarkedForRemoval ? 'border-red-600/50 opacity-60' : 'border-slate-600/30'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1 min-w-0">
                                  <Video className="w-4 h-4 mr-2 text-neon-blue flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-slate-100 text-sm truncate">{video.filename || video.originalName || 'Video'}</p>
                                    {video.size && <p className="text-xs text-slate-400">{formatFileSize(video.size)}</p>}
                                  </div>
                                </div>
                                <button
                                  onClick={() => markVideoForRemoval(index)}
                      disabled={isSaving}
                                  className={`px-2 py-1 text-xs rounded ${isMarkedForRemoval ? 'bg-red-600/20 text-red-400' : 'bg-slate-700/50 text-slate-300 hover:bg-red-600/20 hover:text-red-400'} transition-colors`}
                                >
                                  {isMarkedForRemoval ? 'Undo' : 'Remove'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                  </div>
                )}

                    {/* New Videos */}
                    {(formData.videos || []).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400 font-medium">New Videos to Upload:</p>
                        {(formData.videos || []).map((file, index) => (
                          <div key={index} className="p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center flex-1 min-w-0">
                                <Video className="w-4 h-4 mr-2 text-neon-blue flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-slate-100 text-sm truncate">{file.name}</p>
                                  <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeVideoFile(index)}
                                disabled={isSaving}
                                className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                              >
                                <X className="w-4 h-4 text-slate-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Video Dropzone */}
                    <div
                      {...getVideoRootProps({
                        onClick: (e) => {
                          // Prevent form submission if inside a form
                          if (e.target.closest('form')) {
                            e.preventDefault()
                          }
                          // If clicking directly on the container (not on a button), ensure the input gets the click
                          if (e.target === e.currentTarget || !e.target.closest('button')) {
                            // The dropzone input should handle this via getRootProps, but we ensure it's accessible
                            if (videoDropzoneInputRef.current && !isSaving) {
                              // Let the dropzone handle it naturally, but ensure input is ready
                            }
                          }
                        }
                      })}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors relative ${
                        isVideoDragActive
                          ? 'border-neon-blue bg-neon-blue/10 cursor-copy'
                          : 'border-slate-600/50 hover:border-slate-500/50 bg-slate-800/30 cursor-pointer'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{ position: 'relative' }}
                    >
                      {/* Dropzone input (for drag-and-drop and clicks) */}
                      <input 
                        {...videoInputProps} 
                        ref={videoDropzoneInputRef}
                        style={{ 
                          position: 'absolute', 
                          opacity: 0, 
                          width: '100%', 
                          height: '100%', 
                          top: 0,
                          left: 0,
                          pointerEvents: 'auto',
                          zIndex: 1,
                          cursor: 'pointer'
                        }}
                        onChange={(e) => {
                          // Process files directly - the dropzone's onDrop might not fire for programmatic clicks
                          if (e.target.files && e.target.files.length > 0) {
                            const files = Array.from(e.target.files)
                            onVideoDrop(files)
                            // Reset input after processing
                            setTimeout(() => {
                              if (videoDropzoneInputRef.current) {
                                videoDropzoneInputRef.current.value = ''
                              }
                            }, 100)
                          }
                          // Also call the dropzone's onChange handler for compatibility
                          if (videoInputProps.onChange) {
                            videoInputProps.onChange(e)
                          }
                        }}
                      />
                      {/* Separate input for "click to browse" button (fallback) */}
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept=".mp4,.mov,.avi,.webm,.mkv,.flv,.wmv,.m4v,.mpg,.mpeg,.3gp,video/*"
                        multiple
                        onChange={(e) => {
                          handleVideoInputChange(e)
                        }}
                        onClick={(e) => {
                          // Prevent any form submission
                          e.stopPropagation()
                        }}
                        onFocus={(e) => {
                        }}
                        form="" // Prevent association with any form
                        style={{ 
                          position: 'absolute', 
                          opacity: 0, 
                          width: '1px', 
                          height: '1px', 
                          pointerEvents: 'auto', // Allow pointer events for file selection
                          zIndex: -1,
                          overflow: 'hidden'
                        }}
                        disabled={isSaving}
                      />
                      <Video className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-sm text-slate-300">
                        {isVideoDragActive ? 'Drop video files here' : 'Drag & drop video files or click to browse'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Maximum 5 videos, 50MB each ({(formData.existingVideos || []).length + (formData.videos || []).length}/5)</p>
                      {!isSaving && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openVideoDialog()
                          }}
                          className="mt-2 text-xs text-neon-blue hover:text-neon-purple underline cursor-pointer touch-manipulation"
                        >
                          Or click here to select files
                        </button>
                      )}
                      </div>
                    </div>
                  )}

                  {/* Document Upload Section (for qr-links-video - single document, backward compatibility) */}
                  {showDocument && !showVideo && (
                    <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-200">Document (PDF/DOC/DOCX)</p>
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!formData.removeDocument}
                          onChange={(e) => setField({ removeDocument: e.target.checked })}
                          disabled={isSaving}
                        />
                        Remove existing document
                      </label>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null
                        setField({ document: selectedFile })
                      }}
                      disabled={isSaving}
                      className="input w-full"
                    />
                    {formData.document && (
                      <p className="text-xs text-slate-400">
                        Selected: {formData.document.name}
                      </p>
                    )}
                    </div>
                  )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Upgrade Tab Content */}
            {activeTab === 'upgrade' && (
              <div className="card">
                <div className="card-header">
                  <h4 className="text-sm font-semibold text-slate-100 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-neon-purple" />
                    Upgrade Campaign
                  </h4>
                  <p className="text-xs text-slate-300">
                    Upgrade your campaign to unlock new features and capabilities.
                  </p>
                </div>
                <div className="mt-4">
                  {getAvailableUpgrades && getAvailableUpgrades(campaignType).length > 0 ? (
                    <div className="space-y-3">
                      {getAvailableUpgrades(campaignType).map((upgradeType) => (
                        <button
                          key={upgradeType}
                          onClick={() => {
                            if (onUpgradeRequest) {
                              onUpgradeRequest(project, upgradeType)
                            }
                          }}
                          disabled={isSaving}
                          className="w-full px-4 py-3 text-sm font-semibold text-slate-100 bg-gradient-to-r from-neon-purple/80 to-neon-pink/80 hover:from-neon-purple hover:to-neon-pink rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                        >
                          Upgrade to {getCampaignTypeDisplayName(upgradeType)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No upgrades available for this campaign type.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions - Always visible */}
        <div className="px-4 py-3 sm:py-4 border-t border-slate-600/30 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
          <button 
            onClick={onClose} 
            disabled={isSaving} 
            className="px-4 py-2.5 text-sm sm:text-base font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            Cancel
          </button>
          <button 
            onClick={onSave} 
            disabled={isSaving} 
            className="px-4 py-2.5 text-sm sm:text-base font-medium text-slate-900 bg-neon-blue rounded-lg hover:bg-blue-400 transition-colors flex items-center justify-center shadow-glow-blue disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectsPage

