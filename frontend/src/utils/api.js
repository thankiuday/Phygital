/**
 * API Utility
 * Handles HTTP requests to the backend API
 * Includes authentication headers and error handling
 */

import axios from 'axios'
import toast from 'react-hot-toast'
import { setConnectionStatus, markConnectionFailed, setLastSuccessTime } from './connectionStatus'

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // Default timeout for most requests
  headers: {
    'Content-Type': 'application/json',
  },
})


// Create a separate instance for file uploads with longer timeout
const uploadApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 720000, // 12 minutes for file uploads (especially videos)
  headers: {
    'Content-Type': 'application/json',
  },
})

// Error toast debouncing
let lastErrorToast = null
let lastErrorToastTime = 0
const ERROR_TOAST_DEBOUNCE_MS = 3000 // 3 seconds

/**
 * Show error toast with debouncing
 */
const showErrorToast = (message) => {
  const now = Date.now()
  // Only show if different message or >3 seconds since last error toast
  if (message !== lastErrorToast || now - lastErrorToastTime > ERROR_TOAST_DEBOUNCE_MS) {
    lastErrorToast = message
    lastErrorToastTime = now
    toast.error(message)
  }
}

/**
 * Get context-aware network error message
 */
const getNetworkErrorMessage = (error) => {
  // Handle specific error codes (ERR_NETWORK is the most common when backend is down)
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
    return 'Service is currently starting up. Please try again in a moment.'
  }
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Request timed out. The service may be busy. Please try again.'
  }
  if (error.message?.includes('Network Error') || error.message?.includes('Failed to fetch')) {
    // If backend is not started, show startup message instead of blaming user's connection
    return 'Service is currently starting up. Please try again in a moment.'
  }
  return 'Service temporarily unavailable. Please try again in a moment.'
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Don't overwrite Authorization header if it's already set (e.g., for admin requests)
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Request interceptor for upload API
uploadApi.interceptors.request.use(
  (config) => {
    // Don't overwrite Authorization header if it's already set (e.g., for admin requests)
    if (!config.headers.Authorization) {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Mark connection as successful
    setLastSuccessTime(Date.now())
    setConnectionStatus('connected')
    return response
  },
  (error) => {
    // Handle network errors (but not for static assets)
    if (!error.response) {
      // Don't show toast for static asset requests (favicon, manifest, etc.)
      const url = error.config?.url || ''
      const isStaticAsset = url.includes('favicon') || url.includes('manifest') || url.includes('.svg') || url.includes('.png') || url.includes('.ico')
      
      if (!isStaticAsset) {
        // Mark connection as failed
        markConnectionFailed()
        
        // Get context-aware error message
        const errorMessage = getNetworkErrorMessage(error)
        showErrorToast(errorMessage)
        
        // Only log in development mode
        if (import.meta.env.DEV) {
          console.error('Network error:', error.code || error.message, error.config?.url)
        }
      }
      return Promise.reject(error)
    }

    // Mark connection as successful (we got a response, even if it's an error)
    setLastSuccessTime(Date.now())
    setConnectionStatus('connected')

    // Check if this is an analytics endpoint (should fail silently)
    const url = error.config?.url || ''
    const isAnalyticsEndpoint = url.includes('/analytics/') || url.includes('/qr/scan')

    // Handle authentication errors
    if (error.response.status === 401) {
      // Don't redirect for admin login routes - let AdminContext handle it
      const isAdminRoute = error.config?.url?.includes('/auth/admin/login')
      
      if (!isAdminRoute) {
        localStorage.removeItem('token')
        window.location.href = '/login'
        toast.error('Session expired. Please login again.')
      }
      return Promise.reject(error)
    }

    // Handle server errors
    if (error.response.status >= 500) {
      // Don't show error toast for analytics endpoints (silent failures)
      if (!isAnalyticsEndpoint) {
        showErrorToast('Server error. Please try again later.')
      } else {
        // Log analytics errors silently (no user-facing toast)
        if (import.meta.env.DEV) {
          console.warn('Analytics tracking failed (silent):', url, error.response?.data?.message || error.message)
        }
      }
      return Promise.reject(error)
    }

    // Handle validation errors
    if (error.response.status === 400) {
      const message = error.response.data?.message || 'Invalid request'
      const errors = error.response.data?.errors || []
      // Don't show error toast for analytics endpoints
      if (!isAnalyticsEndpoint) {
        toast.error(message)
      } else {
        // Log analytics validation errors with details for debugging
        console.warn('Analytics validation error (silent):', url, message)
        if (errors.length > 0) {
          console.warn('Validation errors:', errors)
          // Log each validation error for easier debugging
          errors.forEach((err, index) => {
            console.warn(`  Error ${index + 1}:`, err.msg || err.message, 'at', err.param || err.path)
          })
        } else if (error.response?.data) {
          console.warn('Error response:', error.response.data)
        }
      }
      return Promise.reject(error)
    }

    // Handle other errors
    const message = error.response.data?.message || 'An error occurred'
    // Don't show error toast for analytics endpoints
    if (!isAnalyticsEndpoint) {
      toast.error(message)
    } else {
      // Log analytics errors silently
      if (import.meta.env.DEV) {
        console.warn('Analytics error (silent):', url, message)
      }
    }
    return Promise.reject(error)
  }
)

// Response interceptor for upload API
uploadApi.interceptors.response.use(
  (response) => {
    // Mark connection as successful
    setLastSuccessTime(Date.now())
    setConnectionStatus('connected')
    return response
  },
  (error) => {
    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      toast.error('Upload timeout. Please try a smaller file or check your connection.')
      return Promise.reject(error)
    }

    // Handle network errors
    if (!error.response) {
      // Mark connection as failed
      markConnectionFailed()
      
      // Get context-aware error message
      const errorMessage = getNetworkErrorMessage(error)
      showErrorToast(errorMessage)
      
      // Only log in development mode
      if (import.meta.env.DEV) {
        console.error('Upload network error:', error.code || error.message, error.config?.url)
      }
      return Promise.reject(error)
    }

    // Mark connection as successful (we got a response, even if it's an error)
    setLastSuccessTime(Date.now())
    setConnectionStatus('connected')

    // Handle authentication errors
    if (error.response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
      return Promise.reject(error)
    }

    // Handle server errors
    if (error.response.status >= 500) {
      showErrorToast('Server error. Please try again later.')
      return Promise.reject(error)
    }

    // Handle validation errors
    if (error.response.status === 400) {
      const message = error.response.data?.message || 'Invalid request'
      toast.error(message)
      return Promise.reject(error)
    }

    // Handle other errors
    const message = error.response.data?.message || 'An error occurred'
    toast.error(message)
    return Promise.reject(error)
  }
)

// API methods
export const authAPI = {
  // Authentication
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (userData) => api.put('/auth/profile', userData),
  changePassword: (currentPassword, newPassword) => 
    api.post('/auth/change-password', { currentPassword, newPassword }),
}

export const uploadAPI = {
  // Project management
  createProject: (projectData) => api.post('/upload/project', projectData),
  getProjects: () => api.get('/upload/projects'),
  updateProjectSocialLinks: (projectId, links) => {
    return api.put(`/upload/projects/${projectId}/social-links`, { socialLinks: links })
  },
  getProject: (projectId) => api.get(`/upload/project/${projectId}`),
  updateProject: (projectId, projectData) => api.put(`/upload/project/${projectId}`, projectData),
  deleteProject: (projectId) => api.delete(`/upload/project/${projectId}`),
  deleteProjectsBatch: (projectIds) => api.delete('/upload/projects/batch', { data: { projectIds } }),
  
  // File uploads - using uploadApi with longer timeout
  uploadDesign: (formData) => uploadApi.post('/upload/design', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadVideo: (formData, config = {}) => uploadApi.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: config.onUploadProgress
  }),
  uploadVideos: (formData, projectId, campaignType = null) => {
    // Append projectId to formData if provided
    if (projectId) {
      formData.append('projectId', projectId);
    }
    // Append campaignType if provided (for QR Links campaigns with 50MB limit)
    if (campaignType) {
      formData.append('campaignType', campaignType);
    }
    return uploadApi.post('/upload/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  updateVideo: (userId, formData) => uploadApi.put(`/upload/video/${userId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProjectVideo: (projectId, formData) => {
    return uploadApi.put(`/upload/project/${projectId}/video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadDocuments: (formData, projectId) => {
    // Append projectId to formData if provided
    if (projectId) {
      formData.append('projectId', projectId);
    }
    return uploadApi.post('/upload/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // Health check for backend connectivity
  healthCheck: () => api.get('/health'),
  toggleProjectStatus: (projectId, isEnabled) => api.patch(`/upload/project/${projectId}/toggle-status`, { isEnabled }),
  toggleTargetImageRequirement: (projectId, requiresTargetImage) => api.patch(`/upload/project/${projectId}/toggle-target-image`, { requiresTargetImage }),
  setQRPosition: (position) => api.post('/upload/qr-position', position),
  saveCompositeDesign: (compositeImage, qrPosition) => api.post('/upload/save-composite-design', {
    compositeImage,
    qrPosition
  }, {
    timeout: 120000 // 2 minutes timeout for large image uploads
  }),
  updateSocialLinks: (links) => api.post('/upload/social-links', links),
  getUploadStatus: () => api.get('/upload/status'),
  downloadFinalDesign: () => api.get('/upload/download-final-design', { responseType: 'blob' }),
  previewFinalDesign: () => api.get('/upload/preview-final-design'),
  saveMindTarget: (mindTargetBase64) => uploadApi.post('/upload/save-mind-target', { mindTargetBase64 }),
  createARExperience: () => api.post('/upload/create-ar-experience'),
  
  // Get upgrade data for AR Video upgrade
  getUpgradeToArData: (projectId) => api.get(`/upload/project/${projectId}/upgrade-to-ar-data`),
}

export const arExperienceAPI = {
  // AR Experience operations
  create: () => api.post('/ar-experience'),
  getById: (id) => api.get(`/ar-experience/${id}`),
  update: (id, data) => api.put(`/ar-experience/${id}`, data),
  delete: (id) => api.delete(`/ar-experience/${id}`),
  getUserExperiences: (userId) => api.get(`/ar-experience/user/${userId}`),
}

export const qrAPI = {
  // QR code operations
  generateQR: (userId, format = 'png', size = 200) => 
    api.get(`/qr/generate/${userId}?format=${format}&size=${size}`, {
      responseType: 'blob'
    }),
  getMyQR: (format = 'png', size = 200) => 
    api.get(`/qr/my-qr?format=${format}&size=${size}`, {
      responseType: 'blob'
    }),
  getQRInfo: (userId) => api.get(`/qr/info/${userId}`),
  trackScan: (userId, scanData) => api.post('/qr/scan', { userId, scanData }),
  downloadQR: (userId, format = 'png', size = 300) => 
    api.get(`/qr/download/${userId}?format=${format}&size=${size}`, {
      responseType: 'blob'
    }),
  
  // Project-specific QR code operations
  getProjectQR: (projectId, format = 'png', size = 200) => 
    api.get(`/qr/project/${projectId}?format=${format}&size=${size}`, {
      responseType: 'blob'
    }),
  downloadProjectQR: (projectId, format = 'png', size = 300) => 
    api.get(`/qr/download/project/${projectId}?format=${format}&size=${size}`, {
      responseType: 'blob'
    }),
}

export const analyticsAPI = {
  // Analytics tracking (now with project support)
  trackScan: (userId, scanData, projectId = null) => 
    api.post('/analytics/scan', { userId, scanData, projectId }),
  trackVideoView: (userId, videoProgress, videoDuration, projectId = null, videoIndex = null, videoId = null, videoUrl = null) => 
    api.post('/analytics/video-view', { userId, videoProgress, videoDuration, projectId, videoIndex, videoId, videoUrl }),
  trackLinkClick: (userId, linkType, linkUrl, projectId = null, eventId = null) => 
    api.post('/analytics/link-click', { userId, linkType, linkUrl, projectId, eventId }),
  trackPageView: (userId, projectId = null, locationData = null) => 
    api.post('/analytics/page-view', { 
      userId, 
      projectId,
      scanLocation: locationData ? {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        village: locationData.village,
        city: locationData.city,
        state: locationData.state,
        country: locationData.country
      } : null
    }),
  trackSocialMediaClick: (userId, projectId, platform, url) =>
    api.post('/analytics/social-media-click', { userId, projectId, platform, url }),
  trackDocumentView: (userId, projectId, documentUrl, action = 'view') =>
    api.post('/analytics/document-view', { userId, projectId, documentUrl, action }),
  trackVideoComplete: (userId, projectId, duration, videoIndex = null, videoId = null, videoUrl = null) => {
    // Build request body, only including optional fields if they have valid values
    const body = { userId, projectId, duration }
    if (videoIndex !== null && videoIndex !== undefined) {
      body.videoIndex = videoIndex
    }
    if (videoId !== null && videoId !== undefined) {
      body.videoId = videoId
    }
    if (videoUrl !== null && videoUrl !== undefined) {
      body.videoUrl = videoUrl
    }
    return api.post('/analytics/video-complete', body)
  },
  trackPageViewDuration: (userId, projectId, timeSpent, locationData = null) =>
    api.post('/analytics/page-view-duration', { 
      userId, 
      projectId, 
      timeSpent,
      scanLocation: locationData ? {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        village: locationData.village,
        city: locationData.city,
        state: locationData.state,
        country: locationData.country
      } : null
    }),
  trackVideoProgressMilestone: (userId, projectId, milestone, progress, duration, videoIndex = null, videoId = null, videoUrl = null) =>
    api.post('/analytics/video-progress-milestone', { userId, projectId, milestone, progress, duration, videoIndex, videoId, videoUrl }),
  getAnalytics: (userId, days = 30) => api.get(`/analytics/${userId}?days=${days}`),
  getDashboardAnalytics: (userId, period = '30d') => 
    api.get(`/analytics/dashboard/${userId}?period=${period}`),
  getProjectAnalytics: (userId, projectId, days = 30) => 
    api.get(`/analytics/project/${projectId}?userId=${userId}&days=${days}`),
  getCampaignAnalytics: (projectId, period = '30d') =>
    api.get(`/analytics/campaign/${projectId}?period=${period}`),
  getDashboardComplete: (userId, options = {}) => {
    const params = new URLSearchParams();
    if (options.period) params.append('period', options.period);
    if (options.campaignType) params.append('campaignType', options.campaignType || 'all');
    if (options.projectId) params.append('projectId', options.projectId);
    if (options.eventTypes) params.append('eventTypes', options.eventTypes);
    return api.get(`/analytics/dashboard-complete/${userId}?${params.toString()}`);
  },
  getEvents: (userId, options = {}) => {
    const params = new URLSearchParams();
    if (options.projectId) params.append('projectId', options.projectId);
    if (options.campaignType) params.append('campaignType', options.campaignType);
    if (options.period) params.append('period', options.period);
    if (options.eventTypes) params.append('eventTypes', options.eventTypes);
    return api.get(`/analytics/events/${userId}?${params.toString()}`);
  },
}

export const userAPI = {
  // User operations
  getProfile: () => api.get('/user/profile'),
  getUser: (username) => api.get(`/user/${username}`),
  updateProfile: (userData) => api.put('/user/profile', userData),
  getSetupStatus: () => api.get('/user/setup/status'),
  deleteAccount: (password) => api.delete('/user/account', { data: { password } }),
  getAnalyticsSummary: () => api.get('/user/analytics/summary'),
}

export const historyAPI = {
  // History operations
  getHistory: (params = {}) => api.get('/history', { params }),
  getRecentActivities: (limit = 10) => api.get(`/history/recent?limit=${limit}`),
  getActivityStats: () => api.get('/history/stats'),
  getActivitySummary: () => api.get('/history/summary'),
  getActivityHistory: (activityType, params = {}) => api.get(`/history/activity/${activityType}`, { params }),
}


export const templatesAPI = {
  // Get all available templates
  getTemplates: () => api.get('/templates'),
  
  // Get template by ID
  getTemplate: (templateId) => api.get(`/templates/${templateId}`),
  
  // Apply template to campaign(s)
  applyTemplate: (data) => api.post('/templates/apply', data),
  
  // Get user projects (for campaign selector)
  getUserProjects: (userId) => api.get(`/projects/user/${userId}`)
}

export const phygitalizedAPI = {
  // Upload file for Phygitalized campaign
  uploadFile: (variation, projectId, file, fileType) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', projectId)
    formData.append('fileType', fileType)
    
    // Use uploadApi for video files (longer timeout) and regular api for other files
    const apiInstance = fileType === 'video' ? uploadApi : api
    
    return apiInstance.post(`/phygitalized/upload/${variation}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // Add explicit timeout for video uploads (already set in uploadApi, but being explicit)
      timeout: fileType === 'video' ? 720000 : 30000 // 12 minutes for videos, 30 seconds for others
    })
  },
  
  // Get campaign data
  getCampaign: (projectId) => api.get(`/phygitalized/campaign/${projectId}`),
  
  // Update campaign data
  updateCampaign: (projectId, data) => {
    // Use uploadApi for campaign updates since they may include .mind file generation which can take time
    return uploadApi.put(`/phygitalized/campaign/${projectId}`, data)
  },
  
  // Get public campaign data (for landing pages)
  getPublicCampaign: (projectId) => api.get(`/phygitalized/campaign/public/${projectId}`),

  // Delete a single campaign file (and clear it from DB)
  // kind: 'video' | 'pdf' | 'document'
  deleteCampaignFile: (projectId, kind) => api.delete(`/phygitalized/file/${projectId}`, { params: { kind } }),

  // Delete a file from Cloudinary by public_id/filename
  deleteFile: (publicId, resourceType = 'auto') => api.delete('/upload/file', { params: { publicId, resourceType } }),
  
  // Upgrade campaign type
  upgradeCampaign: (projectId, newCampaignType, upgradeData = {}) => 
    api.post('/phygitalized/upgrade-campaign', { projectId, newCampaignType, upgradeData })
}

// Utility functions
export const downloadFile = (blob, filename) => {
  try {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none' // Hide the link element
    
    // Append to body
    document.body.appendChild(link)
    
    // Use requestAnimationFrame to ensure DOM is ready, then click
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          link.click()
          console.log(`✅ Download triggered for: ${filename}`)
          
          // Clean up after a short delay to ensure download starts
          setTimeout(() => {
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
          }, 100)
        } catch (clickError) {
          console.error('❌ Error clicking download link:', clickError)
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
          throw clickError
        }
      }, 10) // Small delay to ensure link is fully attached
    })
  } catch (error) {
    console.error('❌ Error in downloadFile:', error)
    throw error
  }
}

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

export const generateQRCode = async (text, options = {}) => {
  try {
    const QRCode = await import('qrcode')
    return await QRCode.toDataURL(text, {
      width: options.size || 200,
      margin: 2,
      color: {
        dark: options.darkColor || '#000000',
        light: options.lightColor || '#FFFFFF'
      },
      ...options
    })
  } catch (error) {
    console.error('QR code generation error:', error)
    throw new Error('Failed to generate QR code')
  }
}

// Export both default and named exports for flexibility
export default api
export { api, uploadApi }
