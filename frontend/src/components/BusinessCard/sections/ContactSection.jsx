import React from 'react'
import { Phone, Mail, MessageCircle, Globe, MessageSquare } from 'lucide-react'

const ContactSection = ({ contact = {}, colors = {}, onTrack }) => {
  const track = (key) => onTrack && onTrack('contactClick', key)
  const items = [
    { key: 'phone', icon: Phone, href: `tel:${contact.phone}`, label: 'Call' },
    { key: 'email', icon: Mail, href: `mailto:${contact.email}`, label: 'Email' },
    { key: 'whatsapp', icon: MessageCircle, href: `https://wa.me/${(contact.whatsapp || '').replace(/[^0-9]/g, '')}`, label: 'WhatsApp' },
    { key: 'sms', icon: MessageSquare, href: `sms:${contact.sms}`, label: 'SMS' },
    { key: 'website', icon: Globe, href: contact.website?.startsWith('http') ? contact.website : `https://${contact.website}`, label: 'Website' }
  ].filter(i => contact[i.key])

  if (items.length === 0) return null

  return (
    <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:justify-center gap-2 sm:gap-3 py-3 sm:py-4">
      {items.map(({ key, icon: Icon, href, label }) => (
        <a
          key={key}
          href={href}
          target={key === 'website' ? '_blank' : undefined}
          rel={key === 'website' ? 'noopener noreferrer' : undefined}
          onClick={() => track(key)}
          className="flex flex-col items-center gap-1 px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-medium transition-all hover:scale-105"
          style={{ backgroundColor: colors.primary || '#8B5CF6', color: '#FFFFFF' }}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="truncate max-w-full">{label}</span>
        </a>
      ))}
    </div>
  )
}

export default ContactSection
