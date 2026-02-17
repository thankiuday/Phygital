/**
 * QR Selection Page
 * Shows two main options: Dynamic QR (Free Forever) and Phygital QR
 * Guides users through QR creation based on their choice
 */

import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isFreePlan, canAccessFeature } from '../../utils/planUtils'
import { 
  QrCode, 
  Sparkles, 
  Link as LinkIcon, 
  Video, 
  FileText,
  Lock,
  ArrowRight,
  CheckCircle,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'

const QRSelectionPage = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [showMessage, setShowMessage] = useState(true) // Always show message for Dynamic QR

  const isFree = isFreePlan(user)

  // QR creation options for Dynamic QR
  const qrOptions = [
    {
      id: 'qr-link',
      name: 'Single Link QR',
      description: 'QR code pointing to one URL',
      href: '/phygitalized/qr-link',
      icon: LinkIcon,
      free: true
    },
    {
      id: 'qr-links',
      name: 'Multiple Links QR',
      description: 'QR code with multiple links',
      href: '/phygitalized/qr-links',
      icon: LinkIcon,
      free: true
    },
    {
      id: 'qr-links-video',
      name: 'Links & Video QR',
      description: 'QR code with links and video',
      href: '/phygitalized/qr-links-video',
      icon: Video,
      free: true
    },
    {
      id: 'qr-links-pdf-video',
      name: 'Links, PDF & Video QR',
      description: 'QR code with links, PDFs, and video',
      href: '/phygitalized/qr-links-pdf-video',
      icon: FileText,
      free: true
    },
    {
      id: 'qr-links-ar-video',
      name: 'Phygital QR',
      description: 'Full AR experience with video and links',
      href: '/upload',
      icon: Sparkles,
      free: false,
      premium: true,
      locked: true,
      infoHref: '/phygital-qr-info'
    }
  ]

  // This page is only for Dynamic QR - Phygital QR navigates directly to /upload

  // Handle QR option click
  const handleQROptionClick = (option) => {
    if (option.locked) {
      navigate(option.infoHref || '/phygital-qr-info')
      return
    }
    if (option.premium && isFree) {
      toast.error('Upgrade to Phygital QR plan to unlock this feature')
      navigate('/pricing')
      return
    }
    navigate(option.href)
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Message */}
        {showMessage && (
          <div className="bg-gradient-to-r from-neon-blue/20 to-neon-cyan/20 border border-neon-blue/30 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-neon-blue/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-neon-blue" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-100 mb-2">
                  Not sure how phygital works?
                </h3>
                <p className="text-slate-300">
                  Let's start creating a free Dynamic QR. Choose from the options below to get started.
                </p>
              </div>
              <button
                onClick={() => setShowMessage(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* QR Creation Options Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrOptions.map((option) => {
            const Icon = option.icon
            const isLocked = option.locked
            const isDisabled = !isLocked && option.premium && isFree
            
            return (
              <button
                key={option.id}
                onClick={() => handleQROptionClick(option)}
                disabled={isDisabled}
                className={`group relative bg-slate-800/50 backdrop-blur-xl border-2 rounded-xl p-6 transition-all duration-300 text-left ${
                  isDisabled
                    ? 'border-slate-700/30 opacity-60 cursor-not-allowed'
                    : isLocked
                      ? 'border-amber-600/40 hover:border-amber-500/50 hover:scale-[1.02] cursor-pointer'
                      : 'border-slate-700/50 hover:border-neon-blue/50 hover:scale-[1.02] cursor-pointer'
                }`}
              >
                {(isLocked || isDisabled) && (
                  <div className="absolute top-4 right-4">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Lock className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${
                    isDisabled ? 'bg-slate-700/50' : isLocked ? 'bg-amber-600/20' : 'bg-gradient-to-br from-neon-blue to-neon-cyan'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      isDisabled ? 'text-slate-400' : isLocked ? 'text-amber-400' : 'text-white'
                    }`} />
                  </div>
                  {option.free && !isLocked && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                      Free
                    </span>
                  )}
                </div>
                
                <h3 className={`text-lg font-bold mb-2 ${
                  isDisabled ? 'text-slate-500' : 'text-slate-100'
                }`}>
                  {option.name}
                </h3>
                <p className={`text-sm ${
                  isDisabled ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {option.description}
                </p>
                
                {isLocked && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-amber-400 font-semibold mb-1">
                      Contact admin to get access
                    </p>
                    <Link to="/phygital-qr-info" className="text-xs text-amber-300 hover:text-amber-200 font-medium">
                      Learn more about Phygital QR →
                    </Link>
                  </div>
                )}
                {isDisabled && !isLocked && (
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-amber-400 font-semibold">
                      Upgrade to unlock
                    </p>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default QRSelectionPage
