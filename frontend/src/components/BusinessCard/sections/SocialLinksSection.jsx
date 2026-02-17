import React from 'react'
import { Instagram, Facebook, Twitter, Linkedin, Youtube, Github } from 'lucide-react'

const PLATFORM_MAP = {
  instagram: { icon: Instagram, base: 'https://instagram.com/' },
  facebook: { icon: Facebook, base: 'https://facebook.com/' },
  twitter: { icon: Twitter, base: 'https://x.com/' },
  linkedin: { icon: Linkedin, base: 'https://linkedin.com/in/' },
  youtube: { icon: Youtube, base: 'https://youtube.com/@' },
  github: { icon: Github, base: 'https://github.com/' },
  tiktok: { icon: null, base: 'https://tiktok.com/@', label: 'TikTok' },
  pinterest: { icon: null, base: 'https://pinterest.com/', label: 'Pinterest' },
  snapchat: { icon: null, base: 'https://snapchat.com/add/', label: 'Snapchat' },
  telegram: { icon: null, base: 'https://t.me/', label: 'Telegram' }
}

const SocialLinksSection = ({ socialLinks = {}, colors = {}, onTrack }) => {
  const track = (platform) => onTrack && onTrack('socialClick', platform)
  const entries = Object.entries(socialLinks).filter(([, val]) => val)

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 py-3 sm:py-4">
      {entries.map(([platform, value]) => {
        const config = PLATFORM_MAP[platform]
        if (!config) return null
        const href = value.startsWith('http') ? value : `${config.base}${value}`
        const Icon = config.icon
        return (
          <a
            key={platform}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track(platform)}
            className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all hover:scale-110"
            style={{ backgroundColor: colors.primary || '#8B5CF6', color: '#FFFFFF' }}
            title={platform}
          >
            {Icon ? <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> : <span className="text-[9px] sm:text-xs font-bold uppercase">{(config.label || platform).slice(0, 2)}</span>}
          </a>
        )
      })}
    </div>
  )
}

export default SocialLinksSection
