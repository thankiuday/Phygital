/**
 * BannerLayout - Creative template
 * Gradient banner with centered photo, full-width contact rows
 * Supports banner image and theme colors
 */
import React from 'react'
import { Download } from 'lucide-react'
import SectionRenderer from '../SectionRenderer'
import SocialLinksSection from '../sections/SocialLinksSection'

const DEFAULT_ORDER = ['banner', 'photo', 'nameInfo', 'contact', 'saveContact', 'sections', 'social']

export default function BannerLayout({ card, colors, template, contactItems, trackEvent, downloadVCard }) {
  const profile = card.profile || {}
  const fontFamily = card.theme?.fontFamily || template.fontFamily || 'Poppins'
  const showPhoto = profile.showPhoto !== false && profile.photo
  const showBanner = profile.showBanner !== false && profile.bannerImage
  const order = card.contentOrder?.length ? card.contentOrder : DEFAULT_ORDER
  const photoAfterBanner = order.indexOf('photo') === order.indexOf('banner') + 1

  const blocks = {
    banner: (
      <div
        key="banner"
        className="relative w-full"
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
      </div>
    ),

    photo: (
      <div
        key="photo"
        className="relative flex flex-col items-center"
        style={{ marginTop: photoAfterBanner ? '-48px' : '24px', marginBottom: '12px' }}
      >
        {showPhoto ? (
          <img
            src={profile.photo}
            alt={profile.name || 'Profile'}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 shadow-xl"
            style={{ borderColor: 'rgba(255,255,255,0.5)' }}
          />
        ) : (
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 shadow-xl flex items-center justify-center text-2xl sm:text-3xl font-bold"
            style={{ borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}
          >
            {(profile.name || '?')[0]?.toUpperCase()}
          </div>
        )}
      </div>
    ),

    nameInfo: (
      <div key="nameInfo" className="flex flex-col items-center px-4 text-center">
        {profile.name && (
          <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.text }}>{profile.name}</h1>
        )}
        {profile.title && (
          <p className="text-sm sm:text-base mt-0.5 opacity-80" style={{ color: colors.text }}>{profile.title}</p>
        )}
        {profile.company && (
          <p className="text-xs sm:text-sm mt-0.5 opacity-60" style={{ color: colors.text }}>{profile.company}</p>
        )}
        {profile.bio && (
          <div className="px-4 sm:px-6 py-5 text-center mt-3">
            <p className="text-xs sm:text-sm opacity-70 leading-relaxed max-w-md mx-auto" style={{ color: colors.text }}>
              {profile.bio}
            </p>
          </div>
        )}
      </div>
    ),

    contact: contactItems.length > 0 ? (
      <div key="contact" className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4 sm:px-5 mt-5">
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
    ) : null,

    saveContact: (
      <div key="saveContact" className="flex justify-center px-4 sm:px-5 mt-5">
        <button
          onClick={() => { downloadVCard(card); trackEvent('vcardDownload') }}
          className="flex items-center gap-2 w-full justify-center px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] border-2"
          style={{ borderColor: colors.primary, color: colors.primary }}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Save Contact
        </button>
      </div>
    ),

    sections: (card.sections || []).filter(s => s.visible !== false).length > 0 ? (
      <div key="sections" className="px-4 sm:px-5 mt-5">
        {(card.sections || [])
          .filter(s => s.visible !== false)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((sec, i) => (
            <div key={i} className="rounded-xl sm:rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: `${colors.accent}08` }}>
              <SectionRenderer section={sec} card={card} colors={colors} onTrack={trackEvent} />
            </div>
          ))}
      </div>
    ) : null,

    social: (
      <div key="social" className="px-4 sm:px-5 pb-4 mt-4">
        <SocialLinksSection socialLinks={card.socialLinks} colors={colors} onTrack={trackEvent} />
      </div>
    ),
  }

  return (
    <div style={{ fontFamily, overflowWrap: 'break-word', wordBreak: 'break-word' }} className="overflow-hidden">
      {order.map(id => blocks[id])}
      {/* Footer always last */}
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
