/**
 * vCard (.vcf) generator for Digital Business Cards.
 * Generates a VCF 3.0 file string and triggers download.
 * Works across desktop and mobile browsers.
 */

export function generateVCard(card) {
  if (!card) return ''
  const { profile = {}, contact = {}, socialLinks = {} } = card
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0'
  ]

  // Name
  if (profile.name) {
    const parts = profile.name.trim().split(/\s+/)
    const last = parts.length > 1 ? parts.pop() : ''
    const first = parts.join(' ')
    lines.push(`N:${escapeVCard(last)};${escapeVCard(first)};;;`)
    lines.push(`FN:${escapeVCard(profile.name)}`)
  }

  // Title & Org
  if (profile.title) lines.push(`TITLE:${escapeVCard(profile.title)}`)
  if (profile.company) lines.push(`ORG:${escapeVCard(profile.company)}`)

  // Phone
  if (contact.phone) lines.push(`TEL;TYPE=CELL:${contact.phone}`)

  // Email
  if (contact.email) lines.push(`EMAIL;TYPE=INTERNET:${contact.email}`)

  // Website
  if (contact.website) {
    const url = contact.website.startsWith('http') ? contact.website : `https://${contact.website}`
    lines.push(`URL:${url}`)
  }

  // Photo URL
  if (profile.photo) {
    lines.push(`PHOTO;VALUE=URI:${profile.photo}`)
  }

  // Note / Bio
  if (profile.bio) {
    lines.push(`NOTE:${escapeVCard(profile.bio)}`)
  }

  // Social profiles as X- fields
  const socials = Object.entries(socialLinks).filter(([, v]) => v)
  for (const [platform, handle] of socials) {
    const url = handle.startsWith('http') ? handle : `https://${platform}.com/${handle}`
    lines.push(`X-SOCIALPROFILE;TYPE=${platform}:${url}`)
  }

  lines.push('END:VCARD')
  return lines.join('\r\n')
}

function escapeVCard(str) {
  if (!str) return ''
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function downloadVCard(card) {
  if (!card) return

  try {
    const vcfString = generateVCard(card)
    const fileName = `${(card.profile?.name || 'contact').replace(/[^a-zA-Z0-9]/g, '_')}.vcf`
    const blob = new Blob([vcfString], { type: 'text/vcard;charset=utf-8' })

    // Try native share API on mobile (better for iOS/Android)
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      const file = new File([blob], fileName, { type: 'text/vcard' })
      navigator.share({ files: [file], title: card.profile?.name || 'Contact' }).catch(() => {
        fallbackDownload(blob, fileName)
      })
      return
    }

    fallbackDownload(blob, fileName)
  } catch (err) {
    console.error('vCard download error:', err)
    // Last resort: open data URI
    try {
      const vcfString = generateVCard(card)
      const dataUri = 'data:text/vcard;charset=utf-8,' + encodeURIComponent(vcfString)
      window.open(dataUri, '_blank')
    } catch (e) {
      console.error('vCard fallback error:', e)
    }
  }
}

function fallbackDownload(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)

  // Use click event for broader compatibility
  if (typeof a.click === 'function') {
    a.click()
  } else {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window })
    a.dispatchEvent(event)
  }

  // Cleanup after a delay
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 250)
}
