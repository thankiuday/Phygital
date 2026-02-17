/**
 * Admin Create Phygital QR Page
 * Step 1: Select user -> Step 2: Create draft -> Step 3: Wizard (design, QR position, videos, docs, social, mind/composite) -> Grant
 */

import React, { useState, useEffect } from 'react'
import { useAdmin } from '../../contexts/AdminContext'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import toast from 'react-hot-toast'
import { generateHumanReadableCampaignName } from '../../utils/campaignNameGenerator'
import QRPositioningOverlay from '../../components/QRPositioning/QRPositioningOverlay'
import FrameCustomizer from '../../components/QR/FrameCustomizer'
import { generateQRSticker } from '../../utils/qrStickerGenerator'
import { generateQRCode } from '../../utils/api'
import { constructQRCodeUrl } from '../../utils/urlHelpers'
import { generateAdvancedQRCode } from '../../utils/qrGenerator'
import {
  User,
  FileImage,
  Layout,
  Video,
  FileText,
  Share2,
  Target,
  Gift,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles
} from 'lucide-react'

const MIN_STICKER_WIDTH = 120
const MIN_STICKER_HEIGHT = 160
const MAX_DISPLAY_WIDTH = 800
const MAX_DISPLAY_HEIGHT = 600
const MAX_VIEW_SCALE = 3 // allow zooming small images in the editor

const STEPS = [
  { id: 'user', label: 'Select User', icon: User },
  { id: 'draft', label: 'Create Draft', icon: Sparkles },
  { id: 'design', label: 'Design', icon: FileImage },
  { id: 'qr', label: 'QR Position', icon: Layout },
  { id: 'qrDesign', label: 'QR Design', icon: Layout },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'social', label: 'Social Links', icon: Share2 },
  { id: 'composite', label: 'Generate Final Design', icon: Target },
  { id: 'grant', label: 'Grant to User', icon: Gift }
]

const AdminPhygitalCreatePage = () => {
  const { adminApi } = useAdmin()
  const [stepIndex, setStepIndex] = useState(0)
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draft, setDraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [qrPosition, setQrPosition] = useState({ x: 50, y: 50, width: MIN_STICKER_WIDTH, height: MIN_STICKER_HEIGHT })
  const [socialLinks, setSocialLinks] = useState({ website: '', instagram: '', facebook: '', contactNumber: '', whatsappNumber: '' })
  const [granting, setGranting] = useState(false)
  const [targetUserProjects, setTargetUserProjects] = useState([])
  const [placeholderQrUrl, setPlaceholderQrUrl] = useState(null)
  const [captureCompositeFn, setCaptureCompositeFn] = useState(null)
  const [qrFrameConfig, setQrFrameConfig] = useState({
    frameType: 1,
    textContent: 'SCAN ME',
    textStyle: { bold: true, italic: false, color: '#FFFFFF', gradient: null },
    transparentBackground: false
  })
  const [designNaturalWidth, setDesignNaturalWidth] = useState(null)
  const [designNaturalHeight, setDesignNaturalHeight] = useState(null)

  // Scaled display dimensions for QR positioning (flexible viewport, consistent mapping)
  const displayDesignWidth = React.useMemo(() => {
    if (!designNaturalWidth || !designNaturalHeight) return null
    const baseScale = Math.min(
      MAX_DISPLAY_WIDTH / designNaturalWidth,
      MAX_DISPLAY_HEIGHT / designNaturalHeight
    )
    const scale = Math.min(baseScale, MAX_VIEW_SCALE)
    return Math.round(designNaturalWidth * scale)
  }, [designNaturalWidth, designNaturalHeight])

  const displayDesignHeight = React.useMemo(() => {
    if (!designNaturalWidth || !designNaturalHeight) return null
    const baseScale = Math.min(
      MAX_DISPLAY_WIDTH / designNaturalWidth,
      MAX_DISPLAY_HEIGHT / designNaturalHeight
    )
    const scale = Math.min(baseScale, MAX_VIEW_SCALE)
    return Math.round(designNaturalHeight * scale)
  }, [designNaturalWidth, designNaturalHeight])

  useEffect(() => {
    if (stepIndex === 0) {
      fetchUsers()
    }
  }, [stepIndex])

  // Fetch target user's projects for unique campaign name (when selectedUser is set)
  useEffect(() => {
    if (!selectedUser?._id) {
      setTargetUserProjects([])
      return
    }
    let cancelled = false
    const fetchTargetUserProjects = async () => {
      try {
        const data = await adminApi('get', `/users/${selectedUser._id}`)
        const user = data?.data?.user
        if (!cancelled && user?.projects) setTargetUserProjects(user.projects)
        else if (!cancelled) setTargetUserProjects([])
      } catch {
        if (!cancelled) setTargetUserProjects([])
      }
    }
    fetchTargetUserProjects()
    return () => { cancelled = true }
  }, [selectedUser?._id, adminApi])

  // Auto-generate campaign name when on draft step with selectedUser (same as user panel upload)
  useEffect(() => {
    const draftStepId = STEPS[stepIndex]?.id
    if (draftStepId !== 'draft' || !selectedUser?.username) return
    if (draftName.trim() !== '') return // don't overwrite if user already entered something
    const existingProjects = targetUserProjects || []
    const autoName = generateHumanReadableCampaignName(selectedUser.username, 'qr-links-ar-video', existingProjects)
    setDraftName(autoName)
  }, [stepIndex, selectedUser?.username, targetUserProjects])

  // Sync QR position from draft when draft has it (e.g. after load or save)
  useEffect(() => {
    if (draft?.qrPosition && typeof draft.qrPosition.x === 'number') {
      setQrPosition({
        x: draft.qrPosition.x,
        y: draft.qrPosition.y,
        width: Math.max(MIN_STICKER_WIDTH, draft.qrPosition.width || MIN_STICKER_WIDTH),
        height: Math.max(MIN_STICKER_HEIGHT, draft.qrPosition.height || MIN_STICKER_HEIGHT)
      })
    }
  }, [draft?._id, draft?.qrPosition?.x, draft?.qrPosition?.y, draft?.qrPosition?.width, draft?.qrPosition?.height])

  // Load design image to get natural dimensions (for QR step original-size display)
  useEffect(() => {
    const url = draft?.uploadedFiles?.design?.url
    if (!url) {
      setDesignNaturalWidth(null)
      setDesignNaturalHeight(null)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (!cancelled) {
        setDesignNaturalWidth(img.naturalWidth)
        setDesignNaturalHeight(img.naturalHeight)
      }
    }
    img.onerror = () => {
      if (!cancelled) {
        setDesignNaturalWidth(null)
        setDesignNaturalHeight(null)
      }
    }
    img.crossOrigin = 'anonymous'
    img.src = url
    return () => { cancelled = true }
  }, [draft?.uploadedFiles?.design?.url])

  // Placeholder QR for overlay and FrameCustomizer (admin has no user QR; use fixed URL)
  useEffect(() => {
    const qrStepIdx = STEPS.findIndex(s => s.id === 'qr')
    const qrDesignStepIdx = STEPS.findIndex(s => s.id === 'qrDesign')
    if (stepIndex !== qrStepIdx && stepIndex !== qrDesignStepIdx) return
    if (placeholderQrUrl) return
    let cancelled = false
    generateAdvancedQRCode('https://phygital.zone', {}, 300).then((dataUrl) => {
      if (!cancelled) setPlaceholderQrUrl(dataUrl)
    }).catch(() => { if (!cancelled) setPlaceholderQrUrl(null) })
    return () => { cancelled = true }
  }, [stepIndex])

  // Sync socialLinks from draft when draft has them
  useEffect(() => {
    if (!draft?.socialLinks) return
    setSocialLinks(prev => ({
      ...prev,
      ...draft.socialLinks
    }))
  }, [draft?._id])

  // Sync qrFrameConfig from draft when draft has it
  useEffect(() => {
    if (!draft?.qrFrameConfig) return
    const c = draft.qrFrameConfig
    setQrFrameConfig({
      frameType: c.frameType ?? 1,
      textContent: c.textContent ?? 'SCAN ME',
      textStyle: {
        bold: c.textStyle?.bold !== false,
        italic: !!c.textStyle?.italic,
        color: c.textStyle?.color ?? '#FFFFFF',
        gradient: c.textStyle?.gradient ?? null
      },
      transparentBackground: !!c.transparentBackground
    })
  }, [draft?._id, draft?.qrFrameConfig?.frameType, draft?.qrFrameConfig?.textContent])

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const data = await adminApi('get', '/users?limit=100')
      setUsers(data?.data?.users || [])
    } catch (err) {
      toast.error('Failed to load users')
      setUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  const filteredUsers = searchTerm
    ? users.filter(u => (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : users.slice(0, 50)

  const handleCreateDraft = async () => {
    if (!selectedUser || !draftName.trim()) {
      toast.error('Select a user and enter a campaign name')
      return
    }
    setLoading(true)
    try {
      const data = await adminApi('post', '/phygital/drafts', {
        targetUserId: selectedUser._id,
        name: draftName.trim(),
        description: draftDescription.trim()
      })
      setDraft(data.data.draft)
      toast.success('Draft created')
      setStepIndex(2)
    } catch (err) {
      toast.error(err.message || 'Failed to create draft')
    } finally {
      setLoading(false)
    }
  }

  const uploadDesign = async (file) => {
    if (!draft?._id) return
    const form = new FormData()
    form.append('design', file)
    setLoading(true)
    try {
      const data = await adminApi('post', `/phygital/drafts/${draft._id}/design`, form)
      setDraft(data.data.draft)
      toast.success('Design uploaded')
    } catch (err) {
      toast.error(err.message || 'Design upload failed')
    } finally {
      setLoading(false)
    }
  }

  const saveQrPosition = async () => {
    if (!draft?._id) return
    setLoading(true)
    try {
      const data = await adminApi('post', `/phygital/drafts/${draft._id}/qr-position`, qrPosition)
      setDraft(data.data.draft)
      toast.success('QR position saved')
    } catch (err) {
      toast.error(err.message || 'Failed to save QR position')
    } finally {
      setLoading(false)
    }
  }

  const saveQrFrameConfig = async () => {
    if (!draft?._id) return
    setLoading(true)
    try {
      const data = await adminApi('post', `/phygital/drafts/${draft._id}/qr-frame-config`, qrFrameConfig)
      setDraft(data.data.draft)
      toast.success('QR design saved')
    } catch (err) {
      toast.error(err.message || 'Failed to save QR design')
    } finally {
      setLoading(false)
    }
  }

  const [generatingComposite, setGeneratingComposite] = useState(false)

  const handleDownloadFinalDesign = async () => {
    const url = draft?.uploadedFiles?.compositeDesign?.url
    if (!url) {
      toast.error('Generate the final design first')
      return
    }
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = `Phygital_Admin_${draft._id}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(objectUrl)
      toast.success('Final design downloaded')
    } catch (err) {
      toast.error(err.message || 'Download failed')
    }
  }

  const handleGenerateFinalDesign = async () => {
    if (!draft?._id || !draft.uploadedFiles?.design?.url) {
      toast.error('Upload a design and set QR position first')
      return
    }
    setGeneratingComposite(true)
    try {
      const designUrl = draft.uploadedFiles.design.url
      const designImg = new Image()
      designImg.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        designImg.onload = resolve
        designImg.onerror = () => reject(new Error('Failed to load design image'))
        designImg.src = designUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = designImg.naturalWidth
      canvas.height = designImg.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(designImg, 0, 0)

      // qrPosition is in scaled viewport coordinates (displayDesignWidth/Height).
      // Map back to full-resolution image coordinates using the same scale formula
      // as displayDesignWidth/displayDesignHeight.
      const baseScale = Math.min(
        MAX_DISPLAY_WIDTH / designImg.naturalWidth,
        MAX_DISPLAY_HEIGHT / designImg.naturalHeight
      )
      const scale = Math.min(baseScale, MAX_VIEW_SCALE)
      const displayWidth = Math.round(designImg.naturalWidth * scale)
      const displayHeight = Math.round(designImg.naturalHeight * scale)

      const actualQrX = (qrPosition.x / displayWidth) * designImg.naturalWidth
      const actualQrY = (qrPosition.y / displayHeight) * designImg.naturalHeight
      const actualQrWidth = (qrPosition.width / displayWidth) * designImg.naturalWidth
      const actualQrHeight = (qrPosition.height / displayHeight) * designImg.naturalHeight

      // Build the same campaign URL that the user-side AR viewer uses,
      // so scanning the final design QR goes directly to this campaign.
      const targetUserId = draft?.targetUserId || selectedUser?._id
      if (!targetUserId) {
        throw new Error('Target user not found for QR URL')
      }
      const projectIdForQR = draft._id.toString()
      const qrCodeUrl = constructQRCodeUrl(String(targetUserId), String(projectIdForQR))

      const padding = 16
      const borderWidth = 4
      const qrCodeSize = Math.max(80, Math.round(actualQrWidth - (padding * 2 + borderWidth * 2)))
      const qrDataUrl = await generateQRCode(qrCodeUrl, {
        size: qrCodeSize,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      const stickerDataUrl = await generateQRSticker(qrDataUrl, {
        frameType: qrFrameConfig.frameType ?? 1,
        textContent: qrFrameConfig.textContent ?? 'SCAN ME',
        textStyle: qrFrameConfig.textStyle ?? { bold: true, italic: false, color: '#FFFFFF', gradient: null },
        transparentBackground: !!qrFrameConfig.transparentBackground,
        qrSize: qrCodeSize,
        borderWidth: 4,
        padding: 16
      })

      const stickerImg = new Image()
      stickerImg.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        stickerImg.onload = resolve
        stickerImg.onerror = reject
        stickerImg.src = stickerDataUrl
      })

      ctx.drawImage(stickerImg, Math.round(actualQrX), Math.round(actualQrY), Math.round(actualQrWidth), Math.round(actualQrHeight))

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1.0))
      const form = new FormData()
      form.append('compositeDesign', blob, 'composite.png')
      const data = await adminApi('post', `/phygital/drafts/${draft._id}/composite-design`, form)
      setDraft(data.data.draft)
      toast.success('Final design generated')

      // Auto-download high-quality composite (same blob as uploaded)
      const downloadUrl = window.URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = downloadUrl
      downloadLink.download = `Phygital_Admin_${draft._id}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      window.URL.revokeObjectURL(downloadUrl)

      const compositeUrl = data.data.draft?.uploadedFiles?.compositeDesign?.url
      if (!compositeUrl) throw new Error('Composite upload did not return URL')
      toast.loading('Preparing AR target...', { id: 'admin-mind' })
      const img = await new Promise((resolve, reject) => {
        const i = new Image()
        i.crossOrigin = 'anonymous'
        i.onload = () => resolve(i)
        i.onerror = () => reject(new Error('Failed to load composite image'))
        i.src = compositeUrl
      })
      const mindarModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image.prod.js')
      const { Compiler } = mindarModule
      const compiler = new Compiler()
      await compiler.compileImageTargets([img], () => {})
      const buf = await compiler.exportData()
      const mindBlob = new Blob([buf], { type: 'application/octet-stream' })
      const mindDataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(mindBlob)
      })
      const mindRes = await adminApi('post', `/phygital/drafts/${draft._id}/generate-mind-from-composite`, { mindTargetBase64: mindDataUrl })
      if (mindRes?.data?.draft) setDraft(mindRes.data.draft)
      toast.success('AR target generated', { id: 'admin-mind' })
    } catch (err) {
      toast.dismiss('admin-mind')
      toast.error(err.message || 'Failed to generate final design')
    } finally {
      setGeneratingComposite(false)
    }
  }

  const uploadVideos = async (files) => {
    if (!draft?._id || !files?.length) return
    const form = new FormData()
    Array.from(files).forEach(f => form.append('videos', f))
    setLoading(true)
    try {
      const data = await adminApi('post', `/phygital/drafts/${draft._id}/videos`, form)
      setDraft(data.data.draft)
      toast.success('Videos uploaded')
    } catch (err) {
      toast.error(err.message || 'Videos upload failed')
    } finally {
      setLoading(false)
    }
  }

  const uploadDocuments = async (files) => {
    if (!draft?._id || !files?.length) return
    const form = new FormData()
    Array.from(files).forEach(f => form.append('documents', f))
    setLoading(true)
    try {
      const data = await adminApi('post', `/phygital/drafts/${draft._id}/documents`, form)
      setDraft(data.data.draft)
      toast.success('Documents uploaded')
    } catch (err) {
      toast.error(err.message || 'Documents upload failed')
    } finally {
      setLoading(false)
    }
  }

  const uploadMindTarget = async (file) => {
    if (!draft?._id || !file) return
    const form = new FormData()
    form.append('mindTarget', file)
    setLoading(true)
    try {
      const data = await adminApi('post', `/phygital/drafts/${draft._id}/mind-target`, form)
      setDraft(data.data.draft)
      toast.success('AR target uploaded')
    } catch (err) {
      toast.error(err.message || 'AR target upload failed')
    } finally {
      setLoading(false)
    }
  }

  const saveSocialLinks = async () => {
    if (!draft?._id) return
    setLoading(true)
    try {
      await adminApi('put', `/phygital/drafts/${draft._id}`, { socialLinks })
      toast.success('Social links saved')
    } catch (err) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const handleGrant = async () => {
    if (!draft?._id) return
    if (!draft.uploadedFiles?.design?.url) {
      toast.error('Upload a design first')
      return
    }
    if (!draft.uploadedFiles?.mindTarget?.url && !draft.uploadedFiles?.compositeDesign?.url) {
      toast.error('Upload AR target (mind target or composite design) before granting')
      return
    }
    setGranting(true)
    try {
      await adminApi('post', `/phygital/drafts/${draft._id}/grant`)
      toast.success('Campaign granted to user. They can edit links, videos, and documents from their Campaigns page.')
      setDraft(null)
      setSelectedUser(null)
      setDraftName('')
      setStepIndex(0)
    } catch (err) {
      toast.error(err.message || 'Grant failed')
    } finally {
      setGranting(false)
    }
  }

  const stepId = STEPS[stepIndex]?.id
  const canGoNext = stepIndex < STEPS.length - 1
  const canGoPrev = stepIndex > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Create Phygital QR for User</h1>
        <p className="text-slate-400 text-sm mt-1">Select a user, build the campaign, then grant it. User can later edit content only (links, videos, documents).</p>
      </div>

      {/* Stepper */}
      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStepIndex(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              i === stepIndex ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/40' : 'bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <s.icon className="w-4 h-4" />
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        {/* Step: Select User */}
        {stepId === 'user' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by email or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
              />
            </div>
            {usersLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner /></div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1">
                {filteredUsers.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => setSelectedUser(u)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      selectedUser?._id === u._id ? 'border-neon-blue bg-neon-blue/10 text-slate-100' : 'border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="font-medium">{u.username || u.email}</span>
                    <span className="text-slate-500 text-sm ml-2">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step: Create Draft */}
        {stepId === 'draft' && (
          <div className="space-y-4 max-w-md">
            {selectedUser && (
              <p className="text-slate-400 text-sm">Creating for: <span className="text-slate-200">{selectedUser.username || selectedUser.email}</span></p>
            )}
            <input
              type="text"
              placeholder="Campaign name *"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
            />
            <textarea
              placeholder="Description (optional)"
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
            />
            <button
              type="button"
              onClick={handleCreateDraft}
              disabled={loading || !draftName.trim()}
              className="px-4 py-2 rounded-lg bg-neon-blue text-white font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Draft'}
            </button>
          </div>
        )}

        {/* Step: Design */}
        {stepId === 'design' && (
          <div className="space-y-4">
            {draft?.uploadedFiles?.design?.url && (
              <div className="rounded-lg overflow-hidden border border-slate-600 max-w-sm">
                <img src={draft.uploadedFiles.design.url} alt="Design" className="w-full h-auto" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && uploadDesign(e.target.files[0])}
              className="text-slate-300 text-sm"
            />
            {loading && <LoadingSpinner size="sm" />}
          </div>
        )}

        {/* Step: QR Position (drag-and-drop like user panel, scaled viewport for flexible placement) */}
        {stepId === 'qr' && (
          <div className="space-y-4">
            {draft?.uploadedFiles?.design?.url ? (
              <>
                <p className="text-slate-400 text-sm">Drag and resize the QR code to place it on your design. The preview scales your design into a comfortable viewport but keeps the final output in full resolution.</p>
                {!(designNaturalWidth && designNaturalHeight && displayDesignWidth && displayDesignHeight) ? (
                  <p className="text-slate-500 text-sm">Loading design dimensions...</p>
                ) : (
                  <div className="overflow-auto max-h-[80vh] max-w-full rounded-lg border border-slate-600 bg-slate-900/50">
                    <div className="inline-block min-w-0 p-2">
                      <QRPositioningOverlay
                        imageUrl={draft.uploadedFiles.design.url}
                        qrPosition={qrPosition}
                        onPositionChange={(pos) => setQrPosition(p => ({ ...p, x: pos.x, y: pos.y }))}
                        onSizeChange={(size) => setQrPosition(p => ({ ...p, width: size.width, height: size.height }))}
                        onCaptureComposite={setCaptureCompositeFn}
                        qrImageUrl={placeholderQrUrl || undefined}
                        imageWidth={displayDesignWidth}
                        imageHeight={displayDesignHeight}
                        displayAtExplicitSize
                      />
                    </div>
                  </div>
                )}
                <button type="button" onClick={saveQrPosition} disabled={loading} className="px-4 py-2 rounded-lg bg-neon-blue text-white font-medium disabled:opacity-50">Save QR position</button>
                {loading && <LoadingSpinner size="sm" className="inline-block ml-2" />}
              </>
            ) : (
              <p className="text-slate-400">Upload a design in the Design step first.</p>
            )}
          </div>
        )}

        {/* Step: QR Design (template / frame like user panel) */}
        {stepId === 'qrDesign' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Choose frame style and text for the QR sticker (e.g. SCAN ME).</p>
            {placeholderQrUrl ? (
              <>
                <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-4 sm:p-6">
                  <FrameCustomizer
                    qrCodeDataUrl={placeholderQrUrl}
                    onFrameConfigChange={setQrFrameConfig}
                    initialConfig={qrFrameConfig}
                  />
                </div>
                <button type="button" onClick={saveQrFrameConfig} disabled={loading} className="px-4 py-2 rounded-lg bg-neon-blue text-white font-medium disabled:opacity-50">Save QR design</button>
                {loading && <LoadingSpinner size="sm" className="inline-block ml-2" />}
              </>
            ) : (
              <p className="text-slate-400 text-sm">Loading QR preview...</p>
            )}
          </div>
        )}

        {/* Step: Videos */}
        {stepId === 'videos' && (
          <div className="space-y-4">
            <input type="file" accept="video/*" multiple onChange={(e) => e.target.files?.length && uploadVideos(e.target.files)} className="text-slate-300 text-sm" />
            {draft?.uploadedFiles?.videos?.length > 0 && <p className="text-slate-400 text-sm">{draft.uploadedFiles.videos.length} video(s) uploaded</p>}
            {loading && <LoadingSpinner size="sm" />}
          </div>
        )}

        {/* Step: Documents */}
        {stepId === 'documents' && (
          <div className="space-y-4">
            <input type="file" accept=".pdf,.doc,.docx,image/*" multiple onChange={(e) => e.target.files?.length && uploadDocuments(e.target.files)} className="text-slate-300 text-sm" />
            {draft?.uploadedFiles?.documents?.length > 0 && <p className="text-slate-400 text-sm">{draft.uploadedFiles.documents.length} document(s) uploaded</p>}
            {loading && <LoadingSpinner size="sm" />}
          </div>
        )}

        {/* Step: Social Links */}
        {stepId === 'social' && (
          <div className="space-y-4 max-w-md">
            {['website', 'instagram', 'facebook', 'contactNumber', 'whatsappNumber'].map((key) => (
              <input
                key={key}
                type="text"
                placeholder={key}
                value={socialLinks[key] || ''}
                onChange={(e) => setSocialLinks(p => ({ ...p, [key]: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 border border-slate-600 text-slate-100"
              />
            ))}
            <button type="button" onClick={saveSocialLinks} disabled={loading} className="px-4 py-2 rounded-lg bg-slate-700 text-slate-200 font-medium disabled:opacity-50">Save social links</button>
          </div>
        )}

        {/* Step: Generate final design (composite + auto .mind, like user panel) */}
        {stepId === 'composite' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm">Generate the final design (design + QR sticker) and AR target automatically. The file will download in high quality after generation.</p>
            {draft?.uploadedFiles?.compositeDesign?.url && (
              <div className="rounded-xl overflow-hidden border-2 border-slate-600 bg-slate-800/50 max-w-lg">
                <img src={draft.uploadedFiles.compositeDesign.url} alt="Final design" className="w-full h-auto" />
                <div className="p-3 flex flex-wrap items-center gap-3">
                  <p className="text-green-400 text-sm">Composite design generated</p>
                  {draft?.uploadedFiles?.mindTarget?.url && <p className="text-green-400 text-sm">AR target ready</p>}
                  <button
                    type="button"
                    onClick={handleDownloadFinalDesign}
                    className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium"
                  >
                    Download final design
                  </button>
                </div>
              </div>
            )}
            {!draft?.uploadedFiles?.compositeDesign?.url && draft?.uploadedFiles?.mindTarget?.url && <p className="text-green-400 text-sm">AR target generated</p>}
            <button
              type="button"
              onClick={handleGenerateFinalDesign}
              disabled={generatingComposite || !draft?.uploadedFiles?.design?.url}
              className="px-4 py-2 rounded-lg bg-neon-blue text-white font-medium disabled:opacity-50"
            >
              {generatingComposite ? 'Generating...' : (draft?.uploadedFiles?.compositeDesign?.url ? 'Regenerate final design' : 'Generate final design & AR target')}
            </button>
            {generatingComposite && <LoadingSpinner size="sm" className="inline-block ml-2" />}
          </div>
        )}

        {/* Step: Grant */}
        {stepId === 'grant' && (
          <div className="space-y-4">
            <p className="text-slate-300">Review and grant this campaign to <strong className="text-slate-100">{selectedUser?.username || selectedUser?.email}</strong>. They will see it on their Campaigns page and can edit links, videos, documents, and social links only.</p>
            <button
              type="button"
              onClick={handleGrant}
              disabled={granting || !draft?.uploadedFiles?.design?.url || (!draft?.uploadedFiles?.mindTarget?.url && !draft?.uploadedFiles?.compositeDesign?.url)}
              className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {granting ? 'Granting...' : 'Grant to User'}
            </button>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-slate-700">
          <button
            type="button"
            onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
            disabled={!canGoPrev}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          {canGoNext && stepId !== 'draft' && (
            <button
              type="button"
              onClick={() => setStepIndex(Math.min(STEPS.length - 1, stepIndex + 1))}
              className="flex items-center gap-1 text-neon-blue hover:underline"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminPhygitalCreatePage
