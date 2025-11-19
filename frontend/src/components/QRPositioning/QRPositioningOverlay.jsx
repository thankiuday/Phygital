/**
 * QR Positioning Overlay Component
 * Interactive component for positioning and resizing QR codes on design images
 * Supports drag-to-move and resize handles functionality
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Move, RotateCcw } from 'lucide-react'
import { generateQRSticker } from '../../utils/qrStickerGenerator'

const QRPositioningOverlay = ({ 
  imageUrl, 
  qrPosition, 
  onPositionChange, 
  onSizeChange,
  onCaptureComposite,
  qrImageUrl,
  imageWidth = 400,
  imageHeight = 300 
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [imageDimensions, setImageDimensions] = useState({ width: imageWidth, height: imageHeight })
  const [stickerImageUrl, setStickerImageUrl] = useState(null)
  const [stickerAspectRatio, setStickerAspectRatio] = useState(1) // Default to 1:1, will be updated when sticker is generated
  
  // Minimum dimensions for scannable QR code
  // QR code itself needs ~80-100px minimum, plus border (8px) + padding (32px) = ~120px sticker width minimum
  // Height includes "SCAN ME" text (~40px), so minimum height ~160px
  const MIN_STICKER_WIDTH = 120
  const MIN_STICKER_HEIGHT = 160
  
  const imageRef = useRef(null)
  const overlayRef = useRef(null)

  // Calculate scale factor based on actual image dimensions
  const scaleX = imageDimensions.width / imageWidth
  const scaleY = imageDimensions.height / imageHeight

  // Convert absolute coordinates to relative percentages
  const getRelativePosition = useCallback((absolutePos) => {
    return {
      x: (absolutePos.x / imageWidth) * 100,
      y: (absolutePos.y / imageHeight) * 100,
      width: (absolutePos.width / imageWidth) * 100,
      height: (absolutePos.height / imageHeight) * 100
    }
  }, [imageWidth, imageHeight])

  // Convert relative percentages to absolute coordinates
  const getAbsolutePosition = useCallback((relativePos) => {
    return {
      x: (relativePos.x / 100) * imageWidth,
      y: (relativePos.y / 100) * imageHeight,
      width: (relativePos.width / 100) * imageWidth,
      height: (relativePos.height / 100) * imageHeight
    }
  }, [imageWidth, imageHeight])

  // Handle image load to get actual dimensions
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current
      setImageDimensions({ width: naturalWidth, height: naturalHeight })
    }
  }, [])

  // Generate sticker design from QR code when available
  useEffect(() => {
    const generateSticker = async () => {
      if (!qrImageUrl) {
        setStickerImageUrl(null)
        setStickerAspectRatio(1)
        return
      }

      try {
        // Calculate sticker aspect ratio based on default dimensions
        // Sticker dimensions: width = qrSize + padding*2 + borderWidth*2, height = qrSize + padding*2 + borderWidth*2 + textHeight
        const defaultQrSize = 200 // Reference size for aspect ratio calculation
        const padding = 16
        const borderWidth = 4
        const textHeight = 40
        const stickerWidth = defaultQrSize + padding * 2 + borderWidth * 2
        const stickerHeight = defaultQrSize + padding * 2 + borderWidth * 2 + textHeight
        const aspectRatio = stickerHeight / stickerWidth
        setStickerAspectRatio(aspectRatio)

        // Convert blob URL to data URL if needed
        let qrDataUrl = qrImageUrl
        if (qrImageUrl.startsWith('blob:')) {
          const response = await fetch(qrImageUrl)
          const blob = await response.blob()
          qrDataUrl = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.readAsDataURL(blob)
          })
        }

        // Generate sticker with a reasonable QR size based on current position width
        const qrSize = Math.max(100, Math.round(qrPosition.width * 0.8)) // Use 80% of position width as QR size
        const stickerDataUrl = await generateQRSticker(qrDataUrl, {
          variant: 'purple',
          qrSize: qrSize,
          borderWidth: 4,
          padding: 16
        })
        setStickerImageUrl(stickerDataUrl)
      } catch (error) {
        console.error('Failed to generate sticker:', error)
        setStickerImageUrl(null)
        setStickerAspectRatio(1)
      }
    }

    generateSticker()
  }, [qrImageUrl, qrPosition.width])

  // Pointer down handler for drag start (supports both mouse and touch)
  const handlePointerDown = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent scroll during drag/resize
    document.body.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    if (e.pointerType === 'touch') {
      document.body.style.touchAction = 'none'
    }
    
    setIsDragging(true)
    setDragStart({
      x: e.pageX - qrPosition.x,
      y: e.pageY - qrPosition.y
    })
    
    // Capture pointer for consistent tracking
    if (e.target && e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId)
    }
  }, [qrPosition.x, qrPosition.y])

  // Pointer down handler for resize start (supports both mouse and touch)
  const handleResizePointerDown = useCallback((e, handle) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Prevent scroll during drag/resize
    document.body.style.overscrollBehavior = 'none'
    document.body.style.overflow = 'hidden'
    if (e.pointerType === 'touch') {
      document.body.style.touchAction = 'none'
    }
    
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStart({
      x: e.pageX,
      y: e.pageY,
      width: qrPosition.width,
      height: qrPosition.height
    })
    
    // Capture pointer for consistent tracking
    if (e.target && e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId)
    }
  }, [qrPosition.width, qrPosition.height])

  // Pointer move handler (supports both mouse and touch)
  const handlePointerMove = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isDragging) {
      // Use pageX/pageY for consistent coordinates across scroll
      const newX = e.pageX - dragStart.x
      const newY = e.pageY - dragStart.y
      
      // Constrain to image bounds
      const constrainedX = Math.max(0, Math.min(newX, imageWidth - qrPosition.width))
      const constrainedY = Math.max(0, Math.min(newY, imageHeight - qrPosition.height))
      
      onPositionChange({ x: constrainedX, y: constrainedY })
    } else if (isResizing && resizeHandle) {
      // Use pageX/pageY for consistent coordinates across scroll
      const deltaX = e.pageX - resizeStart.x
      const deltaY = e.pageY - resizeStart.y
      
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      let newX = qrPosition.x
      let newY = qrPosition.y
      
      // Handle different resize directions - maintain sticker aspect ratio
      // Calculate new dimensions based on width change, then apply aspect ratio
      let baseSizeChange = 0
      
      switch (resizeHandle) {
        case 'se': // Southeast (bottom-right)
          baseSizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
          newWidth = Math.max(MIN_STICKER_WIDTH, resizeStart.width + baseSizeChange)
          newHeight = newWidth * stickerAspectRatio
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT
            newWidth = newHeight / stickerAspectRatio
          }
          break
        case 'sw': // Southwest (bottom-left)
          baseSizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : deltaY
          newWidth = Math.max(MIN_STICKER_WIDTH, resizeStart.width + baseSizeChange)
          newHeight = newWidth * stickerAspectRatio
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT
            newWidth = newHeight / stickerAspectRatio
          }
          newX = qrPosition.x + (resizeStart.width - newWidth)
          break
        case 'ne': // Northeast (top-right)
          baseSizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : -deltaY
          newWidth = Math.max(MIN_STICKER_WIDTH, resizeStart.width + baseSizeChange)
          newHeight = newWidth * stickerAspectRatio
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT
            newWidth = newHeight / stickerAspectRatio
          }
          newY = qrPosition.y + (resizeStart.height - newHeight)
          break
        case 'nw': // Northwest (top-left)
          baseSizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
          newWidth = Math.max(MIN_STICKER_WIDTH, resizeStart.width + baseSizeChange)
          newHeight = newWidth * stickerAspectRatio
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT
            newWidth = newHeight / stickerAspectRatio
          }
          newX = qrPosition.x + (resizeStart.width - newWidth)
          newY = qrPosition.y + (resizeStart.height - newHeight)
          break
        case 'n': // North (top)
          // Use height change, then calculate width from aspect ratio
          newHeight = Math.max(MIN_STICKER_HEIGHT, resizeStart.height - deltaY)
          newWidth = newHeight / stickerAspectRatio
          // Ensure width meets minimum
          if (newWidth < MIN_STICKER_WIDTH) {
            newWidth = MIN_STICKER_WIDTH
            newHeight = newWidth * stickerAspectRatio
          }
          newY = qrPosition.y + (resizeStart.height - newHeight)
          newX = qrPosition.x + (resizeStart.width - newWidth)
          break
        case 's': // South (bottom)
          // Use height change, then calculate width from aspect ratio
          newHeight = Math.max(MIN_STICKER_HEIGHT, resizeStart.height + deltaY)
          newWidth = newHeight / stickerAspectRatio
          // Ensure width meets minimum
          if (newWidth < MIN_STICKER_WIDTH) {
            newWidth = MIN_STICKER_WIDTH
            newHeight = newWidth * stickerAspectRatio
          }
          newX = qrPosition.x + (resizeStart.width - newWidth)
          break
        case 'e': // East (right)
          newWidth = Math.max(MIN_STICKER_WIDTH, resizeStart.width + deltaX)
          newHeight = newWidth * stickerAspectRatio
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT
            newWidth = newHeight / stickerAspectRatio
          }
          newY = qrPosition.y + (resizeStart.height - newHeight)
          break
        case 'w': // West (left)
          newWidth = Math.max(MIN_STICKER_WIDTH, resizeStart.width - deltaX)
          newHeight = newWidth * stickerAspectRatio
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT
            newWidth = newHeight / stickerAspectRatio
          }
          newX = qrPosition.x + (resizeStart.width - newWidth)
          newY = qrPosition.y + (resizeStart.height - newHeight)
          break
      }
      
      // Constrain to image bounds
      newX = Math.max(0, Math.min(newX, imageWidth - newWidth))
      newY = Math.max(0, Math.min(newY, imageHeight - newHeight))
      
      // Ensure size doesn't exceed bounds, but maintain minimums
      if (newX + newWidth > imageWidth) {
        newWidth = Math.max(MIN_STICKER_WIDTH, imageWidth - newX)
        newHeight = newWidth * stickerAspectRatio
        if (newHeight < MIN_STICKER_HEIGHT) {
          newHeight = MIN_STICKER_HEIGHT
          newWidth = newHeight / stickerAspectRatio
        }
      }
      if (newY + newHeight > imageHeight) {
        newHeight = Math.max(MIN_STICKER_HEIGHT, imageHeight - newY)
        newWidth = newHeight / stickerAspectRatio
        if (newWidth < MIN_STICKER_WIDTH) {
          newWidth = MIN_STICKER_WIDTH
          newHeight = newWidth * stickerAspectRatio
        }
        // Re-adjust X position if needed
        if (resizeHandle === 'n' || resizeHandle === 'w' || resizeHandle === 'nw' || resizeHandle === 'sw') {
          newX = qrPosition.x + (resizeStart.width - newWidth)
        }
      }
      
      // Final check: ensure minimums are met
      newWidth = Math.max(MIN_STICKER_WIDTH, newWidth)
      newHeight = Math.max(MIN_STICKER_HEIGHT, newHeight)
      
      onPositionChange({ x: newX, y: newY })
      onSizeChange({ width: newWidth, height: newHeight })
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeHandle, qrPosition, imageWidth, imageHeight, stickerAspectRatio, onPositionChange, onSizeChange])

  // Pointer up handler (supports both mouse and touch)
  const handlePointerUp = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Restore scroll behavior
    document.body.style.overscrollBehavior = ''
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
    
    // Release pointer capture
    if (e.target && e.target.releasePointerCapture) {
      e.target.releasePointerCapture(e.pointerId)
    }
    
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // Add event listeners for pointer events
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
      document.addEventListener('pointercancel', handlePointerUp)
      return () => {
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp)
        document.removeEventListener('pointercancel', handlePointerUp)
      }
    }
  }, [isDragging, isResizing, handlePointerMove, handlePointerUp])

  // Expose capture function to parent
  useEffect(() => {
    if (onCaptureComposite) {
      onCaptureComposite(captureCompositeImage);
    }
  }, [onCaptureComposite, captureCompositeImage])

  // Reset to default position (with minimum scannable size)
  const resetPosition = useCallback(() => {
    onPositionChange({ x: 10, y: 10 })
    onSizeChange({ width: MIN_STICKER_WIDTH, height: MIN_STICKER_HEIGHT })
  }, [onPositionChange, onSizeChange])

  // Capture composite image (design + QR overlay)
  const captureCompositeImage = useCallback(() => {
    return new Promise((resolve, reject) => {
      try {
        
        if (!imageRef.current) {
          reject(new Error('Image not loaded'));
          return;
        }

        // Create a canvas to draw the composite image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions to match the actual image
        const img = imageRef.current;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Calculate QR position on the actual image based on displayed size
        const displayedWidth = img.offsetWidth || imageWidth
        const displayedHeight = img.offsetHeight || imageHeight
        const actualQrX = (qrPosition.x / displayedWidth) * img.naturalWidth;
        const actualQrY = (qrPosition.y / displayedHeight) * img.naturalHeight;
        const actualQrWidth = (qrPosition.width / displayedWidth) * img.naturalWidth;
        const actualQrHeight = (qrPosition.height / displayedHeight) * img.naturalHeight;
        
        
        // If we have a real QR image, draw it; otherwise, draw placeholder and resolve
        if (qrImageUrl) {
          const qrImg = new Image()
          qrImg.crossOrigin = 'anonymous'
          qrImg.onload = () => {
            try {
              ctx.drawImage(qrImg, actualQrX, actualQrY, actualQrWidth, actualQrHeight)
              const compositeImageData = canvas.toDataURL('image/png', 1.0)
              resolve(compositeImageData)
            } catch (err) {
              // Fallback: placeholder
              ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
              ctx.fillRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight)
              ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
              ctx.lineWidth = 2
              ctx.strokeRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight)
              ctx.fillStyle = 'rgba(59, 130, 246, 1)'
              ctx.font = `${Math.max(12, actualQrWidth / 8)}px Arial`
              ctx.textAlign = 'center'
              ctx.fillText('QR CODE', actualQrX + actualQrWidth / 2, actualQrY + actualQrHeight / 2)
              const compositeImageData = canvas.toDataURL('image/png', 1.0)
              resolve(compositeImageData)
            }
          }
          qrImg.onerror = (e) => {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
            ctx.fillRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight)
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
            ctx.lineWidth = 2
            ctx.strokeRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight)
            ctx.fillStyle = 'rgba(59, 130, 246, 1)'
            ctx.font = `${Math.max(12, actualQrWidth / 8)}px Arial`
            ctx.textAlign = 'center'
            ctx.fillText('QR CODE', actualQrX + actualQrWidth / 2, actualQrY + actualQrHeight / 2)
            const compositeImageData = canvas.toDataURL('image/png', 1.0)
            resolve(compositeImageData)
          }
          qrImg.src = qrImageUrl
          return
        }

        // Placeholder path if no QR image provided
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
        ctx.fillRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight)
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
        ctx.lineWidth = 2
        ctx.strokeRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight)
        ctx.fillStyle = 'rgba(59, 130, 246, 1)'
        ctx.font = `${Math.max(12, actualQrWidth / 8)}px Arial`
        ctx.textAlign = 'center'
        ctx.fillText('QR CODE', actualQrX + actualQrWidth / 2, actualQrY + actualQrHeight / 2)
        const compositeImageData = canvas.toDataURL('image/png', 1.0)
        resolve(compositeImageData)
        
      } catch (error) {
        reject(error);
      }
    });
  }, [imageRef, qrPosition, imageWidth, imageHeight, qrImageUrl]);

  return (
    <div className="relative inline-block">
      <div className="relative">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Design preview"
          className="max-w-full h-auto rounded-lg shadow-sm"
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
          style={{ maxWidth: `${imageWidth}px` }}
        />
        
        {/* QR Code Overlay */}
        <div
          ref={overlayRef}
          className="absolute border-2 border-primary-500 bg-primary-500 bg-opacity-20 cursor-move select-none qr-overlay"
          style={{
            left: `${(qrPosition.x / imageWidth) * 100}%`,
            top: `${(qrPosition.y / imageHeight) * 100}%`,
            width: `${(qrPosition.width / imageWidth) * 100}%`,
            height: `${(qrPosition.height / imageHeight) * 100}%`,
            minWidth: '20px',
            minHeight: '20px'
          }}
          onPointerDown={handlePointerDown}
        >
          {/* QR Code Label */}
          <div className="absolute -top-8 left-0 text-xs bg-primary-500 text-white px-2 py-1 rounded whitespace-nowrap">
            {stickerImageUrl ? 'QR Sticker Position' : 'QR Code Position'}
          </div>
          <div className="absolute -top-6 left-0 text-xs bg-primary-600 text-white px-2 py-1 rounded whitespace-nowrap">
            {stickerImageUrl ? `Drag to move • Min: ${MIN_STICKER_WIDTH}×${MIN_STICKER_HEIGHT}px for scanning` : 'Drag to move • Resize handles on edges'}
          </div>
          {/* Sticker preview inside overlay (if available) */}
          {stickerImageUrl ? (
            <img
              src={stickerImageUrl}
              alt="QR sticker preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            />
          ) : qrImageUrl ? (
            <img
              src={qrImageUrl}
              alt="QR preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            />
          ) : (
            /* Dummy QR Code Pattern */
            <div className="w-full h-full flex items-center justify-center bg-white p-1" style={{ pointerEvents: 'none' }}>
              <div className="grid grid-cols-7 gap-0.5 w-full h-full max-w-[80%] max-h-[80%]">
                {/* Generate a 7x7 grid pattern that looks like a QR code */}
                {Array.from({ length: 49 }, (_, i) => {
                  const row = Math.floor(i / 7);
                  const col = i % 7;
                  // Create a consistent pattern that looks like a QR code
                  // Corner squares (position detection patterns)
                  const isTopLeft = row < 3 && col < 3;
                  const isTopRight = row < 3 && col > 3;
                  const isBottomLeft = row > 3 && col < 3;
                  // Some data pattern dots
                  const isDataPattern = (row === 3 && col === 3) || (row === 3 && col === 5) || 
                                      (row === 5 && col === 3) || (row === 5 && col === 5) ||
                                      (row === 1 && col === 5) || (row === 5 && col === 1);
                  const shouldFill = isTopLeft || isTopRight || isBottomLeft || isDataPattern;
                  
                  return (
                    <div
                      key={i}
                      className={`w-full h-full ${shouldFill ? 'bg-black' : 'bg-white'} border border-gray-200`}
                      style={{ minHeight: '3px', minWidth: '3px' }}
                    />
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Move Icon */}
          <div className="absolute top-1 left-1 bg-primary-500 text-white p-1 rounded opacity-70">
            <Move className="w-3 h-3" />
          </div>
          
          {/* Resize Handles */}
          {/* Corner handles */}
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-nw-resize qr-resize-handle"
            style={{ top: '-6px', left: '-6px' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-ne-resize qr-resize-handle"
            style={{ top: '-6px', right: '-6px' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-sw-resize qr-resize-handle"
            style={{ bottom: '-6px', left: '-6px' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-se-resize qr-resize-handle"
            style={{ bottom: '-6px', right: '-6px' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'se')}
          />
          
          {/* Edge handles */}
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-n-resize qr-resize-handle"
            style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'n')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-s-resize qr-resize-handle"
            style={{ bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }}
            onPointerDown={(e) => handleResizePointerDown(e, 's')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-w-resize qr-resize-handle"
            style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'w')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-e-resize qr-resize-handle"
            style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
            onPointerDown={(e) => handleResizePointerDown(e, 'e')}
          />
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> Position the QR sticker where you want it to appear on your design. 
          {stickerImageUrl ? ` The preview shows the complete sticker design including the gradient border and "SCAN ME" text. Minimum size: ${MIN_STICKER_WIDTH}×${MIN_STICKER_HEIGHT}px to ensure reliable scanning.` : ' The dummy pattern shows you exactly where the QR code will be placed.'}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>Position: ({Math.round(qrPosition.x)}, {Math.round(qrPosition.y)})</p>
          <p>Size: {Math.round(qrPosition.width)} × {Math.round(qrPosition.height)}px</p>
        </div>
        <button
          onClick={resetPosition}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>
    </div>
  )
}

export default QRPositioningOverlay
