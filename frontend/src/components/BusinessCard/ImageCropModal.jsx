import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check, Loader2, ZoomIn } from 'lucide-react'

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    pixelCrop.width, pixelCrop.height
  )

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 1)
  })
}

export default function ImageCropModal({ imageUrl, aspect = 1, cropShape = 'round', onConfirm, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [saving, setSaving] = useState(false)

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const blob = await getCroppedImg(imageUrl, croppedAreaPixels)
      await onConfirm(blob)
    } catch (err) {
      console.error('Crop error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-200">Adjust Image</h3>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative w-full" style={{ height: '340px' }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-4 py-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-400 flex items-center gap-1"><ZoomIn className="w-3 h-3" /> Zoom</span>
              <span className="text-[10px] text-slate-500 font-mono">{zoom.toFixed(1)}x</span>
            </div>
            <input type="range" min="1" max="3" step="0.05" value={zoom}
              onChange={e => setZoom(parseFloat(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{ background: `linear-gradient(90deg, #a855f7 ${((zoom - 1) / 2) * 100}%, #334155 ${((zoom - 1) / 2) * 100}%)` }} />
          </div>

          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border border-slate-700/50 text-xs sm:text-sm text-slate-300 hover:bg-slate-700/50 transition">
              Skip
            </button>
            <button onClick={handleConfirm} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink text-white text-xs sm:text-sm font-medium hover:shadow-glow-lg transition-all disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
