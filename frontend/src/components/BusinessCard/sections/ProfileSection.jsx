import React from 'react'

const ProfileSection = ({ profile = {}, colors = {} }) => {
  const { photo, name, title, company, bio } = profile
  return (
    <div className="text-center py-6">
      {photo && (
        <div className="flex justify-center mb-4">
          <img
            src={photo}
            alt={name || 'Profile'}
            className="w-28 h-28 rounded-full object-cover border-4 shadow-lg"
            style={{ borderColor: colors.primary || '#8B5CF6' }}
          />
        </div>
      )}
      {name && <h1 className="text-2xl font-bold" style={{ color: colors.text }}>{name}</h1>}
      {title && <p className="text-base mt-1 opacity-80" style={{ color: colors.text }}>{title}</p>}
      {company && <p className="text-sm mt-0.5 opacity-60" style={{ color: colors.text }}>{company}</p>}
      {bio && <p className="text-sm mt-3 max-w-sm mx-auto opacity-70 leading-relaxed" style={{ color: colors.text }}>{bio}</p>}
    </div>
  )
}

export default ProfileSection
