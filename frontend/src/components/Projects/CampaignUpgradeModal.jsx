/**
 * Campaign Upgrade Modal Component
 * Shows upgrade confirmation with details about what will change
 */

import React from 'react'
import { X, ArrowRight, Check, Sparkles, Video, FileText, Link as LinkIcon, Zap } from 'lucide-react'
import LoadingSpinner from '../UI/LoadingSpinner'
import { getCampaignTypeDisplayName, getCampaignTypeDescription } from '../../utils/campaignTypeNames'

const CAMPAIGN_TYPE_INFO = {
  'qr-link': {
    name: getCampaignTypeDisplayName('qr-link'),
    description: getCampaignTypeDescription('qr-link'),
    icon: LinkIcon,
    color: 'blue'
  },
  'qr-links': {
    name: getCampaignTypeDisplayName('qr-links'),
    description: getCampaignTypeDescription('qr-links'),
    icon: LinkIcon,
    color: 'purple'
  },
  'qr-links-video': {
    name: getCampaignTypeDisplayName('qr-links-video'),
    description: getCampaignTypeDescription('qr-links-video'),
    icon: Video,
    color: 'indigo'
  },
  'qr-links-pdf-video': {
    name: getCampaignTypeDisplayName('qr-links-pdf-video'),
    description: getCampaignTypeDescription('qr-links-pdf-video'),
    icon: FileText,
    color: 'orange'
  },
  'qr-links-ar-video': {
    name: getCampaignTypeDisplayName('qr-links-ar-video'),
    description: getCampaignTypeDescription('qr-links-ar-video'),
    icon: Sparkles,
    color: 'yellow'
  }
}

const getUpgradeFeatures = (fromType, toType) => {
  const features = []
  
  if (fromType === 'qr-link' && toType === 'qr-links') {
    features.push('Add multiple links')
    features.push('Create landing page')
    features.push('Better link organization')
  }
  
  if (toType === 'qr-links-video') {
    if (fromType === 'qr-link') {
      features.push('Add multiple links')
      features.push('Create landing page')
    }
    features.push('Add multiple videos')
    features.push('Video playback on landing page')
  }
  
  if (toType === 'qr-links-pdf-video') {
    if (fromType !== 'qr-links-video') {
      features.push('Add multiple videos')
    }
    features.push('Add PDF documents')
    features.push('Document downloads on landing page')
  }
  
  if (toType === 'qr-links-ar-video') {
    features.push('Upload design image')
    features.push('Set QR position on design')
    features.push('Create AR experience')
    features.push('All previous features included')
  }
  
  return features
}

const CampaignUpgradeModal = ({ 
  isOpen, 
  onClose, 
  currentType, 
  newType, 
  onConfirm, 
  isUpgrading = false,
  existingData = {}
}) => {
  if (!isOpen) return null

  const currentInfo = CAMPAIGN_TYPE_INFO[currentType] || CAMPAIGN_TYPE_INFO['qr-link']
  const newInfo = CAMPAIGN_TYPE_INFO[newType] || CAMPAIGN_TYPE_INFO['qr-links']
  const CurrentIcon = currentInfo.icon
  const NewIcon = newInfo.icon
  
  const features = getUpgradeFeatures(currentType, newType)
  const isARUpgrade = newType === 'qr-links-ar-video'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-slate-800 rounded-xl border border-slate-600/50 shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-neon-purple" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-bold text-slate-100">Upgrade Campaign Type</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">Enhance your campaign with new features</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUpgrading}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 touch-manipulation"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Campaign Type Comparison */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-${currentInfo.color}-900/20 border border-${currentInfo.color}-600/50 rounded-lg flex items-center justify-center flex-shrink-0`}>
                <CurrentIcon className={`w-5 h-5 sm:w-6 sm:h-6 text-${currentInfo.color}-400`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-400">Current Type</p>
                <p className="text-base sm:text-lg font-bold text-slate-100 truncate">{currentInfo.name}</p>
              </div>
            </div>
            
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500 rotate-90 sm:rotate-0 flex-shrink-0" />
            
            <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-${newInfo.color}-900/20 border border-${newInfo.color}-600/50 rounded-lg flex items-center justify-center flex-shrink-0`}>
                <NewIcon className={`w-5 h-5 sm:w-6 sm:h-6 text-${newInfo.color}-400`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-slate-400">New Type</p>
                <p className="text-base sm:text-lg font-bold text-slate-100 truncate">{newInfo.name}</p>
              </div>
            </div>
          </div>

          {/* New Features */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-200 mb-2 sm:mb-3 flex items-center gap-2">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-neon-yellow flex-shrink-0" />
              New Features Enabled
            </h3>
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 sm:gap-3 p-2.5 sm:p-3 bg-green-900/10 border border-green-600/20 rounded-lg">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm text-slate-200">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Data Preserved */}
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-200 mb-2 sm:mb-3">Your Existing Data</h3>
            <div className="p-3 sm:p-4 bg-blue-900/10 border border-blue-600/20 rounded-lg">
              <p className="text-xs sm:text-sm text-slate-300">
                All your existing data (links, videos, documents, social links) will be preserved and migrated to the new campaign type.
              </p>
            </div>
          </div>

          {/* AR Upgrade Special Note */}
          {isARUpgrade && (
            <div className="p-3 sm:p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <p className="text-xs sm:text-sm text-yellow-200 font-medium mb-1.5 sm:mb-2">
                AR Video Upgrade Process
              </p>
              <p className="text-xs text-yellow-100/80">
                You'll be redirected to the AR Video setup wizard. Your existing data will be pre-filled, and you'll complete the remaining steps to finalize your AR experience.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-700/50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={isUpgrading}
            className="px-4 sm:px-5 py-2.5 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-600/50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600/30 touch-manipulation"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isUpgrading}
            className="px-4 sm:px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl shadow-lg hover:shadow-neon-purple/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 touch-manipulation"
          >
            {isUpgrading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Upgrading...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Upgrade Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CampaignUpgradeModal


