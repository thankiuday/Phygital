/**
 * Admin Context
 * Manages admin authentication state and provides admin methods
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../utils/api'

// Initial state
const initialState = {
  admin: null,
  token: localStorage.getItem('adminToken'),
  isAuthenticated: false,
  isLoading: true,
  error: null
}

// Action types
const ADMIN_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  LOAD_ADMIN_START: 'LOAD_ADMIN_START',
  LOAD_ADMIN_SUCCESS: 'LOAD_ADMIN_SUCCESS',
  LOAD_ADMIN_FAILURE: 'LOAD_ADMIN_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR'
}

// Reducer function
const adminReducer = (state, action) => {
  switch (action.type) {
    case ADMIN_ACTIONS.LOGIN_START:
    case ADMIN_ACTIONS.LOAD_ADMIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      }
    
    case ADMIN_ACTIONS.LOGIN_SUCCESS:
      localStorage.setItem('adminToken', action.payload.token)
      return {
        ...state,
        admin: action.payload.admin,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case ADMIN_ACTIONS.LOAD_ADMIN_SUCCESS:
      return {
        ...state,
        admin: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      }
    
    case ADMIN_ACTIONS.LOGIN_FAILURE:
    case ADMIN_ACTIONS.LOAD_ADMIN_FAILURE:
      localStorage.removeItem('adminToken')
      return {
        ...state,
        admin: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      }
    
    case ADMIN_ACTIONS.LOGOUT:
      localStorage.removeItem('adminToken')
      return {
        ...state,
        admin: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      }
    
    case ADMIN_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      }
    
    default:
      return state
  }
}

// Create context
const AdminContext = createContext()

// Admin provider component
export const AdminProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState)
  const navigate = useNavigate()

  // Load admin function
  const loadAdmin = async () => {
    try {
      dispatch({ type: ADMIN_ACTIONS.LOAD_ADMIN_START })
      
      const response = await api.get('/auth/profile', {
        headers: {
          Authorization: `Bearer ${state.token}`
        }
      })
      
      const user = response.data.data.user
      
      // Check if user is admin
      if (user.email === 'admin@phygital.zone' || user.role === 'admin') {
        dispatch({
          type: ADMIN_ACTIONS.LOAD_ADMIN_SUCCESS,
          payload: user
        })
      } else {
        dispatch({
          type: ADMIN_ACTIONS.LOAD_ADMIN_FAILURE,
          payload: 'Not an admin account'
        })
      }
    } catch (error) {
      console.error('Load admin error:', error)
      dispatch({
        type: ADMIN_ACTIONS.LOAD_ADMIN_FAILURE,
        payload: error.response?.data?.message || 'Failed to load admin'
      })
    }
  }

  // Load admin on app start
  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      loadAdmin()
    } else {
      dispatch({ type: ADMIN_ACTIONS.LOAD_ADMIN_FAILURE, payload: null })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Login function
  const login = async (email, password) => {
    try {
      dispatch({ type: ADMIN_ACTIONS.LOGIN_START })

      const response = await api.post('/auth/admin/login', { email, password })

      const tokenExpiresIn = response.data.data.expiresIn || '2h'
      
      dispatch({
        type: ADMIN_ACTIONS.LOGIN_SUCCESS,
        payload: {
          admin: response.data.data.user,
          token: response.data.data.token
        }
      })

      toast.success(`Admin login successful! Session expires in ${tokenExpiresIn}`)
      navigate('/admin/dashboard')

      return { success: true }
    } catch (error) {
      console.error('Admin login error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'

      dispatch({
        type: ADMIN_ACTIONS.LOGIN_FAILURE,
        payload: errorMessage
      })

      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  // Logout function
  const logout = () => {
    try {
      localStorage.removeItem('adminToken')
      
      dispatch({ type: ADMIN_ACTIONS.LOGOUT })
      
      toast.success('Logged out successfully')
      
      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 100)
    } catch (error) {
      console.error('Logout error:', error)
      localStorage.clear()
      window.location.href = '/admin/login'
    }
  }

  // Clear error function
  const clearError = () => {
    dispatch({ type: ADMIN_ACTIONS.CLEAR_ERROR })
  }

  // Create admin API instance with token
  const adminApi = async (method, endpoint, data = null) => {
    try {
      const token = localStorage.getItem('adminToken') || state.token

      if (!token) {
        console.error('❌ No admin token available in localStorage or state')
        throw new Error('No admin token available')
      }

      console.log('🔑 Using admin token for request:', method, endpoint)

      const config = {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
      const body = (method.toLowerCase() === 'post' || method.toLowerCase() === 'put') && data == null ? {} : data
      if (body && typeof FormData !== 'undefined' && body instanceof FormData) {
        config.headers['Content-Type'] = false
      }

      let response
      switch (method.toLowerCase()) {
        case 'get':
          response = await api.get(`/admin${endpoint}`, config)
          break
        case 'post':
          response = await api.post(`/admin${endpoint}`, body, config)
          break
        case 'put':
          response = await api.put(`/admin${endpoint}`, body, config)
          break
        case 'delete':
          response = await api.delete(`/admin${endpoint}`, config)
          break
        default:
          throw new Error(`Unsupported HTTP method: ${method}`)
      }

      return response.data
    } catch (error) {
      console.error(`Admin API ${method} error:`, error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        endpoint
      })
      
      // Handle token expiration or unauthorized access
      if (error.response?.status === 401) {
        const errorMessage = error.response?.data?.message || 'Session expired'
        
        if (errorMessage.includes('expired') || errorMessage.includes('Invalid token')) {
          toast.error('Your session has expired. Please login again.')
          
          // Clear token and logout
          localStorage.removeItem('adminToken')
          dispatch({ type: ADMIN_ACTIONS.LOGOUT })
          
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/admin/login'
          }, 1500)
          
          // Throw a specific error that can be caught by components
          throw new Error('Session expired')
        }
      }
      
      // Re-throw with more context
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred'
      const enhancedError = new Error(errorMessage)
      enhancedError.response = error.response
      enhancedError.status = error.response?.status
      throw enhancedError
    }
  }

  const value = {
    ...state,
    login,
    logout,
    clearError,
    loadAdmin,
    adminApi
  }

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  )
}

// Custom hook to use admin context
export const useAdmin = () => {
  const context = useContext(AdminContext)
  
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  
  return context
}

export default AdminContext

