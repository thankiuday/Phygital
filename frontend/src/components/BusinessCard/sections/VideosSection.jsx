import React from 'react'

const VideosSection = ({ section = {}, colors = {} }) => {
  const videos = Array.isArray(section.content) ? section.content : section.content?.videos || []
  if (videos.length === 0) return null

  return (
    <div className="py-3 sm:py-4 px-2">
      {section.title && (
        <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3" style={{ color: colors.text }}>
          {section.title}
        </h2>
      )}
      <div className="space-y-3">
        {videos.filter(Boolean).map((url, i) => {
          const isYouTube = url.includes('youtube.com') || url.includes('youtu.be')
          const isVimeo = url.includes('vimeo.com')
          if (isYouTube || isVimeo) {
            let embedUrl = url
            if (isYouTube) {
              const id = url.match(/(?:v=|youtu\.be\/)([^&?]+)/)?.[1]
              embedUrl = `https://www.youtube.com/embed/${id}`
            } else {
              const id = url.match(/vimeo\.com\/(\d+)/)?.[1]
              embedUrl = `https://player.vimeo.com/video/${id}`
            }
            return (
              <div key={i} className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allowFullScreen title={`Video ${i+1}`} />
              </div>
            )
          }
          return (
            <video key={i} src={url} controls className="w-full rounded-lg" style={{ maxHeight: '300px' }}>
              Your browser does not support video playback.
            </video>
          )
        })}
      </div>
    </div>
  )
}

export default VideosSection
