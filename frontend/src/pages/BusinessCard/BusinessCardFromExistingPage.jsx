/**
 * BusinessCardFromExistingPage
 * 5-step wizard for creating a digital + printable card from an existing physical card.
 * Steps: Upload Front+Back → Review Details → Choose Font → Personalized Page → Printable Card
 */

import React, { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Upload, ArrowLeft, ArrowRight, Check, Loader2, Camera, X,
  User, Phone, Mail, Globe, Building, Briefcase, MapPin,
  Type, Eye, CreditCard, Palette, ChevronRight
} from 'lucide-react'
import api from '../../utils/api'
import PRINTABLE_CARD_FONTS, { loadGoogleFont, preloadAllFonts } from '../../config/printableCardFonts'
import PrintableCardPreview from '../../components/BusinessCard/PrintableCardPreview'

const STEPS = [
  { id: 'upload', label: 'Upload Card', icon: Camera },
  { id: 'review', label: 'Review Details', icon: Eye },
  { id: 'font', label: 'Choose Font', icon: Type },
  { id: 'personalize', label: 'Personalized Page', icon: User },
  { id: 'printable', label: 'Printable Card', icon: CreditCard }
]

export default function BusinessCardFromExistingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Upload state
  const [frontImage, setFrontImage] = useState(null)
  const [frontPreview, setFrontPreview] = useState(null)
  const [backImage, setBackImage] = useState(null)
  const [backPreview, setBackPreview] = useState(null)

  // Analysis results
  const [sourceImages, setSourceImages] = useState({ frontUrl: '', backUrl: '' })
  const [extractedText, setExtractedText] = useState({
    name: '', title: '', company: '', phone: '', email: '', website: '', address: ''
  })
  const [colorPalette, setColorPalette] = useState({
    primary: '#1E40AF', secondary: '#3B82F6', accent: '#60A5FA',
    background: '#FFFFFF', text: '#1F2937'
  })

  // Font selection
  const [selectedFont, setSelectedFont] = useState('Inter')

  // Created card state
  const [cardId, setCardId] = useState(null)
  const [slug, setSlug] = useState('')

  // Card data for printable preview
  const cardData = {
    profile: {
      name: extractedText.name,
      title: extractedText.title,
      company: extractedText.company,
      photo: ''
    },
    contact: {
      phone: extractedText.phone,
      email: extractedText.email,
      website: extractedText.website
    },
    theme: {
      primaryColor: colorPalette.primary,
      secondaryColor: colorPalette.secondary
    }
  }

  // ── File handlers ───────────────────────────────────
  const handleFileSelect = (side) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG)')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10 MB')
      return
    }
    const preview = URL.createObjectURL(file)
    if (side === 'front') {
      setFrontImage(file)
      setFrontPreview(preview)
    } else {
      setBackImage(file)
      setBackPreview(preview)
    }
  }

  const handleDrop = (side) => (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const preview = URL.createObjectURL(file)
    if (side === 'front') {
      setFrontImage(file)
      setFrontPreview(preview)
    } else {
      setBackImage(file)
      setBackPreview(preview)
    }
  }

  // ── Analyze card ────────────────────────────────────
  const analyzeCard = async () => {
    if (!frontImage) {
      toast.error('Please upload the front of your business card')
      return
    }
    setAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('frontImage', frontImage)
      if (backImage) formData.append('backImage', backImage)

      const res = await api.post('/business-cards/analyze-card', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      })

      const data = res.data?.data
      if (data) {
        setSourceImages(data.sourceImages || {})
        setExtractedText(prev => ({ ...prev, ...data.extractedText }))
        setColorPalette(prev => ({ ...prev, ...data.colorPalette }))
        toast.success('Card analyzed successfully!')
        setStep(1)
      }
    } catch (err) {
      console.error('Analyze error:', err)
      toast.error('Failed to analyze card. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Create digital card ─────────────────────────────
  const createDigitalCard = async () => {
    if (!extractedText.name?.trim()) {
      toast.error('Please fill in a name')
      return
    }
    setSaving(true)
    try {
      const payload = {
        profile: {
          name: extractedText.name,
          title: extractedText.title,
          company: extractedText.company,
          bio: ''
        },
        contact: {
          phone: extractedText.phone,
          email: extractedText.email,
          website: extractedText.website
        },
        theme: {
          primaryColor: colorPalette.primary,
          secondaryColor: colorPalette.secondary,
          fontFamily: selectedFont,
          cardStyle: 'rounded'
        },
        sourceCard: {
          frontImageUrl: sourceImages.frontUrl,
          backImageUrl: sourceImages.backUrl,
          extractedColors: colorPalette,
          createdFromExisting: true
        },
        printableCard: {
          fontFamily: selectedFont
        },
        isPublished: true
      }

      const res = await api.post('/business-cards', payload)
      const card = res.data?.data?.card
      if (card) {
        setCardId(card._id)
        setSlug(card.slug)
        toast.success('Digital card created!')
        setStep(4)
      }
    } catch (err) {
      console.error('Create card error:', err)
      toast.error('Failed to create card')
    } finally {
      setSaving(false)
    }
  }

  // ── Step navigation ─────────────────────────────────
  const canGoNext = () => {
    switch (step) {
      case 0: return !!frontImage
      case 1: return !!extractedText.name?.trim()
      case 2: return !!selectedFont
      case 3: return true
      default: return false
    }
  }

  const goNext = () => {
    if (step === 0) {
      analyzeCard()
      return
    }
    if (step === 2) {
      preloadAllFonts()
    }
    if (step === 3) {
      createDigitalCard()
      return
    }
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => setStep(s => Math.max(s - 1, 0))

  // ── Render Steps ────────────────────────────────────
  const DropZone = ({ side, image, preview, label }) => {
    const inputRef = useRef(null)
    return (
      <div
        className={`flex-1 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all min-h-[200px] flex flex-col items-center justify-center ${
          preview ? 'border-neon-purple/50 bg-neon-purple/5' : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop(side)}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect(side)} />
        {preview ? (
          <div className="relative w-full">
            <img src={preview} alt={label} className="w-full h-40 object-contain rounded-lg" />
            <button
              onClick={e => { e.stopPropagation(); side === 'front' ? (setFrontImage(null), setFrontPreview(null)) : (setBackImage(null), setBackPreview(null)) }}
              className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <p className="text-xs text-neon-purple mt-2 font-medium">{label} uploaded</p>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-500 mb-2" />
            <p className="text-sm font-medium text-slate-300">{label}</p>
            <p className="text-xs text-slate-500 mt-1">Drag & drop or click to upload</p>
            <p className="text-[10px] text-slate-600 mt-0.5">JPG, PNG up to 10 MB</p>
          </>
        )}
      </div>
    )
  }

  const renderUploadStep = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Upload Your Business Card</h2>
        <p className="text-sm text-slate-400">Upload both the front and back of your existing card for best results.</p>
      </div>
      <div className="flex gap-4 flex-col sm:flex-row">
        <DropZone side="front" image={frontImage} preview={frontPreview} label="FRONT of card" />
        <DropZone side="back" image={backImage} preview={backPreview} label="BACK of card" />
      </div>
      {!backImage && frontImage && (
        <p className="text-xs text-amber-400/80">Tip: uploading the back side too helps us extract more contact info.</p>
      )}
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Review Extracted Details</h2>
        <p className="text-sm text-slate-400">We extracted these details from your card. Please correct anything that looks wrong.</p>
      </div>

      {/* Source images preview */}
      <div className="flex gap-3">
        {frontPreview && <img src={frontPreview} alt="Front" className="h-24 rounded-lg border border-slate-700 object-contain" />}
        {backPreview && <img src={backPreview} alt="Back" className="h-24 rounded-lg border border-slate-700 object-contain" />}
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { key: 'name', label: 'Full Name', icon: User, placeholder: 'John Doe' },
          { key: 'title', label: 'Job Title', icon: Briefcase, placeholder: 'Software Engineer' },
          { key: 'company', label: 'Company', icon: Building, placeholder: 'Acme Inc.' },
          { key: 'phone', label: 'Phone', icon: Phone, placeholder: '+1 234 567 8900' },
          { key: 'email', label: 'Email', icon: Mail, placeholder: 'john@example.com' },
          { key: 'website', label: 'Website', icon: Globe, placeholder: 'https://example.com' },
        ].map(field => (
          <div key={field.key}>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1">
              <field.icon className="w-3.5 h-3.5" /> {field.label}
            </label>
            <input
              type="text"
              value={extractedText[field.key] || ''}
              onChange={e => setExtractedText(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 placeholder:text-slate-600 focus:border-neon-purple/50 focus:outline-none transition"
            />
          </div>
        ))}
      </div>

      {/* Color Palette */}
      <div>
        <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5" /> Extracted Color Palette
        </p>
        <div className="flex gap-3 flex-wrap">
          {Object.entries(colorPalette).map(([key, value]) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={e => setColorPalette(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-8 h-8 rounded border border-slate-600 cursor-pointer"
              />
              <span className="text-xs text-slate-400 capitalize">{key}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderFontStep = () => {
    preloadAllFonts()
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-100 mb-1">Choose a Font</h2>
          <p className="text-sm text-slate-400">Select the font that most closely matches your old card's style.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PRINTABLE_CARD_FONTS.map(f => {
            loadGoogleFont(f.family, f.weights)
            const isSelected = selectedFont === f.family
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFont(f.family)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-neon-purple bg-neon-purple/10 shadow-lg shadow-neon-purple/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <p className="text-lg font-semibold truncate" style={{ fontFamily: f.family, color: isSelected ? '#A78BFA' : '#E2E8F0' }}>
                  {extractedText.name || 'Your Name'}
                </p>
                <p className="text-[10px] mt-1 truncate" style={{ fontFamily: f.family, color: '#94A3B8' }}>
                  {extractedText.title || 'Job Title'}
                </p>
                <p className="text-[10px] mt-2 text-slate-500">{f.name} <span className="text-slate-600">({f.category})</span></p>
                {isSelected && <Check className="w-4 h-4 text-neon-purple mt-1" />}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderPersonalizeStep = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Setup Personalized Page</h2>
        <p className="text-sm text-slate-400">Your digital card will be created with the extracted details. You can further edit it later.</p>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">Summary</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-slate-500">Name:</span>
            <p className="text-slate-200 font-medium">{extractedText.name || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Title:</span>
            <p className="text-slate-200">{extractedText.title || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Company:</span>
            <p className="text-slate-200">{extractedText.company || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Phone:</span>
            <p className="text-slate-200">{extractedText.phone || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Email:</span>
            <p className="text-slate-200">{extractedText.email || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Website:</span>
            <p className="text-slate-200">{extractedText.website || '—'}</p>
          </div>
          <div>
            <span className="text-slate-500">Font:</span>
            <p className="text-slate-200" style={{ fontFamily: selectedFont }}>{selectedFont}</p>
          </div>
          <div>
            <span className="text-slate-500">Colors:</span>
            <div className="flex gap-1 mt-1">
              {Object.values(colorPalette).map((c, i) => (
                <div key={i} className="w-5 h-5 rounded border border-slate-600" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-500">Clicking "Next" will create your digital card and take you to the printable card step.</p>
    </div>
  )

  const renderPrintableStep = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Your Printable Card</h2>
        <p className="text-sm text-slate-400">Choose a layout, customize, and download your new card (3.5" x 2" at 300 DPI).</p>
      </div>
      <PrintableCardPreview
        card={cardData}
        slug={slug}
        colors={colorPalette}
        onColorsChange={setColorPalette}
        initialLayout="classic"
        initialFont={selectedFont}
      />
      <div className="flex gap-3 pt-2">
        {cardId && (
          <button
            onClick={() => navigate(`/business-cards/edit/${cardId}`)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-700/50 transition"
          >
            Edit Digital Card
          </button>
        )}
        <button
          onClick={() => navigate('/business-cards')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white text-sm font-medium hover:shadow-glow-lg transition-all"
        >
          Done
        </button>
      </div>
    </div>
  )

  const stepRenderers = [renderUploadStep, renderReviewStep, renderFontStep, renderPersonalizeStep, renderPrintableStep]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/business-cards')} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-gradient">Create from Existing Card</h1>
          </div>
        </div>
        {/* Step indicator */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex-1 flex items-center gap-1">
                <div className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? 'bg-neon-purple' : 'bg-slate-700'}`} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            {STEPS.map((s, i) => (
              <span key={s.id} className={`text-[10px] ${i === step ? 'text-neon-purple font-medium' : i < step ? 'text-slate-400' : 'text-slate-600'}`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {stepRenderers[step]()}

        {/* Navigation buttons */}
        {step < 4 && (
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-700/50">
            <button
              onClick={goBack}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={goNext}
              disabled={!canGoNext() || analyzing || saving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white text-sm font-medium hover:shadow-glow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              ) : step === 3 ? (
                <>Create Card <ChevronRight className="w-4 h-4" /></>
              ) : (
                <>Next <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
