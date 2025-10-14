/**
 * History Page Component
 * Simple, clean interface for viewing projects and updating videos
 */

import React, { useState, useEffect } from 'react'
import { historyAPI, uploadAPI } from '../../utils/api'
import { useAuth } from '../../contexts/AuthContext'
import BackButton from '../../components/UI/BackButton'
import { 
  Video, 
  Calendar,
  RefreshCw,
  Edit3,
  X,
  Upload,
  FolderOpen,
  Trash2
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import toast from 'react-hot-toast'

const HistoryPage = () => {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Video update modal state
  const [showVideoUpdateModal, setShowVideoUpdateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [videoFile, setVideoFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load history data
  const loadHistory = async () => {
    try {
      setLoading(true)
      const response = await uploadAPI.getProjects()
      console.log('Projects API response:', response.data)
      
      const projectsData = response.data.data?.projects || []
      console.log('Projects data:', projectsData)
      
      // Convert projects to history format for compatibility
      const historyData = projectsData.map(project => ({
        _id: project.id,
        createdAt: project.createdAt,
        activityType: 'project_created',
        data: {
          project: {
            id: project.id,
            name: project.name,
            description: project.description
          }
        }
      }))
      
      setHistory(historyData)
    } catch (error) {
      console.error('Failed to load projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  // Extract unique projects from history and get actual project data from user
  const getUniqueProjects = () => {
    const projectMap = new Map()
    
    history.forEach(activity => {
      if (activity.data?.project) {
        const projectId = activity.data.project.id
        const projectName = activity.data.project.name
        
        if (!projectMap.has(projectId)) {
          // Find the actual project from user data to get video status
          const userProject = user?.projects?.find(p => p.id === projectId)
          
          projectMap.set(projectId, {
            id: projectId,
            name: projectName,
            description: activity.data.project.description,
            createdAt: activity.createdAt,
            hasVideo: !!(userProject?.uploadedFiles?.video?.url), // Check project-specific video
            videoUrl: userProject?.uploadedFiles?.video?.url,
            lastActivity: activity.createdAt
          })
        } else {
          // Update with latest activity date
          const existing = projectMap.get(projectId)
          if (new Date(activity.createdAt) > new Date(existing.lastActivity)) {
            existing.lastActivity = activity.createdAt
          }
        }
      }
    })
    
    return Array.from(projectMap.values()).sort((a, b) => 
      new Date(b.lastActivity) - new Date(a.lastActivity)
    )
  }

  const projects = getUniqueProjects()

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Handle project selection for video update
  const handleProjectSelect = (project) => {
    setSelectedProject(project)
    setShowVideoUpdateModal(true)
  }

  // Handle video file selection
  const handleVideoFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a valid video file')
        return
      }
      
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Video file size must be less than 50MB')
        return
      }
      
      setVideoFile(file)
    }
  }

  // Handle video upload
  const handleVideoUpload = async () => {
    if (!videoFile || !selectedProject) {
      toast.error('Please select a video file')
      return
    }

    try {
      setIsUploading(true)
      
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('projectId', selectedProject.id)
      
      const response = await uploadAPI.updateProjectVideo(selectedProject.id, formData)
      
      if (response.data.success) {
        toast.success('Video updated successfully!')
        setShowVideoUpdateModal(false)
        setSelectedProject(null)
        setVideoFile(null)
        loadHistory()
      } else {
        toast.error('Failed to update video')
      }
    } catch (error) {
      console.error('Video upload error:', error)
      toast.error('Failed to update video')
    } finally {
      setIsUploading(false)
    }
  }

  // Close modal
  const closeModal = () => {
    setShowVideoUpdateModal(false)
    setSelectedProject(null)
    setVideoFile(null)
  }

  // Handle project deletion
  const handleDeleteProject = (project) => {
    setProjectToDelete(project)
    setShowDeleteModal(true)
  }

  // Confirm project deletion
  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      setIsDeleting(true)
      
      // Call delete API (we'll need to create this endpoint)
      const response = await uploadAPI.deleteProject(projectToDelete.id)
      
      if (response.data.success) {
        const deletedFilesCount = response.data.data?.deletedFiles || 0
        const cloudinaryDeletion = response.data.data?.cloudinaryDeletion
        
        if (cloudinaryDeletion && cloudinaryDeletion.failed > 0) {
          toast.success(`Project deleted successfully! ${cloudinaryDeletion.successful}/${deletedFilesCount} files removed from Cloudinary.`)
        } else {
          toast.success(`Project deleted successfully! ${deletedFilesCount} files removed from Cloudinary.`)
        }
        
        setShowDeleteModal(false)
        setProjectToDelete(null)
        loadHistory() // Refresh the list
      } else {
        toast.error('Failed to delete project')
      }
    } catch (error) {
      console.error('Delete project error:', error)
      
      // Provide more specific error messages
      if (error.response?.status === 404) {
        toast.error('Project not found or already deleted')
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to delete this project')
      } else if (error.response?.status >= 500) {
        toast.error('Server error occurred. Some files may not have been deleted from Cloudinary.')
      } else {
        toast.error('Failed to delete project. Please try again.')
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        {/* Mobile Back Button - Top Left */}
        <div className="flex justify-start mb-4 sm:hidden">
          <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm" />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1 sm:mb-2">
              Your Projects
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Manage your Phygital creations
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {projects.length > 0 && (
              <button
                onClick={loadHistory}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors flex items-center justify-center text-sm sm:text-base"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span>Refresh</span>
              </button>
            )}
            {/* Desktop Back Button */}
            <BackButton to="/dashboard" variant="ghost" text="Back" className="text-sm sm:text-base hidden sm:flex" />
          </div>
        </div>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-12">
          <FolderOpen className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-100 mb-2">No projects found</h3>
          <p className="text-slate-300 mb-6">
            Start creating your first Phygital project!
          </p>
          <button
            onClick={loadHistory}
            className="btn-primary px-6 py-3 rounded-lg transition-colors flex items-center justify-center mx-auto"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            <span>Refresh</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <div key={project.id} className="card-glass rounded-lg shadow-dark-large border border-slate-600/30 hover:border-neon-blue/30 transition-all duration-200 w-full">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left side - Project info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-button-gradient rounded-lg flex items-center justify-center shadow-glow-purple">
                          <Video className="w-6 h-6 text-slate-100" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-slate-100 truncate">
                          {project.name}
                        </h2>
                        {project.description && (
                          <p className="text-sm text-slate-300 truncate mt-1">
                            {project.description}
                          </p>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 mt-2">
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
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right side - Action buttons */}
                  <div className="flex-shrink-0 sm:ml-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleProjectSelect(project)}
                      className="w-full sm:w-auto px-4 py-2 bg-neon-blue text-slate-900 text-sm font-medium rounded-lg hover:bg-neon-cyan transition-colors flex items-center justify-center shadow-glow-blue"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Update Video
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project)}
                      className="w-full sm:w-auto px-4 py-2 bg-neon-red text-slate-900 text-sm font-medium rounded-lg hover:bg-red-500 transition-colors flex items-center justify-center shadow-glow-red"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Update Modal */}
      {showVideoUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="card-glass rounded-lg shadow-dark-large max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-600/30">
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-slate-600/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-100 pr-2">
                  Update Video for {selectedProject?.name}
                </h3>
                <button
                  onClick={closeModal}
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
                    onChange={handleVideoFileChange}
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
                onClick={closeModal}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors w-full sm:w-auto touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={handleVideoUpload}
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
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="card-glass rounded-lg shadow-dark-large max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-600/30">
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-slate-600/30">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-100 pr-2">
                  Delete Project
                </h3>
                <button
                  onClick={closeDeleteModal}
                  className="text-slate-400 hover:text-slate-200 flex-shrink-0 touch-manipulation p-1"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </button>
              </div>
            </div>
            
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
              <div className="mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-slate-300 mb-3 sm:mb-4">
                  Are you sure you want to delete <strong>"{projectToDelete?.name}"</strong>?
                </p>
                <div className="bg-red-900/20 border border-neon-red/30 rounded-lg p-2 sm:p-3">
                  <p className="text-xs sm:text-sm text-neon-red">
                    <strong>Warning:</strong> This will permanently delete:
                  </p>
                  <ul className="text-xs sm:text-sm text-slate-300 mt-2 list-disc list-inside">
                    <li>Project data from database</li>
                    <li>Design image from Cloudinary storage</li>
                    <li>Video file from Cloudinary storage</li>
                    <li>Composite design (if generated)</li>
                    <li>AR target file (.mind file)</li>
                    <li>All project history and analytics</li>
                  </ul>
                </div>
                <p className="text-xs sm:text-sm text-neon-red mt-2 sm:mt-3 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-t border-slate-600/30 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg transition-colors w-full sm:w-auto touch-manipulation"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProject}
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
      )}
    </div>
  )
}

export default HistoryPage