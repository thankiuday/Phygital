/**
 * MinimalLayout - Minimal template
 * No header/banner, small centered photo, text-link contacts, maximum whitespace
 * Supports banner image and theme colors
 */
import React from 'react'
import { Download } from 'lucide-react'
import SectionRenderer from '../SectionRenderer'
import SocialLinksSection from '../sections/SocialLinksSection'

const DEFAULT_ORDER = ['banner', 'photo', 'nameInfo', 'contact', 'saveContact', 'sections', 'social']

export default function MinimalLayout({ card, colors, template, contactItems, trackEvent, downloadVCard }) {
  const profile = card.profile || {}
  const fontFamily = card.theme?.fontFamily || template.fontFamily || 'Inter'
  const showPhoto = profile.showPhoto !== false && profile.photo
  const showBanner = profile.showBanner !== false && profile.bannerImage
  const order = card.contentOrder?.length ? card.contentOrder : DEFAULT_ORDER
  const visibleSections = (card.sections || []).filter(s => s.visible !== false)

  const blocks = {
    banner: showBanner ? (
      <div key="banner" className="w-full h-28 sm:h-36">
        <img src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
      </div>
    ) : null,

    photo: (
      <div key="photo" className="flex justify-center mb-5 sm:mb-6">
        {showPhoto ? (
          <img
            src={profile.photo}
            alt={profile.name || 'Profile'}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
            style={{ border: `1px solid ${colors.secondary || '#E5E7EB'}` }}
          />
        ) : (
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-lg sm:text-xl font-medium"
            style={{ border: `1px solid ${colors.secondary || '#E5E7EB'}`, color: colors.text }}
          >
            {(profile.name || '?')[0]?.toUpperCase()}
          </div>
        )}
      </div>
    ),

    nameInfo: (
      <div key="nameInfo" className="text-center">
        {profile.name && (
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: colors.text }}>
            {profile.name}
          </h1>
        )}
        {profile.title && (
          <p className="text-xs sm:text-sm mt-2" style={{ color: colors.secondary || '#9CA3AF' }}>
            {profile.title}
          </p>
        )}
        {profile.company && (
          <p className="text-xs mt-0.5" style={{ color: colors.secondary || '#D1D5DB' }}>
            {profile.company}
          </p>
        )}
        {profile.bio && (
          <p className="text-xs sm:text-sm mt-5 sm:mt-6 text-center max-w-sm mx-auto leading-relaxed" style={{ color: colors.secondary || '#6B7280' }}>
            {profile.bio}
          </p>
        )}
      </div>
    ),

    contact: contactItems.length > 0 ? (
      <div key="contact" className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-8 sm:mt-10">
        {contactItems.map(({ key, href, label, icon: Icon }) => (
          <a
            key={key}
            href={href}
            target={key === 'website' ? '_blank' : undefined}
            rel={key === 'website' ? 'noopener noreferrer' : undefined}
            onClick={() => trackEvent('contactClick', key)}
            className="flex items-center gap-2 text-xs sm:text-sm transition-opacity hover:opacity-70 underline underline-offset-4 decoration-1"
            style={{ color: colors.text, textDecorationColor: colors.secondary || '#D1D5DB' }}
          >
            <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-40 flex-shrink-0" />
            <span className="truncate max-w-[200px]">{label}</span>
          </a>
        ))}
      </div>
    ) : null,

    saveContact: (
      <div key="saveContact" className="flex justify-center mt-6 sm:mt-8">
        <button
          onClick={() => { downloadVCard(card); trackEvent('vcardDownload') }}
          className="flex items-center gap-2 text-xs sm:text-sm transition-opacity hover:opacity-70 underline underline-offset-4 decoration-1"
          style={{ color: colors.text, textDecorationColor: colors.secondary || '#D1D5DB' }}
        >
          <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5 opacity-40" />
          Save Contact
        </button>
      </div>
    ),

    sections: visibleSections.length > 0 ? (
      <div key="sections" className="mt-8 sm:mt-10 space-y-5 sm:space-y-6">
        {visibleSections
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((sec, i) => (
            <div key={i} className="border-t pt-4" style={{ borderColor: '#F3F4F6' }}>
              <SectionRenderer section={sec} card={card} colors={colors} onTrack={trackEvent} />
            </div>
          ))}
      </div>
    ) : null,

    social: (
      <div key="social" className="pb-2 mt-5 sm:mt-6">
        <SocialLinksSection socialLinks={card.socialLinks} colors={colors} onTrack={trackEvent} />
      </div>
    ),
  }

  return (
    <div style={{ fontFamily, overflowWrap: 'break-word', wordBreak: 'break-word' }} className="overflow-hidden">
      {order.map((id, i) => {
        const el = blocks[id]
        if (!el) return null
        if (id === 'banner') return el
        const isFirstContent = order.slice(0, i).every(x => x === 'banner')
        return (
          <div key={id} className={`px-5 sm:px-8 ${isFirstContent ? 'pt-8 sm:pt-12' : ''}`}>
            {el}
          </div>
        )
      })}
      {/* Footer always last */}
      <div className="text-center pt-6 sm:pt-8 mt-6 sm:mt-8 border-t px-5 sm:px-8 pb-8 sm:pb-12" style={{ borderColor: '#F3F4F6' }}>
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
