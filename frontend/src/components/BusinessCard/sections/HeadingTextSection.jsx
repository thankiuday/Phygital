import React from 'react'

const HeadingTextSection = ({ section = {}, colors = {} }) => {
  const { title, content } = section
  const text = typeof content === 'string' ? content : content?.text || ''
  const primary = colors.primary || '#8B5CF6'

  return (
    <div
      className="py-3 sm:py-4 px-3 sm:px-4 my-2 rounded-lg sm:rounded-xl"
      style={{
        backgroundColor: `${primary}08`,
        borderLeft: `3px solid ${primary}`,
      }}
    >
      {title && (
        <h2 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2" style={{ color: colors.text }}>
          {title}
        </h2>
      )}
      {text && (
        <p className="text-xs sm:text-sm leading-relaxed opacity-80 whitespace-pre-line" style={{ color: colors.text }}>
          {text}
        </p>
      )}
    </div>
  )
}

export default HeadingTextSection
