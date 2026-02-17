/**
 * WaveLayout - Elegant template
 * Cover photo top, SVG wave separator, icon-only contacts, serif typography
 * Supports banner image and theme colors
 */
import React from 'react'
import { Download } from 'lucide-react'
import SectionRenderer from '../SectionRenderer'
import SocialLinksSection from '../sections/SocialLinksSection'

export default function WaveLayout({ card, colors, template, contactItems, trackEvent, downloadVCard }) {
  const profile = card.profile || {}
  const fontFamily = card.theme?.fontFamily || template.fontFamily || 'Georgia'
  const showPhoto = profile.showPhoto !== false && profile.photo
  const showBanner = profile.showBanner !== false && profile.bannerImage
  const bgColor = colors.background?.includes?.('gradient') ? '#FFFBEB' : (colors.background || '#FFFBEB')

  return (
    <div style={{ fontFamily }}>
      {/* Cover Photo / Banner / Colored Header */}
      <div className="relative w-full" style={{ height: '240px' }}>
        {showBanner ? (
          <img src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
        ) : showPhoto ? (
          <img src={profile.photo} alt={profile.name || 'Profile'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.accent})` }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4))' }} />
      </div>

      {/* SVG Wave Separator */}
      <div className="relative" style={{ marginTop: '-40px' }}>
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0,64L48,58.7C96,53,192,43,288,48C384,53,480,75,576,80C672,85,768,75,864,64C960,53,1056,43,1152,48C1248,53,1344,75,1392,85.3L1440,96L1440,120L0,120Z"
            fill={bgColor}
          />
        </svg>
      </div>

      {/* Profile photo below wave (when banner is used) */}
      {showBanner && showPhoto && (
        <div className="flex justify-center -mt-4 mb-2">
          <img
            src={profile.photo}
            alt={profile.name || 'Profile'}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 shadow-lg"
            style={{ borderColor: bgColor }}
          />
        </div>
      )}

      {/* Name & Title below wave */}
      <div className="text-center px-4 sm:px-6 -mt-2">
        {profile.name && (
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.text, fontFamily }}>{profile.name}</h1>
        )}
        {profile.title && (
          <p className="text-sm sm:text-base mt-1 italic" style={{ color: colors.accent || colors.secondary }}>
            {profile.title}
          </p>
        )}
        {profile.company && (
          <p className="text-xs sm:text-sm mt-0.5 opacity-60" style={{ color: colors.text }}>{profile.company}</p>
        )}
        {profile.bio && (
          <p className="text-xs sm:text-sm mt-3 max-w-md mx-auto opacity-70 leading-relaxed italic" style={{ color: colors.text }}>
            {profile.bio}
          </p>
        )}
      </div>

      {/* Horizontal icon-only circular contact buttons - responsive */}
      {contactItems.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 px-4 sm:px-6 mt-5 sm:mt-6">
          {contactItems.map(({ key, icon: Icon, href, label }) => (
            <a
              key={key}
              href={href}
              target={key === 'website' ? '_blank' : undefined}
              rel={key === 'website' ? 'noopener noreferrer' : undefined}
              onClick={() => trackEvent('contactClick', key)}
              title={label}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all hover:scale-110 active:scale-95 shadow-md"
              style={{
                backgroundColor: colors.primary,
                color: '#FFFFFF',
                boxShadow: `0 4px 14px ${colors.primary}40`
              }}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </a>
          ))}
        </div>
      )}

      {/* Save Contact */}
      <div className="flex justify-center px-4 sm:px-6 mt-4">
        <button
          onClick={() => { downloadVCard(card); trackEvent('vcardDownload') }}
          className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all hover:scale-105 active:scale-95 border-2"
          style={{ borderColor: colors.accent || colors.primary, color: colors.accent || colors.primary }}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Save Contact
        </button>
      </div>

      {/* Dynamic Sections */}
      <div className="px-4 sm:px-6 mt-4">
        {(card.sections || [])
          .filter(s => s.visible !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((sec, i) => (
            <div key={i} className="mb-3 border-l-2 pl-3" style={{ borderColor: colors.accent || colors.primary }}>
              <SectionRenderer section={sec} card={card} colors={colors} onTrack={trackEvent} />
            </div>
          ))}
      </div>

      {/* Social Links */}
      <div className="px-4 sm:px-6 pb-2">
        <SocialLinksSection socialLinks={card.socialLinks} colors={colors} onTrack={trackEvent} />
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t mx-4 sm:mx-6" style={{ borderColor: `${colors.accent || colors.primary}30` }}>
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
