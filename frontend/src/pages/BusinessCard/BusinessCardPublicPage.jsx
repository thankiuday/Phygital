/**
 * BusinessCardPublicPage
 * Renders a published business card at /card/:slug
 * No authentication required.
 * Delegates rendering to layout-specific components based on template.layout.
 * Sends referrer + source info to analytics on load and interaction.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Phone, Mail, MessageCircle, Globe, MessageSquare, Loader2 } from 'lucide-react'
import axios from 'axios'
import { getBusinessCardTemplate, mergeThemeColors } from '../../config/businessCardTemplates'
import { getLayout } from '../../components/BusinessCard/layouts'
import { downloadVCard } from '../../utils/vcardGenerator'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function BusinessCardPublicPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const viewTracked = useRef(false)

  // Detect source from URL params
  const detectedSource = searchParams.get('utm_source') === 'qr' || searchParams.get('source') === 'qr' || searchParams.get('ref') === 'qr'
    ? 'qr' : ''

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    const params = detectedSource ? `?source=${detectedSource}` : ''
    axios.get(`${API_BASE}/business-cards/public/${slug}${params}`)
      .then(res => {
        if (res.data?.data?.card) setCard(res.data.data.card)
        else setError('Card not found')
      })
      .catch(() => setError('Card not found or no longer available'))
      .finally(() => setLoading(false))
  }, [slug, detectedSource])

  const trackEvent = useCallback((event, target = '') => {
    axios.post(`${API_BASE}/business-cards/public/${slug}/track`, {
      event,
      target,
      referrer: document.referrer || '',
      source: detectedSource || ''
    }).catch(() => {})
  }, [slug, detectedSource])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-gradient" />
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-400 px-4 text-center">
        <h1 className="text-2xl font-bold mb-2 text-slate-100">Card Not Found</h1>
        <p className="text-sm">{error || 'This business card does not exist or is not published.'}</p>
      </div>
    )
  }

  const template = getBusinessCardTemplate(card.templateId)
  const colors = mergeThemeColors(template, card.theme || {})
  const fontFamily = card.theme?.fontFamily || template.fontFamily || 'Inter'

  const bgStyle = colors.background?.includes('gradient') || colors.background?.includes('linear')
    ? { background: colors.background }
    : { backgroundColor: colors.background || '#F8FAFC' }

  const cardStyle = card.theme?.cardStyle || template.cardStyle || 'rounded'
  const cardRadius = cardStyle === 'sharp' ? '0px' : cardStyle === 'glass' ? '20px' : '16px'
  const cardBg = cardStyle === 'glass'
    ? { backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.18)' }
    : { backgroundColor: colors.card || '#FFFFFF' }

  const contact = card.contact || {}
  const contactItems = [
    { key: 'phone', icon: Phone, href: `tel:${contact.phone}`, label: 'Call' },
    { key: 'email', icon: Mail, href: `mailto:${contact.email}`, label: 'Email' },
    { key: 'whatsapp', icon: MessageCircle, href: `https://wa.me/${(contact.whatsapp || '').replace(/[^0-9]/g, '')}`, label: 'WhatsApp' },
    { key: 'sms', icon: MessageSquare, href: `sms:${contact.sms}`, label: 'SMS' },
    { key: 'website', icon: Globe, href: contact.website?.startsWith('http') ? contact.website : `https://${contact.website}`, label: 'Website' }
  ].filter(i => contact[i.key])

  const LayoutComponent = getLayout(template.layout)

  return (
    <div className="min-h-screen flex items-start justify-center py-6 px-4" style={{ ...bgStyle, fontFamily }}>
      <div
        className="w-full max-w-md sm:max-w-lg shadow-2xl overflow-hidden"
        style={{ ...cardBg, borderRadius: cardRadius }}
      >
        <LayoutComponent
          card={card}
          colors={colors}
          template={template}
          contactItems={contactItems}
          trackEvent={trackEvent}
          downloadVCard={downloadVCard}
        />
      </div>
    </div>
  )
}
