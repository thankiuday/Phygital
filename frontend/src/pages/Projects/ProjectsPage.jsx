/**
 * Projects Page Component
 * Comprehensive project management interface
 * Combines project list, QR code generation, video updates, and deletion
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useSearchParams, useLocation } from 'react-router-dom'
import { uploadAPI, generateQRCode, downloadFile, api } from '../../utils/api'
import BackButton from '../../components/UI/BackButton'
import { 
  Video, 
  Calendar,
  Edit3,
  X,
  Upload,
  FolderOpen,
  Trash2,
  QrCode,
  Download,
  Share2,
  Copy,
  CheckCircle,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronUp,
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
  AlertCircle
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
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid'
  const [sortBy, setSortBy] = useState('newest') // 'newest', 'oldest', 'name', 'scans'
  
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // QR Code state
  const [expandedProjectId, setExpandedProjectId] = useState(null)
  const [qrCodeUrls, setQrCodeUrls] = useState({}) // Map of projectId -> qrCodeUrl
  const [loadingQR, setLoadingQR] = useState({}) // Map of projectId -> boolean
  const [copiedUrl, setCopiedUrl] = useState(null)
  
  // Toggle status state
  const [togglingStatus, setTogglingStatus] = useState({}) // Map of projectId -> boolean
  
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

  // Phone number validation function
  const validatePhoneNumber = (value) => {
    if (!value || value.trim() === '') return '';
    
    // Check if it contains only allowed characters: digits, +, -, (, ), and spaces
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter only numbers, +, -, (, ), and spaces';
    }
    
    // Check minimum length (at least 7 digits)
    const digitsOnly = value.replace(/[\s\-\+\(\)]/g, '');
    if (digitsOnly.length < 7) {
      return 'Phone number must have at least 7 digits';
    }
    
    // Check maximum length (at most 15 digits)
    if (digitsOnly.length > 15) {
      return 'Phone number cannot exceed 15 digits';
    }
    
    return '';
  };

  // Filter phone input to only allow valid characters
  const filterPhoneInput = (value) => {
    // Allow only digits, +, -, (, ), and spaces
    return value.replace(/[^\d\s\-\+\(\)]/g, '');
  };

  // Handle edit project - moved here to avoid hoisting issues
  const handleEditProject = useCallback((project) => {
    console.log('🔧 handleEditProject called with:', project)
    setEditingProject(project)

    // Initialize form data with current project data
    const userProject = user?.projects?.find(p => p.id === project.id)
    console.log('🔧 Found user project:', userProject)

    const initialSocialLinks = {
      instagram: userProject?.socialLinks?.instagram || '',
      facebook: userProject?.socialLinks?.facebook || '',
      twitter: userProject?.socialLinks?.twitter || '',
      linkedin: userProject?.socialLinks?.linkedin || '',
      website: userProject?.socialLinks?.website || '',
      contactNumber: userProject?.socialLinks?.contactNumber || '',
      whatsappNumber: userProject?.socialLinks?.whatsappNumber || ''
    }

    setEditFormData({
      video: null, // Will be set when user selects a new video
      socialLinks: initialSocialLinks
    })

    console.log('🔧 Setting showEditModal to true')
    setShowEditModal(true)
  }, [user])

  // Sort projects based on selected criteria
  const getSortedProjects = () => {
    const sorted = [...projects]

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name))
      case 'scans':
        return sorted.sort((a, b) => (b.analytics?.totalScans || 0) - (a.analytics?.totalScans || 0))
      default:
        return sorted
    }
  }

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
      
      const personalizedUrl = `${window.location.origin}/user/${user?.username}?project=${projectId}`
      
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
      
      const link = document.createElement('a')
      link.href = url
      link.download = `${project.name}-composite-design.png`
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
    const personalizedUrl = `${window.location.origin}/user/${user?.username}?project=${project.id}`
    
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
    const personalizedUrl = `${window.location.origin}/user/${user?.username}?project=${project.id}`
    
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
    // Filter phone inputs to only allow valid characters
    if (field === 'contactNumber' || field === 'whatsappNumber') {
      value = filterPhoneInput(value);
      
      // Validate and set error
      const error = validatePhoneNumber(value);
      setPhoneErrors(prev => ({ ...prev, [field]: error }));
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

    // Validate phone numbers before saving
    const contactError = validatePhoneNumber(editFormData.socialLinks.contactNumber);
    const whatsappError = validatePhoneNumber(editFormData.socialLinks.whatsappNumber);
    
    if (contactError || whatsappError) {
      setPhoneErrors({
        contactNumber: contactError,
        whatsappNumber: whatsappError
      });
      toast.error('Please fix the phone number errors before saving');
      return;
    }

    try {
      setIsSaving(true)
      setUploadProgress(0)

      // Update social links first (always update to allow clearing fields)
      let socialLinksUpdated = false

      try {

        const response = await uploadAPI.updateProjectSocialLinks(editingProject.id, editFormData.socialLinks);

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



  // Handle project deletion
  const handleDeleteProject = (project) => {
    setProjectToDelete(project)
    setShowDeleteModal(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      setIsDeleting(true)
      
      const response = await uploadAPI.deleteProject(projectToDelete.id)
      
      if (response.data.success) {
        toast.success('Project deleted successfully! All content has been removed.')
        
        setShowDeleteModal(false)
        setProjectToDelete(null)
        loadProjects()
      } else {
        toast.error('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete project error:', error)
      
      if (error.response?.status === 404) {
        toast.error('Project not found or already deleted')
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to delete this project')
      } else if (error.response?.status >= 500) {
        toast.error('Server error. Some files may not have been deleted.')
      } else {
        toast.error('Failed to delete project')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setProjectToDelete(null)
  }

  // Toggle project enabled/disabled status
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
        toast.success(`Project ${newStatus ? 'enabled' : 'disabled'} successfully`)
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
        toast.error('Failed to toggle project status')
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
      toast.error(error.response?.data?.message || 'Failed to toggle project status')
    } finally {
      setTogglingStatus(prev => ({ ...prev, [projectId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex justify-start mb-4 sm:hidden">
          <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm" />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1 sm:mb-2">
              Project Management
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Manage your projects, QR codes, and videos all in one place
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            {/* Sort Dropdown */}
            {projects.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input px-3 py-2 text-sm bg-slate-700/50 border-slate-600 text-slate-100 w-full sm:w-auto min-w-[140px]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="scans">Most Scans</option>
                </select>
              </div>
            )}

            {/* View Mode Toggle - Hidden on mobile */}
            {projects.length > 0 && (
              <div className="hidden sm:flex bg-slate-700/50 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-md transition-colors flex items-center ${
                    viewMode === 'list'
                      ? 'bg-neon-blue text-slate-900'
                      : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  <List className="w-4 h-4 mr-1" />
                  <span className="text-sm">List</span>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 rounded-md transition-colors flex items-center ${
                    viewMode === 'grid'
                      ? 'bg-neon-blue text-slate-900'
                      : 'text-slate-300 hover:text-slate-100'
                  }`}
                >
                  <Grid className="w-4 h-4 mr-1" />
                  <span className="text-sm">Grid</span>
                </button>
              </div>
            )}
            <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm sm:text-base hidden sm:flex" />
          </div>
        </div>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-100 mb-2">No projects found</h3>
          <p className="text-slate-300">
            Start creating your first Phygital project!
          </p>
        </div>
      ) : (
        <div className={viewMode === 'grid'
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
          : 'space-y-4'
        }>
          {getSortedProjects().map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              user={user}
              isExpanded={expandedProjectId === project.id}
              qrCodeUrl={qrCodeUrls[project.id]}
              isLoadingQR={loadingQR[project.id]}
              copiedUrl={copiedUrl}
              isTogglingStatus={togglingStatus[project.id]}
              onToggleExpand={() => toggleProjectExpansion(project)}
              onDownloadQR={() => handleDownloadQR(project)}
              onDownloadComposite={() => handleDownloadComposite(project)}
              onCopyUrl={() => copyUrlToClipboard(project)}
              onShare={() => handleShareUrl(project)}
              onEdit={() => handleEditProject(project)}
              onDelete={() => handleDeleteProject(project)}
              onToggleStatus={() => handleToggleProjectStatus(project)}
              formatDate={formatDate}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}


      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          project={projectToDelete}
          isDeleting={isDeleting}
          onConfirm={confirmDeleteProject}
          onClose={closeDeleteModal}
        />
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
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
        />
      )}
    </div>
  )
}

// Project Card Component
const ProjectCard = ({
  project,
  user,
  isExpanded,
  qrCodeUrl,
  isLoadingQR,
  copiedUrl,
  isTogglingStatus,
  onToggleExpand,
  onDownloadQR,
  onDownloadComposite,
  onCopyUrl,
  onShare,
  onEdit,
  onDelete,
  onToggleStatus,
  formatDate,
  viewMode
}) => {
  const personalizedUrl = `${window.location.origin}/user/${user?.username}?project=${project.id}`

  return (
      <div className={`card-glass rounded-lg shadow-dark-large border transition-all duration-200 w-full ${isExpanded ? 'ring-2 ring-neon-blue/50' : ''} ${
        project.isEnabled
          ? 'border-slate-600/30 hover:border-neon-blue/30'
          : 'border-red-600/30 hover:border-red-500/30 opacity-75'
      }`}>
      <div className="p-4 sm:p-6">
        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-button-gradient rounded-lg flex items-center justify-center shadow-glow-purple">
                  <Video className="w-6 h-6 text-slate-100" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-semibold text-slate-100 truncate">
                    {project.name}
                  </h2>
                  {!project.isEnabled && (
                    <span className="px-2 py-1 text-xs font-medium bg-red-900/30 text-neon-red border border-red-600/30 rounded-full">
                      Disabled
                    </span>
                  )}
                </div>
                {project.description && (
                  <p className="text-sm text-slate-300 truncate mt-1">
                    {project.description}
                  </p>
                )}
              </div>
            </div>

            {/* Project Status Toggle */}
            <div className="mt-3 flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-100">
                  AR Scanning: {project.isEnabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {project.isEnabled 
                    ? 'Users can scan and view this project' 
                    : 'Scanning is disabled for this project'
                  }
                </p>
              </div>
              <button
                onClick={onToggleStatus}
                disabled={isTogglingStatus}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                  project.isEnabled 
                    ? 'bg-neon-green focus:ring-neon-green' 
                    : 'bg-slate-600 focus:ring-slate-500'
                } ${isTogglingStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={project.isEnabled ? 'Click to disable' : 'Click to enable'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    project.isEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Project Stats */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3">
              <div className="flex items-center text-sm text-slate-400">
                <Calendar className="w-4 h-4 mr-1" />
                <span>{formatDate(project.createdAt)}</span>
              </div>
              <div className="flex items-center text-sm">
                <Video className="w-4 h-4 mr-1" />
                <span className={project.hasVideo ? 'text-neon-green' : 'text-slate-400'}>
                  {project.hasVideo ? 'Video uploaded' : 'No video'}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <QrCode className="w-4 h-4 mr-1" />
                <span className="text-neon-blue">
                  {project.analytics?.totalScans || 0} scans
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={onToggleExpand}
            className="flex-1 sm:flex-initial px-4 py-2 bg-neon-purple text-slate-900 text-sm font-medium rounded-lg hover:bg-purple-400 transition-colors flex items-center justify-center shadow-glow-purple"
          >
            <QrCode className="w-4 h-4 mr-2" />
            {isExpanded ? 'Hide QR' : 'Show QR'}
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>
          <button
            onClick={onEdit}
            className="flex-1 sm:flex-initial px-4 py-2 bg-neon-cyan text-slate-900 text-sm font-medium rounded-lg hover:bg-cyan-400 transition-colors flex items-center justify-center shadow-glow-cyan"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit
          </button>
          <button
            onClick={onDownloadComposite}
            disabled={!project.hasCompositeDesign}
            className="flex-1 sm:flex-initial px-4 py-2 bg-neon-green text-slate-900 text-sm font-medium rounded-lg hover:bg-green-400 transition-colors flex items-center justify-center shadow-glow-green disabled:opacity-50 disabled:cursor-not-allowed"
            title={project.hasCompositeDesign ? 'Download composite design' : 'Composite design not available'}
          >
            <Image className="w-4 h-4 mr-2" />
            Final Design
          </button>
          <button
            onClick={onDelete}
            className="flex-1 sm:flex-initial px-4 py-2 bg-neon-red text-slate-900 text-sm font-medium rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center shadow-glow-red"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </button>
        </div>

        {/* QR Code Section (Expandable) */}
        {isExpanded && (
          <div className="border-t border-slate-600/30 pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* QR Code Display */}
              <div className="flex flex-col items-center justify-center bg-slate-800/50 rounded-lg p-4">
                {isLoadingQR ? (
                  <div className="flex flex-col items-center py-8">
                    <LoadingSpinner size="lg" />
                    <p className="text-sm text-slate-300 mt-4">Generating QR code...</p>
                  </div>
                ) : qrCodeUrl ? (
                  <>
                    <img 
                      src={qrCodeUrl} 
                      alt={`QR Code for ${project.name}`} 
                      className="w-48 h-48 sm:w-64 sm:h-64 object-contain rounded-lg shadow-lg"
                    />
                    <p className="text-xs text-slate-400 mt-3 text-center">
                      Scan this code to access your AR experience
                    </p>
                  </>
                ) : (
                  <div className="py-8">
                    <QrCode className="w-16 h-16 text-slate-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">QR code not available</p>
                  </div>
                )}
              </div>

              {/* Actions & URL */}
              <div className="flex flex-col justify-center space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">
                    Project URL
                  </label>
                  <div className="flex items-center space-x-2 p-3 bg-slate-800/50 rounded-lg border border-slate-600/30">
                    <ExternalLink className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-slate-200 flex-1 truncate">
                      {personalizedUrl}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onDownloadQR}
                    disabled={!qrCodeUrl}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  
                  <button
                    onClick={onCopyUrl}
                    className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center text-sm"
                  >
                    {copiedUrl === project.id ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-neon-green" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy URL
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={onShare}
                  className="px-4 py-2 bg-neon-green text-slate-900 rounded-lg hover:bg-green-400 transition-colors flex items-center justify-center text-sm font-medium shadow-glow-green"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Project
                </button>

                <a
                  href={personalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center text-sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </a>
              </div>
            </div>
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

// Delete Confirmation Modal Component
const DeleteConfirmationModal = ({ project, isDeleting, onConfirm, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
    <div className="card-glass rounded-lg shadow-dark-large max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-600/30">
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-slate-600/30">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-100 pr-2">
            Delete Project
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
            Are you sure you want to delete <strong>"{project?.name}"</strong>?
          </p>
          <div className="bg-red-900/20 border border-neon-red/30 rounded-lg p-2 sm:p-3">
            <p className="text-xs sm:text-sm text-neon-red">
              <strong>Warning:</strong> This will permanently remove:
            </p>
            <ul className="text-xs sm:text-sm text-slate-300 mt-2 list-disc list-inside">
              <li>Your design image and video</li>
              <li>QR code and AR experience</li>
              <li>Project settings and configuration</li>
              <li>All analytics and scan data</li>
              <li>Generated composite designs</li>
              <li>Project history and timeline</li>
            </ul>
          </div>
          <p className="text-xs sm:text-sm text-neon-red mt-2 sm:mt-3 font-medium">
            This action cannot be undone.
          </p>
        </div>
      </div>
      
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-slate-600/30 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors w-full sm:w-auto touch-manipulation"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting}
          className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-900 bg-neon-red hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto touch-manipulation shadow-glow-red"
        >
          {isDeleting ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Deleting...</span>
            </>
          ) : (
            <>
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Delete Project
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
  phoneErrors 
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
              Edit Project: {project?.name}
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
                <input
                  type="tel"
                  value={formData.socialLinks.contactNumber}
                  onChange={(e) => onSocialLinkChange('contactNumber', e.target.value)}
                  placeholder="+1234567890"
                  className={`input w-full px-3 py-2 text-sm ${
                    phoneErrors?.contactNumber 
                      ? 'border-neon-red bg-red-900/20' 
                      : formData.socialLinks.contactNumber 
                      ? 'border-neon-green bg-green-900/20' 
                      : ''
                  }`}
                  disabled={isSaving}
                />
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
                <input
                  type="tel"
                  value={formData.socialLinks.whatsappNumber}
                  onChange={(e) => onSocialLinkChange('whatsappNumber', e.target.value)}
                  placeholder="+1234567890"
                  className={`input w-full px-3 py-2 text-sm ${
                    phoneErrors?.whatsappNumber 
                      ? 'border-neon-red bg-red-900/20' 
                      : formData.socialLinks.whatsappNumber 
                      ? 'border-neon-green bg-green-900/20' 
                      : ''
                  }`}
                  disabled={isSaving}
                />
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

export default ProjectsPage

