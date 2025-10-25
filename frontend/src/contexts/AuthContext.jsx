/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 * Handles login, logout, and token management
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null
}

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',
  LOAD_USER_START: 'LOAD_USER_START',
  LOAD_USER_SUCCESS: 'LOAD_USER_SUCCESS',
  LOAD_USER_FAILURE: 'LOAD_USER_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
  CLEAR_ERROR: 'CLEAR_ERROR'
}

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.LOAD_USER_START:
      return {
        ...state,
        isLoading: true,
        error: null
      }
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      localStorage.setItem('token', action.payload.token)
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case AUTH_ACTIONS.LOAD_USER_SUCCESS:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.LOAD_USER_FAILURE:
      localStorage.removeItem('token')
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    
    case AUTH_ACTIONS.LOGOUT:
      localStorage.removeItem('token')
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: action.payload // Replace entire user object to ensure proper updates
      }
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      }
    
    default:
      return state
  }
}

// Create context
const AuthContext = createContext()

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const navigate = useNavigate()

  // Load user on app start
  useEffect(() => {
    if (state.token) {
      loadUser()
    } else {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_FAILURE, payload: null })
    }
  }, [])

  // Load user function
  const loadUser = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOAD_USER_START })
      
      const response = await api.get('/auth/profile')
      
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
        payload: response.data.data.user
      })
    } catch (error) {
      console.error('Load user error:', error)
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_FAILURE,
        payload: error.response?.data?.message || 'Failed to load user'
      })
    }
  }

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START })

      const response = await api.post('/auth/login', { email, password })

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: response.data.data
      })

      toast.success('Login successful!')
      navigate('/dashboard')

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'

      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      })

      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.REGISTER_START })
      
      const response = await api.post('/auth/register', userData)
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload: response.data.data
      })
      
      toast.success('Registration successful!')
      navigate('/dashboard')
      
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed'
      
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: errorMessage
      })
      
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Logout function
  const logout = () => {
    dispatch({ type: AUTH_ACTIONS.LOGOUT })
    toast.success('Logged out successfully')
    navigate('/')
  }

  // Update user function - improved to handle nested objects properly
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData
    });
  }

  // Refresh user data from backend to ensure consistency
  const refreshUserData = async () => {
    try {
      const response = await api.get('/auth/profile')
      dispatch({
        type: AUTH_ACTIONS.LOAD_USER_SUCCESS,
        payload: response.data.data.user
      })
      return response.data.data.user
    } catch (error) {
      console.error('Failed to refresh user data:', error)
      return null
    }
  }

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR })
  }

  // Check if user has completed setup (has at least one complete project)
  const isSetupComplete = () => {
    if (!state.user) return false
    
    // Check if user has any completed projects
    if (state.user.projects && state.user.projects.length > 0) {
      return state.user.projects.some(project => isProjectComplete(project))
    }
    
    // If no projects, check if they have all components for a potential project
    return !!(
      state.user.uploadedFiles?.design?.url &&
      state.user.uploadedFiles?.video?.url &&
      (state.user.qrPosition?.x !== 0 || state.user.qrPosition?.y !== 0) &&
      Object.values(state.user.socialLinks || {}).some(link => link)
    )
  }

  // Helper function to check if a project is complete based on actual DB schema
  const isProjectComplete = (project) => {
    // Based on actual DB schema from user's data
    const hasDesign = project.uploadedFiles?.design?.url
    const hasVideo = project.uploadedFiles?.video?.url
    const hasQR = project.uploadedFiles?.mindTarget?.generated || (project.qrPosition?.x !== 0 || project.qrPosition?.y !== 0)
    // Fix: Check project-specific social links instead of global ones
    const hasSocial = project.socialLinks ? Object.values(project.socialLinks).some(link => link && link.trim() !== '') : false
    
    return !!(hasDesign && hasVideo && hasQR && hasSocial)
  }

  // Get setup progress based on current project state
  const getSetupProgress = () => {
    if (!state.user) return 0
    
    // If user has NO projects at all, always return 0% regardless of global settings
    // This ensures a clean slate when all projects are deleted
    if (!state.user.projects || state.user.projects.length === 0) {
      return 0
    }
    
    // If user has completed projects, show 100%
    if (isSetupComplete()) {
      return 100
    }
    
    // Get the latest project (most recently created)
    const latestProject = state.user.projects[state.user.projects.length - 1]
    
    // Calculate progress based on the latest project ONLY
    // Don't count global settings if the project itself doesn't have files
    let completedSteps = 0
    const totalSteps = 4
    
    // Step 1: Design uploaded (project-specific)
    if (latestProject.uploadedFiles?.design?.url) completedSteps++
    
    // Step 2: Video uploaded (project-specific)
    if (latestProject.uploadedFiles?.video?.url) completedSteps++
    
    // Step 3: QR position set or .mind file generated (project-specific)
    if (latestProject.uploadedFiles?.mindTarget?.generated || (latestProject.qrPosition?.x !== 0 || latestProject.qrPosition?.y !== 0)) completedSteps++
    
    // Step 4: Social links added (project-specific)
    // Only count social links if the project has at least design or video
    const projectHasFiles = latestProject.uploadedFiles?.design?.url || latestProject.uploadedFiles?.video?.url
    if (projectHasFiles && latestProject.socialLinks && Object.values(latestProject.socialLinks).some(link => link && link.trim() !== '')) {
      completedSteps++
    }
    
    return Math.round((completedSteps / totalSteps) * 100)
  }

  // Get user's project statistics
  const getProjectStats = () => {
    if (!state.user?.projects) return { total: 0, complete: 0, incomplete: 0 }
    
    const total = state.user.projects.length
    const complete = state.user.projects.filter(isProjectComplete).length
    const incomplete = total - complete
    
    return { total, complete, incomplete }
  }

  const value = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    refreshUserData,
    clearError,
    loadUser,
    isSetupComplete,
    getSetupProgress,
    getProjectStats,
    isProjectComplete
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

export default AuthContext
