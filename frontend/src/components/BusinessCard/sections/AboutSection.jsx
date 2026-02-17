import React from 'react'

const AboutSection = ({ section = {}, colors = {} }) => {
  const text = typeof section.content === 'string' ? section.content : section.content?.text || ''
  const primary = colors.primary || '#8B5CF6'

  return (
    <div
      className="py-3 sm:py-4 px-3 sm:px-4 my-2 rounded-lg sm:rounded-xl"
      style={{
        backgroundColor: `${primary}08`,
        borderLeft: `3px solid ${primary}`,
      }}
    >
      <h2 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2" style={{ color: colors.text }}>
        {section.title || 'About'}
      </h2>
      <p className="text-xs sm:text-sm leading-relaxed opacity-80 whitespace-pre-line" style={{ color: colors.text }}>
        {text}
      </p>
    </div>
  )
}

export default AboutSection
