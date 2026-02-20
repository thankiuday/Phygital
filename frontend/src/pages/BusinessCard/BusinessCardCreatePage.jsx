/**
 * BusinessCardCreatePage
 * 4-tab wizard: Content → Design → QR Code → Preview/Publish
 * Handles both create and edit (if :id param present).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  User, Phone, Mail, Palette, Eye, Save, ArrowLeft, ArrowRight,
  Plus, Trash2, ChevronUp, ChevronDown, Image as ImageIcon, Video, Upload,
  Link as LinkIcon, MessageSquare, MessageCircle, Type, FileText, UserCircle, Globe,
  Copy, Download, Check, Loader2, GripVertical, Cloud, CloudOff, CreditCard,
  ImagePlus, EyeOff, QrCode, X
} from 'lucide-react'
import api from '../../utils/api'
import { downloadVCard } from '../../utils/vcardGenerator'
import { generateAdvancedQRCode } from '../../utils/qrGenerator'
import businessCardTemplates, { getBusinessCardTemplate, mergeThemeColors } from '../../config/businessCardTemplates'
import { getLayout } from '../../components/BusinessCard/layouts'
import PrintableCardPreview, { PRINT_DARK, ScaledPrintFrame } from '../../components/BusinessCard/PrintableCardPreview'
import ImageCropModal from '../../components/BusinessCard/ImageCropModal'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.bubble.css'

const SECTION_TYPES = [
  { type: 'heading', label: 'Heading & Text', icon: Type },
  { type: 'about', label: 'About', icon: FileText },
  { type: 'images', label: 'Image Gallery', icon: ImageIcon },
  { type: 'videos', label: 'Videos', icon: Video },
  { type: 'social_links', label: 'Social Links', icon: Globe },
  { type: 'links', label: 'Custom Links', icon: LinkIcon },
  { type: 'testimonials', label: 'Testimonials', icon: MessageSquare }
]

const DEFAULT_CONTENT_ORDER = ['banner', 'photo', 'nameInfo', 'contact', 'saveContact', 'sections', 'social']

const CONTENT_BLOCKS = [
  { id: 'banner', label: 'Banner / Header', icon: ImageIcon },
  { id: 'photo', label: 'Profile Photo', icon: UserCircle },
  { id: 'nameInfo', label: 'Name, Title & Bio', icon: Type },
  { id: 'contact', label: 'Contact Buttons', icon: Phone },
  { id: 'saveContact', label: 'Save Contact', icon: Download },
  { id: 'sections', label: 'Content Sections', icon: FileText },
  { id: 'social', label: 'Social Links', icon: Globe },
]

const DEFAULT_CARD = {
  profile: { photo: '', bannerImage: '', showPhoto: true, showBanner: true, name: '', title: '', company: '', bio: '' },
  contact: { phone: '', email: '', sms: '', whatsapp: '', website: '' },
  sections: [],
  socialLinks: {},
  contentOrder: DEFAULT_CONTENT_ORDER,
  theme: { primaryColor: '#8B5CF6', secondaryColor: '#EC4899', fontFamily: 'Inter', cardStyle: 'rounded' },
  templateId: 'professional',
  isPublished: true
}

const TABS = [
  { id: 'content', label: 'Content', icon: UserCircle },
  { id: 'design', label: 'Design', icon: Palette },
  { id: 'preview', label: 'Preview & Publish', icon: Eye },
  { id: 'printable', label: 'Printable Card', icon: CreditCard }
]

export default function BusinessCardCreatePage() {
  const { id: editId } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)
  const [tabVisible, setTabVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!!editId)
  const [cardId, setCardId] = useState(editId || null)
  const [card, setCard] = useState(JSON.parse(JSON.stringify(DEFAULT_CARD)))
  const [slug, setSlug] = useState('')
  const [copied, setCopied] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState('saved')
  const [cropModal, setCropModal] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const autoSaveTimeoutRef = useRef(null)
  const hasUnsavedChangesRef = useRef(false)
  const previewPanelRef = useRef(null)
  const printableRef = useRef(null)

  const switchTab = useCallback((idx) => {
    if (idx === activeTab) return
    setTabVisible(false)
    setTimeout(() => { setActiveTab(idx); setTabVisible(true) }, 120)
  }, [activeTab])

  const currentTemplate = useMemo(() => getBusinessCardTemplate(card.templateId), [card.templateId])
  const colors = useMemo(() => mergeThemeColors(currentTemplate, card.theme), [currentTemplate, card.theme])
  const publicUrl = slug ? `${window.location.origin}/#/card/${slug}` : ''

  // ── Load card if editing ──
  useEffect(() => {
    if (!editId) return
    setLoading(true)
    api.get(`/business-cards/${editId}`)
      .then(res => {
        const c = res.data?.data?.card
        if (c) {
          setCard({
            profile: { ...DEFAULT_CARD.profile, ...c.profile },
            contact: c.contact || DEFAULT_CARD.contact,
            sections: c.sections || [],
            socialLinks: c.socialLinks || {},
            theme: c.theme || DEFAULT_CARD.theme,
            templateId: c.templateId || 'professional',
            isPublished: c.isPublished || false
          })
          setSlug(c.slug || '')
          setCardId(c._id)
        }
      })
      .catch(() => toast.error('Failed to load business card'))
      .finally(() => setLoading(false))
  }, [editId])

  // ── Auto-save function ──
  const autoSave = useCallback(async (force = false) => {
    // Skip if no name (required field) unless forced
    if (!card.profile.name?.trim() && !force) return
    
    // Skip if already saving
    if (saving) return
    
    setAutoSaveStatus('saving')
    setSaving(true)
    hasUnsavedChangesRef.current = false
    
    try {
      let res
      const payload = { ...card, slug: slug || undefined }
      const currentCardId = cardId
      
      if (currentCardId) {
        res = await api.put(`/business-cards/${currentCardId}`, payload)
      } else {
        // Auto-create card if it doesn't exist
        res = await api.post('/business-cards', payload)
      }
      
      const saved = res.data?.data?.card
      if (saved) {
        if (!currentCardId) {
          setCardId(saved._id)
          if (!editId && saved._id) {
            navigate(`/business-cards/edit/${saved._id}`, { replace: true })
          }
        }
        setSlug(saved.slug)
        setAutoSaveStatus('saved')
        return saved._id
      }
    } catch (err) {
      setAutoSaveStatus('error')
      console.error('Auto-save error:', err)
      // Don't show toast for auto-save errors to avoid spam
      return null
    } finally {
      setSaving(false)
    }
  }, [card, slug, cardId, saving, editId, navigate])

  // ── Debounced auto-save ──
  useEffect(() => {
    // Skip initial load
    if (loading) return
    
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    // Set flag that we have unsaved changes
    hasUnsavedChangesRef.current = true
    
    // Auto-save after 1.5 seconds of inactivity
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current) {
        autoSave()
      }
    }, 1500)
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, slug, loading])

  const updateField = useCallback((path, value) => {
    setCard(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return next
    })
  }, [])

  const addSection = (type) => {
    setCard(prev => ({
      ...prev,
      sections: [...prev.sections, { type, title: SECTION_TYPES.find(s => s.type === type)?.label || type, content: type === 'links' ? [] : type === 'images' ? [] : type === 'videos' ? [] : type === 'testimonials' ? [] : '', visible: true, order: prev.sections.length }]
    }))
  }

  const removeSection = (idx) => {
    setCard(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== idx) }))
  }

  const moveSection = (idx, dir) => {
    setCard(prev => {
      const arr = [...prev.sections]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return prev
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return { ...prev, sections: arr.map((s, i) => ({ ...s, order: i })) }
    })
  }

  const updateSection = (idx, updates) => {
    setCard(prev => {
      const sections = [...prev.sections]
      sections[idx] = { ...sections[idx], ...updates }
      return { ...prev, sections }
    })
  }

  // ── Photo upload ──
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setPhotoUploading(true)
    
    try {
      // Auto-create card if it doesn't exist
      let currentCardId = cardId
      if (!currentCardId) {
        // Ensure we have at least a name for auto-create
        if (!card.profile.name?.trim()) {
          updateField('profile.name', 'New Card')
          // Wait a bit for state update
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Force auto-save to create the card
        const savedId = await autoSave(true)
        currentCardId = savedId || cardId
        
        // If still no card ID, show error
        if (!currentCardId) {
          toast.error('Please enter a name first')
          setPhotoUploading(false)
          return
        }
      }
      
      const formData = new FormData()
      formData.append('photo', file)
      const res = await api.post(`/business-cards/${currentCardId}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const photoUrl = res.data?.data?.card?.profile?.photo
      if (photoUrl) {
        updateField('profile.photo', photoUrl)
        setCropModal({ url: photoUrl, field: 'profile.photo', aspect: 1, shape: 'round' })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload photo')
    } finally {
      setPhotoUploading(false)
    }
  }

  // ── Banner upload ──
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setBannerUploading(true)
    try {
      let currentCardId = cardId
      if (!currentCardId) {
        if (!card.profile.name?.trim()) {
          updateField('profile.name', 'New Card')
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        const savedId = await autoSave(true)
        currentCardId = savedId || cardId
        if (!currentCardId) {
          toast.error('Please enter a name first')
          setBannerUploading(false)
          return
        }
      }
      
      const formData = new FormData()
      formData.append('banner', file)
      const res = await api.post(`/business-cards/${currentCardId}/banner`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const bannerUrl = res.data?.data?.card?.profile?.bannerImage
      if (bannerUrl) {
        updateField('profile.bannerImage', bannerUrl)
        setCropModal({ url: bannerUrl, field: 'profile.bannerImage', aspect: 16 / 9, shape: 'rect' })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload banner')
    } finally {
      setBannerUploading(false)
    }
  }

  // ── Section file upload (images/videos to Cloudinary) ──
  const handleSectionFileUpload = async (files, type = 'images') => {
    if (!files || files.length === 0) return []
    
    let currentCardId = cardId
    if (!currentCardId) {
      if (!card.profile.name?.trim()) {
        updateField('profile.name', 'New Card')
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      const savedId = await autoSave(true)
      currentCardId = savedId || cardId
      if (!currentCardId) {
        toast.error('Please enter a name first')
        return []
      }
    }
    
    const formData = new FormData()
    for (const file of files) {
      formData.append(type, file)
    }
    
    try {
      const timeoutMs = type === 'videos' ? 600000 : 120000 // 10 min for videos, 2 min for images
      const res = await api.post(`/business-cards/${currentCardId}/${type}`, formData, { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: timeoutMs,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      })
      return res.data?.data?.urls || []
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to upload ${type}`)
      return []
    }
  }

  const handleCropConfirm = useCallback(async (blob) => {
    if (!cropModal || !cardId) { setCropModal(null); return }
    try {
      const formData = new FormData()
      const fieldName = cropModal.field === 'profile.photo' ? 'photo' : 'banner'
      formData.append(fieldName, blob, 'cropped.png')
      const endpoint = fieldName === 'photo' ? 'photo' : 'banner'
      const res = await api.post(`/business-cards/${cardId}/${endpoint}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      const updatedCard = res.data?.data?.card
      if (updatedCard) {
        const url = fieldName === 'photo' ? updatedCard.profile?.photo : updatedCard.profile?.bannerImage
        if (url) updateField(cropModal.field, url)
      }
      toast.success('Image cropped and uploaded')
    } catch {
      toast.error('Failed to upload cropped image')
    }
    setCropModal(null)
  }, [cropModal, cardId, updateField])

  // ── Manual save (for preview tab) ──
  const handleSave = async () => {
    await autoSave(true)
    if (autoSaveStatus === 'saved') {
      toast.success(cardId ? 'Card updated!' : 'Card created!')
    }
  }

  // ── Save on printable tab then redirect to business cards list ──
  const handleSavePrintableAndRedirect = useCallback(async () => {
    const savedId = await autoSave(true)
    if (savedId != null) {
      toast.success('Card saved!')
      navigate('/business-cards')
    }
  }, [autoSave, navigate])

  // ── Save then go to next tab (Content, Design, Preview tabs) ──
  const handleNextWithSave = useCallback(async () => {
    if (activeTab >= TABS.length - 1) return
    const savedId = await autoSave(true)
    if (savedId != null) {
      toast.success('Saved')
      switchTab(activeTab + 1)
    }
  }, [activeTab, autoSave, switchTab])

  // ── Copy URL ──
  const handleCopy = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-gradient" />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {cropModal && (
        <ImageCropModal
          imageUrl={cropModal.url}
          aspect={cropModal.aspect}
          cropShape={cropModal.shape}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropModal(null)}
        />
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 pt-6 pb-8">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute -top-2 -right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 transition shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/80 p-3 backdrop-blur-sm">
              {activeTab === 3 && printableRef.current ? (() => {
                const s = printableRef.current
                const FC = s.FrontComp
                const BC = s.BackComp
                const c = s.colors || PRINT_DARK
                return (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-400 font-medium text-center">Printable Card Preview</p>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5 text-center">Front</p>
                      <ScaledPrintFrame>
                        {FC && <FC v={s.v} photoZoom={s.photoZoom} photoOffsetX={s.photoOffsetX} photoOffsetY={s.photoOffsetY} fontScale={s.frontFontScale} colors={c} />}
                      </ScaledPrintFrame>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5 text-center">Back</p>
                      <ScaledPrintFrame>
                        {BC && <BC card={card} qrDataUrl={s.qrDataUrl} vf={s.visibleFields} fontScale={s.backFontScale} colors={c} />}
                      </ScaledPrintFrame>
                    </div>
                  </div>
                )
              })() : (
                <>
                  <p className="text-xs text-slate-400 mb-2 font-medium text-center">Live Preview</p>
                  <LivePreview card={card} colors={colors} currentTemplate={currentTemplate} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="relative flex items-center justify-center">
            <h1 className="text-base sm:text-lg font-bold text-gradient text-center">
              {editId ? 'Edit Business Card' : 'Create Business Card'}
            </h1>
            {/* Auto-save indicator */}
            <div className="absolute right-0 flex items-center gap-2 text-xs">
              {autoSaveStatus === 'saving' && (
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-1.5 text-green-400">
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Saved</span>
                </div>
              )}
              {autoSaveStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-red-400">
                  <CloudOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Error</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Bar - centered */}
      <div className="border-b border-slate-700/50 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => switchTab(i)}
                className={`flex items-center gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap flex-shrink-0 ${
                  activeTab === i
                    ? 'border-neon-purple text-gradient'
                    : 'border-transparent text-slate-400 hover:text-slate-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* ── Main editor ── */}
          <div className="col-span-1 lg:col-span-3 space-y-4 sm:space-y-6" style={{ opacity: tabVisible ? 1 : 0, transition: 'opacity 0.12s ease' }}>
            {activeTab === 0 && <ContentTab card={card} updateField={updateField} addSection={addSection} removeSection={removeSection} moveSection={moveSection} updateSection={updateSection} handlePhotoUpload={handlePhotoUpload} photoUploading={photoUploading} handleBannerUpload={handleBannerUpload} bannerUploading={bannerUploading} handleSectionFileUpload={handleSectionFileUpload} cardId={cardId} />}
            {activeTab === 1 && <DesignTab card={card} updateField={updateField} slug={slug} setSlug={setSlug} />}
            {activeTab === 2 && <PreviewPublishTab card={card} updateField={updateField} publicUrl={publicUrl} slug={slug} handleCopy={handleCopy} copied={copied} handleSave={handleSave} saving={saving} cardId={cardId} />}
            {activeTab === 3 && <PrintableTab card={card} slug={slug} printableRef={printableRef} />}
          </div>

          {/* ── Live Preview Panel (desktop only — mobile uses the Preview modal) ── */}
          <div ref={previewPanelRef} className="hidden lg:block lg:col-span-2 order-1 lg:order-2">
            <div className="sticky top-24">
              <h3 className="text-sm text-slate-400 mb-3 font-medium px-1">Live Preview</h3>
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-3 backdrop-blur-sm">
                <LivePreview card={card} colors={colors} currentTemplate={currentTemplate} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="border-t border-slate-700/50 bg-slate-800/50 backdrop-blur sticky bottom-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center gap-2">
            <button 
              onClick={() => switchTab(Math.max(0, activeTab - 1))} 
              disabled={activeTab === 0} 
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border border-slate-700/50 text-xs sm:text-sm disabled:opacity-30 hover:bg-slate-700/50 transition text-slate-300"
            >
              <ArrowLeft className="w-4 h-4" /> 
              <span className="hidden sm:inline">Previous</span>
            </button>
            
            {/* Preview + Tab indicators (center) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neon-purple/40 bg-neon-purple/10 text-neon-purple text-xs font-medium hover:bg-neon-purple/20 transition"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <div className="hidden sm:flex items-center gap-1.5">
                {TABS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition ${
                      i === activeTab ? 'bg-neon-purple w-6' : 'bg-slate-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {activeTab === TABS.length - 1 ? (
              <button 
                onClick={handleSavePrintableAndRedirect} 
                disabled={saving} 
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white hover:shadow-glow-lg disabled:opacity-50 text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="hidden sm:inline">Save</span>
              </button>
            ) : (
              <button 
                onClick={handleNextWithSave} 
                disabled={saving} 
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white hover:shadow-glow-lg disabled:opacity-50 text-xs sm:text-sm transition-all duration-300 hover:scale-105 active:scale-95"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span className="hidden sm:inline">Next</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  TAB 1: Content
// ═══════════════════════════════════════════════════════════
function ContentTab({ card, updateField, addSection, removeSection, moveSection, updateSection, handlePhotoUpload, photoUploading, handleBannerUpload, bannerUploading, handleSectionFileUpload, cardId }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile */}
      <Panel title="Profile">
        {/* Profile Photo */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-700 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden flex-shrink-0">
            {card.profile.photo ? (
              <img src={card.profile.photo} alt="" className="w-full h-full object-cover" style={{ transition: 'opacity 0.2s ease' }} />
            ) : (
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500" />
            )}
            {photoUploading && (
              <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-5 h-5 animate-spin text-gradient" />
              </div>
            )}
          </div>
          <div className="flex-1 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              <label className={`inline-flex items-center justify-center text-xs sm:text-sm px-4 py-2 rounded-lg cursor-pointer transition ${cardId || card.profile.name?.trim() ? 'bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white hover:shadow-glow-lg' : 'bg-slate-700 text-slate-300'}`}>
                {photoUploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Uploading...</>
                ) : (
                  <><Plus className="w-4 h-4 mr-2" /> Upload Photo</>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
              {card.profile.photo && (
                <button onClick={() => updateField('profile.photo', '')} className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-400/30 hover:border-red-400/50 transition">
                  <Trash2 className="w-3 h-3 inline mr-1" />Remove
                </button>
              )}
            </div>
            {card.profile.photo && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs text-slate-400">
                <input type="checkbox" checked={card.profile.showPhoto !== false} onChange={e => updateField('profile.showPhoto', e.target.checked)} className="rounded border-slate-600 bg-slate-700 text-neon-purple focus:ring-neon-purple" />
                Show profile photo on digital card
              </label>
            )}
          </div>
        </div>

        {/* Banner Image (optional) */}
        <div className="mb-4 p-3 rounded-lg border border-slate-700/50 bg-slate-800/30">
          <p className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
            <ImagePlus className="w-3.5 h-3.5 text-neon-purple" />
            Banner Image <span className="text-slate-500">(optional)</span>
          </p>
          {card.profile.bannerImage ? (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden h-24 sm:h-32">
                <img src={card.profile.bannerImage} alt="Banner" className="w-full h-full object-cover" style={{ transition: 'opacity 0.2s ease' }} />
                {bannerUploading && (
                  <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-gradient" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 cursor-pointer transition text-slate-300">
                  <Upload className="w-3 h-3 mr-1.5" /> Change
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={bannerUploading} />
                </label>
                <button onClick={() => updateField('profile.bannerImage', '')} className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded border border-red-400/30 hover:border-red-400/50 transition">
                  <Trash2 className="w-3 h-3 inline mr-1" />Remove
                </button>
                <label className="flex items-center gap-2 ml-auto cursor-pointer text-xs text-slate-400">
                  <input type="checkbox" checked={card.profile.showBanner !== false} onChange={e => updateField('profile.showBanner', e.target.checked)} className="rounded border-slate-600 bg-slate-700 text-neon-purple focus:ring-neon-purple" />
                  Show on digital card
                </label>
              </div>
            </div>
          ) : (
            <label className={`flex items-center justify-center gap-2 w-full h-20 rounded-lg border-2 border-dashed cursor-pointer transition ${cardId || card.profile.name?.trim() ? 'border-slate-600 hover:border-neon-purple/50 hover:bg-neon-purple/5' : 'border-slate-700 opacity-60'} text-slate-400`}>
              {bannerUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><ImagePlus className="w-5 h-5" /> <span className="text-xs">Upload Banner Image</span></>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={bannerUploading} />
            </label>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Full Name *" value={card.profile.name} onChange={v => updateField('profile.name', v)} placeholder="John Doe" />
          <Input label="Job Title" value={card.profile.title} onChange={v => updateField('profile.title', v)} placeholder="Software Engineer" />
          <Input label="Company" value={card.profile.company} onChange={v => updateField('profile.company', v)} placeholder="Acme Corp" className="sm:col-span-2" />
        </div>
        <TextArea label="Bio" value={card.profile.bio} onChange={v => updateField('profile.bio', v)} placeholder="A short bio about yourself..." className="mt-3" />
      </Panel>

      {/* Contact */}
      <Panel title="Contact Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Phone" value={card.contact.phone} onChange={v => updateField('contact.phone', v)} placeholder="+1234567890" />
          <Input label="Email" value={card.contact.email} onChange={v => updateField('contact.email', v)} placeholder="john@example.com" />
          <Input label="WhatsApp" value={card.contact.whatsapp} onChange={v => updateField('contact.whatsapp', v)} placeholder="+1234567890" />
          <Input label="SMS" value={card.contact.sms} onChange={v => updateField('contact.sms', v)} placeholder="+1234567890" />
          <Input label="Website" value={card.contact.website} onChange={v => updateField('contact.website', v)} placeholder="https://example.com" className="sm:col-span-2" />
        </div>
      </Panel>

      {/* Social Links */}
      <Panel title="Social Links">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {['instagram', 'facebook', 'twitter', 'linkedin', 'youtube', 'tiktok', 'github', 'telegram'].map(platform => (
            <Input
              key={platform}
              label={platform.charAt(0).toUpperCase() + platform.slice(1)}
              value={card.socialLinks[platform] || ''}
              onChange={v => updateField(`socialLinks.${platform}`, v)}
              placeholder={`Your ${platform} handle or URL`}
            />
          ))}
        </div>
      </Panel>

      {/* Sections */}
      <Panel title="Content Sections">
        <p className="text-xs text-slate-400 mb-3">Add and reorder sections to customize your card.</p>
        {card.sections.length > 0 && (
          <div className="space-y-3 mb-4">
            {card.sections.map((sec, idx) => (
              <SectionEditor key={idx} section={sec} idx={idx} total={card.sections.length} onUpdate={updateSection} onRemove={removeSection} onMove={moveSection} handleSectionFileUpload={handleSectionFileUpload} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {SECTION_TYPES.map(st => (
            <button key={st.type} onClick={() => addSection(st.type)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/50 transition text-slate-300">
              <Plus className="w-3.5 h-3.5 text-neon-purple" />
              {st.label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ── Section Editor (inline form for each section) ──
function SectionEditor({ section, idx, total, onUpdate, onRemove, onMove, handleSectionFileUpload }) {
  const [expanded, setExpanded] = useState(true)
  const typeMeta = SECTION_TYPES.find(s => s.type === section.type) || {}
  const Icon = typeMeta.icon || Type

  return (
    <div className="border border-slate-700/50 rounded-xl bg-slate-800/50 overflow-hidden backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <GripVertical className="w-4 h-4 text-slate-500" />
        <Icon className="w-4 h-4 text-neon-purple" />
        <span className="text-sm font-medium flex-1 text-slate-100">{section.title || typeMeta.label}</span>
        <button onClick={e => { e.stopPropagation(); onMove(idx, -1) }} disabled={idx === 0} className="p-1 hover:bg-slate-700/50 rounded disabled:opacity-30 text-slate-400"><ChevronUp className="w-3 h-3" /></button>
        <button onClick={e => { e.stopPropagation(); onMove(idx, 1) }} disabled={idx === total - 1} className="p-1 hover:bg-slate-700/50 rounded disabled:opacity-30 text-slate-400"><ChevronDown className="w-3 h-3" /></button>
        <button onClick={e => { e.stopPropagation(); onRemove(idx) }} className="p-1 hover:bg-red-500/20 rounded text-red-400"><Trash2 className="w-3 h-3" /></button>
      </div>
      {expanded && (
        <div className="p-3 space-y-2">
          <Input label="Section Title" value={section.title} onChange={v => onUpdate(idx, { title: v })} />
          <SectionContentEditor section={section} idx={idx} onUpdate={onUpdate} handleSectionFileUpload={handleSectionFileUpload} />
        </div>
      )}
    </div>
  )
}

// ── Per-type content editors ──
function SectionContentEditor({ section, idx, onUpdate, handleSectionFileUpload }) {
  const [uploading, setUploading] = useState(false)
  const type = section.type

  if (type === 'heading' || type === 'text' || type === 'about') {
    const text = typeof section.content === 'string' ? section.content : section.content?.text || ''
    return (
      <div>
        <label className="text-xs text-slate-400 block mb-1">Text (use toolbar to bold, italic, underline)</label>
        <div className="bg-slate-800 border border-slate-700/50 rounded-lg overflow-hidden quill-dark">
          <ReactQuill
            theme="bubble"
            value={text}
            onChange={v => onUpdate(idx, { content: v })}
            placeholder="Enter text..."
            modules={{ toolbar: [['bold', 'italic', 'underline'], ['link']] }}
            formats={['bold', 'italic', 'underline', 'link']}
          />
        </div>
        <p className="text-[9px] text-slate-500 mt-1">Select text to see formatting toolbar</p>
      </div>
    )
  }

  if (type === 'links') {
    const links = Array.isArray(section.content) ? section.content : []
    return (
      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input className="flex-1 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition" placeholder="Label" value={link.label || ''} onChange={e => { const updated = [...links]; updated[i] = { ...link, label: e.target.value }; onUpdate(idx, { content: updated }) }} />
            <input className="flex-1 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition" placeholder="URL" value={link.url || ''} onChange={e => { const updated = [...links]; updated[i] = { ...link, url: e.target.value }; onUpdate(idx, { content: updated }) }} />
            <button onClick={() => onUpdate(idx, { content: links.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate(idx, { content: [...links, { label: '', url: '' }] })} className="text-xs text-neon-purple hover:text-neon-purple/80 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Link</button>
      </div>
    )
  }

  if (type === 'testimonials') {
    const items = Array.isArray(section.content) ? section.content : []
    return (
      <div className="space-y-2">
        {items.map((t, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="flex-1 space-y-1">
              <input className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition" placeholder="Quote" value={t.text || ''} onChange={e => { const u = [...items]; u[i] = { ...t, text: e.target.value }; onUpdate(idx, { content: u }) }} />
              <input className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition" placeholder="Author" value={t.author || ''} onChange={e => { const u = [...items]; u[i] = { ...t, author: e.target.value }; onUpdate(idx, { content: u }) }} />
            </div>
            <button onClick={() => onUpdate(idx, { content: items.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300 p-1 mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <button onClick={() => onUpdate(idx, { content: [...items, { text: '', author: '' }] })} className="text-xs text-neon-purple hover:text-neon-purple/80 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Testimonial</button>
      </div>
    )
  }

  if (type === 'images') {
    const images = Array.isArray(section.content) ? section.content : []
    const handleImageFileUpload = async (e) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      setUploading(true)
      try {
        const urls = await handleSectionFileUpload(Array.from(files), 'images')
        if (urls.length > 0) {
          onUpdate(idx, { content: [...images, ...urls] })
          toast.success(`${urls.length} image(s) uploaded`)
        }
      } finally {
        setUploading(false)
        e.target.value = ''
      }
    }
    return (
      <div className="space-y-2">
        {images.map((url, i) => (
          <div key={i} className="flex gap-2 items-center">
            {url && <img src={url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 border border-slate-700/50" />}
            <input className="flex-1 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition" placeholder="Image URL" value={url} onChange={e => { const u = [...images]; u[i] = e.target.value; onUpdate(idx, { content: u }) }} />
            <button onClick={() => onUpdate(idx, { content: images.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onUpdate(idx, { content: [...images, ''] })} className="text-xs text-neon-purple hover:text-neon-purple/80 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Image URL</button>
          <span className="text-xs text-slate-600">or</span>
          <label className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition ${uploading ? 'bg-slate-700 text-slate-400' : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 border border-neon-purple/30'}`}>
            {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3" /> Upload from device</>}
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageFileUpload} disabled={uploading} />
          </label>
        </div>
      </div>
    )
  }

  if (type === 'videos') {
    const videos = Array.isArray(section.content) ? section.content : []
    const handleVideoFileUpload = async (e) => {
      const files = e.target.files
      if (!files || files.length === 0) return
      setUploading(true)
      try {
        const urls = await handleSectionFileUpload(Array.from(files), 'videos')
        if (urls.length > 0) {
          onUpdate(idx, { content: [...videos, ...urls] })
          toast.success(`${urls.length} video(s) uploaded`)
        }
      } finally {
        setUploading(false)
        e.target.value = ''
      }
    }
    return (
      <div className="space-y-2">
        {videos.map((url, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input className="flex-1 bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition" placeholder="Video URL (YouTube/Vimeo) or uploaded" value={url} onChange={e => { const u = [...videos]; u[i] = e.target.value; onUpdate(idx, { content: u }) }} />
            <button onClick={() => onUpdate(idx, { content: videos.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => onUpdate(idx, { content: [...videos, ''] })} className="text-xs text-neon-purple hover:text-neon-purple/80 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Video URL</button>
          <span className="text-xs text-slate-600">or</span>
          <label className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer transition ${uploading ? 'bg-slate-700 text-slate-400' : 'bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30 border border-neon-purple/30'}`}>
            {uploading ? <><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</> : <><Upload className="w-3 h-3" /> Upload from device</>}
            <input type="file" accept="video/*,.mkv,.avi,.mov,.wmv,.flv,.webm,.mp4,.m4v,.3gp,.ogv" multiple className="hidden" onChange={handleVideoFileUpload} disabled={uploading} />
          </label>
        </div>
        <p className="text-[10px] text-slate-500">Supports YouTube, Vimeo URLs or uploaded video files (any format — MP4, WebM, AVI, MKV, MOV, etc.). No size limit.</p>
      </div>
    )
  }

  return <p className="text-xs text-slate-500">This section uses the {type === 'social_links' ? 'Social Links' : 'Contact Information'} data above.</p>
}

// ═══════════════════════════════════════════════════════════
//  Content Order (drag-to-reorder) + Section sub-order
// ═══════════════════════════════════════════════════════════
function ContentOrderPanel({ order, onChange, sections = [], onSectionsOrderChange }) {
  const dragItem = useRef(null)
  const dragOver = useRef(null)
  const sectionDragItem = useRef(null)
  const sectionDragOver = useRef(null)
  const [sectionsExpanded, setSectionsExpanded] = useState(false)

  const moveItem = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return
    const next = [...order]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    onChange(next)
  }

  const moveSectionItem = (fromIdx, toIdx) => {
    if (!onSectionsOrderChange || fromIdx === toIdx) return
    const next = [...sections]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    onSectionsOrderChange(next.map((s, i) => ({ ...s, order: i })))
  }

  const handleDragStart = (idx) => { dragItem.current = idx }
  const handleDragEnter = (idx) => { dragOver.current = idx }
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOver.current !== null) {
      moveItem(dragItem.current, dragOver.current)
    }
    dragItem.current = null
    dragOver.current = null
  }

  const handleSectionDragStart = (idx) => { sectionDragItem.current = idx }
  const handleSectionDragEnter = (idx) => { sectionDragOver.current = idx }
  const handleSectionDragEnd = () => {
    if (sectionDragItem.current !== null && sectionDragOver.current !== null) {
      moveSectionItem(sectionDragItem.current, sectionDragOver.current)
    }
    sectionDragItem.current = null
    sectionDragOver.current = null
  }

  const handleReset = () => onChange([...DEFAULT_CONTENT_ORDER])

  return (
    <div className="space-y-1.5">
      {order.map((blockId, idx) => {
        const block = CONTENT_BLOCKS.find(b => b.id === blockId)
        if (!block) return null
        const Icon = block.icon
        const isSectionsBlock = blockId === 'sections'

        return (
          <div key={blockId} className="space-y-1">
            <div
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={e => e.preventDefault()}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 hover:border-slate-600/70 cursor-grab active:cursor-grabbing transition group"
            >
              <GripVertical className="w-4 h-4 text-slate-500 group-hover:text-slate-300 flex-shrink-0 transition" />
              <span className="w-5 h-5 rounded flex items-center justify-center bg-slate-700/60 flex-shrink-0">
                <Icon className="w-3 h-3 text-slate-300" />
              </span>
              <span className="flex-1 text-xs sm:text-sm font-medium text-slate-200 truncate">{block.label}</span>
              {isSectionsBlock && sections.length > 0 && (
                <span className="text-[10px] text-slate-500">({sections.length})</span>
              )}
              <span className="text-[10px] text-slate-500 font-mono mr-1">{idx + 1}</span>
              {isSectionsBlock && sections.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSectionsExpanded(s => !s) }}
                  className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                  title={sectionsExpanded ? 'Collapse section order' : 'Order section items'}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sectionsExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button
                  onClick={() => moveItem(idx, Math.max(0, idx - 1))}
                  disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveItem(idx, Math.min(order.length - 1, idx + 1))}
                  disabled={idx === order.length - 1}
                  className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-order: section items when "Content Sections" is expanded */}
            {isSectionsBlock && sectionsExpanded && sections.length > 0 && (
              <div className="ml-6 pl-3 border-l-2 border-slate-700/60 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Order of section items</p>
                {sections.map((sec, secIdx) => {
                  const typeMeta = SECTION_TYPES.find(s => s.type === sec.type) || {}
                  const SecIcon = typeMeta.icon || FileText
                  const label = sec.title || typeMeta.label || sec.type
                  return (
                    <div
                      key={secIdx}
                      draggable
                      onDragStart={() => handleSectionDragStart(secIdx)}
                      onDragEnter={() => handleSectionDragEnter(secIdx)}
                      onDragEnd={handleSectionDragEnd}
                      onDragOver={e => e.preventDefault()}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 hover:border-slate-600/70 cursor-grab active:cursor-grabbing transition group"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
                      <span className="w-4 h-4 rounded flex items-center justify-center bg-slate-700/60 flex-shrink-0">
                        <SecIcon className="w-2.5 h-2.5 text-slate-300" />
                      </span>
                      <span className="flex-1 text-[11px] font-medium text-slate-200 truncate">{label}</span>
                      <span className="text-[9px] text-slate-500 font-mono">{secIdx + 1}</span>
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => moveSectionItem(secIdx, Math.max(0, secIdx - 1))}
                          disabled={secIdx === 0}
                          className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSectionItem(secIdx, Math.min(sections.length - 1, secIdx + 1))}
                          disabled={secIdx === sections.length - 1}
                          className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      <button onClick={handleReset} className="mt-2 text-[10px] text-slate-500 hover:text-neon-purple transition underline underline-offset-2">
        Reset to default order
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  TAB 2: Design
// ═══════════════════════════════════════════════════════════
function DesignTab({ card, updateField, slug, setSlug }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Template selector */}
      <Panel title="Template">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {businessCardTemplates.map(t => (
            <button
              key={t.id}
              onClick={() => updateField('templateId', t.id)}
              className={`relative p-2.5 sm:p-3 rounded-xl border-2 transition text-left ${
                card.templateId === t.id ? 'border-neon-purple bg-neon-purple/10' : 'border-slate-700/50 hover:border-slate-600/50 bg-slate-800/50'
              }`}
            >
              {card.templateId === t.id && <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-neon-purple" />}
              <LayoutSchematic layout={t.layout} colors={t.colors} />
              <p className="text-xs sm:text-sm font-medium text-slate-100 mt-1.5 sm:mt-2 truncate">{t.name}</p>
              <p className="text-[10px] sm:text-xs text-slate-400 line-clamp-1">{t.description}</p>
            </button>
          ))}
        </div>
      </Panel>

      {/* Theme overrides */}
      <Panel title="Theme Customization">
        <p className="text-xs text-slate-400 mb-3">Override the template's default colors. These will be applied to buttons, accents, and section styling.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={card.theme.primaryColor || '#8B5CF6'} onChange={e => updateField('theme.primaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <span className="text-xs text-slate-300">{card.theme.primaryColor}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input type="color" value={card.theme.secondaryColor || '#EC4899'} onChange={e => updateField('theme.secondaryColor', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
              <span className="text-xs text-slate-300">{card.theme.secondaryColor}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Font Family</label>
            <select value={card.theme.fontFamily || 'Inter'} onChange={e => updateField('theme.fontFamily', e.target.value)} className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition">
              <option value="Inter">Inter</option>
              <option value="Poppins">Poppins</option>
              <option value="Georgia">Georgia</option>
              <option value="Roboto">Roboto</option>
              <option value="Playfair Display">Playfair Display</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Card Style</label>
            <select value={card.theme.cardStyle || 'rounded'} onChange={e => updateField('theme.cardStyle', e.target.value)} className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition">
              <option value="rounded">Rounded</option>
              <option value="sharp">Sharp</option>
              <option value="glass">Glass</option>
            </select>
          </div>
        </div>
      </Panel>

      {/* Content Order */}
      <Panel title="Content Order">
        <p className="text-xs text-slate-400 mb-3">Drag or use arrows to reorder how content appears on your digital card. Expand &quot;Content Sections&quot; to order individual section items (headers, text, links, etc.).</p>
        <ContentOrderPanel
          order={card.contentOrder || DEFAULT_CONTENT_ORDER}
          onChange={newOrder => updateField('contentOrder', newOrder)}
          sections={card.sections || []}
          onSectionsOrderChange={newSections => updateField('sections', newSections)}
        />
      </Panel>

      {/* Slug */}
      <Panel title="Card URL">
        <Input label="Custom slug" value={slug} onChange={setSlug} placeholder="john-doe" />
        <p className="text-xs text-slate-500 mt-1">Your card will be available at: <span className="text-neon-purple">{window.location.origin}/#/card/{slug || 'your-slug'}</span></p>
      </Panel>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  TAB 4: Preview & Publish
// ═══════════════════════════════════════════════════════════
function PreviewPublishTab({ card, updateField, publicUrl, slug, handleCopy, copied, handleSave, saving, cardId }) {
  const [qrDownloading, setQrDownloading] = useState(false)

  const handleDownloadQR = async () => {
    if (!publicUrl) return
    setQrDownloading(true)
    try {
      const dataUrl = await generateAdvancedQRCode(publicUrl, {}, 1200)
      const link = document.createElement('a')
      link.download = `business-card-qr-${slug || 'card'}.png`
      link.href = dataUrl
      link.click()
      toast.success('QR code downloaded')
    } catch {
      toast.error('Failed to generate QR code')
    } finally {
      setQrDownloading(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <Panel title="Publish Settings">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-100">Publish Card</p>
            <p className="text-xs text-slate-400">Make your card publicly accessible</p>
          </div>
          <button
            onClick={() => updateField('isPublished', !card.isPublished)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition ${card.isPublished ? 'bg-neon-purple' : 'bg-slate-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${card.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        {card.isPublished && publicUrl && (
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg backdrop-blur-sm">
            <p className="text-xs text-slate-400 mb-2">Public URL</p>
            <div className="flex items-start gap-2">
              <code className="flex-1 text-xs sm:text-sm text-neon-purple break-all">{publicUrl}</code>
              <button onClick={handleCopy} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition text-slate-300 flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Actions">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
          <button onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white hover:shadow-glow-lg disabled:opacity-50 text-xs sm:text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {cardId ? 'Save Changes' : 'Create Card'}
          </button>
          {publicUrl && (
            <button onClick={handleDownloadQR} disabled={qrDownloading} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-neon-purple/50 bg-neon-purple/10 hover:bg-neon-purple/20 text-xs sm:text-sm font-medium transition text-neon-purple disabled:opacity-50">
              {qrDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              Download QR
            </button>
          )}
          {cardId && (
            <button onClick={() => downloadVCard(card)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 text-xs sm:text-sm font-medium transition text-slate-300">
              <Download className="w-4 h-4" /> Download vCard
            </button>
          )}
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700/50 hover:bg-slate-700/50 text-xs sm:text-sm font-medium transition text-slate-300">
              <Globe className="w-4 h-4" /> Open Card
            </a>
          )}
        </div>
      </Panel>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Live Preview (uses layout router for accurate preview)
// ═══════════════════════════════════════════════════════════
const LivePreview = React.memo(function LivePreview({ card, colors, currentTemplate }) {
  const bgStyle = colors.background?.includes('gradient') || colors.background?.includes('linear')
    ? { background: colors.background }
    : { backgroundColor: colors.background || '#FFFFFF' }

  const cardRadius = card.theme.cardStyle === 'sharp' ? '0px' : card.theme.cardStyle === 'glass' ? '16px' : '12px'
  const cardBg = card.theme.cardStyle === 'glass'
    ? { backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.15)' }
    : { backgroundColor: colors.card || '#FFFFFF' }

  const contact = card.contact || {}
  const contactItems = [
    { key: 'phone', icon: Phone, href: `tel:${contact.phone}`, label: 'Call' },
    { key: 'email', icon: Mail, href: `mailto:${contact.email}`, label: 'Email' },
    { key: 'whatsapp', icon: MessageCircle, href: `https://wa.me/${(contact.whatsapp || '').replace(/[^0-9]/g, '')}`, label: 'WhatsApp' },
    { key: 'sms', icon: MessageSquare, href: `sms:${contact.sms}`, label: 'SMS' },
    { key: 'website', icon: Globe, href: contact.website?.startsWith('http') ? contact.website : `https://${contact.website}`, label: 'Website' }
  ].filter(i => contact[i.key])

  const LayoutComponent = getLayout(currentTemplate.layout)

  return (
    <div className="mx-auto w-full max-w-[360px] rounded-2xl overflow-hidden shadow-2xl" style={{ ...bgStyle, fontFamily: currentTemplate.fontFamily || 'Inter', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
      <div style={{ ...cardBg, borderRadius: cardRadius }} className="overflow-hidden">
        <LayoutComponent
          card={card}
          colors={colors}
          template={currentTemplate}
          contactItems={contactItems}
          trackEvent={() => {}}
          downloadVCard={downloadVCard}
        />
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════
//  Layout Schematic (mini visual preview of each layout)
// ═══════════════════════════════════════════════════════════
function LayoutSchematic({ layout, colors }) {
  const p = colors.primary
  const s = colors.secondary || colors.accent

  // Classic: header band, overlapping circle, pill buttons
  if (layout === 'classic') return (
    <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-700/50 relative">
      <div className="w-full h-8" style={{ backgroundColor: p }} />
      <div className="absolute left-1/2 top-4 -translate-x-1/2 w-8 h-8 rounded-full border-2 border-white" style={{ backgroundColor: s }} />
      <div className="flex justify-center gap-1 mt-5">
        <div className="w-6 h-2 rounded-full" style={{ backgroundColor: p, opacity: 0.7 }} />
        <div className="w-6 h-2 rounded-full" style={{ backgroundColor: p, opacity: 0.7 }} />
        <div className="w-6 h-2 rounded-full" style={{ backgroundColor: p, opacity: 0.7 }} />
      </div>
    </div>
  )

  // Banner: gradient banner, circle inside, full-width rows
  if (layout === 'banner') return (
    <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-700/50 relative">
      <div className="w-full h-12 flex flex-col items-center justify-end pb-1" style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
        <div className="w-6 h-6 rounded-full border border-white/50 mb-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <div className="w-10 h-1 rounded bg-white/60" />
      </div>
      <div className="px-2 mt-1 space-y-0.5">
        <div className="w-full h-1.5 rounded" style={{ backgroundColor: `${p}25` }} />
        <div className="w-full h-1.5 rounded" style={{ backgroundColor: `${p}25` }} />
      </div>
    </div>
  )

  // Wave: photo top, wave line, icon row
  if (layout === 'wave') return (
    <div className="w-full h-20 rounded-lg overflow-hidden bg-slate-700/50 relative">
      <div className="w-full h-8" style={{ background: `linear-gradient(135deg, ${p}, ${s})` }} />
      <svg viewBox="0 0 100 12" className="w-full -mt-1 relative z-10">
        <path d="M0,6 Q25,0 50,6 T100,6 L100,12 L0,12 Z" fill={colors.background?.includes('gradient') ? '#FFFBEB' : (colors.background || '#FFFBEB')} />
      </svg>
      <div className="flex justify-center gap-1.5 -mt-1">
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p }} />
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p }} />
        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p }} />
      </div>
    </div>
  )

  // Minimal: no header, small circle, text links
  if (layout === 'minimal') return (
    <div className="w-full h-20 rounded-lg overflow-hidden bg-white/90 relative flex flex-col items-center justify-center gap-1">
      <div className="w-6 h-6 rounded-full border" style={{ borderColor: colors.secondary || '#E5E7EB' }} />
      <div className="w-14 h-1.5 rounded bg-gray-800" />
      <div className="w-10 h-1 rounded bg-gray-300" />
      <div className="flex flex-col items-center gap-0.5 mt-0.5">
        <div className="w-8 h-0.5 bg-gray-300" />
        <div className="w-8 h-0.5 bg-gray-300" />
      </div>
    </div>
  )

  // Bold: dark bg, big text, 2x2 grid
  if (layout === 'bold') return (
    <div className="w-full h-20 rounded-lg overflow-hidden relative" style={{ backgroundColor: colors.background?.includes('gradient') ? '#0F0A1A' : (colors.background || '#0F0A1A') }}>
      <div className="w-full h-6" style={{ background: `linear-gradient(to bottom, ${p}40, transparent)` }} />
      <div className="px-2 -mt-1">
        <div className="w-14 h-2 rounded" style={{ backgroundColor: colors.accent || p }} />
        <div className="w-10 h-1 rounded mt-0.5 bg-slate-600" />
      </div>
      <div className="grid grid-cols-2 gap-0.5 px-2 mt-1.5">
        <div className="h-3.5 rounded" style={{ backgroundColor: `${colors.accent || p}30` }} />
        <div className="h-3.5 rounded" style={{ backgroundColor: `${colors.accent || p}30` }} />
        <div className="h-3.5 rounded" style={{ backgroundColor: `${colors.accent || p}30` }} />
        <div className="h-3.5 rounded border border-dashed" style={{ borderColor: `${colors.accent || p}50` }} />
      </div>
    </div>
  )

  // Glass: dark bg, glass card, glow ring
  if (layout === 'glass') return (
    <div className="w-full h-20 rounded-lg overflow-hidden relative" style={{ background: 'linear-gradient(to bottom, #0F172A, #1E293B)' }}>
      <div className="mx-2 mt-2 rounded-lg p-2 flex flex-col items-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="h-0.5 w-full rounded mb-2" style={{ background: `linear-gradient(90deg, ${p}, ${s})` }} />
        <div className="w-6 h-6 rounded-full mb-1" style={{ background: `linear-gradient(135deg, ${p}, ${s})`, boxShadow: `0 0 8px ${colors.accent || p}60` }} />
        <div className="w-10 h-1 rounded bg-slate-400/40" />
        <div className="flex gap-1 mt-1.5">
          <div className="w-5 h-3 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <div className="w-5 h-3 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <div className="w-5 h-3 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
        </div>
      </div>
    </div>
  )

  // Fallback
  return (
    <div className="w-full h-20 rounded-lg bg-slate-700/50 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p }} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  Shared UI Components
// ═══════════════════════════════════════════════════════════
function Panel({ title, children }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Input({ label, value, onChange, placeholder, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="text-xs text-slate-400 block mb-1">{label}</label>}
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition"
      />
    </div>
  )
}

function TextArea({ label, value, onChange, placeholder, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="text-xs text-slate-400 block mb-1">{label}</label>}
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-slate-800 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-neon-purple focus:outline-none transition resize-none"
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
//  TAB 5: Printable Card (Fixed Phygital Format)
// ═══════════════════════════════════════════════════════════
function PrintableTab({ card, slug, printableRef }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <Panel title="Phygital Business Card">
        <p className="text-xs text-slate-400 mb-4">
          Your branded Phygital card with your details. Download as a high-resolution PNG (3.5" x 2" at 300 DPI). The back includes a QR code linking to your personalized digital card page.
        </p>
        {!slug ? (
          <div className="text-center py-8">
            <CreditCard className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">Publish your card first to generate a printable version.</p>
            <p className="text-xs text-slate-500 mt-1">Go to the "Preview & Publish" tab and enable publishing.</p>
          </div>
        ) : (
          <PrintableCardPreview ref={printableRef} card={card} slug={slug} />
        )}
      </Panel>
    </div>
  )
}
