import React from 'react'
import { ExternalLink } from 'lucide-react'

const LinksSection = ({ section = {}, colors = {}, onTrack }) => {
  const links = Array.isArray(section.content) ? section.content : section.content?.links || []
  if (links.length === 0) return null
  const primary = colors.primary || '#8B5CF6'

  return (
    <div className="py-3 sm:py-4 px-2">
      {section.title && (
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" style={{ color: colors.text }}>
          {section.title}
        </h2>
      )}
      <div className="space-y-2">
        {links.map((link, i) => (
          <a
            key={i}
            href={link.url?.startsWith('http') ? link.url : `https://${link.url}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onTrack && onTrack('linkClick', link.label || link.url)}
            className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-all hover:scale-[1.02]"
            style={{ backgroundColor: `${primary}10`, color: colors.text, border: `1px solid ${primary}15` }}
          >
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: primary }} />
            <span className="text-xs sm:text-sm font-medium truncate">{link.label || link.url}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default LinksSection
