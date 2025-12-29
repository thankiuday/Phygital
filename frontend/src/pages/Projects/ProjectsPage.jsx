/**
 * Campaigns Page Component
 * Comprehensive campaign management interface
 * Combines campaign list, QR code generation, video updates, and deletion
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSearchParams, useLocation } from 'react-router-dom'
import { uploadAPI, generateQRCode, downloadFile, api, phygitalizedAPI } from '../../utils/api'
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
  Plus
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'

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
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [editFormData, setEditFormData] = useState({
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

  // Handle country code change
  const handleCountryCodeChange = (field, newCountryCode) => {
    setCountryCodesState(prev => ({ ...prev, [field]: newCountryCode }));
    
    // Revalidate the phone number with new country code
    if (editFormData.socialLinks[field]) {
      const validation = validatePhone(editFormData.socialLinks[field], newCountryCode);
      setPhoneErrors(prev => ({ ...prev, [field]: validation.error }));
    }
  };

  // Handle edit project - moved here to avoid hoisting issues
  const handleEditProject = useCallback((project) => {
    console.log('🔧 handleEditProject called with:', project)
    setEditingProject(project)

    // Initialize form data with current project data
    const userProject = user?.projects?.find(p => p.id === project.id)
    console.log('🔧 Found user project:', userProject)

    // ✅ Phygitalized campaigns: use phygitalizedData instead of legacy project.socialLinks/video
    if (userProject?.campaignType?.startsWith('qr-') || project?.campaignType?.startsWith('qr-')) {
      setEditFormData({
        // replacement files
        video: null,
        pdf: null,
        document: null,
        removeVideo: false,
        removePdf: false,
        removeDocument: false,
        // editable data
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

    console.log('🔧 Setting showEditModal to true')
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

  // Helper function to generate landing page URL for phygitalized campaigns
  const getLandingPageUrl = (project) => {
    const baseUrl = window.location.origin
    const projectId = project?.id

    if (!projectId) return null

    // Check campaign type and generate appropriate landing page URL
    const campaignType = project?.campaignType

    // Debug logging to help diagnose URL generation issues
    console.log('🔗 Generating landing page URL:', {
      projectId,
      campaignType,
      projectName: project?.name,
      hasPhygitalizedData: !!project?.phygitalizedData,
      phygitalizedDataKeys: project?.phygitalizedData ? Object.keys(project.phygitalizedData) : []
    })

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
          console.warn('Cannot generate AR experience URL: userId not found')
          return null
        }
        const arUrl = `${baseUrl}/#/ar/user/${userId}/project/${projectId}`
        console.log('✅ Generated AR experience URL:', arUrl)
        return arUrl
      
      default:
        // Check if it's a QR Links AR Video campaign by checking phygitalizedData structure
        // This handles cases where campaignType might not be set correctly
        if (project?.phygitalizedData?.videoUrl && project?.phygitalizedData?.compositeDesignUrl) {
          // Likely a QR Links AR Video campaign - check if it has AR-specific data
          const userId = user?._id || user?.id
          if (userId) {
            console.warn('⚠️ campaignType not set, but detected QR Links AR Video campaign by data structure')
            const arUrl = `${baseUrl}/#/ar/user/${userId}/project/${projectId}`
            console.log('✅ Generated AR experience URL (fallback):', arUrl)
            return arUrl
          }
        }
        // For legacy campaigns, use personalized URL
        console.log('📄 Using personalized URL (fallback):', getPersonalizedUrl(project))
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
          hasVideo: !!(userProject?.uploadedFiles?.video?.url),
          videoUrl: userProject?.uploadedFiles?.video?.url,
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

  // Handle auto-edit from URL parameter - use ref to prevent unnecessary re-runs
  const editProcessedRef = useRef(false);
  
  useEffect(() => {
    const editProjectId = searchParams.get('edit') || editParam;
    
    // Only process if we have an edit ID, projects are loaded, and we haven't processed this edit yet
    if (editProjectId && projects.length > 0 && !editProcessedRef.current) {
      console.log('🔍 Processing auto-edit for project ID:', editProjectId);
      
      const projectToEdit = projects.find(p => 
        p.id === editProjectId || 
        p.id === parseInt(editProjectId) || 
        p.id === editProjectId.toString()
      );
      
      if (projectToEdit) {
        console.log('🔍 Opening edit modal for project:', projectToEdit.name);
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

  // Download QR code
  const handleDownloadQR = async (project) => {
    const projectId = project.id
    const qrUrl = qrCodeUrls[projectId]
    
    if (!qrUrl) {
      toast.error('QR code not available')
      return
    }

    try {
      // Create a temporary link to download the data URL
      const link = document.createElement('a')
      link.href = qrUrl
      link.download = `${project.name}-qr-code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('QR code downloaded!')
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

    // ✅ Phygitalized save flow (skip legacy phone validation + upload routes)
    if (editingProject?.campaignType?.startsWith('qr-')) {
      try {
        setIsSaving(true)
        setUploadProgress(0)

        const projectId = editingProject.id
        const campaignType = editingProject.campaignType
        const variation = campaignType

        // Delete removed files first (Cloudinary + DB cleanup)
        if (editFormData.removeVideo) await phygitalizedAPI.deleteCampaignFile(projectId, 'video')
        if (editFormData.removePdf) await phygitalizedAPI.deleteCampaignFile(projectId, 'pdf')
        if (editFormData.removeDocument) await phygitalizedAPI.deleteCampaignFile(projectId, 'document')

        const fileUrlsPayload = {}
        const phygitalizedDataPayload = {
          links: (editFormData.links || []).map(l => ({
            label: l.label || 'Link',
            url: (l.url || '').startsWith('http://') || (l.url || '').startsWith('https://')
              ? l.url
              : `https://${l.url}`
          })),
          socialLinks: editFormData.socialLinks || {}
        }

        // Upload replacements if provided
        if (campaignType === 'qr-links-video') {
          const file = editFormData.video || editFormData.document || editFormData.pdf
          if (file) {
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
            }
          }
        }

        if (campaignType === 'qr-links-pdf-video') {
          if (editFormData.pdf) {
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
            }
          }
          if (editFormData.video) {
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
            }
          }
        }

        if (campaignType === 'qr-links-ar-video') {
          if (editFormData.video) {
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
            }
          }
        }

        // qr-links: just links + socialLinks
        await phygitalizedAPI.updateCampaign(projectId, {
          campaignType,
          phygitalizedData: phygitalizedDataPayload,
          fileUrls: fileUrlsPayload
        })

        toast.success('Campaign updated successfully!')
        setShowEditModal(false)
        setEditingProject(null)
        await loadUser()
        await loadProjects()
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
      
      console.log('Toggle response:', response.data)
      
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
      
      console.log('Toggle target image response:', response.data)
      
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

                    {/* View Mode Toggle - Hidden on mobile, visible on desktop */}
                    <div className="hidden sm:flex sm:flex-initial">
                      <div className="flex bg-slate-800/60 rounded-lg p-1 border border-slate-600/40 gap-1">
                        <button
                          onClick={() => setViewMode('list')}
                          className={`px-3.5 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-2 touch-manipulation min-h-[38px] ${
                            viewMode === 'list'
                              ? 'bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-blue text-slate-900 shadow-glow-blue font-semibold scale-105'
                              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/60'
                          }`}
                          title="List view"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`px-3.5 py-2 rounded-md transition-all duration-200 flex items-center justify-center gap-2 touch-manipulation min-h-[38px] ${
                            viewMode === 'grid'
                              ? 'bg-gradient-to-r from-neon-blue via-neon-cyan to-neon-blue text-slate-900 shadow-glow-blue font-semibold scale-105'
                              : 'text-slate-300 hover:text-slate-100 hover:bg-slate-700/60'
                          }`}
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
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6'
              : 'space-y-3 sm:space-y-4'
            }>
              {filteredProjects.map((project, index) => (
                <div 
                  key={project.id}
                  className="animate-fade-in-up"
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
                    formatDate={formatDate}
                    viewMode={viewMode}
                    getLandingPageUrl={getLandingPageUrl}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>



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
  formatDate,
  viewMode,
  getLandingPageUrl
}) => {
  const personalizedUrl = `${window.location.origin}/user/${user?.username}?project=${project.id}`
  const landingPageUrl = getLandingPageUrl ? getLandingPageUrl(project) : null

  return (
    <div className={`group card-glass rounded-xl shadow-dark-large border transition-all duration-300 w-full ${
      viewMode === 'list' 
        ? 'hover:shadow-glow-blue/10' 
        : 'hover:scale-[1.02] hover:shadow-glow-blue/20'
    } ${
      project.isEnabled
        ? 'border-slate-600/30 hover:border-neon-blue/50'
        : 'border-red-600/30 hover:border-red-500/50 opacity-90'
    }`}>
      <div className={`${viewMode === 'list' ? 'p-4 sm:p-5' : 'p-5 sm:p-6'}`}>
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
                    {project.campaignType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

        {/* Action Buttons */}
        <div className={`flex flex-wrap gap-2 ${viewMode === 'list' ? 'mb-4 sm:mb-0 sm:flex-nowrap sm:justify-end' : 'mb-4'}`}>
          {landingPageUrl && (
            <a
              href={landingPageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2.5 bg-gradient-to-r from-neon-purple to-purple-500 text-slate-900 text-sm font-semibold rounded-lg hover:from-purple-400 hover:to-purple-400 transition-all duration-200 flex items-center justify-center shadow-glow-purple hover:scale-105 active:scale-95 ${
                viewMode === 'list' ? 'sm:px-3 sm:py-2' : 'flex-1 sm:flex-initial'
              }`}
              title={project?.campaignType === 'qr-link' ? 'Preview redirect page' : 'View landing page'}
            >
              <Eye className="w-4 h-4 sm:mr-2" />
              <span className={`${viewMode === 'list' ? 'hidden sm:inline' : 'hidden sm:inline'}`}>
                {project?.campaignType === 'qr-link' ? 'Preview' : 'View'}
              </span>
              {viewMode !== 'list' && <span className="sm:hidden">View</span>}
            </a>
          )}
          <button
            onClick={onEdit}
            className={`px-4 py-2.5 bg-gradient-to-r from-neon-cyan to-cyan-500 text-slate-900 text-sm font-semibold rounded-lg hover:from-cyan-400 hover:to-cyan-400 transition-all duration-200 flex items-center justify-center shadow-glow-cyan hover:scale-105 active:scale-95 ${
              viewMode === 'list' ? 'sm:px-3 sm:py-2' : 'flex-1 sm:flex-initial'
            }`}
          >
            <Edit3 className="w-4 h-4 sm:mr-2" />
            <span className={viewMode === 'list' ? 'hidden sm:inline' : ''}>Edit</span>
          </button>
          <button
            onClick={onDownloadComposite}
            disabled={!project.hasCompositeDesign}
            className={`px-4 py-2.5 bg-gradient-to-r from-neon-green to-green-500 text-slate-900 text-sm font-semibold rounded-lg hover:from-green-400 hover:to-green-400 transition-all duration-200 flex items-center justify-center shadow-glow-green disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105 active:scale-95 ${
              viewMode === 'list' ? 'sm:px-3 sm:py-2' : 'flex-1 sm:flex-initial'
            }`}
            title={project.hasCompositeDesign ? 'Download composite design' : 'Composite design not available'}
          >
            <Image className="w-4 h-4 sm:mr-2" />
            <span className={viewMode === 'list' ? 'hidden sm:inline' : 'hidden sm:inline'}>Design</span>
            {viewMode !== 'list' && <span className="sm:hidden">Design</span>}
          </button>
          <button
            onClick={onDelete}
            className={`px-4 py-2.5 bg-gradient-to-r from-neon-red to-red-500 text-slate-900 text-sm font-semibold rounded-lg hover:from-red-400 hover:to-red-400 transition-all duration-200 flex items-center justify-center shadow-glow-red hover:scale-105 active:scale-95 ${
              viewMode === 'list' ? 'sm:px-3 sm:py-2' : 'flex-1 sm:flex-initial'
            }`}
          >
            <Trash2 className="w-4 h-4 sm:mr-2" />
            <span className={viewMode === 'list' ? 'hidden sm:inline' : ''}>Delete</span>
          </button>
        </div>

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
            className="px-4 py-2 text-sm sm:text-base font-medium text-slate-300 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm sm:text-base font-medium text-slate-900 bg-neon-blue rounded-lg hover:bg-blue-400 transition-colors flex items-center justify-center shadow-glow-blue disabled:opacity-50 disabled:cursor-not-allowed"
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
const PhygitalizedEditModal = ({ project, formData, isSaving, onChange, onSave, onClose }) => {
  const campaignType = project?.campaignType || ''

  const setField = (patch) => onChange(prev => ({ ...prev, ...patch }))

  const updateLink = (idx, patch) => {
    const next = [...(formData.links || [])]
    next[idx] = { ...(next[idx] || {}), ...patch }
    setField({ links: next })
  }

  const addLink = () => setField({ links: [...(formData.links || []), { label: '', url: '' }] })
  const removeLink = (idx) => setField({ links: (formData.links || []).filter((_, i) => i !== idx) })

  const showLinks = campaignType === 'qr-links' || campaignType === 'qr-links-video' || campaignType === 'qr-links-pdf-video'
  const showVideo = campaignType === 'qr-links-video' || campaignType === 'qr-links-pdf-video' || campaignType === 'qr-links-ar-video'
  const showPdf = campaignType === 'qr-links-pdf-video'
  const showDocument = campaignType === 'qr-links-video'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="card-glass rounded-lg shadow-dark-large max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-600/30">
        <div className="px-4 py-4 border-b border-slate-600/30 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-100">Edit Campaign: {project?.name}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4 space-y-6">
          {/* Contact + Social links (selection UI like upload) */}
          <div className="card">
            <SocialLinksInput
              value={formData.socialLinks || {}}
              onChange={(val) => setField({ socialLinks: val })}
              showSelection={true}
            />
          </div>

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
                  <div key={idx} className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Label"
                      value={l.label || ''}
                      onChange={(e) => updateLink(idx, { label: e.target.value })}
                      disabled={isSaving}
                    />
                    <input
                      className="input flex-[2]"
                      placeholder="https://..."
                      value={l.url || ''}
                      onChange={(e) => updateLink(idx, { url: e.target.value })}
                      disabled={isSaving}
                    />
                    <button
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
                      onClick={() => removeLink(idx)}
                      disabled={isSaving}
                    >
                      <X className="w-4 h-4 text-slate-200" />
                    </button>
                  </div>
                ))}

                <button className="btn-secondary" onClick={addLink} disabled={isSaving}>
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
                <p className="text-xs text-slate-300">Replace or remove existing assets (old asset will be deleted).</p>
              </div>

              <div className="space-y-4">
                {showVideo && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-200">Video</p>
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!formData.removeVideo}
                          onChange={(e) => setField({ removeVideo: e.target.checked })}
                          disabled={isSaving}
                        />
                        Remove existing video
                      </label>
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => setField({ video: e.target.files?.[0] || null })}
                      disabled={isSaving}
                      className="input w-full"
                    />
                    {formData.video && <p className="text-xs text-slate-400">Selected: {formData.video.name}</p>}
                  </div>
                )}

                {showPdf && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-200">PDF</p>
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={!!formData.removePdf}
                          onChange={(e) => setField({ removePdf: e.target.checked })}
                          disabled={isSaving}
                        />
                        Remove existing PDF
                      </label>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setField({ pdf: e.target.files?.[0] || null })}
                      disabled={isSaving}
                      className="input w-full"
                    />
                    {formData.pdf && <p className="text-xs text-slate-400">Selected: {formData.pdf.name}</p>}
                  </div>
                )}

                {showDocument && (
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
                      onChange={(e) => setField({ document: e.target.files?.[0] || null })}
                      disabled={isSaving}
                      className="input w-full"
                    />
                    {formData.document && <p className="text-xs text-slate-400">Selected: {formData.document.name}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-4 border-t border-slate-600/30 flex justify-end gap-3">
          <button onClick={onClose} disabled={isSaving} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onSave} disabled={isSaving} className="btn-primary flex items-center">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProjectsPage

