/**
 * PrintableCardPreview
 * Phygital-branded printable card with multiple front/back layout options,
 * field toggles, photo zoom/pan, font size adjustment, dark/light theme,
 * and premium print-quality download.
 *
 * PRINT QUALITY:
 * - Captures visible preview with toPng at 1050x600 + pixelRatio 6 = 6300x3600 output (1800 DPI)
 * - QR code generated at 1200px for razor-sharp scanning
 * - Profile photos loaded at full Cloudinary resolution (q_100,f_png)
 * - Font scale adjustable per side (front/back) from 60% to 160%
 * - Light theme available for physical print (white bg, dark text)
 */

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { toPng } from 'html-to-image'
import toast from 'react-hot-toast'
import {
  Download, RotateCcw, Loader2, Settings2, LayoutGrid,
  ZoomIn, Move, RotateCw, Type, Sun, Moon
} from 'lucide-react'
import { generateAdvancedQRCode } from '../../utils/qrGenerator'

// ── Dark Theme ──
const DARK = {
  bg: '#0f172a',
  bgCard: '#1e293b',
  bgSubtle: '#334155',
  neonBlue: '#00d4ff',
  neonPurple: '#a855f7',
  neonPink: '#ec4899',
  white: '#FFFFFF',
  txt1: '#f1f5f9',
  txt2: '#94a3b8',
  txt3: '#64748b',
  glass: 'rgba(255,255,255,0.08)',
  glassLight: 'rgba(255,255,255,0.05)',
  qrBg: '#FFFFFF',
}

// ── Light Theme (print-friendly) ──
const LIGHT = {
  bg: '#FFFFFF',
  bgCard: '#f8fafc',
  bgSubtle: '#e2e8f0',
  neonBlue: '#0284c7',
  neonPurple: '#7c3aed',
  neonPink: '#db2777',
  white: '#0f172a',
  txt1: '#1e293b',
  txt2: '#475569',
  txt3: '#64748b',
  glass: 'rgba(0,0,0,0.06)',
  glassLight: 'rgba(0,0,0,0.03)',
  qrBg: '#FFFFFF',
}

function makeGradient(c) {
  return `linear-gradient(90deg, ${c.neonBlue}, ${c.neonPurple}, ${c.neonPink})`
}

const FONT = "'Inter', system-ui, sans-serif"
const BASE_W = 1050, BASE_H = 600, PX = 6

function hiResPhoto(url) {
  if (!url) return ''
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/q_100,f_png/')
  }
  return url
}

const FIELD_OPTIONS = [
  { key: 'name', label: 'Name', default: true, required: true },
  { key: 'title', label: 'Job Title', default: true },
  { key: 'company', label: 'Company', default: true },
  { key: 'photo', label: 'Profile Photo', default: true },
  { key: 'phone', label: 'Phone', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'website', label: 'Website', default: true },
  { key: 'whatsapp', label: 'WhatsApp', default: false },
  { key: 'bio', label: 'Short Bio', default: false },
]

function gv(card, key) {
  switch (key) {
    case 'name': return card?.profile?.name || ''
    case 'title': return card?.profile?.title || ''
    case 'company': return card?.profile?.company || ''
    case 'photo': return card?.profile?.photo || ''
    case 'phone': return card?.contact?.phone || ''
    case 'email': return card?.contact?.email || ''
    case 'website': return card?.contact?.website || ''
    case 'whatsapp': return card?.contact?.whatsapp || ''
    case 'bio': return card?.profile?.bio || ''
    default: return ''
  }
}

// ═══════════════════════════════════════════════════════════
//  LAYOUT DEFINITIONS
// ═══════════════════════════════════════════════════════════
const FRONT_LAYOUTS = [
  { id: 'classic', name: 'Classic', desc: 'Text left, photo right' },
  { id: 'centered', name: 'Centered', desc: 'Photo top, text centered' },
  { id: 'leftPhoto', name: 'Left Photo', desc: 'Large photo left side' },
  { id: 'minimal', name: 'Minimal', desc: 'Text-only, no photo' },
  { id: 'bold', name: 'Bold', desc: 'Large name, compact info' },
]

const BACK_LAYOUTS = [
  { id: 'qrCenter', name: 'QR Center', desc: 'QR code centered' },
  { id: 'qrLeft', name: 'QR + Info', desc: 'QR left, info right' },
  { id: 'qrMinimal', name: 'QR Minimal', desc: 'Small QR, large name' },
  { id: 'qrBrand', name: 'QR Branded', desc: 'QR with brand strip' },
]

// ═══════════════════════════════════════════════════════════
//  SHARED DECORATIONS (accept `colors`)
// ═══════════════════════════════════════════════════════════
function NeonLine({ pos = 'top', h = 3, colors }) {
  return <div className={`absolute ${pos}-0 left-0 right-0 z-20`} style={{ height: `${h}px`, background: makeGradient(colors) }} />
}
function GlowOrb({ top, left, bottom, right, color, size = 40, opacity = 0.07 }) {
  return (
    <div className="absolute rounded-full" style={{
      top, left, bottom, right,
      width: `${size}px`, height: `${size}px`, opacity,
      background: `radial-gradient(circle, ${color}, transparent 70%)`
    }} />
  )
}
function BrandTag() {
  return null
}

function ContactRow({ phone, email, website, whatsapp, fontScale = 1, colors }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  const items = [
    phone && { icon: <PhoneIcon />, color: colors.neonBlue, text: phone },
    email && { icon: <EmailIcon />, color: colors.neonPurple, text: email },
    website && { icon: <WebIcon />, color: colors.neonPink, text: website },
    whatsapp && { icon: <WhatsAppIcon />, color: colors.neonBlue, text: whatsapp },
  ].filter(Boolean)
  if (!items.length) return null
  return (
    <div className="space-y-[4px]">
      {items.map((it, i) => (
        <p key={i} className="flex items-center gap-2" style={{ color: colors.txt2, fontSize: sz(15) }}>
          <span style={{ color: it.color, display: 'flex', alignItems: 'center' }}>{it.icon}</span>
          <span className="truncate">{it.text}</span>
        </p>
      ))}
    </div>
  )
}

function PhotoBox({ src, zoom, offX, offY, size = 90, rounded = '16px', colors }) {
  if (!src) return null
  const imgSrc = hiResPhoto(src)
  return (
    <div className="overflow-hidden flex-shrink-0" style={{
      width: `${size}px`, height: `${size}px`, borderRadius: rounded,
      border: `2px solid ${colors.glass}`, boxShadow: `0 0 20px ${colors.neonPurple}20`,
    }}>
      <img src={imgSrc} alt="" draggable={false} crossOrigin="anonymous" className="w-full h-full"
        style={{ objectFit: 'cover', transform: `scale(${zoom||1}) translate(${offX||0}px, ${offY||0}px)`, transformOrigin: 'center' }} />
    </div>
  )
}

function QRBlock({ url, size = 96, colors }) {
  return url ? (
    <div className="rounded-xl p-2.5" style={{ backgroundColor: colors.qrBg, boxShadow: `0 0 30px ${colors.neonBlue}15, 0 0 60px ${colors.neonPurple}10` }}>
      <img src={url} alt="QR Code" style={{ width: `${size}px`, height: `${size}px`, imageRendering: 'pixelated' }} />
    </div>
  ) : (
    <div className="rounded-xl flex items-center justify-center" style={{ width: `${size + 20}px`, height: `${size + 20}px`, backgroundColor: colors.glassLight, border: `1px solid ${colors.glass}` }}>
      <span className="text-[10px]" style={{ color: colors.txt3 }}>QR Code</span>
    </div>
  )
}

function BrandFooter() {
  return null
}

// ═══════════════════════════════════════════════════════════
//  FRONT LAYOUTS (print-friendly font sizes)
// ═══════════════════════════════════════════════════════════
function FrontClassic({ v, photoZoom, photoOffsetX, photoOffsetY, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  const ng = makeGradient(colors)
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb top="-10px" right="-10px" color={colors.neonPurple} size={160} />
      <GlowOrb bottom="-6px" left="-6px" color={colors.neonBlue} size={112} opacity={0.05} />
      <div className="relative z-10 w-full h-full flex items-stretch p-5 gap-4">
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <BrandTag colors={colors} />
          <div className="my-auto">
            <h1 className="font-extrabold leading-tight tracking-tight truncate" style={{ color: colors.white, fontSize: sz(34) }}>{v.name}</h1>
            {(v.title || v.company) && <p className="font-medium mt-1.5 truncate" style={{ color: colors.txt2, fontSize: sz(17) }}>{[v.title, v.company].filter(Boolean).join('  ·  ')}</p>}
            {v.bio && <p className="mt-2 leading-relaxed line-clamp-2" style={{ color: colors.txt3, fontSize: sz(13) }}>{v.bio}</p>}
          </div>
          <ContactRow phone={v.phone} email={v.email} website={v.website} whatsapp={v.whatsapp} fontScale={fontScale} colors={colors} />
        </div>
        {v.photo && (
          <div className="flex items-center justify-center flex-shrink-0">
            <PhotoBox src={v.photo} zoom={photoZoom} offX={photoOffsetX} offY={photoOffsetY} colors={colors} />
          </div>
        )}
      </div>
    </div>
  )
}

function FrontCentered({ v, photoZoom, photoOffsetX, photoOffsetY, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb top="-20px" left="50%" color={colors.neonPurple} size={200} opacity={0.06} />
      <GlowOrb bottom="-10px" right="-10px" color={colors.neonBlue} size={120} opacity={0.04} />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6">
        <BrandTag colors={colors} />
        {v.photo && (
          <div className="mt-2 mb-2">
            <PhotoBox src={v.photo} zoom={photoZoom} offX={photoOffsetX} offY={photoOffsetY} size={72} rounded="50%" colors={colors} />
          </div>
        )}
        <h1 className="font-extrabold leading-tight tracking-tight" style={{ color: colors.white, fontSize: sz(36) }}>{v.name}</h1>
        {(v.title || v.company) && <p className="font-medium mt-1 truncate max-w-[80%]" style={{ color: colors.txt2, fontSize: sz(17) }}>{[v.title, v.company].filter(Boolean).join('  ·  ')}</p>}
        {v.bio && <p className="mt-1.5 leading-relaxed line-clamp-2 max-w-[75%]" style={{ color: colors.txt3, fontSize: sz(13) }}>{v.bio}</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-[3px]">
          {v.phone && <p className="flex items-center gap-1.5" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonBlue, display:'flex' }}><PhoneIcon /></span>{v.phone}</p>}
          {v.email && <p className="flex items-center gap-1.5" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonPurple, display:'flex' }}><EmailIcon /></span>{v.email}</p>}
          {v.website && <p className="flex items-center gap-1.5" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonPink, display:'flex' }}><WebIcon /></span>{v.website}</p>}
        </div>
      </div>
    </div>
  )
}

function FrontLeftPhoto({ v, photoZoom, photoOffsetX, photoOffsetY, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb top="-10px" left="-10px" color={colors.neonPurple} size={160} opacity={0.06} />
      <div className="relative z-10 w-full h-full flex items-stretch">
        {v.photo ? (
          <div className="w-[40%] h-full relative overflow-hidden flex-shrink-0">
            <img src={hiResPhoto(v.photo)} alt="" crossOrigin="anonymous" className="w-full h-full" style={{
              objectFit: 'cover',
              transform: `scale(${photoZoom||1}) translate(${photoOffsetX||0}px, ${photoOffsetY||0}px)`,
              transformOrigin: 'center'
            }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent 60%, ${colors.bg})` }} />
          </div>
        ) : (
          <div className="w-[40%] h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${colors.neonPurple}20, ${colors.neonBlue}10)` }}>
            <span className="font-black" style={{ color: colors.neonPurple + '40', fontSize: sz(48) }}>{(v.name || '?')[0]}</span>
          </div>
        )}
        <div className="flex-1 flex flex-col justify-between p-5 min-w-0">
          <BrandTag colors={colors} />
          <div className="my-auto">
            <h1 className="font-extrabold leading-tight" style={{ color: colors.white, fontSize: sz(32) }}>{v.name}</h1>
            {v.title && <p className="font-medium mt-1 truncate" style={{ color: colors.txt2, fontSize: sz(17) }}>{v.title}</p>}
            {v.company && <p className="mt-0.5 truncate" style={{ color: colors.txt3, fontSize: sz(16) }}>{v.company}</p>}
            {v.bio && <p className="mt-2 leading-relaxed line-clamp-3" style={{ color: colors.txt3, fontSize: sz(13) }}>{v.bio}</p>}
          </div>
          <ContactRow phone={v.phone} email={v.email} website={v.website} whatsapp={v.whatsapp} fontScale={fontScale} colors={colors} />
        </div>
      </div>
    </div>
  )
}

function FrontMinimal({ v, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  const ng = makeGradient(colors)
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb bottom="-20px" right="-20px" color={colors.neonPink} size={180} opacity={0.05} />
      <div className="relative z-10 w-full h-full flex flex-col justify-center px-8">
        <BrandTag colors={colors} />
        <div className="h-[2px] w-12 mt-3 mb-4 rounded-full" style={{ background: ng }} />
        <h1 className="font-extrabold leading-tight tracking-tight" style={{ color: colors.white, fontSize: sz(42) }}>{v.name}</h1>
        {(v.title || v.company) && <p className="font-medium mt-2" style={{ color: colors.txt2, fontSize: sz(18) }}>{[v.title, v.company].filter(Boolean).join('  ·  ')}</p>}
        {v.bio && <p className="mt-3 leading-relaxed max-w-[70%] line-clamp-2" style={{ color: colors.txt3, fontSize: sz(14) }}>{v.bio}</p>}
        <div className="mt-auto mb-1">
          <div className="flex flex-wrap gap-x-5 gap-y-[4px]">
            {v.phone && <p className="flex items-center gap-2" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonBlue, display:'flex' }}><PhoneIcon /></span>{v.phone}</p>}
            {v.email && <p className="flex items-center gap-2" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonPurple, display:'flex' }}><EmailIcon /></span>{v.email}</p>}
            {v.website && <p className="flex items-center gap-2" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonPink, display:'flex' }}><WebIcon /></span>{v.website}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function FrontBold({ v, photoZoom, photoOffsetX, photoOffsetY, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  const ng = makeGradient(colors)
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb top="-30px" left="30%" color={colors.neonPurple} size={240} opacity={0.05} />
      <div className="relative z-10 w-full h-full p-5 flex flex-col">
        <div className="flex items-start justify-between">
          <BrandTag colors={colors} />
          {v.photo && <PhotoBox src={v.photo} zoom={photoZoom} offX={photoOffsetX} offY={photoOffsetY} size={60} rounded="12px" colors={colors} />}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="font-black leading-[1.1] tracking-tight" style={{
            background: ng, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: sz(48),
          }}>{v.name}</h1>
          {v.title && <p className="font-semibold mt-2" style={{ color: colors.white, fontSize: sz(20) }}>{v.title}</p>}
          {v.company && <p className="mt-0.5" style={{ color: colors.txt3, fontSize: sz(16) }}>{v.company}</p>}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-[4px]">
          {v.phone && <p className="flex items-center gap-2" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonBlue, display:'flex' }}><PhoneIcon /></span>{v.phone}</p>}
          {v.email && <p className="flex items-center gap-2" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonPurple, display:'flex' }}><EmailIcon /></span>{v.email}</p>}
          {v.website && <p className="flex items-center gap-2" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonPink, display:'flex' }}><WebIcon /></span>{v.website}</p>}
          {v.whatsapp && <p className="flex items-center gap-2" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonBlue, display:'flex' }}><WhatsAppIcon /></span>{v.whatsapp}</p>}
        </div>
      </div>
    </div>
  )
}

const FRONT_COMPONENTS = {
  classic: FrontClassic,
  centered: FrontCentered,
  leftPhoto: FrontLeftPhoto,
  minimal: FrontMinimal,
  bold: FrontBold,
}

// ═══════════════════════════════════════════════════════════
//  BACK LAYOUTS (print-friendly font sizes)
// ═══════════════════════════════════════════════════════════
function BackQRCenter({ card, qrDataUrl, vf, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  const ng = makeGradient(colors)
  const name = vf.name ? (card?.profile?.name || '') : ''
  const company = vf.company ? (card?.profile?.company || '') : ''
  const displayName = name || company
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb bottom="-10px" right="-10px" color={colors.neonPink} size={160} />
      <GlowOrb top="-6px" left="-6px" color={colors.neonBlue} size={112} opacity={0.05} />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6">
        <QRBlock url={qrDataUrl} colors={colors} />
        <p className="font-bold tracking-wide mt-3" style={{ background: ng, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: sz(18) }}>Scan to connect</p>
        {displayName && <p className="mt-1" style={{ color: colors.txt3, fontSize: sz(15) }}>{displayName}</p>}
        <BrandFooter colors={colors} />
      </div>
    </div>
  )
}

function BackQRLeft({ card, qrDataUrl, vf, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  const ng = makeGradient(colors)
  const name = vf.name ? (card?.profile?.name || '') : ''
  const title = vf.title ? (card?.profile?.title || '') : ''
  const company = vf.company ? (card?.profile?.company || '') : ''
  const phone = vf.phone ? (card?.contact?.phone || '') : ''
  const email = vf.email ? (card?.contact?.email || '') : ''
  const website = vf.website ? (card?.contact?.website || '') : ''
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb top="-10px" right="-10px" color={colors.neonPurple} size={140} opacity={0.06} />
      <div className="relative z-10 w-full h-full flex items-center p-6 gap-6">
        <div className="flex flex-col items-center flex-shrink-0">
          <QRBlock url={qrDataUrl} size={100} colors={colors} />
          <p className="font-bold tracking-wide mt-2" style={{ background: ng, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: sz(14) }}>Scan to connect</p>
        </div>
        <div className="w-[1px] h-[70%] rounded-full" style={{ background: ng, opacity: 0.3 }} />
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {name && <h2 className="font-bold truncate" style={{ color: colors.white, fontSize: sz(28) }}>{name}</h2>}
          {(title || company) && <p className="mt-1 truncate" style={{ color: colors.txt2, fontSize: sz(16) }}>{[title, company].filter(Boolean).join(' · ')}</p>}
          {(phone || email || website) && (
            <div className="mt-3 space-y-[4px]">
              {phone && <p className="flex items-center gap-2 truncate" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonBlue, display:'flex' }}><PhoneIcon /></span>{phone}</p>}
              {email && <p className="flex items-center gap-2 truncate" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonPurple, display:'flex' }}><EmailIcon /></span>{email}</p>}
              {website && <p className="flex items-center gap-2 truncate" style={{ color: colors.txt2, fontSize: sz(15) }}><span style={{ color: colors.neonPink, display:'flex' }}><WebIcon /></span>{website}</p>}
            </div>
          )}
        </div>
      </div>
      <BrandFooter colors={colors} />
    </div>
  )
}

function BackQRMinimal({ card, qrDataUrl, vf, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  const ng = makeGradient(colors)
  const name = vf.name ? (card?.profile?.name || '') : ''
  const title = vf.title ? (card?.profile?.title || '') : ''
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb top="50%" left="-20px" color={colors.neonPurple} size={200} opacity={0.04} />
      <div className="relative z-10 w-full h-full flex items-center justify-between p-6">
        <div className="flex-1 min-w-0">
          <BrandTag colors={colors} />
          <h1 className="font-black leading-tight mt-3" style={{ color: colors.white, fontSize: sz(40) }}>{name || 'Your Name'}</h1>
          {title && <p className="mt-1.5" style={{ color: colors.txt2, fontSize: sz(17) }}>{title}</p>}
          <p className="mt-4 font-medium tracking-wide" style={{ background: ng, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: sz(15) }}>Scan to connect →</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <QRBlock url={qrDataUrl} size={90} colors={colors} />
        </div>
      </div>
      <BrandFooter colors={colors} />
    </div>
  )
}

function BackQRBrand({ card, qrDataUrl, vf, fontScale = 1, colors = DARK }) {
  const sz = (px) => `${Math.round(px * fontScale)}px`
  const ng = makeGradient(colors)
  const name = vf.name ? (card?.profile?.name || '') : ''
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: colors.bg, fontFamily: FONT }}>
      <div className="absolute top-0 left-0 right-0 h-[40%] z-0" style={{ background: `linear-gradient(135deg, ${colors.neonPurple}15, ${colors.neonBlue}10)` }} />
      <NeonLine colors={colors} /><NeonLine pos="bottom" h={2} colors={colors} />
      <GlowOrb top="-10px" right="20%" color={colors.neonPink} size={160} opacity={0.06} />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6">
        <QRBlock url={qrDataUrl} size={96} colors={colors} />
        <p className="font-bold tracking-wide mt-3" style={{ background: ng, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontSize: sz(18) }}>Scan to connect</p>
        {name && <p className="mt-1.5 font-medium" style={{ color: colors.txt2, fontSize: sz(16) }}>{name}</p>}
      </div>
    </div>
  )
}

const BACK_COMPONENTS = {
  qrCenter: BackQRCenter,
  qrLeft: BackQRLeft,
  qrMinimal: BackQRMinimal,
  qrBrand: BackQRBrand,
}

// ── Tiny SVG icons (slightly larger for print) ──
function PhoneIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
}
function EmailIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
}
function WebIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}
function WhatsAppIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 0 1-4.243-1.216l-.295-.175-2.869.853.853-2.869-.175-.295A8 8 0 1 1 12 20z"/></svg>
}

// ── DraggablePhoto ──
function DraggablePhoto({ src, zoom, offsetX, offsetY, onDrag, size = 90 }) {
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const onMouseDown = (e) => { e.preventDefault(); dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; window.addEventListener('mousemove', onMM); window.addEventListener('mouseup', onMU) }
  const onTouchStart = (e) => { dragging.current = true; const t = e.touches[0]; lastPos.current = { x: t.clientX, y: t.clientY }; window.addEventListener('touchmove', onTM, { passive: false }); window.addEventListener('touchend', onTE) }
  const onMM = (e) => { if (!dragging.current) return; onDrag?.(e.clientX - lastPos.current.x, e.clientY - lastPos.current.y); lastPos.current = { x: e.clientX, y: e.clientY } }
  const onTM = (e) => { if (!dragging.current) return; e.preventDefault(); const t = e.touches[0]; onDrag?.(t.clientX - lastPos.current.x, t.clientY - lastPos.current.y); lastPos.current = { x: t.clientX, y: t.clientY } }
  const onMU = () => { dragging.current = false; window.removeEventListener('mousemove', onMM); window.removeEventListener('mouseup', onMU) }
  const onTE = () => { dragging.current = false; window.removeEventListener('touchmove', onTM); window.removeEventListener('touchend', onTE) }
  return (
    <div className="rounded-2xl overflow-hidden" style={{ width: `${size}px`, height: `${size}px`, border: `2px solid ${DARK.glass}`, boxShadow: '0 0 20px rgba(168,85,247,0.15)', cursor: 'grab' }}
      onMouseDown={onMouseDown} onTouchStart={onTouchStart}>
      <img src={src} alt="" draggable={false} className="w-full h-full" style={{ objectFit: 'cover', transform: `scale(${zoom}) translate(${offsetX}px, ${offsetY}px)`, transformOrigin: 'center' }} />
    </div>
  )
}

// ── Layout mini-preview schematics ──
function FrontSchematic({ layoutId }) {
  const c = { p: DARK.neonPurple, b: DARK.neonBlue, pk: DARK.neonPink }
  if (layoutId === 'classic') return (
    <div className="w-full h-10 rounded bg-slate-800 flex items-center px-2 gap-2">
      <div className="flex-1 space-y-1"><div className="w-10 h-1.5 rounded-sm" style={{ backgroundColor: c.p }} /><div className="w-7 h-1 rounded-sm bg-slate-600" /></div>
      <div className="w-6 h-6 rounded-md" style={{ backgroundColor: c.b + '30' }} />
    </div>
  )
  if (layoutId === 'centered') return (
    <div className="w-full h-10 rounded bg-slate-800 flex flex-col items-center justify-center gap-0.5">
      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.b + '30' }} />
      <div className="w-8 h-1 rounded-sm" style={{ backgroundColor: c.p }} />
    </div>
  )
  if (layoutId === 'leftPhoto') return (
    <div className="w-full h-10 rounded bg-slate-800 flex items-stretch overflow-hidden">
      <div className="w-[38%] h-full" style={{ background: `linear-gradient(135deg, ${c.p}20, ${c.b}15)` }} />
      <div className="flex-1 flex flex-col justify-center px-1.5 gap-0.5"><div className="w-8 h-1.5 rounded-sm" style={{ backgroundColor: c.p }} /><div className="w-6 h-1 rounded-sm bg-slate-600" /></div>
    </div>
  )
  if (layoutId === 'minimal') return (
    <div className="w-full h-10 rounded bg-slate-800 flex flex-col justify-center px-2 gap-1">
      <div className="w-2 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, ${c.b}, ${c.pk})` }} />
      <div className="w-10 h-2 rounded-sm" style={{ backgroundColor: c.p }} />
      <div className="flex gap-1"><div className="w-5 h-0.5 bg-slate-600 rounded-sm" /><div className="w-5 h-0.5 bg-slate-600 rounded-sm" /></div>
    </div>
  )
  if (layoutId === 'bold') return (
    <div className="w-full h-10 rounded bg-slate-800 flex flex-col justify-center px-2 gap-0.5">
      <div className="flex items-start justify-between"><div className="w-1 h-1 rounded-full" style={{ backgroundColor: c.b }} /><div className="w-4 h-4 rounded" style={{ backgroundColor: c.p + '20' }} /></div>
      <div className="w-12 h-2.5 rounded-sm" style={{ background: `linear-gradient(90deg, ${c.b}, ${c.p}, ${c.pk})`, opacity: 0.6 }} />
    </div>
  )
  return <div className="w-full h-10 rounded bg-slate-800" />
}

function BackSchematic({ layoutId }) {
  const c = { p: DARK.neonPurple, b: DARK.neonBlue, pk: DARK.neonPink }
  if (layoutId === 'qrCenter') return (
    <div className="w-full h-10 rounded bg-slate-800 flex flex-col items-center justify-center gap-0.5">
      <div className="w-5 h-5 rounded bg-white/80" /><div className="w-6 h-0.5 rounded-sm" style={{ background: `linear-gradient(90deg, ${c.b}, ${c.pk})` }} />
    </div>
  )
  if (layoutId === 'qrLeft') return (
    <div className="w-full h-10 rounded bg-slate-800 flex items-center px-2 gap-1.5">
      <div className="w-5 h-5 rounded bg-white/80 flex-shrink-0" />
      <div className="w-[1px] h-5 rounded-full" style={{ background: `linear-gradient(180deg, ${c.b}, ${c.pk})`, opacity: 0.4 }} />
      <div className="flex-1 space-y-0.5"><div className="w-8 h-1.5 rounded-sm" style={{ backgroundColor: c.p }} /><div className="w-6 h-0.5 bg-slate-600 rounded-sm" /></div>
    </div>
  )
  if (layoutId === 'qrMinimal') return (
    <div className="w-full h-10 rounded bg-slate-800 flex items-center justify-between px-2">
      <div className="space-y-0.5"><div className="w-8 h-2 rounded-sm" style={{ backgroundColor: c.p }} /><div className="w-5 h-0.5 bg-slate-600 rounded-sm" /></div>
      <div className="w-5 h-5 rounded bg-white/80 flex-shrink-0" />
    </div>
  )
  if (layoutId === 'qrBrand') return (
    <div className="w-full h-10 rounded bg-slate-800 flex flex-col items-center justify-center gap-0.5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[40%]" style={{ background: `linear-gradient(135deg, ${c.p}15, ${c.b}10)` }} />
      <div className="w-5 h-5 rounded bg-white/80 relative z-10" />
    </div>
  )
  return <div className="w-full h-10 rounded bg-slate-800" />
}

const REF_W = 525
const REF_H = Math.round(REF_W / 1.75)
const PAD_BOTTOM = `${(1 / 1.75) * 100}%`

export function ScaledPrintFrame({ children, innerRef }) {
  const outerRef = useRef(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    if (!outerRef.current) return
    const obs = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / REF_W)))
    obs.observe(outerRef.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={outerRef} className="relative w-full">
      <div className="relative overflow-hidden rounded-xl shadow-2xl" style={{ paddingBottom: PAD_BOTTOM }}>
        <div ref={innerRef} className="absolute top-0 left-0 overflow-hidden" style={{ width: `${REF_W}px`, height: `${REF_H}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export { FRONT_COMPONENTS, BACK_COMPONENTS, DARK as PRINT_DARK, LIGHT as PRINT_LIGHT, FIELD_OPTIONS as PRINT_FIELDS, gv as printGv }

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
const PrintableCardPreview = forwardRef(function PrintableCardPreview({ card, slug }, ref) {
  const [side, setSide] = useState('front')
  const [downloading, setDownloading] = useState(false)
  const [downloadingFront, setDownloadingFront] = useState(false)
  const [downloadingBack, setDownloadingBack] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const previewRef = useRef(null)
  const frontCaptureRef = useRef(null)
  const backCaptureRef = useRef(null)

  const [frontLayout, setFrontLayout] = useState('classic')
  const [backLayout, setBackLayout] = useState('qrCenter')

  const [photoZoom, setPhotoZoom] = useState(1)
  const [photoOffsetX, setPhotoOffsetX] = useState(0)
  const [photoOffsetY, setPhotoOffsetY] = useState(0)

  const [frontFontScale, setFrontFontScale] = useState(1)
  const [backFontScale, setBackFontScale] = useState(1)

  const [cardTheme, setCardTheme] = useState('dark')

  const colors = cardTheme === 'light' ? LIGHT : DARK

  const [visibleFields, setVisibleFields] = useState(() => {
    const init = {}
    FIELD_OPTIONS.forEach(f => { init[f.key] = f.default })
    return init
  })

  const publicUrl = slug ? `${window.location.origin}/#/card/${slug}?source=qr` : ''
  const hasPhoto = visibleFields.photo && gv(card, 'photo')

  useEffect(() => {
    if (!publicUrl) { setQrDataUrl(null); return }
    generateAdvancedQRCode(publicUrl, {}, 1200).then(url => setQrDataUrl(url)).catch(() => {})
  }, [publicUrl])

  const toggleField = (key) => {
    const opt = FIELD_OPTIONS.find(f => f.key === key)
    if (opt?.required) return
    setVisibleFields(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handlePhotoDrag = useCallback((dx, dy) => {
    const max = 20 + (photoZoom - 1) * 20
    setPhotoOffsetX(prev => Math.max(-max, Math.min(max, prev + dx * 0.5)))
    setPhotoOffsetY(prev => Math.max(-max, Math.min(max, prev + dy * 0.5)))
  }, [photoZoom])

  const resetPhoto = () => { setPhotoZoom(1); setPhotoOffsetX(0); setPhotoOffsetY(0) }

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return
    setDownloading(true)
    try {
      const outW = BASE_W * PX
      const outH = BASE_H * PX
      const dataUrl = await toPng(previewRef.current, {
        width: BASE_W,
        height: BASE_H,
        pixelRatio: PX,
        quality: 1.0,
        cacheBust: true,
        includeQueryParams: true,
        style: {
          transform: 'none',
          width: `${BASE_W}px`,
          height: `${BASE_H}px`,
          borderRadius: '0',
        },
        filter: (node) => node.dataset?.excludeExport !== 'true'
      })
      const link = document.createElement('a')
      link.download = `phygital-card-${side}-${cardTheme}-${outW}x${outH}.png`
      link.href = dataUrl
      link.click()
      toast.success(`${side === 'front' ? 'Front' : 'Back'} downloaded — ${outW}x${outH}px (premium print quality)`)
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download card image')
    } finally { setDownloading(false) }
  }, [side, cardTheme])

  const handleDownloadFront = useCallback(async () => {
    // Use visible preview on desktop, hidden capture ref on mobile
    const useVisiblePreview = !!previewRef.current
    const captureElement = previewRef.current || frontCaptureRef.current
    if (!captureElement) return
    setDownloadingFront(true)
    
    // On mobile: temporarily move capture ref into viewport (but keep it hidden) for proper rendering
    let captureParent = null
    if (!useVisiblePreview && frontCaptureRef.current?.parentElement) {
      captureParent = frontCaptureRef.current.parentElement
      // Force re-render by temporarily making it visible, then hiding again
      captureParent.style.display = 'block'
      captureParent.style.left = '0px'
      captureParent.style.top = '0px'
      captureParent.style.opacity = '0.01' // Slightly visible to force rendering
      captureParent.style.zIndex = '-9999'
      // Force layout recalculation
      void captureParent.offsetHeight
    }
    
    try {
      // On desktop: temporarily switch to front side if needed
      const originalSide = side
      if (useVisiblePreview && side !== 'front') {
        setSide('front')
        // Wait for React to render the front side
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      // Delay to ensure DOM updates are painted and fonts are loaded
      await new Promise(resolve => setTimeout(resolve, 300))
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      
      // Force layout recalculation by reading layout properties
      if (captureElement) {
        void captureElement.offsetHeight
        void captureElement.offsetWidth
      }
      
      const outW = BASE_W * PX
      const outH = BASE_H * PX
      
      // Suppress console errors for CSS rules (CORS issue with Google Fonts)
      const originalError = console.error
      console.error = (...args) => {
        if (args[0]?.includes?.('cssRules') || args[0]?.includes?.('CSSStyleSheet')) {
          return // Ignore CSS CORS errors
        }
        originalError(...args)
      }
      
      const dataUrl = await toPng(captureElement, {
        width: BASE_W,
        height: BASE_H,
        pixelRatio: PX,
        quality: 1.0,
        cacheBust: true,
        includeQueryParams: true,
        useCORS: true,
        allowTaint: false,
        style: {
          transform: 'none',
          width: `${BASE_W}px`,
          height: `${BASE_H}px`,
          borderRadius: '0',
        },
        filter: (node) => node.dataset?.excludeExport !== 'true'
      })
      
      console.error = originalError // Restore console.error
      
      // Restore original side if it was changed (desktop only)
      if (useVisiblePreview && originalSide !== 'front') {
        setSide(originalSide)
      }
      
      // Restore capture ref position (mobile only)
      if (captureParent) {
        captureParent.style.left = '-9999px'
        captureParent.style.top = '-9999px'
        captureParent.style.opacity = '0'
        captureParent.style.display = ''
        captureParent.style.zIndex = ''
      }
      
      const link = document.createElement('a')
      link.download = `phygital-card-front-${cardTheme}-${outW}x${outH}.png`
      link.href = dataUrl
      link.click()
      toast.success(`Front downloaded — ${outW}x${outH}px (premium print quality)`)
    } catch (err) {
      console.error('Download front error:', err)
      toast.error('Failed to download front image')
      // Restore capture ref position on error (mobile only)
      if (captureParent) {
        captureParent.style.left = '-9999px'
        captureParent.style.top = '-9999px'
        captureParent.style.opacity = '0'
        captureParent.style.display = ''
        captureParent.style.zIndex = ''
      }
    } finally { setDownloadingFront(false) }
  }, [cardTheme, frontFontScale, photoZoom, photoOffsetX, photoOffsetY, side])

  const handleDownloadBack = useCallback(async () => {
    // Use visible preview on desktop, hidden capture ref on mobile
    const useVisiblePreview = !!previewRef.current
    const captureElement = previewRef.current || backCaptureRef.current
    if (!captureElement) return
    setDownloadingBack(true)
    
    // On mobile: temporarily move capture ref into viewport (but keep it hidden) for proper rendering
    let captureParent = null
    if (!useVisiblePreview && backCaptureRef.current?.parentElement) {
      captureParent = backCaptureRef.current.parentElement
      // Force re-render by temporarily making it visible, then hiding again
      captureParent.style.display = 'block'
      captureParent.style.left = '0px'
      captureParent.style.top = '0px'
      captureParent.style.opacity = '0.01' // Slightly visible to force rendering
      captureParent.style.zIndex = '-9999'
      // Force layout recalculation
      void captureParent.offsetHeight
    }
    
    try {
      // On desktop: temporarily switch to back side if needed
      const originalSide = side
      if (useVisiblePreview && side !== 'back') {
        setSide('back')
        // Wait for React to render the back side
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      // Delay to ensure DOM updates are painted and fonts are loaded
      await new Promise(resolve => setTimeout(resolve, 300))
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      
      // Force layout recalculation by reading layout properties
      if (captureElement) {
        void captureElement.offsetHeight
        void captureElement.offsetWidth
      }
      
      const outW = BASE_W * PX
      const outH = BASE_H * PX
      
      // Suppress console errors for CSS rules (CORS issue with Google Fonts)
      const originalError = console.error
      console.error = (...args) => {
        if (args[0]?.includes?.('cssRules') || args[0]?.includes?.('CSSStyleSheet')) {
          return // Ignore CSS CORS errors
        }
        originalError(...args)
      }
      
      const dataUrl = await toPng(captureElement, {
        width: BASE_W,
        height: BASE_H,
        pixelRatio: PX,
        quality: 1.0,
        cacheBust: true,
        includeQueryParams: true,
        useCORS: true,
        allowTaint: false,
        style: {
          transform: 'none',
          width: `${BASE_W}px`,
          height: `${BASE_H}px`,
          borderRadius: '0',
        },
        filter: (node) => node.dataset?.excludeExport !== 'true'
      })
      
      console.error = originalError // Restore console.error
      
      // Restore original side if it was changed (desktop only)
      if (useVisiblePreview && originalSide !== 'back') {
        setSide(originalSide)
      }
      
      // Restore capture ref position (mobile only)
      if (captureParent) {
        captureParent.style.left = '-9999px'
        captureParent.style.top = '-9999px'
        captureParent.style.opacity = '0'
        captureParent.style.display = ''
        captureParent.style.zIndex = ''
      }
      
      const link = document.createElement('a')
      link.download = `phygital-card-back-${cardTheme}-${outW}x${outH}.png`
      link.href = dataUrl
      link.click()
      toast.success(`Back downloaded — ${outW}x${outH}px (premium print quality)`)
    } catch (err) {
      console.error('Download back error:', err)
      toast.error('Failed to download back image')
      // Restore capture ref position on error (mobile only)
      if (captureParent) {
        captureParent.style.left = '-9999px'
        captureParent.style.top = '-9999px'
        captureParent.style.opacity = '0'
        captureParent.style.display = ''
        captureParent.style.zIndex = ''
      }
    } finally { setDownloadingBack(false) }
  }, [cardTheme, backFontScale, side])

  const v = {}
  for (const f of FIELD_OPTIONS) {
    v[f.key] = visibleFields[f.key] ? gv(card, f.key) : ''
  }
  if (!v.name) v.name = 'Your Name'

  const FrontComp = FRONT_COMPONENTS[frontLayout] || FrontClassic
  const BackComp = BACK_COMPONENTS[backLayout] || BackQRCenter

  useImperativeHandle(ref, () => ({
    FrontComp, BackComp,
    v, visibleFields,
    photoZoom, photoOffsetX, photoOffsetY,
    frontFontScale, backFontScale,
    colors, qrDataUrl,
  }))

  const outputW = BASE_W * PX
  const outputH = BASE_H * PX
  const dpi = Math.round((outputW / 3.5))

  return (
    <div className="space-y-5">
      {/* ── Theme Toggle ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
          {cardTheme === 'dark' ? <Moon className="w-3.5 h-3.5 text-neon-blue" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
          Card Theme
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCardTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-xs font-medium transition-all ${cardTheme === 'dark' ? 'border-neon-purple bg-neon-purple/10 text-slate-100' : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600'}`}
          >
            <Moon className="w-3.5 h-3.5" />
            Dark
          </button>
          <button
            onClick={() => setCardTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 text-xs font-medium transition-all ${cardTheme === 'light' ? 'border-amber-400 bg-amber-400/10 text-slate-100' : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600'}`}
          >
            <Sun className="w-3.5 h-3.5" />
            Light (Print-friendly)
          </button>
        </div>
      </div>

      {/* ── Layout Selector ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-neon-purple" />
          Card Layout
        </p>

        <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-semibold">Front Side</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {FRONT_LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => { setFrontLayout(l.id); setSide('front') }}
              className={`p-2 rounded-lg border-2 transition-all text-left ${frontLayout === l.id ? 'border-neon-purple bg-neon-purple/10' : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'}`}
            >
              <FrontSchematic layoutId={l.id} />
              <p className="text-[10px] font-medium text-slate-200 mt-1.5 truncate">{l.name}</p>
              <p className="text-[9px] text-slate-500 truncate">{l.desc}</p>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-semibold">Back Side</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BACK_LAYOUTS.map(l => (
            <button
              key={l.id}
              onClick={() => { setBackLayout(l.id); setSide('back') }}
              className={`p-2 rounded-lg border-2 transition-all text-left ${backLayout === l.id ? 'border-neon-purple bg-neon-purple/10' : 'border-slate-700/50 hover:border-slate-600 bg-slate-800/30'}`}
            >
              <BackSchematic layoutId={l.id} />
              <p className="text-[10px] font-medium text-slate-200 mt-1.5 truncate">{l.name}</p>
              <p className="text-[9px] text-slate-500 truncate">{l.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── Hidden capture divs for both sides (for combined download) ── */}
      <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none" style={{ width: `${BASE_W}px`, height: `${BASE_H}px` }}>
        <div ref={frontCaptureRef} style={{ width: `${BASE_W}px`, height: `${BASE_H}px` }}>
          <FrontComp v={v} photoZoom={photoZoom} photoOffsetX={photoOffsetX} photoOffsetY={photoOffsetY} fontScale={frontFontScale} colors={colors} />
        </div>
      </div>
      <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none" style={{ width: `${BASE_W}px`, height: `${BASE_H}px` }}>
        <div ref={backCaptureRef} style={{ width: `${BASE_W}px`, height: `${BASE_H}px` }}>
          <BackComp card={card} qrDataUrl={qrDataUrl} vf={visibleFields} fontScale={backFontScale} colors={colors} />
        </div>
      </div>

      {/* ── Card Preview ── */}
      <div className="flex justify-center">
        <div className="relative w-full" style={{ maxWidth: '525px' }}>
          <ScaledPrintFrame innerRef={previewRef}>
            {side === 'front'
              ? <FrontComp v={v} photoZoom={photoZoom} photoOffsetX={photoOffsetX} photoOffsetY={photoOffsetY} fontScale={frontFontScale} colors={colors} />
              : <BackComp card={card} qrDataUrl={qrDataUrl} vf={visibleFields} fontScale={backFontScale} colors={colors} />}
          </ScaledPrintFrame>
          <button
            onClick={() => setSide(s => s === 'front' ? 'back' : 'front')}
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-xs text-slate-300 hover:bg-slate-700 transition shadow-lg"
          >
            <RotateCcw className="w-3 h-3" />
            {side === 'front' ? 'Show Back' : 'Show Front'}
          </button>
        </div>
      </div>

      {/* ── Photo Adjustment ── */}
      {hasPhoto && frontLayout !== 'minimal' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
          <p className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-neon-blue" /> Adjust Photo
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <DraggablePhoto src={gv(card, 'photo')} zoom={photoZoom} offsetX={photoOffsetX} offsetY={photoOffsetY} onDrag={handlePhotoDrag} size={80} />
              <p className="text-[9px] text-slate-500 text-center mt-1 flex items-center justify-center gap-1"><Move className="w-2.5 h-2.5" /> Drag to reposition</p>
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
                  <span className="text-[10px] text-slate-500 font-mono">{photoZoom.toFixed(1)}x</span>
                </div>
                <input type="range" min="1" max="3" step="0.1" value={photoZoom}
                  onChange={e => { const z = parseFloat(e.target.value); setPhotoZoom(z); if (z === 1) { setPhotoOffsetX(0); setPhotoOffsetY(0) } }}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(90deg, ${DARK.neonPurple} ${((photoZoom - 1) / 2) * 100}%, ${DARK.bgSubtle} ${((photoZoom - 1) / 2) * 100}%)` }} />
              </div>
              <button onClick={resetPhoto} disabled={photoZoom === 1 && photoOffsetX === 0 && photoOffsetY === 0}
                className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 transition disabled:opacity-30">
                <RotateCw className="w-3 h-3" /> Reset position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Font Size Adjustment ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-neon-pink" /> Font Size
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Front Side</span>
              <span className="text-[10px] text-slate-500 font-mono">{Math.round(frontFontScale * 100)}%</span>
            </div>
            <input type="range" min="0.6" max="1.6" step="0.05" value={frontFontScale}
              onChange={e => setFrontFontScale(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(90deg, ${DARK.neonPink} ${((frontFontScale - 0.6) / 1.0) * 100}%, ${DARK.bgSubtle} ${((frontFontScale - 0.6) / 1.0) * 100}%)` }} />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-slate-600">Small</span>
              <button onClick={() => setFrontFontScale(1)} className="text-[9px] text-slate-500 hover:text-slate-300 transition">Reset</button>
              <span className="text-[9px] text-slate-600">Large</span>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Back Side</span>
              <span className="text-[10px] text-slate-500 font-mono">{Math.round(backFontScale * 100)}%</span>
            </div>
            <input type="range" min="0.6" max="1.6" step="0.05" value={backFontScale}
              onChange={e => setBackFontScale(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(90deg, ${DARK.neonPink} ${((backFontScale - 0.6) / 1.0) * 100}%, ${DARK.bgSubtle} ${((backFontScale - 0.6) / 1.0) * 100}%)` }} />
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-slate-600">Small</span>
              <button onClick={() => setBackFontScale(1)} className="text-[9px] text-slate-500 hover:text-slate-300 transition">Reset</button>
              <span className="text-[9px] text-slate-600">Large</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Field Toggles ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
          <Settings2 className="w-3.5 h-3.5 text-neon-purple" /> Choose what to include
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FIELD_OPTIONS.map(opt => {
            const hasData = !!gv(card, opt.key)
            const isOn = visibleFields[opt.key]
            return (
              <button key={opt.key} onClick={() => toggleField(opt.key)} disabled={opt.required}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${isOn ? 'border-neon-purple/50 bg-neon-purple/10 text-slate-100' : 'border-slate-700/50 bg-slate-800/30 text-slate-500'} ${opt.required ? 'opacity-70 cursor-not-allowed' : 'hover:border-slate-600 cursor-pointer'} ${!hasData ? 'opacity-40' : ''}`}
                title={!hasData ? `No ${opt.label.toLowerCase()} entered yet` : ''}>
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${isOn ? 'bg-neon-purple text-white' : 'bg-slate-700 text-slate-500'}`}>
                  {isOn && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                </div>
                {opt.label}
                {opt.required && <span className="text-[9px] text-slate-500 ml-auto">required</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Download ── */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={handleDownloadFront} disabled={downloadingFront || downloadingBack}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white text-xs sm:text-sm font-medium hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50">
          {downloadingFront ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">Download Front</span>
          <span className="sm:hidden">Front</span>
        </button>
        <button onClick={handleDownloadBack} disabled={downloadingFront || downloadingBack}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue text-white text-xs sm:text-sm font-medium hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50">
          {downloadingBack ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span className="hidden sm:inline">Download Back</span>
          <span className="sm:hidden">Back</span>
        </button>
      </div>
      <p className="text-[11px] text-slate-500 text-center">
        {PX}x upscale = <strong className="text-slate-400">{outputW} x {outputH}px</strong> ({dpi} DPI). {cardTheme === 'light' ? 'Light theme — optimized for physical printing.' : 'Dark theme — switch to Light for best print results.'}
      </p>
    </div>
  )
})

export default PrintableCardPreview
