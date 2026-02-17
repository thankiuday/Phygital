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
      {/* Vertical (stacked) layout — one image per row */}
      <div className="flex flex-col gap-3">
        {images.filter(Boolean).map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Gallery ${i + 1}`}
            className="w-full rounded-lg object-cover"
            style={{ border: `1px solid ${primary}15`, maxHeight: '320px' }}
          />
        ))}
      </div>
    </div>
  )
}

export default ImagesSection
