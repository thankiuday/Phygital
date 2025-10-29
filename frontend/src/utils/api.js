/**
 * API Utility
 * Handles HTTP requests to the backend API
 * Includes authentication headers and error handling
 */

import axios from 'axios'
import toast from 'react-hot-toast'

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

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
    return response
  },
  (error) => {
    // Handle network errors (but not for static assets)
    if (!error.response) {
      // Don't show toast for static asset requests (favicon, manifest, etc.)
      const url = error.config?.url || ''
      if (!url.includes('favicon') && !url.includes('manifest') && !url.includes('.svg') && !url.includes('.png') && !url.includes('.ico')) {
        toast.error('Network error. Please check your connection.')
      }
      return Promise.reject(error)
    }

    // Handle authentication errors
    if (error.response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
      return Promise.reject(error)
    }

    // Handle server errors
    if (error.response.status >= 500) {
      toast.error('Server error. Please try again later.')
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

// Response interceptor for upload API
uploadApi.interceptors.response.use(
  (response) => {
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
      toast.error('Network error. Please check your connection.')
      return Promise.reject(error)
    }

    // Handle authentication errors
    if (error.response.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
      return Promise.reject(error)
    }

    // Handle server errors
    if (error.response.status >= 500) {
      toast.error('Server error. Please try again later.')
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
  
  // File uploads - using uploadApi with longer timeout
  uploadDesign: (formData) => uploadApi.post('/upload/design', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadVideo: (formData) => uploadApi.post('/upload/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateVideo: (userId, formData) => uploadApi.put(`/upload/video/${userId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProjectVideo: (projectId, formData) => {
    return uploadApi.put(`/upload/project/${projectId}/video`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  // Health check for backend connectivity
  healthCheck: () => api.get('/health'),
  toggleProjectStatus: (projectId, isEnabled) => api.patch(`/upload/project/${projectId}/toggle-status`, { isEnabled }),
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
  trackVideoView: (userId, videoProgress, videoDuration, projectId = null, eventId = null) => 
    api.post('/analytics/video-view', { userId, videoProgress, videoDuration, projectId, eventId }),
  trackLinkClick: (userId, linkType, linkUrl, projectId = null, eventId = null) => 
    api.post('/analytics/link-click', { userId, linkType, linkUrl, projectId, eventId }),
  trackPageView: (userId, projectId = null) => 
    api.post('/analytics/page-view', { userId, projectId }),
  getAnalytics: (userId, days = 30) => api.get(`/analytics/${userId}?days=${days}`),
  getDashboardAnalytics: (userId, period = '30d') => 
    api.get(`/analytics/dashboard/${userId}?period=${period}`),
  getProjectAnalytics: (userId, projectId, days = 30) => 
    api.get(`/analytics/project/${projectId}?userId=${userId}&days=${days}`),
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

// Utility functions
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
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
