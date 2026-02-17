import React from 'react'

const ImagesSection = ({ section = {}, colors = {} }) => {
  const images = Array.isArray(section.content) ? section.content : section.content?.images || []
  if (images.length === 0) return null
  const primary = colors.primary || '#8B5CF6'

  return (
    <div className="py-3 sm:py-4 px-2">
      {section.title && (
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" style={{ color: colors.text }}>
          {section.title}
        </h2>
      )}
      <div className={`grid gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {images.filter(Boolean).map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Gallery ${i + 1}`}
            className="w-full h-28 sm:h-32 object-cover rounded-lg"
            style={{ border: `1px solid ${primary}15` }}
          />
        ))}
      </div>
    </div>
  )
}

export default ImagesSection
