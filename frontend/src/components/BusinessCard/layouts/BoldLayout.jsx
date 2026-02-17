/**
 * BoldLayout - Bold template
 * Dark full-bleed background, oversized typography, 2-column grid contact tiles
 * Supports banner image and theme colors
 */
import React from 'react'
import { Download } from 'lucide-react'
import SectionRenderer from '../SectionRenderer'
import SocialLinksSection from '../sections/SocialLinksSection'

export default function BoldLayout({ card, colors, template, contactItems, trackEvent, downloadVCard }) {
  const profile = card.profile || {}
  const fontFamily = card.theme?.fontFamily || template.fontFamily || 'Inter'
  const showPhoto = profile.showPhoto !== false && profile.photo
  const showBanner = profile.showBanner !== false && profile.bannerImage
  const bgFlat = colors.background?.includes?.('gradient') ? '#0F0A1A' : (colors.background || '#0F0A1A')

  return (
    <div
      style={{
        fontFamily,
        backgroundColor: bgFlat,
        background: colors.background?.includes?.('gradient') ? colors.background : undefined,
        color: colors.text || '#F5F3FF'
      }}
    >
      {/* Large photo / banner - full width */}
      <div className="relative w-full" style={{ height: '200px' }}>
        {showBanner ? (
          <img src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
        ) : showPhoto ? (
          <img src={profile.photo} alt={profile.name || 'Profile'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: colors.card || 'rgba(124,58,237,0.12)' }}>
            <span className="text-5xl sm:text-7xl font-black" style={{ color: colors.accent }}>{(profile.name || '?')[0]?.toUpperCase()}</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 30%, ${bgFlat})` }} />
      </div>

      {/* Profile photo overlay (when banner is used) */}
      {showBanner && showPhoto && (
        <div className="flex px-4 sm:px-6 -mt-12 relative z-10 mb-2">
          <img
            src={profile.photo}
            alt={profile.name || 'Profile'}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 shadow-xl"
            style={{ borderColor: `${colors.accent || colors.primary}50` }}
          />
        </div>
      )}

      {/* Oversized Name */}
      <div className="px-4 sm:px-6 -mt-6 relative z-10">
        {profile.name && (
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight break-words" style={{ color: colors.accent || colors.primary }}>
            {profile.name}
          </h1>
        )}
        {profile.title && (
          <p className="text-base sm:text-lg mt-2 font-medium opacity-80" style={{ color: colors.text }}>{profile.title}</p>
        )}
        {profile.company && (
          <p className="text-xs sm:text-sm mt-0.5 opacity-50" style={{ color: colors.text }}>{profile.company}</p>
        )}
        {profile.bio && (
          <p className="text-xs sm:text-sm mt-3 sm:mt-4 opacity-60 leading-relaxed max-w-lg" style={{ color: colors.text }}>{profile.bio}</p>
        )}
      </div>

      {/* 2-column grid contact tiles - responsive */}
      {contactItems.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 px-4 sm:px-6 mt-6 sm:mt-8">
          {contactItems.map(({ key, icon: Icon, href, label }) => (
            <a
              key={key}
              href={href}
              target={key === 'website' ? '_blank' : undefined}
              rel={key === 'website' ? 'noopener noreferrer' : undefined}
              onClick={() => trackEvent('contactClick', key)}
              className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-3.5 sm:py-5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: `${colors.accent || colors.primary}20`,
                color: colors.accent || colors.primary,
                border: `1px solid ${colors.accent || colors.primary}30`
              }}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="truncate max-w-full px-2">{label}</span>
            </a>
          ))}
          <button
            onClick={() => { downloadVCard(card); trackEvent('vcardDownload') }}
            className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-3.5 sm:py-5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'transparent',
              color: colors.accent || colors.primary,
              border: `2px dashed ${colors.accent || colors.primary}50`
            }}
          >
            <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            Save Contact
          </button>
        </div>
      )}

      {/* Dynamic Sections - accent borders */}
      <div className="px-4 sm:px-6 mt-6 sm:mt-8 space-y-3 sm:space-y-4">
        {(card.sections || [])
          .filter(s => s.visible !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((sec, i) => (
            <div
              key={i}
              className="rounded-xl p-3 sm:p-4"
              style={{
                backgroundColor: `${colors.accent || colors.primary}10`,
                borderLeft: `3px solid ${colors.accent || colors.primary}`
              }}
            >
              <SectionRenderer section={sec} card={card} colors={colors} onTrack={trackEvent} />
            </div>
          ))}
      </div>

      {/* Social Links */}
      <div className="px-4 sm:px-6 pb-2 mt-4">
        <SocialLinksSection socialLinks={card.socialLinks} colors={colors} onTrack={trackEvent} />
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t mx-4 sm:mx-6" style={{ borderColor: `${colors.accent || colors.primary}20` }}>
        <p className="text-xs">
          <span className="text-gradient">
            Powered by{' '}
            <a href="https://phygital.zone" className="hover:opacity-80 transition-opacity underline">
              Phygital.zone
            </a>
          </span>
        </p>
      </div>
    </div>
  )
}
