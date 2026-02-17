/**
 * ClassicLayout - Professional template
 * Solid header band with overlapping profile photo, pill contact buttons
 * Supports banner image and theme colors
 */
import React from 'react'
import { Download } from 'lucide-react'
import SectionRenderer from '../SectionRenderer'
import SocialLinksSection from '../sections/SocialLinksSection'

export default function ClassicLayout({ card, colors, template, contactItems, trackEvent, downloadVCard }) {
  const profile = card.profile || {}
  const fontFamily = card.theme?.fontFamily || template.fontFamily || 'Inter'
  const showPhoto = profile.showPhoto !== false && profile.photo
  const showBanner = profile.showBanner !== false && profile.bannerImage

  return (
    <div style={{ fontFamily }}>
      {/* Header Band - shows banner or solid color */}
      <div className="relative w-full" style={{ height: showBanner ? '180px' : '140px' }}>
        {showBanner ? (
          <>
            <img src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 40%, ${colors.primary}90)` }} />
          </>
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: colors.primary }} />
        )}
      </div>

      {/* Overlapping Photo */}
      {showPhoto ? (
        <div className="relative flex justify-center" style={{ marginTop: '-64px' }}>
          <img
            src={profile.photo}
            alt={profile.name || 'Profile'}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 shadow-xl"
            style={{ borderColor: colors.card || '#FFFFFF' }}
          />
        </div>
      ) : (
        <div className="relative flex justify-center" style={{ marginTop: '-48px' }}>
          <div
            className="w-24 h-24 rounded-full border-4 shadow-xl flex items-center justify-center text-2xl font-bold"
            style={{ borderColor: colors.card || '#FFFFFF', backgroundColor: colors.secondary || colors.primary, color: '#FFFFFF' }}
          >
            {(profile.name || '?')[0]?.toUpperCase()}
          </div>
        </div>
      )}

      {/* Name & Title */}
      <div className="text-center mt-4 px-4 sm:px-6">
        {profile.name && (
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.text }}>{profile.name}</h1>
        )}
        {profile.title && (
          <p className="text-sm sm:text-base mt-1 opacity-80" style={{ color: colors.text }}>{profile.title}</p>
        )}
        {profile.company && (
          <p className="text-xs sm:text-sm mt-0.5 opacity-60" style={{ color: colors.text }}>{profile.company}</p>
        )}
        {profile.bio && (
          <p className="text-xs sm:text-sm mt-3 max-w-md mx-auto opacity-70 leading-relaxed" style={{ color: colors.text }}>
            {profile.bio}
          </p>
        )}
      </div>

      {/* Pill Contact Buttons */}
      {contactItems.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4 sm:px-6 mt-5">
          {contactItems.map(({ key, icon: Icon, href, label }) => (
            <a
              key={key}
              href={href}
              target={key === 'website' ? '_blank' : undefined}
              rel={key === 'website' ? 'noopener noreferrer' : undefined}
              onClick={() => trackEvent('contactClick', key)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-md"
              style={{ backgroundColor: colors.primary, color: '#FFFFFF' }}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">{label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Save Contact */}
      <div className="flex justify-center px-4 sm:px-6 mt-4">
        <button
          onClick={() => { downloadVCard(card); trackEvent('vcardDownload') }}
          className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all hover:scale-105 active:scale-95 border-2"
          style={{ borderColor: colors.primary, color: colors.primary }}
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
            <SectionRenderer key={i} section={sec} card={card} colors={colors} onTrack={trackEvent} />
          ))}
      </div>

      {/* Social Links */}
      <div className="px-4 sm:px-6 pb-2">
        <SocialLinksSection socialLinks={card.socialLinks} colors={colors} onTrack={trackEvent} />
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t mx-4 sm:mx-6" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
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
