/**
 * GlassLayout - Dark template
 * Dark gradient background, glassmorphism card, glowing photo ring, frosted buttons
 * Supports banner image and theme colors
 */
import React from 'react'
import { Download } from 'lucide-react'
import SectionRenderer from '../SectionRenderer'
import SocialLinksSection from '../sections/SocialLinksSection'

const DEFAULT_ORDER = ['banner', 'photo', 'nameInfo', 'contact', 'saveContact', 'sections', 'social']

export default function GlassLayout({ card, colors, template, contactItems, trackEvent, downloadVCard }) {
  const profile = card.profile || {}
  const fontFamily = card.theme?.fontFamily || template.fontFamily || 'Inter'
  const glowColor = colors.accent || colors.primary || '#22D3EE'
  const showPhoto = profile.showPhoto !== false && profile.photo
  const showBanner = profile.showBanner !== false && profile.bannerImage

  const order = card.contentOrder?.length ? card.contentOrder : DEFAULT_ORDER
  const visibleSections = (card.sections || [])
    .filter(s => s.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  const blocks = {
    banner: showBanner ? (
      <div key="banner" className="relative w-full h-36 sm:h-44">
        <img src={profile.bannerImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(15,23,42,0.9))' }} />
      </div>
    ) : null,
    photo: (
      <div key="photo" className="flex justify-center pt-6 sm:pt-8">
        {showPhoto ? (
          <div
            className="rounded-full p-1"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.accent})`,
              boxShadow: `0 0 30px ${glowColor}50, 0 0 60px ${glowColor}20`
            }}
          >
            <img
              src={profile.photo}
              alt={profile.name || 'Profile'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2"
              style={{ borderColor: 'rgba(15,23,42,0.8)' }}
            />
          </div>
        ) : (
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || colors.accent})`,
              boxShadow: `0 0 30px ${glowColor}50, 0 0 60px ${glowColor}20`,
              color: '#FFFFFF'
            }}
          >
            {(profile.name || '?')[0]?.toUpperCase()}
          </div>
        )}
      </div>
    ),
    nameInfo: (
      <div key="nameInfo" className="text-center mt-4 sm:mt-5 px-4 sm:px-6">
        {profile.name && (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold" style={{ color: colors.text || '#F1F5F9' }}>
              {profile.name}
            </h1>
            <div
              className="h-0.5 w-14 sm:w-16 mx-auto mt-2 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary || colors.accent})`,
                boxShadow: `0 0 10px ${glowColor}60`
              }}
            />
          </div>
        )}
        {profile.title && (
          <p className="text-sm sm:text-base mt-3 opacity-70" style={{ color: colors.text || '#F1F5F9' }}>{profile.title}</p>
        )}
        {profile.company && (
          <p className="text-xs sm:text-sm mt-0.5 opacity-50" style={{ color: colors.text || '#F1F5F9' }}>{profile.company}</p>
        )}
        {profile.bio && (
          <p className="text-xs sm:text-sm mt-3 sm:mt-4 max-w-md mx-auto opacity-60 leading-relaxed" style={{ color: colors.text || '#F1F5F9' }}>
            {profile.bio}
          </p>
        )}
      </div>
    ),
    contact: contactItems.length > 0 ? (
      <div key="contact" className="flex flex-wrap justify-center gap-2 sm:gap-3 px-4 sm:px-6 mt-5 sm:mt-6">
        {contactItems.map(({ key, icon: Icon, href, label }) => (
          <a
            key={key}
            href={href}
            target={key === 'website' ? '_blank' : undefined}
            rel={key === 'website' ? 'noopener noreferrer' : undefined}
            onClick={() => trackEvent('contactClick', key)}
            className="flex flex-col items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-medium transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: colors.text || '#F1F5F9'
            }}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" style={{ color: glowColor }} />
            <span className="truncate max-w-full">{label}</span>
          </a>
        ))}
      </div>
    ) : null,
    saveContact: (
      <div key="saveContact" className="flex justify-center px-4 sm:px-6 mt-4">
        <button
          onClick={() => { downloadVCard(card); trackEvent('vcardDownload') }}
          className="flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-medium transition-all hover:scale-105 active:scale-95"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${glowColor}40`,
            color: glowColor
          }}
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Save Contact
        </button>
      </div>
    ),
    sections: visibleSections.length > 0 ? (
      <div key="sections" className="px-4 sm:px-6 mt-5 sm:mt-6 space-y-2 sm:space-y-3">
        {visibleSections.map((sec, i) => (
          <div
            key={i}
            className="rounded-xl sm:rounded-2xl p-3 sm:p-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <SectionRenderer section={sec} card={card} colors={colors} onTrack={trackEvent} />
          </div>
        ))}
      </div>
    ) : null,
    social: (
      <div key="social" className="px-4 sm:px-6 pb-2 mt-4">
        <SocialLinksSection socialLinks={card.socialLinks} colors={colors} onTrack={trackEvent} />
      </div>
    ),
  }

  const bannerFirst = order[0] === 'banner' && showBanner
  const glassContentOrder = bannerFirst ? order.filter(id => id !== 'banner') : order

  return (
    <div style={{ fontFamily, overflowWrap: 'break-word', wordBreak: 'break-word' }} className="overflow-hidden">
      {bannerFirst && blocks.banner}

      <div
        className="rounded-2xl sm:rounded-3xl overflow-hidden"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          marginTop: bannerFirst ? '-1.5rem' : undefined,
          position: 'relative',
          zIndex: 10
        }}
      >
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary || colors.accent})` }} />

        {glassContentOrder.map(id => blocks[id])}

        <div className="text-center py-4 border-t mx-4 sm:mx-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
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
    </div>
  )
}
