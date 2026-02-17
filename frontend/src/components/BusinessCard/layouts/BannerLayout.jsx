/**
 * BannerLayout - Creative template
 * Gradient banner with centered photo, full-width contact rows
 * Supports banner image and theme colors
 */
import React from 'react'
import { Download } from 'lucide-react'
import SectionRenderer from '../SectionRenderer'
import SocialLinksSection from '../sections/SocialLinksSection'

export default function BannerLayout({ card, colors, template, contactItems, trackEvent, downloadVCard }) {
  const profile = card.profile || {}
  const fontFamily = card.theme?.fontFamily || template.fontFamily || 'Poppins'
  const showPhoto = profile.showPhoto !== false && profile.photo
  const showBanner = profile.showBanner !== false && profile.bannerImage

  return (
    <div style={{ fontFamily }}>
      {/* Gradient Banner with photo + name overlay */}
      <div
        className="relative w-full flex flex-col items-center justify-end pb-5 sm:pb-6"
        style={{
          background: showBanner ? undefined : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          minHeight: showBanner ? '240px' : '220px'
        }}
      >
        {showBanner && (
          <>
            <img src={profile.bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 20%, ${colors.primary}CC)` }} />
          </>
        )}
        <div className="relative z-10 flex flex-col items-center">
          {showPhoto ? (
            <img
              src={profile.photo}
              alt={profile.name || 'Profile'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 shadow-xl mb-3"
              style={{ borderColor: 'rgba(255,255,255,0.5)' }}
            />
          ) : (
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 shadow-xl flex items-center justify-center text-2xl sm:text-3xl font-bold mb-3"
              style={{ borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}
            >
              {(profile.name || '?')[0]?.toUpperCase()}
            </div>
          )}
          {profile.name && (
            <h1 className="text-xl sm:text-2xl font-bold text-white drop-shadow-lg text-center px-4">{profile.name}</h1>
          )}
          {profile.title && (
            <p className="text-sm sm:text-base text-white/80 mt-0.5 drop-shadow text-center px-4">{profile.title}</p>
          )}
          {profile.company && (
            <p className="text-xs sm:text-sm text-white/60 mt-0.5 text-center px-4">{profile.company}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="px-4 sm:px-6 py-4 text-center">
          <p className="text-xs sm:text-sm opacity-70 leading-relaxed max-w-md mx-auto" style={{ color: colors.text }}>
            {profile.bio}
          </p>
        </div>
      )}

      {/* Full-width contact rows */}
      {contactItems.length > 0 && (
        <div className="px-4 sm:px-5 mt-2 space-y-2">
          {contactItems.map(({ key, icon: Icon, href, label }) => (
            <a
              key={key}
              href={href}
              target={key === 'website' ? '_blank' : undefined}
              rel={key === 'website' ? 'noopener noreferrer' : undefined}
              onClick={() => trackEvent('contactClick', key)}
              className="flex items-center gap-2.5 sm:gap-3 w-full px-3.5 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
              style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex-shrink-0"
                style={{ backgroundColor: colors.primary, color: '#FFFFFF' }}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <span className="truncate">{label}</span>
            </a>
          ))}
        </div>
      )}

      {/* Save Contact */}
      <div className="flex justify-center px-4 sm:px-5 mt-4">
        <button
          onClick={() => { downloadVCard(card); trackEvent('vcardDownload') }}
          className="flex items-center gap-2 w-full justify-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] border-2"
          style={{ borderColor: colors.primary, color: colors.primary }}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Save Contact
        </button>
      </div>

      {/* Dynamic Sections */}
      <div className="px-4 sm:px-5 mt-4">
        {(card.sections || [])
          .filter(s => s.visible !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((sec, i) => (
            <div key={i} className="rounded-xl sm:rounded-2xl overflow-hidden mb-3" style={{ backgroundColor: `${colors.accent}08` }}>
              <SectionRenderer section={sec} card={card} colors={colors} onTrack={trackEvent} />
            </div>
          ))}
      </div>

      {/* Social Links */}
      <div className="px-4 sm:px-5 pb-2">
        <SocialLinksSection socialLinks={card.socialLinks} colors={colors} onTrack={trackEvent} />
      </div>

      {/* Footer */}
      <div className="text-center py-4 border-t mx-4 sm:mx-5" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
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
