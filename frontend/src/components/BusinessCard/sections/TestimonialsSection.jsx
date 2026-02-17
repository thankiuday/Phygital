import React from 'react'

const TestimonialsSection = ({ section = {}, colors = {} }) => {
  const testimonials = Array.isArray(section.content) ? section.content : section.content?.testimonials || []
  if (testimonials.length === 0) return null
  const primary = colors.primary || '#8B5CF6'

  return (
    <div className="py-3 sm:py-4 px-2">
      {section.title && (
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" style={{ color: colors.text }}>
          {section.title}
        </h2>
      )}
      <div className="space-y-2 sm:space-y-3">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className="p-3 sm:p-4 rounded-lg sm:rounded-xl"
            style={{ backgroundColor: `${primary}08`, borderLeft: `3px solid ${primary}30` }}
          >
            <p className="text-xs sm:text-sm italic leading-relaxed opacity-80" style={{ color: colors.text }}>
              "{t.text}"
            </p>
            {t.author && (
              <p className="text-[10px] sm:text-xs font-semibold mt-1.5 sm:mt-2 opacity-60" style={{ color: colors.text }}>
                — {t.author}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default TestimonialsSection
