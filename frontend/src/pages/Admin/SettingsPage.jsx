/**
 * Admin Settings Page
 * Site settings including maintenance mode
 */

import React, { useState, useEffect } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import {
  Settings,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Save,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const SettingsPage = () => {
  const { adminApi } = useAdmin()
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Load current maintenance mode status
    loadMaintenanceStatus()
  }, [])

  const loadMaintenanceStatus = async () => {
    try {
      // Import maintenance config
      const maintenanceConfig = await import('../../config/maintenance')
      setMaintenanceMode(maintenanceConfig.MAINTENANCE_CONFIG?.ENABLED || false)
      setMaintenanceMessage(maintenanceConfig.MAINTENANCE_CONFIG?.MESSAGE || '')
    } catch (err) {
      console.error('Failed to load maintenance status:', err)
      // Default values if import fails
      setMaintenanceMode(false)
      setMaintenanceMessage('')
    }
  }

  const handleToggleMaintenance = async () => {
    try {
      setIsSaving(true)
      await adminApi('post', '/maintenance', {
        enabled: !maintenanceMode,
        message: maintenanceMessage
      })
      setMaintenanceMode(!maintenanceMode)
      toast.success(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`)
    } catch (err) {
      toast.error('Failed to update maintenance mode')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveMessage = async () => {
    if (maintenanceMode) {
      try {
        setIsSaving(true)
        await adminApi('post', '/maintenance', {
          enabled: true,
          message: maintenanceMessage
        })
        toast.success('Maintenance message updated')
      } catch (err) {
        toast.error('Failed to update message')
        console.error(err)
      } finally {
        setIsSaving(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Site Settings</h1>
        <p className="text-slate-300">Manage site-wide settings and configurations</p>
      </div>

      {/* Maintenance Mode */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-neon-orange" />
            <div>
              <h2 className="text-xl font-semibold text-slate-100">Maintenance Mode</h2>
              <p className="text-slate-300">
                Enable maintenance mode to temporarily disable the site for maintenance
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
            <div>
              <p className="font-medium text-slate-100">Maintenance Mode</p>
              <p className="text-sm text-slate-400">
                {maintenanceMode
                  ? 'Site is currently in maintenance mode'
                  : 'Site is currently active'}
              </p>
            </div>
            <button
              onClick={handleToggleMaintenance}
              disabled={isSaving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                maintenanceMode ? 'bg-neon-orange' : 'bg-slate-600'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Maintenance Message */}
          {maintenanceMode && (
            <div className="space-y-4">
              <div>
                <label className="label">Maintenance Message</label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="Enter maintenance message to display to users..."
                  rows={4}
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-slate-400">
                  This message will be displayed to users when maintenance mode is active
                </p>
              </div>
              <button
                onClick={handleSaveMessage}
                disabled={isSaving}
                className="btn-primary inline-flex items-center"
              >
                {isSaving ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Saving...</span>
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Message
                  </>
                )}
              </button>
            </div>
          )}

          {/* Warning */}
          {maintenanceMode && (
            <div className="p-4 bg-orange-900/20 border border-orange-600/30 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-neon-orange mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-neon-orange mb-1">
                    Maintenance mode is active
                  </p>
                  <p className="text-sm text-slate-300">
                    Users will see the maintenance page when they visit the site. Only admin users can access the admin panel.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Settings */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-slate-400" />
            <h2 className="text-xl font-semibold text-slate-100">Additional Settings</h2>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-400">More settings will be available in future updates</p>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage

