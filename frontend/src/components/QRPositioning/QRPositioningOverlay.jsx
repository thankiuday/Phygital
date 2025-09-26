/**
 * QR Positioning Overlay Component
 * Interactive component for positioning and resizing QR codes on design images
 * Supports drag-to-move and resize handles functionality
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Move, RotateCcw } from 'lucide-react'

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

  // Mouse down handler for drag start
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - qrPosition.x,
      y: e.clientY - qrPosition.y
    })
  }, [qrPosition.x, qrPosition.y])

  // Mouse down handler for resize start
  const handleResizeMouseDown = useCallback((e, handle) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: qrPosition.width,
      height: qrPosition.height
    })
  }, [qrPosition.width, qrPosition.height])

  // Mouse move handler
  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      
      // Constrain to image bounds
      const constrainedX = Math.max(0, Math.min(newX, imageWidth - qrPosition.width))
      const constrainedY = Math.max(0, Math.min(newY, imageHeight - qrPosition.height))
      
      onPositionChange({ x: constrainedX, y: constrainedY })
    } else if (isResizing && resizeHandle) {
      const deltaX = e.clientX - resizeStart.x
      const deltaY = e.clientY - resizeStart.y
      
      let newWidth = resizeStart.width
      let newHeight = resizeStart.height
      let newX = qrPosition.x
      let newY = qrPosition.y
      
      // Handle different resize directions
      switch (resizeHandle) {
        case 'se': // Southeast (bottom-right)
          newWidth = Math.max(20, resizeStart.width + deltaX)
          newHeight = Math.max(20, resizeStart.height + deltaY)
          break
        case 'sw': // Southwest (bottom-left)
          newWidth = Math.max(20, resizeStart.width - deltaX)
          newHeight = Math.max(20, resizeStart.height + deltaY)
          newX = qrPosition.x + (resizeStart.width - newWidth)
          break
        case 'ne': // Northeast (top-right)
          newWidth = Math.max(20, resizeStart.width + deltaX)
          newHeight = Math.max(20, resizeStart.height - deltaY)
          newY = qrPosition.y + (resizeStart.height - newHeight)
          break
        case 'nw': // Northwest (top-left)
          newWidth = Math.max(20, resizeStart.width - deltaX)
          newHeight = Math.max(20, resizeStart.height - deltaY)
          newX = qrPosition.x + (resizeStart.width - newWidth)
          newY = qrPosition.y + (resizeStart.height - newHeight)
          break
        case 'n': // North (top)
          newHeight = Math.max(20, resizeStart.height - deltaY)
          newY = qrPosition.y + (resizeStart.height - newHeight)
          break
        case 's': // South (bottom)
          newHeight = Math.max(20, resizeStart.height + deltaY)
          break
        case 'e': // East (right)
          newWidth = Math.max(20, resizeStart.width + deltaX)
          break
        case 'w': // West (left)
          newWidth = Math.max(20, resizeStart.width - deltaX)
          newX = qrPosition.x + (resizeStart.width - newWidth)
          break
      }
      
      // Constrain to image bounds
      newX = Math.max(0, Math.min(newX, imageWidth - newWidth))
      newY = Math.max(0, Math.min(newY, imageHeight - newHeight))
      
      onPositionChange({ x: newX, y: newY })
      onSizeChange({ width: newWidth, height: newHeight })
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeHandle, qrPosition, imageWidth, imageHeight, onPositionChange, onSizeChange])

  // Mouse up handler
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle(null)
  }, [])

  // Add event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp])

  // Expose capture function to parent
  useEffect(() => {
    if (onCaptureComposite) {
      onCaptureComposite(captureCompositeImage);
    }
  }, [onCaptureComposite, captureCompositeImage])

  // Reset to default position
  const resetPosition = useCallback(() => {
    onPositionChange({ x: 10, y: 10 })
    onSizeChange({ width: 100, height: 100 })
  }, [onPositionChange, onSizeChange])

  // Capture composite image (design + QR overlay)
  const captureCompositeImage = useCallback(() => {
    return new Promise((resolve, reject) => {
      try {
        console.log('=== COMPOSITE IMAGE CAPTURE DEBUG ===');
        
        if (!imageRef.current) {
          console.log('ERROR: Image not loaded');
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
        
        console.log('Image dimensions:', {
          natural: { width: img.naturalWidth, height: img.naturalHeight },
          displayed: { width: img.offsetWidth, height: img.offsetHeight },
          canvas: { width: canvas.width, height: canvas.height }
        });
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Calculate QR position on the actual image based on displayed size
        const displayedWidth = img.offsetWidth || imageWidth
        const displayedHeight = img.offsetHeight || imageHeight
        const actualQrX = (qrPosition.x / displayedWidth) * img.naturalWidth;
        const actualQrY = (qrPosition.y / displayedHeight) * img.naturalHeight;
        const actualQrWidth = (qrPosition.width / displayedWidth) * img.naturalWidth;
        const actualQrHeight = (qrPosition.height / displayedHeight) * img.naturalHeight;
        
        console.log('QR Position calculation:', {
          qrPosition,
          imageWidth: displayedWidth,
          imageHeight: displayedHeight,
          actualQr: {
            x: actualQrX,
            y: actualQrY,
            width: actualQrWidth,
            height: actualQrHeight
          }
        });
        
        // If we have a real QR image, draw it; otherwise, draw placeholder and resolve
        if (qrImageUrl) {
          const qrImg = new Image()
          qrImg.crossOrigin = 'anonymous'
          qrImg.onload = () => {
            console.log('[QR Overlay] qrImg loaded, drawing onto canvas', {
              naturalWidth: qrImg.naturalWidth,
              naturalHeight: qrImg.naturalHeight,
              drawSize: { w: actualQrWidth, h: actualQrHeight }
            })
            try {
              ctx.drawImage(qrImg, actualQrX, actualQrY, actualQrWidth, actualQrHeight)
              const compositeImageData = canvas.toDataURL('image/png')
              console.log('Composite with real QR generated')
              resolve(compositeImageData)
            } catch (err) {
              console.error('Failed drawing QR image, falling back to placeholder', err)
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
              const compositeImageData = canvas.toDataURL('image/png')
              resolve(compositeImageData)
            }
          }
          qrImg.onerror = (e) => {
            console.error('Failed to load QR image, using placeholder', e)
            ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
            ctx.fillRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight)
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'
            ctx.lineWidth = 2
            ctx.strokeRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight)
            ctx.fillStyle = 'rgba(59, 130, 246, 1)'
            ctx.font = `${Math.max(12, actualQrWidth / 8)}px Arial`
            ctx.textAlign = 'center'
            ctx.fillText('QR CODE', actualQrX + actualQrWidth / 2, actualQrY + actualQrHeight / 2)
            const compositeImageData = canvas.toDataURL('image/png')
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
        const compositeImageData = canvas.toDataURL('image/png')
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
          onMouseDown={handleMouseDown}
        >
          {/* QR Code Label */}
          <div className="absolute -top-6 left-0 text-xs bg-primary-500 text-white px-2 py-1 rounded whitespace-nowrap">
            QR Code Area
          </div>
          {/* QR preview inside overlay (if available) */}
          {qrImageUrl && (
            <img
              src={qrImageUrl}
              alt="QR preview"
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            />
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
            onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-ne-resize qr-resize-handle"
            style={{ top: '-6px', right: '-6px' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-sw-resize qr-resize-handle"
            style={{ bottom: '-6px', left: '-6px' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-se-resize qr-resize-handle"
            style={{ bottom: '-6px', right: '-6px' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
          />
          
          {/* Edge handles */}
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-n-resize qr-resize-handle"
            style={{ top: '-6px', left: '50%', transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-s-resize qr-resize-handle"
            style={{ bottom: '-6px', left: '50%', transform: 'translateX(-50%)' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 's')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-w-resize qr-resize-handle"
            style={{ left: '-6px', top: '50%', transform: 'translateY(-50%)' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
          />
          <div
            className="absolute w-3 h-3 bg-primary-500 border border-white cursor-e-resize qr-resize-handle"
            style={{ right: '-6px', top: '50%', transform: 'translateY(-50%)' }}
            onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
          />
        </div>
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
