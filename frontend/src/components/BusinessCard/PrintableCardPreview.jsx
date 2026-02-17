/**
 * PrintableCardPreview
 * Phygital-branded printable card with multiple front/back layout options,
 * field toggles, photo zoom/pan, and premium print-quality download.
 *
 * PRINT QUALITY:
 * - Renders an off-screen 1050x600 CSS node (true business card proportions at 300 DPI)
 * - Captures with pixelRatio 6 = 6300x3600 output (1800 DPI equivalent)
 * - QR code generated at 1200px for razor-sharp scanning
 * - Profile photos loaded at full Cloudinary resolution
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { toPng } from 'html-to-image'
import toast from 'react-hot-toast'
import {
  Download, RotateCcw, Loader2, Settings2, LayoutGrid,
  ZoomIn, Move, RotateCw
} from 'lucide-react'
import { generateAdvancedQRCode } from '../../utils/qrGenerator'

// ── Phygital Dark Theme ──
const B = {
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
}
const NG = `linear-gradient(90deg, ${B.neonBlue}, ${B.neonPurple}, ${B.neonPink})`
const FONT = "'Inter', system-ui, sans-serif"
const BASE_W = 1050, BASE_H = 600, PX = 6

// Ensure Cloudinary images load at full resolution for print
function hiResPhoto(url) {
  if (!url) return ''
  if (url.includes('cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/q_100,f_png/')
  }
  return url
}

// ── Field definitions (no banner) ──
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
//  FRONT LAYOUT DEFINITIONS
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

// ── Shared decorations ──
function NeonLine({ pos = 'top', h = 3 }) {
  return <div className={`absolute ${pos}-0 left-0 right-0 z-20`} style={{ height: `${h}px`, background: NG }} />
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
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: B.neonBlue }} />
      <span className="text-[8px] font-bold tracking-[0.25em] uppercase"
        style={{ background: NG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        PHYGITAL
      </span>
    </div>
  )
}
function ContactRow({ phone, email, website, whatsapp }) {
  const items = [
    phone && { icon: <PhoneIcon />, color: B.neonBlue, text: phone },
    email && { icon: <EmailIcon />, color: B.neonPurple, text: email },
    website && { icon: <WebIcon />, color: B.neonPink, text: website },
    whatsapp && { icon: <WhatsAppIcon />, color: B.neonBlue, text: whatsapp },
  ].filter(Boolean)
  if (!items.length) return null
  return (
    <div className="space-y-[3px]">
      {items.map((it, i) => (
        <p key={i} className="text-[9px] flex items-center gap-1.5" style={{ color: B.txt2 }}>
          <span style={{ color: it.color, display: 'flex', alignItems: 'center' }}>{it.icon}</span>
          <span className="truncate">{it.text}</span>
        </p>
      ))}
    </div>
  )
}
function PhotoBox({ src, zoom, offX, offY, size = 90, rounded = '16px', forExport = false }) {
  if (!src) return null
  const imgSrc = forExport ? hiResPhoto(src) : src
  return (
    <div className="overflow-hidden flex-shrink-0" style={{
      width: `${size}px`, height: `${size}px`, borderRadius: rounded,
      border: `2px solid ${B.glass}`, boxShadow: '0 0 20px rgba(168,85,247,0.15)',
    }}>
      <img src={imgSrc} alt="" draggable={false} crossOrigin="anonymous" className="w-full h-full"
        style={{ objectFit: 'cover', transform: `scale(${zoom||1}) translate(${offX||0}px, ${offY||0}px)`, transformOrigin: 'center' }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  FRONT LAYOUTS
// ═══════════════════════════════════════════════════════════
function FrontClassic({ v, photoZoom, photoOffsetX, photoOffsetY, forExport }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb top="-10px" right="-10px" color={B.neonPurple} size={160} />
      <GlowOrb bottom="-6px" left="-6px" color={B.neonBlue} size={112} opacity={0.05} />
      <div className="relative z-10 w-full h-full flex items-stretch p-5 gap-4">
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <BrandTag />
          <div className="my-auto">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight truncate" style={{ color: B.white }}>{v.name}</h1>
            {(v.title || v.company) && <p className="text-[11px] font-medium mt-1.5 truncate" style={{ color: B.txt2 }}>{[v.title, v.company].filter(Boolean).join('  ·  ')}</p>}
            {v.bio && <p className="text-[8px] mt-2 leading-relaxed line-clamp-2" style={{ color: B.txt3 }}>{v.bio}</p>}
          </div>
          <ContactRow phone={v.phone} email={v.email} website={v.website} whatsapp={v.whatsapp} />
        </div>
        {v.photo && (
          <div className="flex items-center justify-center flex-shrink-0">
            <PhotoBox src={v.photo} zoom={photoZoom} offX={photoOffsetX} offY={photoOffsetY} forExport={forExport} />
          </div>
        )}
      </div>
    </div>
  )
}

function FrontCentered({ v, photoZoom, photoOffsetX, photoOffsetY, forExport }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb top="-20px" left="50%" color={B.neonPurple} size={200} opacity={0.06} />
      <GlowOrb bottom="-10px" right="-10px" color={B.neonBlue} size={120} opacity={0.04} />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6">
        <BrandTag />
        {v.photo && (
          <div className="mt-2 mb-2">
            <PhotoBox src={v.photo} zoom={photoZoom} offX={photoOffsetX} offY={photoOffsetY} size={72} rounded="50%" forExport={forExport} />
          </div>
        )}
        <h1 className="text-[24px] font-extrabold leading-tight tracking-tight" style={{ color: B.white }}>{v.name}</h1>
        {(v.title || v.company) && <p className="text-[11px] font-medium mt-1 truncate max-w-[80%]" style={{ color: B.txt2 }}>{[v.title, v.company].filter(Boolean).join('  ·  ')}</p>}
        {v.bio && <p className="text-[8px] mt-1.5 leading-relaxed line-clamp-2 max-w-[75%]" style={{ color: B.txt3 }}>{v.bio}</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-[2px]">
          {v.phone && <p className="text-[9px] flex items-center gap-1" style={{ color: B.txt2 }}><span style={{ color: B.neonBlue, display:'flex' }}><PhoneIcon /></span>{v.phone}</p>}
          {v.email && <p className="text-[9px] flex items-center gap-1" style={{ color: B.txt2 }}><span style={{ color: B.neonPurple, display:'flex' }}><EmailIcon /></span>{v.email}</p>}
          {v.website && <p className="text-[9px] flex items-center gap-1" style={{ color: B.txt2 }}><span style={{ color: B.neonPink, display:'flex' }}><WebIcon /></span>{v.website}</p>}
        </div>
      </div>
    </div>
  )
}

function FrontLeftPhoto({ v, photoZoom, photoOffsetX, photoOffsetY, forExport }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb top="-10px" left="-10px" color={B.neonPurple} size={160} opacity={0.06} />
      <div className="relative z-10 w-full h-full flex items-stretch">
        {/* Left: Photo area */}
        {v.photo ? (
          <div className="w-[40%] h-full relative overflow-hidden flex-shrink-0">
            <img src={forExport ? hiResPhoto(v.photo) : v.photo} alt="" crossOrigin="anonymous" className="w-full h-full" style={{
              objectFit: 'cover',
              transform: `scale(${photoZoom||1}) translate(${photoOffsetX||0}px, ${photoOffsetY||0}px)`,
              transformOrigin: 'center'
            }} />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent 60%, ${B.bg})` }} />
          </div>
        ) : (
          <div className="w-[40%] h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${B.neonPurple}20, ${B.neonBlue}10)` }}>
            <span className="text-[48px] font-black" style={{ color: B.neonPurple + '40' }}>{(v.name || '?')[0]}</span>
          </div>
        )}
        {/* Right: Text */}
        <div className="flex-1 flex flex-col justify-between p-5 min-w-0">
          <BrandTag />
          <div className="my-auto">
            <h1 className="text-[20px] font-extrabold leading-tight" style={{ color: B.white }}>{v.name}</h1>
            {v.title && <p className="text-[11px] font-medium mt-1 truncate" style={{ color: B.txt2 }}>{v.title}</p>}
            {v.company && <p className="text-[10px] mt-0.5 truncate" style={{ color: B.txt3 }}>{v.company}</p>}
            {v.bio && <p className="text-[8px] mt-2 leading-relaxed line-clamp-3" style={{ color: B.txt3 }}>{v.bio}</p>}
          </div>
          <ContactRow phone={v.phone} email={v.email} website={v.website} whatsapp={v.whatsapp} />
        </div>
      </div>
    </div>
  )
}

function FrontMinimal({ v }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb bottom="-20px" right="-20px" color={B.neonPink} size={180} opacity={0.05} />
      <div className="relative z-10 w-full h-full flex flex-col justify-center px-8">
        <BrandTag />
        <div className="h-[2px] w-12 mt-3 mb-4 rounded-full" style={{ background: NG }} />
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight" style={{ color: B.white }}>{v.name}</h1>
        {(v.title || v.company) && <p className="text-[12px] font-medium mt-2" style={{ color: B.txt2 }}>{[v.title, v.company].filter(Boolean).join('  ·  ')}</p>}
        {v.bio && <p className="text-[9px] mt-3 leading-relaxed max-w-[70%] line-clamp-2" style={{ color: B.txt3 }}>{v.bio}</p>}
        <div className="mt-auto mb-1">
          <div className="flex flex-wrap gap-x-5 gap-y-[3px]">
            {v.phone && <p className="text-[9px] flex items-center gap-1.5" style={{ color: B.txt2 }}><span style={{ color: B.neonBlue, display:'flex' }}><PhoneIcon /></span>{v.phone}</p>}
            {v.email && <p className="text-[9px] flex items-center gap-1.5" style={{ color: B.txt2 }}><span style={{ color: B.neonPurple, display:'flex' }}><EmailIcon /></span>{v.email}</p>}
            {v.website && <p className="text-[9px] flex items-center gap-1.5" style={{ color: B.txt2 }}><span style={{ color: B.neonPink, display:'flex' }}><WebIcon /></span>{v.website}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function FrontBold({ v, photoZoom, photoOffsetX, photoOffsetY, forExport }) {
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb top="-30px" left="30%" color={B.neonPurple} size={240} opacity={0.05} />
      <div className="relative z-10 w-full h-full p-5 flex flex-col">
        <div className="flex items-start justify-between">
          <BrandTag />
          {v.photo && <PhotoBox src={v.photo} zoom={photoZoom} offX={photoOffsetX} offY={photoOffsetY} size={60} rounded="12px" forExport={forExport} />}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-[32px] font-black leading-[1.1] tracking-tight" style={{
            background: NG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>{v.name}</h1>
          {v.title && <p className="text-[13px] font-semibold mt-2" style={{ color: B.white }}>{v.title}</p>}
          {v.company && <p className="text-[10px] mt-0.5" style={{ color: B.txt3 }}>{v.company}</p>}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-[3px]">
          {v.phone && <p className="text-[9px] flex items-center gap-1.5" style={{ color: B.txt2 }}><span style={{ color: B.neonBlue, display:'flex' }}><PhoneIcon /></span>{v.phone}</p>}
          {v.email && <p className="text-[9px] flex items-center gap-1.5" style={{ color: B.txt2 }}><span style={{ color: B.neonPurple, display:'flex' }}><EmailIcon /></span>{v.email}</p>}
          {v.website && <p className="text-[9px] flex items-center gap-1.5" style={{ color: B.txt2 }}><span style={{ color: B.neonPink, display:'flex' }}><WebIcon /></span>{v.website}</p>}
          {v.whatsapp && <p className="text-[9px] flex items-center gap-1.5" style={{ color: B.txt2 }}><span style={{ color: B.neonBlue, display:'flex' }}><WhatsAppIcon /></span>{v.whatsapp}</p>}
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
//  BACK LAYOUTS
// ═══════════════════════════════════════════════════════════
function BackQRCenter({ card, qrDataUrl, vf }) {
  const name = vf.name ? (card?.profile?.name || '') : ''
  const company = vf.company ? (card?.profile?.company || '') : ''
  const displayName = name || company
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb bottom="-10px" right="-10px" color={B.neonPink} size={160} />
      <GlowOrb top="-6px" left="-6px" color={B.neonBlue} size={112} opacity={0.05} />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6">
        <QRBlock url={qrDataUrl} />
        <p className="text-[12px] font-bold tracking-wide mt-3" style={{ background: NG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scan to connect</p>
        {displayName && <p className="text-[9px] mt-1" style={{ color: B.txt3 }}>{displayName}</p>}
        <BrandFooter />
      </div>
    </div>
  )
}

function BackQRLeft({ card, qrDataUrl, vf }) {
  const name = vf.name ? (card?.profile?.name || '') : ''
  const title = vf.title ? (card?.profile?.title || '') : ''
  const company = vf.company ? (card?.profile?.company || '') : ''
  const phone = vf.phone ? (card?.contact?.phone || '') : ''
  const email = vf.email ? (card?.contact?.email || '') : ''
  const website = vf.website ? (card?.contact?.website || '') : ''
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb top="-10px" right="-10px" color={B.neonPurple} size={140} opacity={0.06} />
      <div className="relative z-10 w-full h-full flex items-center p-6 gap-6">
        {/* Left: QR */}
        <div className="flex flex-col items-center flex-shrink-0">
          <QRBlock url={qrDataUrl} size={100} />
          <p className="text-[9px] font-bold tracking-wide mt-2" style={{ background: NG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scan to connect</p>
        </div>
        {/* Divider */}
        <div className="w-[1px] h-[70%] rounded-full" style={{ background: NG, opacity: 0.3 }} />
        {/* Right: Info */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {name && <h2 className="text-[18px] font-bold truncate" style={{ color: B.white }}>{name}</h2>}
          {(title || company) && <p className="text-[10px] mt-1 truncate" style={{ color: B.txt2 }}>{[title, company].filter(Boolean).join(' · ')}</p>}
          {(phone || email || website) && (
            <div className="mt-3 space-y-[3px]">
              {phone && <p className="text-[9px] flex items-center gap-1.5 truncate" style={{ color: B.txt2 }}><span style={{ color: B.neonBlue, display:'flex' }}><PhoneIcon /></span>{phone}</p>}
              {email && <p className="text-[9px] flex items-center gap-1.5 truncate" style={{ color: B.txt2 }}><span style={{ color: B.neonPurple, display:'flex' }}><EmailIcon /></span>{email}</p>}
              {website && <p className="text-[9px] flex items-center gap-1.5 truncate" style={{ color: B.txt2 }}><span style={{ color: B.neonPink, display:'flex' }}><WebIcon /></span>{website}</p>}
            </div>
          )}
        </div>
      </div>
      <BrandFooter />
    </div>
  )
}

function BackQRMinimal({ card, qrDataUrl, vf }) {
  const name = vf.name ? (card?.profile?.name || '') : ''
  const title = vf.title ? (card?.profile?.title || '') : ''
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb top="50%" left="-20px" color={B.neonPurple} size={200} opacity={0.04} />
      <div className="relative z-10 w-full h-full flex items-center justify-between p-6">
        <div className="flex-1 min-w-0">
          <BrandTag />
          <h1 className="text-[26px] font-black leading-tight mt-3" style={{ color: B.white }}>{name || 'Your Name'}</h1>
          {title && <p className="text-[11px] mt-1.5" style={{ color: B.txt2 }}>{title}</p>}
          <p className="text-[9px] mt-4 font-medium tracking-wide" style={{ background: NG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scan to connect →</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <QRBlock url={qrDataUrl} size={90} />
        </div>
      </div>
      <BrandFooter />
    </div>
  )
}

function BackQRBrand({ card, qrDataUrl, vf }) {
  const name = vf.name ? (card?.profile?.name || '') : ''
  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: B.bg, fontFamily: FONT }}>
      {/* Top brand strip */}
      <div className="absolute top-0 left-0 right-0 h-[40%] z-0" style={{ background: `linear-gradient(135deg, ${B.neonPurple}15, ${B.neonBlue}10)` }} />
      <NeonLine /><NeonLine pos="bottom" h={2} />
      <GlowOrb top="-10px" right="20%" color={B.neonPink} size={160} opacity={0.06} />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center px-6">
        <div className="mb-3">
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase" style={{ background: NG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PHYGITAL</span>
        </div>
        <div className="h-[1px] w-16 rounded-full mb-4" style={{ background: NG, opacity: 0.4 }} />
        <QRBlock url={qrDataUrl} size={96} />
        <p className="text-[12px] font-bold tracking-wide mt-3" style={{ background: NG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Scan to connect</p>
        {name && <p className="text-[10px] mt-1.5 font-medium" style={{ color: B.txt2 }}>{name}</p>}
        <BrandFooter />
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

// ── Shared helpers ──
function QRBlock({ url, size = 96 }) {
  return url ? (
    <div className="rounded-xl p-2.5" style={{ backgroundColor: B.white, boxShadow: '0 0 30px rgba(0,212,255,0.1), 0 0 60px rgba(168,85,247,0.08)' }}>
      <img src={url} alt="QR Code" style={{ width: `${size}px`, height: `${size}px`, imageRendering: 'pixelated' }} />
    </div>
  ) : (
    <div className="rounded-xl flex items-center justify-center" style={{ width: `${size + 20}px`, height: `${size + 20}px`, backgroundColor: B.glassLight, border: `1px solid ${B.glass}` }}>
      <span className="text-[10px]" style={{ color: B.txt3 }}>QR Code</span>
    </div>
  )
}

function BrandFooter() {
  return (
    <div className="absolute bottom-3.5 left-0 right-0 flex items-center justify-center gap-2">
      <div className="w-8 h-[1px]" style={{ background: NG, opacity: 0.4 }} />
      <span className="text-[8px] font-bold tracking-[0.2em] uppercase" style={{ background: NG, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', opacity: 0.7 }}>phygital.zone</span>
      <div className="w-8 h-[1px]" style={{ background: NG, opacity: 0.4 }} />
    </div>
  )
}

// ── Tiny SVG icons ──
function PhoneIcon() {
  return <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
}
function EmailIcon() {
  return <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
}
function WebIcon() {
  return <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}
function WhatsAppIcon() {
  return <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 0 1-4.243-1.216l-.295-.175-2.869.853.853-2.869-.175-.295A8 8 0 1 1 12 20z"/></svg>
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
    <div className="rounded-2xl overflow-hidden" style={{ width: `${size}px`, height: `${size}px`, border: `2px solid ${B.glass}`, boxShadow: '0 0 20px rgba(168,85,247,0.15)', cursor: zoom > 1 ? 'grab' : 'default' }}
      onMouseDown={zoom > 1 ? onMouseDown : undefined} onTouchStart={zoom > 1 ? onTouchStart : undefined}>
      <img src={src} alt="" draggable={false} className="w-full h-full" style={{ objectFit: 'cover', transform: `scale(${zoom}) translate(${offsetX}px, ${offsetY}px)`, transformOrigin: 'center' }} />
    </div>
  )
}

// ── Layout mini-preview schematics ──
function FrontSchematic({ layoutId }) {
  const c = { p: B.neonPurple, b: B.neonBlue, pk: B.neonPink }
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
  const c = { p: B.neonPurple, b: B.neonBlue, pk: B.neonPink }
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

// ═══════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function PrintableCardPreview({ card, slug }) {
  const [side, setSide] = useState('front')
  const [downloading, setDownloading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const previewRef = useRef(null)
  const exportRef = useRef(null)

  const [frontLayout, setFrontLayout] = useState('classic')
  const [backLayout, setBackLayout] = useState('qrCenter')

  const [photoZoom, setPhotoZoom] = useState(1)
  const [photoOffsetX, setPhotoOffsetX] = useState(0)
  const [photoOffsetY, setPhotoOffsetY] = useState(0)

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
    const max = (photoZoom - 1) * 20
    setPhotoOffsetX(prev => Math.max(-max, Math.min(max, prev + dx * 0.5)))
    setPhotoOffsetY(prev => Math.max(-max, Math.min(max, prev + dy * 0.5)))
  }, [photoZoom])

  const resetPhoto = () => { setPhotoZoom(1); setPhotoOffsetX(0); setPhotoOffsetY(0) }

  const handleDownload = useCallback(async () => {
    if (!exportRef.current) return
    setDownloading(true)
    try {
      const outW = BASE_W * PX
      const outH = BASE_H * PX
      const dataUrl = await toPng(exportRef.current, {
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
        },
        filter: (node) => node.dataset?.excludeExport !== 'true'
      })
      const link = document.createElement('a')
      link.download = `phygital-card-${side}-${outW}x${outH}.png`
      link.href = dataUrl
      link.click()
      toast.success(`${side === 'front' ? 'Front' : 'Back'} downloaded — ${outW}x${outH}px (premium print quality)`)
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to download card image')
    } finally { setDownloading(false) }
  }, [side])

  // Resolved field values
  const v = {}
  for (const f of FIELD_OPTIONS) {
    v[f.key] = visibleFields[f.key] ? gv(card, f.key) : ''
  }
  if (!v.name) v.name = 'Your Name'

  const FrontComp = FRONT_COMPONENTS[frontLayout] || FrontClassic
  const BackComp = BACK_COMPONENTS[backLayout] || BackQRCenter

  const outputW = BASE_W * PX
  const outputH = BASE_H * PX
  const dpi = Math.round((outputW / 3.5))

  return (
    <div className="space-y-5">
      {/* ══ HIDDEN EXPORT TARGET ══
          Rendered at full 1050x600 CSS px off-screen.
          toPng captures THIS node at pixelRatio 6 = 6300x3600 output.
          This is what makes the printed card razor-sharp. */}
      <div style={{
        position: 'fixed', left: '-99999px', top: '-99999px',
        width: `${BASE_W}px`, height: `${BASE_H}px`,
        overflow: 'hidden', pointerEvents: 'none', zIndex: -1
      }}>
        <div ref={exportRef} style={{ width: `${BASE_W}px`, height: `${BASE_H}px`, overflow: 'hidden' }}>
          {side === 'front'
            ? <FrontComp v={v} photoZoom={photoZoom} photoOffsetX={photoOffsetX} photoOffsetY={photoOffsetY} forExport />
            : <BackComp card={card} qrDataUrl={qrDataUrl} vf={visibleFields} />}
        </div>
      </div>

      {/* ── Layout Selector ── */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
        <p className="text-xs font-medium text-slate-300 mb-3 flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-neon-purple" />
          Card Layout
        </p>

        {/* Front layouts */}
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

        {/* Back layouts */}
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

      {/* ── Card Preview (visible, scaled down for screen) ── */}
      <div className="flex justify-center">
        <div className="relative" style={{ width: '525px', maxWidth: '100%' }}>
          <div className="relative" style={{ paddingBottom: `${(1 / 1.75) * 100}%` }}>
            <div ref={previewRef} className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl" style={{ width: '100%', height: '100%' }}>
              {side === 'front'
                ? <FrontComp v={v} photoZoom={photoZoom} photoOffsetX={photoOffsetX} photoOffsetY={photoOffsetY} />
                : <BackComp card={card} qrDataUrl={qrDataUrl} vf={visibleFields} />}
            </div>
          </div>
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
              {photoZoom > 1 && <p className="text-[9px] text-slate-500 text-center mt-1 flex items-center justify-center gap-1"><Move className="w-2.5 h-2.5" /> Drag to reposition</p>}
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
                  style={{ background: `linear-gradient(90deg, ${B.neonPurple} ${((photoZoom - 1) / 2) * 100}%, ${B.bgSubtle} ${((photoZoom - 1) / 2) * 100}%)` }} />
              </div>
              <button onClick={resetPhoto} disabled={photoZoom === 1 && photoOffsetX === 0 && photoOffsetY === 0}
                className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-slate-200 transition disabled:opacity-30">
                <RotateCw className="w-3 h-3" /> Reset position
              </button>
            </div>
          </div>
        </div>
      )}

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
      <button onClick={handleDownload} disabled={downloading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white text-sm font-medium hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50">
        {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        Download {side === 'front' ? 'Front' : 'Back'} — Premium Print ({outputW}x{outputH}px)
      </button>
      <p className="text-[11px] text-slate-500 text-center">
        Renders at full {BASE_W}x{BASE_H} CSS then {PX}x upscale = <strong className="text-slate-400">{outputW} x {outputH}px</strong> ({dpi} DPI). Premium print quality.
      </p>
    </div>
  )
}
