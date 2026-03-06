/**
 * Phygital QR Hub Page
 * Entry point for advanced QR campaigns (video, PDF + video, AR, business cards).
 */

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { isFreePlan } from '../../utils/planUtils'
import { Sparkles, Video, FileText, QrCode, CreditCard, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

const PhygitalQRHubPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isFree = isFreePlan(user)

  const options = [
    {
      id: 'links-video',
      name: 'Links + Video QR',
      description: 'Landing page with links and a featured video',
      href: '/phygitalized/qr-links-video',
      icon: Video,
      premium: true,
    },
    {
      id: 'links-pdf-video',
      name: 'Links, PDF & Video QR',
      description: 'Share links, documents, and video in one QR',
      href: '/phygitalized/qr-links-pdf-video',
      icon: FileText,
      premium: true,
    },
    {
      id: 'phygital-ar',
      name: 'Phygital QR (AR Experience)',
      description: 'AR experience triggered by your printed design',
      href: '/phygitalized/qr-links-ar-video',
      icon: QrCode,
      premium: true,
      isAr: true,
    },
    {
      id: 'business-card',
      name: 'Digital Business Card',
      description: 'Personal landing page with your contact details',
      href: '/business-cards/create',
      icon: CreditCard,
      premium: false,
    },
  ]

  const handleClick = (option) => {
    if (option.id === 'business-card') {
      navigate(option.href)
      return
    }

    if (isFree && option.premium) {
      if (option.isAr) {
        toast.error('Phygital QR (AR Experience) is locked. Contact the admin to get access.')
        navigate('/phygital-qr-info')
      } else {
        toast.error('Upgrade to Phygital QR plan to unlock video and AR experience features.')
        navigate('/pricing')
      }
      return
    }

    navigate(option.href)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/70 border border-slate-700/60 text-[11px] font-medium text-slate-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-neon-purple" />
            Phygital & advanced QR experiences
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-3">
            Choose your Phygital QR experience
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
            Go beyond basic Dynamic QR codes. Create rich experiences with video, documents,
            AR overlays, or a personalized digital business card.
          </p>
        </div>

        {/* Options grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {options.map((option) => {
            const Icon = option.icon
            const isLocked = isFree && option.premium

            return (
              <button
                key={option.id}
                onClick={() => handleClick(option)}
                className={`group relative bg-slate-800/60 backdrop-blur-xl border-2 rounded-xl p-6 text-left transition-all duration-300 ${
                  isLocked
                    ? 'border-amber-600/40 hover:border-amber-500/60'
                    : 'border-slate-700/60 hover:border-neon-purple/60 hover:scale-[1.02]'
                }`}
              >
                {isLocked && (
                  <div className="absolute top-4 right-4">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Lock className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div
                    className={`p-3 rounded-lg ${
                      option.isAr
                        ? 'bg-gradient-to-br from-neon-purple to-neon-pink'
                        : 'bg-gradient-to-br from-neon-blue to-neon-cyan'
                    }`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  {option.premium && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300">
                      Phygital QR plan
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-slate-50 mb-1.5">
                  {option.name}
                </h3>
                <p className="text-sm text-slate-400">{option.description}</p>

                {isLocked && (
                  <div className="mt-4 pt-4 border-t border-slate-700/60">
                    <p className="text-xs text-amber-400 font-semibold mb-1">
                      Upgrade to unlock this experience
                    </p>
                    {option.isAr ? (
                      <p className="text-[11px] text-slate-400">
                        Phygital QR AR experiences are available on the Phygital QR plan and above.
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Video and document experiences are part of the Phygital QR plan.
                      </p>
                    )}
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

export default PhygitalQRHubPage

