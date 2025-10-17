import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadAPI, qrAPI } from '../../../utils/api';
import { QrCode, CheckCircle, AlertCircle, MapPin, MousePointer } from 'lucide-react';
import MindFileGenerationLoader from '../../UI/MindFileGenerationLoader';
import toast from 'react-hot-toast';

const QRPositionLevel = ({ onComplete, currentPosition, designUrl, forceStartFromLevel1 = false, onLoadingStart, onLoadingEnd }) => {
  const { user, updateUser } = useAuth();
  const [qrPosition, setQrPosition] = useState({
    x: currentPosition?.x || user?.qrPosition?.x || 100,
    y: currentPosition?.y || user?.qrPosition?.y || 100,
    width: currentPosition?.width || user?.qrPosition?.width || 100,
    height: currentPosition?.height || user?.qrPosition?.height || 100
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [captureCompositeFunction, setCaptureCompositeFunction] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState('');

  console.log('🎨 QRPositionLevel - Props received:');
  console.log('  - designUrl (prop):', designUrl);
  console.log('  - currentPosition:', currentPosition);
  console.log('  - forceStartFromLevel1:', forceStartFromLevel1);
  console.log('  - user?.uploadedFiles?.design?.url:', user?.uploadedFiles?.design?.url);

  const designImageUrl = designUrl || user?.uploadedFiles?.design?.url;
  
  console.log('🎨 QRPositionLevel - Final Design Image URL:', designImageUrl);
  console.log('🎨 QRPositionLevel - designImageUrl is null?', designImageUrl === null);
  console.log('🎨 QRPositionLevel - designImageUrl is undefined?', designImageUrl === undefined);

  // Fetch user's QR image for live preview and composite drawing
  useEffect(() => {
    const fetchQR = async () => {
      try {
        if (!user?._id) return;
        let res = await qrAPI.getMyQR('png', 300);
        let blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'image/png' });
        let url = URL.createObjectURL(blob);
        console.log('[Level QR] Loaded QR from my-qr endpoint');
        setQrImageUrl(url);
      } catch (err) {
        console.warn('[Level QR] getMyQR failed, trying generate...', err);
        try {
          const res2 = await qrAPI.generateQR(user._id, 'png', 300);
          const blob2 = res2.data instanceof Blob ? res2.data : new Blob([res2.data], { type: 'image/png' });
          const url2 = URL.createObjectURL(blob2);
          console.log('[Level QR] Loaded QR from generate endpoint');
          setQrImageUrl(url2);
        } catch (err2) {
          console.error('[Level QR] Failed to load QR image', err2);
        }
      }
    };
    fetchQR();
    return () => {
      if (qrImageUrl) {
        console.log('[Level QR] Revoking QR object URL');
        URL.revokeObjectURL(qrImageUrl);
      }
    };
  }, [user?._id]);

  // Capture composite image (design + QR overlay)
  const captureCompositeImage = React.useCallback(() => {
    return new Promise((resolve, reject) => {
      try {
        console.log('=== COMPOSITE IMAGE CAPTURE DEBUG (QRPositionLevel) ===');
        
        const imageElement = document.querySelector('img[alt="Design preview"]');
        if (!imageElement) {
          console.log('ERROR: Image element not found');
          reject(new Error('Image not loaded'));
          return;
        }

        // Create a new image with CORS enabled to avoid tainted canvas
        const corsImage = new Image();
        corsImage.crossOrigin = 'anonymous';
        
        corsImage.onload = () => {
          try {
            // Create a canvas to draw the composite image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match the actual image
            canvas.width = corsImage.naturalWidth || corsImage.width;
            canvas.height = corsImage.naturalHeight || corsImage.height;
            
            console.log('Image dimensions:', {
              natural: { width: corsImage.naturalWidth, height: corsImage.naturalHeight },
              canvas: { width: canvas.width, height: canvas.height }
            });
            
            // Draw the original image
            ctx.drawImage(corsImage, 0, 0);
            
            // Calculate QR position on the actual image (using the stored position)
            const actualQrX = qrPosition.x;
            const actualQrY = qrPosition.y;
            const actualQrWidth = qrPosition.width;
            const actualQrHeight = qrPosition.height;
            
            console.log('QR Position for composite:', {
              qrPosition,
              actualQr: {
                x: actualQrX,
                y: actualQrY,
                width: actualQrWidth,
                height: actualQrHeight
              }
            });
            
            const drawPlaceholderAndResolve = () => {
              // Draw QR code placeholder
              ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
              ctx.fillRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight);
              ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
              ctx.lineWidth = 2;
              ctx.strokeRect(actualQrX, actualQrY, actualQrWidth, actualQrHeight);
              ctx.fillStyle = 'rgba(59, 130, 246, 1)';
              ctx.font = `${Math.max(12, actualQrWidth / 8)}px Arial`;
              ctx.textAlign = 'center';
              ctx.fillText('QR CODE', actualQrX + actualQrWidth / 2, actualQrY + actualQrHeight / 2);
              const data = canvas.toDataURL('image/png', 1.0);
              console.log('Composite image generated (placeholder)');
              resolve(data);
            };

            if (qrImageUrl) {
              const qrImg = new Image();
              qrImg.crossOrigin = 'anonymous';
              qrImg.onload = () => {
                try {
                  console.log('[Level QR] qrImg loaded, drawing into canvas', { w: actualQrWidth, h: actualQrHeight });
                  ctx.drawImage(qrImg, actualQrX, actualQrY, actualQrWidth, actualQrHeight);
                  const data = canvas.toDataURL('image/png', 1.0);
                  console.log('Composite image generated with real QR');
                  resolve(data);
                } catch (e) {
                  console.warn('[Level QR] drawImage failed, using placeholder', e);
                  drawPlaceholderAndResolve();
                }
              };
              qrImg.onerror = (e) => {
                console.warn('[Level QR] Failed to load qrImg, using placeholder', e);
                drawPlaceholderAndResolve();
              };
              qrImg.src = qrImageUrl;
            } else {
              drawPlaceholderAndResolve();
            }
          } catch (canvasError) {
            console.error('Error processing canvas:', canvasError);
            reject(canvasError);
          }
        };
        
        corsImage.onerror = (error) => {
          console.error('Error loading CORS image:', error);
          console.log('Falling back to server-side composite generation...');
          // Fallback: Let the server generate the composite image
          reject(new Error('CORS_FALLBACK'));
        };
        
        // Load the image with CORS
        corsImage.src = imageElement.src;
        
      } catch (error) {
        console.error('Error capturing composite image:', error);
        reject(error);
      }
    });
  }, [qrPosition]);

  // Set the capture function when component mounts
  React.useEffect(() => {
    setCaptureCompositeFunction(() => captureCompositeImage);
  }, [captureCompositeImage]);
  
  // Handle image load to get dimensions
  const handleImageLoad = (e) => {
    const img = e.target;
    const dimensions = {
      width: img.naturalWidth,
      height: img.naturalHeight
    };
    setImageDimensions(dimensions);
    console.log('Image loaded with dimensions:', dimensions);
    console.log('Displayed image dimensions:', {
      width: img.offsetWidth,
      height: img.offsetHeight
    });
    
    // Adjust QR position if it's outside the image boundaries
    setQrPosition(prev => {
      const constrainedPosition = constrainPositionToImage(prev, dimensions);
      if (constrainedPosition !== prev) {
        console.log('QR position constrained to image boundaries:', constrainedPosition);
      }
      return constrainedPosition;
    });
  };
  
  // Function to constrain position to image boundaries
  const constrainPositionToImage = (position, imgDims = imageDimensions) => {
    if (imgDims.width === 0 || imgDims.height === 0) return position;
    
    const maxX = Math.max(0, imgDims.width - position.width);
    const maxY = Math.max(0, imgDims.height - position.height);
    
    return {
      x: Math.max(0, Math.min(position.x, maxX)),
      y: Math.max(0, Math.min(position.y, maxY)),
      width: Math.max(50, Math.min(position.width, imgDims.width)),
      height: Math.max(50, Math.min(position.height, imgDims.height))
    };
  };

  // Convert screen coordinates to image coordinates
  const screenToImageCoords = (screenX, screenY, imageElement) => {
    if (!imageElement || imageDimensions.width === 0 || imageDimensions.height === 0) {
      return { x: screenX, y: screenY };
    }

    const rect = imageElement.getBoundingClientRect();
    
    // Calculate scale factors
    const scaleX = imageDimensions.width / rect.width;
    const scaleY = imageDimensions.height / rect.height;
    
    // Convert to image coordinates
    const imageX = (screenX - rect.left) * scaleX;
    const imageY = (screenY - rect.top) * scaleY;
    
    console.log('Coordinate conversion:', {
      screen: { x: screenX, y: screenY },
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      scale: { x: scaleX, y: scaleY },
      image: { x: imageX, y: imageY },
      natural: imageDimensions,
      percentage: {
        x: (imageX / imageDimensions.width) * 100,
        y: (imageY / imageDimensions.height) * 100
      }
    });
    
    return { x: imageX, y: imageY };
  };

  // Convert image coordinates to percentage
  const imageToPercentage = (x, y) => {
    if (imageDimensions.width === 0 || imageDimensions.height === 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: (x / imageDimensions.width) * 100,
      y: (y / imageDimensions.height) * 100
    };
  };
  
  // Debug logging
  React.useEffect(() => {
    console.log('QRPositionLevel initialized with:', {
      currentPosition,
      userQrPosition: user?.qrPosition,
      designUrl,
      designImageUrl,
      qrPosition,
      imageDimensions
    });
    
    // Add debug function to window for testing
    if (process.env.NODE_ENV === 'development') {
      window.debugQRPosition = {
        testSave: () => {
          console.log('Testing QR position save...');
          saveQRPosition();
        },
        getCurrentPosition: () => qrPosition,
        getImageDimensions: () => imageDimensions,
        getUser: () => user,
        getToken: () => localStorage.getItem('token')
      };
      console.log('Debug functions available at window.debugQRPosition');
    }
  }, [currentPosition, user?.qrPosition, designUrl, designImageUrl, qrPosition, imageDimensions]);

  // Add global mouse listeners to handle mouse events outside the image
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing) {
        console.log('Global mouse up - stopping drag/resize');

        // Restore scroll behavior
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';

        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
      }
    };

    const handleGlobalMouseMove = (e) => {
      if (isDragging || isResizing) {
        // Find the image element to get its bounding rect
        const imageElement = document.querySelector('img[alt="Design preview"]');
        if (imageElement && imageDimensions.width > 0 && imageDimensions.height > 0) {
          // Get coordinates (handle both mouse and touch events)
          const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
          const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

          // Convert coordinates to image coordinates
          const imageCoords = screenToImageCoords(clientX, clientY, imageElement);

          if (isResizing && dragStart.resizeHandle && dragStart.initialWidth !== undefined) {
            // Handle resizing (global)
            // Set initial coordinates on first move if not set
            if (!dragStart.x || !dragStart.y) {
              setDragStart(prev => ({
                ...prev,
                x: imageCoords.x,
                y: imageCoords.y
              }));
              return; // Skip this frame
            }

            const deltaX = imageCoords.x - dragStart.x;
            const deltaY = imageCoords.y - dragStart.y;

            let newX = dragStart.initialX;
            let newY = dragStart.initialY;
            let newWidth = dragStart.initialWidth;
            let newHeight = dragStart.initialHeight;

            // Calculate new dimensions based on resize handle
            switch (resizeHandle) {
              case 'nw': // Top-left
                newX = dragStart.initialX + deltaX;
                newY = dragStart.initialY + deltaY;
                newWidth = dragStart.initialWidth - deltaX;
                newHeight = dragStart.initialHeight - deltaY;
                break;
              case 'ne': // Top-right
                newY = dragStart.initialY + deltaY;
                newWidth = dragStart.initialWidth + deltaX;
                newHeight = dragStart.initialHeight - deltaY;
                break;
              case 'sw': // Bottom-left
                newX = dragStart.initialX + deltaX;
                newWidth = dragStart.initialWidth - deltaX;
                newHeight = dragStart.initialHeight + deltaY;
                break;
              case 'se': // Bottom-right
                newWidth = dragStart.initialWidth + deltaX;
                newHeight = dragStart.initialHeight + deltaY;
                break;
              case 'n': // Top
                newY = dragStart.initialY + deltaY;
                newHeight = dragStart.initialHeight - deltaY;
                break;
              case 's': // Bottom
                newHeight = dragStart.initialHeight + deltaY;
                break;
              case 'w': // Left
                newX = dragStart.initialX + deltaX;
                newWidth = dragStart.initialWidth - deltaX;
                break;
              case 'e': // Right
                newWidth = dragStart.initialWidth + deltaX;
                break;
            }

            // Constrain dimensions and position
            newWidth = Math.max(50, Math.min(newWidth, imageDimensions.width - newX));
            newHeight = Math.max(50, Math.min(newHeight, imageDimensions.height - newY));
            newX = Math.max(0, Math.min(newX, imageDimensions.width - newWidth));
            newY = Math.max(0, Math.min(newY, imageDimensions.height - newHeight));

            setQrPosition({
              x: newX,
              y: newY,
              width: newWidth,
              height: newHeight
            });
          } else if (isDragging) {
            // Handle dragging (global)
            const offsetX = dragStart.offsetX || (dragStart.x - qrPosition.x);
            const offsetY = dragStart.offsetY || (dragStart.y - qrPosition.y);

            const newX = Math.max(0, Math.min(imageCoords.x - offsetX, imageDimensions.width - qrPosition.width));
            const newY = Math.max(0, Math.min(imageCoords.y - offsetY, imageDimensions.height - qrPosition.height));

            setQrPosition(prev => ({
              ...prev,
              x: newX,
              y: newY
            }));
          }
        } else {
          // Fallback case for global mouse move when image dimensions are not available
          if (isDragging && dragStart.fallback) {
            const rect = document.querySelector('img[alt="Design preview"]')?.getBoundingClientRect();
            if (rect) {
              // Get coordinates (handle both mouse and touch events)
              const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
              const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

              const deltaX = clientX - dragStart.x;
              const deltaY = clientY - dragStart.y;

              const newX = Math.max(0, Math.min(qrPosition.x + deltaX, rect.width - qrPosition.width));
              const newY = Math.max(0, Math.min(qrPosition.y + deltaY, rect.height - qrPosition.height));

              setQrPosition(prev => ({
                ...prev,
                x: newX,
                y: newY
              }));
            }
          }
        }
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('mouseleave', handleGlobalMouseUp);
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('touchend', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalMouseMove);
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mouseleave', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('touchend', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalMouseMove);
    };
  }, [isDragging, isResizing, dragStart, resizeHandle, qrPosition.width, qrPosition.height, imageDimensions]);

  // Handle resize start for both mouse and touch
  const handleResizeStart = (handle) => {
    console.log('Resize handle clicked:', handle);
    setIsResizing(true);
    setResizeHandle(handle);

    // Find the image element to get current coordinates
    const imageElement = document.querySelector('img[alt="Design preview"]');

    if (imageElement && imageDimensions.width > 0 && imageDimensions.height > 0) {
      // Store initial values for resize calculations with current coordinates
      setDragStart({
        x: 0, // Will be set in handlePointerMove
        y: 0, // Will be set in handlePointerMove
        initialWidth: qrPosition.width,
        initialHeight: qrPosition.height,
        initialX: qrPosition.x,
        initialY: qrPosition.y,
        resizeHandle: handle
      });
    } else {
      // Fallback for when image dimensions aren't available
      setDragStart({
        x: 0,
        y: 0,
        initialWidth: qrPosition.width,
        initialHeight: qrPosition.height,
        initialX: qrPosition.x,
        initialY: qrPosition.y,
        resizeHandle: handle
      });
    }
  };

  // Get resize handle at mouse position
  const getResizeHandle = (mouseX, mouseY, rect) => {
    const handleSize = 8; // Size of resize handles
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;

    // Corner handles
    if (x <= handleSize && y <= handleSize) return 'nw'; // Top-left
    if (x >= rect.width - handleSize && y <= handleSize) return 'ne'; // Top-right
    if (x <= handleSize && y >= rect.height - handleSize) return 'sw'; // Bottom-left
    if (x >= rect.width - handleSize && y >= rect.height - handleSize) return 'se'; // Bottom-right

    // Edge handles
    if (y <= handleSize && x > handleSize && x < rect.width - handleSize) return 'n'; // Top
    if (y >= rect.height - handleSize && x > handleSize && x < rect.width - handleSize) return 's'; // Bottom
    if (x <= handleSize && y > handleSize && y < rect.height - handleSize) return 'w'; // Left
    if (x >= rect.width - handleSize && y > handleSize && y < rect.height - handleSize) return 'e'; // Right

    return null; // Not on a resize handle
  };

  // Handle mouse/touch down on QR area or resize handles
  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Pointer down on QR area');

    // Prevent page scrolling on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    // Find the image element
    const imageElement = document.querySelector('img[alt="Design preview"]');

    // Get coordinates (handle both mouse and touch events)
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    if (imageElement && imageDimensions.width > 0 && imageDimensions.height > 0) {
      // Convert coordinates to image coordinates
      const imageCoords = screenToImageCoords(clientX, clientY, imageElement);

      // Check if clicking on resize handle
      // For resize handle detection, we need to check relative to the image element
      const imageRect = imageElement.getBoundingClientRect();
      const qrRect = {
        left: imageRect.left + (qrPosition.x / imageDimensions.width) * imageRect.width,
        top: imageRect.top + (qrPosition.y / imageDimensions.height) * imageRect.height,
        width: (qrPosition.width / imageDimensions.width) * imageRect.width,
        height: (qrPosition.height / imageDimensions.height) * imageRect.height
      };

      // For resize handle detection, use coordinates relative to the image element
      const relativeX = clientX - imageRect.left;
      const relativeY = clientY - imageRect.top;

      const handle = getResizeHandle(relativeX, relativeY, qrRect);

      if (handle) {
        console.log('Resize handle clicked:', handle);
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({
          x: imageCoords.x,
          y: imageCoords.y,
          initialWidth: qrPosition.width,
          initialHeight: qrPosition.height,
          initialX: qrPosition.x,
          initialY: qrPosition.y
        });
      } else {
        console.log('QR area clicked for dragging');
        setIsDragging(true);
        setDragStart({
          x: imageCoords.x,
          y: imageCoords.y,
          offsetX: imageCoords.x - qrPosition.x,
          offsetY: imageCoords.y - qrPosition.y
        });
      }
    } else {
      // Fallback to original behavior if image dimensions not available
      const rect = e.currentTarget.getBoundingClientRect();
      const handle = getResizeHandle(clientX - rect.left, clientY - rect.top, rect);

      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        setDragStart({
          x: clientX,
          y: clientY,
          initialWidth: qrPosition.width,
          initialHeight: qrPosition.height,
          initialX: qrPosition.x,
          initialY: qrPosition.y
        });
      } else {
        console.log('Using fallback drag calculation');
        setIsDragging(true);
        setDragStart({
          x: clientX,
          y: clientY,
          offsetX: clientX - rect.left - qrPosition.x,
          offsetY: clientY - rect.top - qrPosition.y,
          fallback: true
        });
      }
    }
  };

  // Handle mouse/touch move
  const handlePointerMove = (e) => {
    if (!isDragging && !isResizing) return;

    e.preventDefault();

    // Find the image element
    const imageElement = document.querySelector('img[alt="Design preview"]');

    // Get coordinates (handle both mouse and touch events)
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    if (imageElement && imageDimensions.width > 0 && imageDimensions.height > 0) {
      // Convert coordinates to image coordinates
      const imageCoords = screenToImageCoords(clientX, clientY, imageElement);

      if (isResizing && dragStart.resizeHandle) {
        // Handle resizing
        // Set initial coordinates on first move if not set
        if (!dragStart.x || !dragStart.y) {
          setDragStart(prev => ({
            ...prev,
            x: imageCoords.x,
            y: imageCoords.y
          }));
          return; // Skip this frame
        }

        const deltaX = imageCoords.x - dragStart.x;
        const deltaY = imageCoords.y - dragStart.y;

        let newX = dragStart.initialX;
        let newY = dragStart.initialY;
        let newWidth = dragStart.initialWidth;
        let newHeight = dragStart.initialHeight;
        const handle = dragStart.resizeHandle;

        // Calculate new dimensions based on resize handle
        switch (handle) {
          case 'nw': // Top-left
            newX = dragStart.initialX + deltaX;
            newY = dragStart.initialY + deltaY;
            newWidth = dragStart.initialWidth - deltaX;
            newHeight = dragStart.initialHeight - deltaY;
            break;
          case 'ne': // Top-right
            newY = dragStart.initialY + deltaY;
            newWidth = dragStart.initialWidth + deltaX;
            newHeight = dragStart.initialHeight - deltaY;
            break;
          case 'sw': // Bottom-left
            newX = dragStart.initialX + deltaX;
            newWidth = dragStart.initialWidth - deltaX;
            newHeight = dragStart.initialHeight + deltaY;
            break;
          case 'se': // Bottom-right
            newWidth = dragStart.initialWidth + deltaX;
            newHeight = dragStart.initialHeight + deltaY;
            break;
          case 'n': // Top
            newY = dragStart.initialY + deltaY;
            newHeight = dragStart.initialHeight - deltaY;
            break;
          case 's': // Bottom
            newHeight = dragStart.initialHeight + deltaY;
            break;
          case 'w': // Left
            newX = dragStart.initialX + deltaX;
            newWidth = dragStart.initialWidth - deltaX;
            break;
          case 'e': // Right
            newWidth = dragStart.initialWidth + deltaX;
            break;
        }

        // Constrain dimensions and position
        newWidth = Math.max(50, Math.min(newWidth, imageDimensions.width - newX));
        newHeight = Math.max(50, Math.min(newHeight, imageDimensions.height - newY));
        newX = Math.max(0, Math.min(newX, imageDimensions.width - newWidth));
        newY = Math.max(0, Math.min(newY, imageDimensions.height - newHeight));

        console.log('Resize - new dimensions:', { x: newX, y: newY, width: newWidth, height: newHeight, deltaX, deltaY });

        setQrPosition({
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight
        });
      } else if (isDragging) {
        // Handle dragging
        const offsetX = dragStart.offsetX || (dragStart.x - qrPosition.x);
        const offsetY = dragStart.offsetY || (dragStart.y - qrPosition.y);

        const newX = Math.max(0, Math.min(imageCoords.x - offsetX, imageDimensions.width - qrPosition.width));
        const newY = Math.max(0, Math.min(imageCoords.y - offsetY, imageDimensions.height - qrPosition.height));

        console.log('Pointer move - new position:', { x: newX, y: newY, offsetX, offsetY });

        setQrPosition(prev => ({
          ...prev,
          x: newX,
          y: newY
        }));
      }
    } else {
      // Fallback case when image dimensions are not available
      if (isDragging && dragStart.fallback) {
        const rect = document.querySelector('img[alt="Design preview"]')?.getBoundingClientRect();
        if (rect) {
          const deltaX = clientX - dragStart.x;
          const deltaY = clientY - dragStart.y;

          const newX = Math.max(0, Math.min(qrPosition.x + deltaX, rect.width - qrPosition.width));
          const newY = Math.max(0, Math.min(qrPosition.y + deltaY, rect.height - qrPosition.height));

          setQrPosition(prev => ({
            ...prev,
            x: newX,
            y: newY
          }));
        }
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    console.log('Mouse up - stopping drag/resize');

    // Restore scroll behavior
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  // Save QR position
  const saveQRPosition = async () => {
    let successFlow = false; // Track if we're in the success flow
    
    try {
      // Show loader immediately when button is clicked
      console.log('🔄 Starting save process - signaling parent to show loader');
      setIsSaving(true);
      onLoadingStart('Saving QR position...');
      console.log('✅ Loader state set:', { isSaving: true });
      
      console.log('=== QR Position Save Debug ===');
      console.log('Saving QR position:', qrPosition);
      console.log('User token available:', !!localStorage.getItem('token'));
      console.log('User token value:', localStorage.getItem('token')?.substring(0, 20) + '...');
      console.log('Current user:', user);
      
      // Check if user is authenticated
      if (!user || !localStorage.getItem('token')) {
        console.error('User not authenticated');
        toast.error('Please login to save QR position');
        setIsSaving(false);
        onLoadingEnd();
        return;
      }
      
      // Validate QR position data
      if (!qrPosition || typeof qrPosition.x !== 'number' || typeof qrPosition.y !== 'number') {
        console.error('Invalid QR position data:', qrPosition);
        toast.error('Invalid QR position data');
        setIsSaving(false);
        onLoadingEnd();
        return;
      }
      
      console.log('QR position data validation passed:', qrPosition);
      
      onLoadingStart('Uploading QR position to server...');
      
      // Always use server-side composite generation to ensure real QR is baked in
      console.log('Using server-side composite generation (setQRPosition)');
      const response = await uploadAPI.setQRPosition(qrPosition);
      console.log('Server-side composite generation response:', response);
      
      onLoadingStart('Verifying AR tracking file...');
      
      // Update user context with the response data
      if (response.data?.data?.user) {
        console.log('Updating user with response data');
        updateUser(response.data.data.user);
      } else {
        console.log('Using fallback: updating qrPosition field only');
        updateUser({ qrPosition });
      }

      // ===== CRITICAL: Verify .mind file generation before advancing =====
      let mindTargetUrl = null;
      
      try {
        // Check if server already generated .mind file (new response structure)
        mindTargetUrl = response.data?.data?.mindTarget?.url || 
                        response.data?.data?.user?.uploadedFiles?.mindTarget?.url;
        
        console.log('[Level QR] Server-side .mind URL:', mindTargetUrl);
        
        if (mindTargetUrl) {
          // Server already generated .mind file - we can proceed directly
          console.log('[Level QR] ✅ Server already has .mind file, proceeding to Level 3');
          onLoadingStart('✅ AR tracking file ready!');
          
          // Mark that we're in the success flow since we have the .mind file
          successFlow = true;
        } else {
          // Server didn't generate .mind file - try client-side generation
          // Show specialized loader for .mind generation
          console.log('🔍 Signaling parent to show loader for .mind generation');
          onLoadingStart('Generating AR tracking file...');
          toast.loading('🧠 Generating AR tracking file...', { id: 'mind-gen' });
          console.log('🔍 Loader should now be visible with message: Generating AR tracking file...');
          
          // Add a small delay to ensure state updates are processed
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Mark that we're in the success flow as soon as we start .mind generation
          // This ensures the loader stays visible until Level 3 is ready
          successFlow = true;
          
          // Check for composite URL (new response structure first, then fallback)
          const compositeUrl = response.data?.data?.compositeDesign?.url || 
                              response.data?.data?.user?.uploadedFiles?.compositeDesign?.url;
          
          console.log('[Level QR] Composite URL for .mind generation:', compositeUrl);
          
          if (!compositeUrl) {
            console.log('🔍 No composite URL available - ending loader');
            onLoadingEnd();
            throw new Error('No composite image available for .mind generation. Please try uploading your design again.');
          }
          
          onLoadingStart('Loading AR compiler...');
          console.log('[Level QR] Generating .mind on client from composite...');
          const mindarModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image.prod.js');
          const { Compiler } = mindarModule;
          
          onLoadingStart('Loading design image...');
          const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = 'anonymous';
            let timeoutId;
            
            i.onload = () => {
              console.log('[Level QR] Composite image loaded successfully');
              clearTimeout(timeoutId); // Clear the timeout since image loaded successfully
              resolve(i);
            };
            i.onerror = (error) => {
              console.error('[Level QR] Image load error:', error);
              clearTimeout(timeoutId); // Clear the timeout on error
              reject(new Error(`Failed to load composite image: ${error}`));
            };
            i.src = compositeUrl;
            timeoutId = setTimeout(() => {
              console.error('[Level QR] Image load timeout after 30 seconds');
              reject(new Error('Image load timeout after 30 seconds'));
            }, 30000);
          });
          
          onLoadingStart('Processing AR tracking data...');
          const compiler = new Compiler();
          console.log('[Level QR] Starting image compilation...');
          await compiler.compileImageTargets([img], (progress) => {
            const percentage = (progress * 100).toFixed(0);
            console.log(`[Level QR] .mind compilation progress: ${percentage}%`);
            onLoadingStart(`Compiling AR data: ${percentage}%`);
          });
          console.log('[Level QR] Image compilation completed successfully');
          
          onLoadingStart('Exporting AR data...');
          console.log('[Level QR] Exporting compiled data...');
          const buf = await compiler.exportData();
          console.log('[Level QR] Data export completed successfully');
          
          onLoadingStart('Converting to file format...');
          // Convert ArrayBuffer -> data URL (base64) safely via Blob + FileReader
          const blob = new Blob([buf], { type: 'application/octet-stream' });
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
          });
          
          onLoadingStart('Uploading AR tracking file...');
          const saveRes = await uploadAPI.saveMindTarget(dataUrl);
          mindTargetUrl = saveRes.data?.data?.mindTarget?.url;
          
          console.log('[Level QR] .mind generated and saved via /upload/save-mind-target', saveRes.data);
          toast.success('✅ AR tracking file generated!', { id: 'mind-gen' });
          // Don't hide loader here - let the success flow handle it
        }
      } catch (clientMindErr) {
        console.error('[Level QR] .mind generation failed:', clientMindErr);
        console.error('[Level QR] Error details:', {
          message: clientMindErr?.message,
          name: clientMindErr?.name,
          stack: clientMindErr?.stack,
          toString: clientMindErr?.toString()
        });
        
        // Check if it's a timeout error
        const isTimeoutError = clientMindErr?.message?.includes('timeout') || 
                             clientMindErr?.code === 'ECONNABORTED' ||
                             clientMindErr?.name === 'AxiosError';
        
        if (isTimeoutError) {
          // Don't hide loader immediately - show timeout message first
          onLoadingStart('⏱️ Upload taking longer than expected...');
          
          // Show user-friendly timeout message
          toast.error('⏱️ Upload is taking longer than expected', { id: 'mind-gen' });
          toast.error(
            'The AR tracking file is large and taking time to upload. Please wait a bit longer or try again.\n\nIf this continues, please contact support.',
            { duration: 10000 }
          );
          
          // Keep loader visible for timeout errors to give user time to read the message
          setTimeout(() => {
            console.log('🔍 Ending loader - timeout error (5 second delay)');
            onLoadingEnd();
            setIsSaving(false);
          }, 5000); // Give user more time to see the timeout message
        } else {
          // Don't hide loader immediately - show error message first
          onLoadingStart('❌ AR tracking file generation failed');
          
          // Show user-friendly error with action
          const errorMessage = clientMindErr?.message || clientMindErr?.toString() || 'Unknown error';
          toast.error('❌ Failed to generate AR tracking file', { id: 'mind-gen' });
          toast.error(
            `Cannot proceed to Level 3: ${errorMessage}\n\nPlease try saving QR position again or contact support.`,
            { duration: 8000 }
          );
          
          // Hide loader after showing error message
          setTimeout(() => {
            console.log('🔍 Ending loader - other error (3 second delay)');
            onLoadingEnd();
            setIsSaving(false);
          }, 3000); // Give user time to see the error message
        }
        
        return; // DON'T advance to Level 3 without .mind file
        }
      
      // ===== Final verification before advancing =====
      if (!mindTargetUrl) {
        console.error('[Level QR] .mind file URL not available after generation attempts');
        toast.error('⚠️ AR tracking file was not generated. Cannot proceed to Level 3.');
        toast.error('Please try clicking "Save QR Position" again.', { duration: 6000 });
        setIsSaving(false);
        onLoadingEnd();
        return; // DON'T advance without .mind file
      }
      
      console.log('[Level QR] ✅ .mind file verified:', mindTargetUrl);
      
      // Mark that we're in the success flow
      successFlow = true;
      
      // Show final success message on the loader
      onLoadingStart('✅ AR tracking file successfully generated!');
      
      // Wait 2 seconds to show the success message on loader
      setTimeout(() => {
        // Show toast notification FIRST (while loader is still visible)
        toast.success('📍 QR position saved with AR tracking!');
        
        // Wait another 1 second for user to see the toast, then advance to Level 3
        setTimeout(() => {
          // ===== Advance to Level 3 FIRST (while loader is still visible) =====
          console.log('Calling onComplete with qrPosition:', qrPosition);
          console.log('Mind file URL confirmed:', mindTargetUrl);
          
          // Advance to next level
          onComplete(qrPosition);
          console.log('onComplete called successfully - advancing to Level 3');
          
          // Hide loader after Level 3 is confirmed to be ready
          // Use a more robust approach - check if Level 3 is actually rendered
          let loaderHidden = false; // Prevent multiple hiding attempts
          
          const hideLoaderWhenLevel3Ready = () => {
            // Check if we're on Level 3 and it's rendered
            const checkLevel3Ready = () => {
              if (loaderHidden) return true; // Already hidden
              
              // Look specifically for the Level 3 heading: "Level 3: Upload Video"
              const h2Headings = document.querySelectorAll('h2');
              console.log(`Checking for Level 3 - found ${h2Headings.length} h2 elements`);
              
              for (let heading of h2Headings) {
                console.log(`Checking heading: "${heading.textContent}"`);
                if (heading.textContent && heading.textContent.trim() === 'Level 3: Upload Video') {
                  console.log('✅ Level 3: Upload Video heading found, hiding loader');
                  onLoadingEnd();
                  loaderHidden = true;
                  return true;
                }
              }
              
              // Fallback: Check for any Level 3 heading
              for (let heading of h2Headings) {
                if (heading.textContent && heading.textContent.includes('Level 3:')) {
                  console.log('✅ Level 3 heading found (fallback), hiding loader');
                  onLoadingEnd();
                  loaderHidden = true;
                  return true;
                }
              }
              
              // Additional check: Look for VideoUploadLevel specific elements
              const videoUploadElements = document.querySelectorAll('input[type="file"][accept*="video"], [class*="video"], [class*="Video"]');
              if (videoUploadElements.length > 0) {
                console.log('✅ Video upload elements found, hiding loader');
                onLoadingEnd();
                loaderHidden = true;
                return true;
              }
              
              console.log('❌ Level 3: Upload Video heading not found yet');
              return false;
            };
            
            // Try immediately
            if (checkLevel3Ready()) return;
            
            // If not ready, check every 500ms for up to 12 seconds
            let attempts = 0;
            const maxAttempts = 24; // 12 seconds total
            
            const interval = setInterval(() => {
              attempts++;
              if (checkLevel3Ready() || attempts >= maxAttempts) {
                clearInterval(interval);
                if (attempts >= maxAttempts && !loaderHidden) {
                  console.log('Level 3 not detected after 12 seconds, hiding loader anyway');
                  onLoadingEnd();
                  loaderHidden = true;
                }
              }
            }, 500);
          };
          
          // Start checking for Level 3 readiness
          hideLoaderWhenLevel3Ready();
          
          // Fallback: Hide loader after 15 seconds regardless (safety net)
          setTimeout(() => {
            if (!loaderHidden) {
              console.log('Fallback: Hiding loader after 15 seconds');
              onLoadingEnd();
              loaderHidden = true;
            } else {
              console.log('Fallback timeout reached but loader already hidden');
            }
          }, 15000);
        }, 1000); // Wait 1 second after toast appears
      }, 2000); // Keep loader visible for 2 seconds to show success message
      
    } catch (error) {
      console.error('=== QR Position Save Error ===');
      console.error('QR position save error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
      
      // Handle specific error cases
      if (error.response?.status === 401) {
        console.error('Authentication failed - token may be invalid or expired');
        toast.error('Authentication failed. Please login again.');
        // Optionally redirect to login
        // window.location.href = '/login';
      } else if (error.response?.status === 400) {
        console.error('❌ Validation error (400):', error.response?.data);
        console.error('  - Message:', error.response?.data?.message);
        console.error('  - Errors:', error.response?.data?.errors);
        console.error('  - Full response:', JSON.stringify(error.response?.data, null, 2));
        const errorMsg = error.response?.data?.message || 'Invalid QR position data';
        toast.error(`Validation Error: ${errorMsg}`);
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to save QR position';
        toast.error(errorMessage);
      }
    } finally {
      // Only hide loader if we're not in the success flow
      // The success flow uses a timeout to hide the loader after Level 3 loads
      console.log('🔍 Finally block - successFlow:', successFlow);
      if (!successFlow) {
        console.log('🔍 Finally block - not success flow, ending loader');
        setIsSaving(false);
        onLoadingEnd();
      } else {
        // In success flow, only hide the saving state, keep the mind generation loader visible
        console.log('🔍 Success flow - keeping mind generation loader visible');
        setIsSaving(false);
        console.log('Success flow: Mind generation loader will be hidden by timeout after Level 3 loads');
      }
    }
  };

  // Loader is now handled by the parent component (LevelBasedUpload)

  // If position already exists and we're not forcing a fresh start, show completion and auto-advance
  if (!forceStartFromLevel1 && (currentPosition || user?.qrPosition)) {
    const position = currentPosition || user.qrPosition;
    
    // Auto-complete the level if not already completed (only once)
    React.useEffect(() => {
      if (!currentPosition && user?.qrPosition) {
        console.log('Auto-completing Level 2 with existing QR position');
        toast.success('📍 QR position found! Level 2 completed automatically.');
        onComplete(user.qrPosition);
      }
    }, [user?.qrPosition?.x, user?.qrPosition?.y, currentPosition, onComplete]); // Include onComplete in dependencies
    
    return (
      <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neon-green/20 mb-6 shadow-glow-green">
            <CheckCircle className="w-10 h-10 text-neon-green" />
          </div>
        
          <h3 className="text-2xl font-bold text-neon-green mb-4">
            🎉 Level 2 Complete!
          </h3>
          
          <div className="bg-green-900/20 border border-neon-green/30 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-center mb-4">
              <QrCode className="w-8 h-8 text-neon-green mr-3" />
              <span className="font-semibold text-neon-green">QR Position Set</span>
            </div>
            <p className="text-slate-200">
              X: {position.x}px, Y: {position.y}px
            </p>
            <p className="text-sm text-slate-300">
              Size: {position.width} × {position.height}px
            </p>
          </div>
          
          {designImageUrl && (
            <div className="max-w-md mx-auto relative">
              <img
                src={designImageUrl}
                alt="Design with QR position"
                className="w-full h-auto rounded-lg shadow-dark-large"
              />
              <div
                className="absolute border-2 border-neon-green bg-neon-green bg-opacity-20"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  width: `${position.width}px`,
                  height: `${position.height}px`
                }}
              >
                <div className="absolute -top-6 left-0 text-xs bg-neon-green text-slate-900 px-2 py-1 rounded">
                  QR Code Area
                </div>
              </div>
            </div>
          )}
          
          <p className="text-slate-300 mt-6">
            ✨ Perfect! Your QR code position is set for the next level.
          </p>
          
          <div className="mt-6">
            <button
              onClick={() => onComplete(position)}
              className="btn-primary px-6 py-3"
            >
              Continue to Next Level →
            </button>
          </div>
        </div>
    );
  }

  if (!designImageUrl) {
    return (
      <div className="text-center py-12">
          <AlertCircle className="mx-auto h-16 w-16 text-slate-400 mb-4" />
          <h3 className="text-xl font-semibold text-slate-100 mb-2">
            Design Required
          </h3>
          <p className="text-slate-300">
            Please complete Level 1 (Upload Design) first to set QR code position.
          </p>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-blue/20 mb-4 shadow-glow-blue">
            <QrCode className="w-8 h-8 text-neon-blue" />
          </div>
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          Position Your QR Code
        </h3>
        <p className="text-slate-300">
          Click and drag the QR code area to position it on your design
        </p>
      </div>

      {/* Interactive Design Preview */}
      <div className="bg-slate-800/50 border-2 border-slate-600/30 rounded-xl p-3 sm:p-6 mb-4 sm:mb-6">
        <div className="relative inline-block">
          <img
            src={designImageUrl}
            alt="Design preview"
            className="max-w-full h-auto rounded-lg shadow-sm touch-manipulation"
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
            onMouseMove={handlePointerMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handlePointerMove}
            onTouchEnd={handleMouseUp}
          />
          <div
            className={`absolute border-2 bg-neon-blue bg-opacity-20 cursor-move transition-all duration-200 touch-manipulation ${
              isDragging || isResizing ? 'border-neon-blue scale-105 shadow-glow-blue' : 'border-neon-blue'
            }`}
            style={{
              left: imageDimensions.width > 0 ? `${Math.max(0, Math.min((qrPosition.x / imageDimensions.width) * 100, 100))}%` : `${qrPosition.x}px`,
              top: imageDimensions.height > 0 ? `${Math.max(0, Math.min((qrPosition.y / imageDimensions.height) * 100, 100))}%` : `${qrPosition.y}px`,
              width: imageDimensions.width > 0 ? `${Math.max(0, Math.min((qrPosition.width / imageDimensions.width) * 100, 100))}%` : `${qrPosition.width}px`,
              height: imageDimensions.height > 0 ? `${Math.max(0, Math.min((qrPosition.height / imageDimensions.height) * 100, 100))}%` : `${qrPosition.height}px`
            }}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
          >
            {/* Resize Handles */}
            {/* Corner handles */}
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-neon-blue border border-white cursor-nw-resize hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('nw'); }} onTouchStart={(e) => { e.stopPropagation(); handleResizeStart('nw'); }}></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-blue border border-white cursor-ne-resize hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('ne'); }} onTouchStart={(e) => { e.stopPropagation(); handleResizeStart('ne'); }}></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-neon-blue border border-white cursor-sw-resize hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('sw'); }} onTouchStart={(e) => { e.stopPropagation(); handleResizeStart('sw'); }}></div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-neon-blue border border-white cursor-se-resize hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('se'); }} onTouchStart={(e) => { e.stopPropagation(); handleResizeStart('se'); }}></div>

            {/* Edge handles */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-3 h-2 bg-neon-blue border border-white cursor-n-resize hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('n'); }} onTouchStart={(e) => { e.stopPropagation(); handleResizeStart('n'); }}></div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-3 h-2 bg-neon-blue border border-white cursor-s-resize hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('s'); }} onTouchStart={(e) => { e.stopPropagation(); handleResizeStart('s'); }}></div>
            <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-3 bg-neon-blue border border-white cursor-w-resize hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('w'); }} onTouchStart={(e) => { e.stopPropagation(); handleResizeStart('w'); }}></div>
            <div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2 w-2 h-3 bg-neon-blue border border-white cursor-e-resize hover:scale-125 transition-transform" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('e'); }} onTouchStart={(e) => { e.stopPropagation(); handleResizeStart('e'); }}></div>

            <div className="absolute -top-6 left-0 text-xs bg-neon-blue text-slate-900 px-2 py-1 rounded whitespace-nowrap">
              QR Code Area
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <QrCode className="w-4 h-4 sm:w-6 sm:h-6 text-neon-blue" />
            </div>
          </div>
        </div>
      </div>

      {/* Current Position Display */}
      <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-slate-200 mb-3 flex items-center">
          <QrCode className="w-4 h-4 mr-2 text-neon-blue" />
          QR Code Position & Size
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-700/30 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">X Position</div>
            <div className="text-sm font-mono text-slate-100">{isNaN(qrPosition.x) ? '0' : Math.round(qrPosition.x)}px</div>
          </div>
          <div className="bg-slate-700/30 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">Y Position</div>
            <div className="text-sm font-mono text-slate-100">{isNaN(qrPosition.y) ? '0' : Math.round(qrPosition.y)}px</div>
          </div>
          <div className="bg-slate-700/30 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">Width</div>
            <div className="text-sm font-mono text-slate-100">{isNaN(qrPosition.width) ? '100' : Math.round(qrPosition.width)}px</div>
          </div>
          <div className="bg-slate-700/30 rounded p-3">
            <div className="text-xs text-slate-400 mb-1">Height</div>
            <div className="text-sm font-mono text-slate-100">{isNaN(qrPosition.height) ? '100' : Math.round(qrPosition.height)}px</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
          <p className="text-sm text-blue-300 flex items-center">
            <MousePointer className="w-4 h-4 mr-2" />
            <strong>Instructions:</strong> Drag the QR code area to reposition it, or use the blue handles at the corners and edges to resize it.
          </p>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
        <h4 className="text-sm font-medium text-slate-300 mb-2">Debug Info:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
          <div>
            <p><strong>Pixel Coordinates:</strong></p>
            <p>Position: X={qrPosition.x}, Y={qrPosition.y}</p>
            <p>Size: W={qrPosition.width}, H={qrPosition.height}</p>
            <p>Max: X={Math.max(0, imageDimensions.width - qrPosition.width)}, Y={Math.max(0, imageDimensions.height - qrPosition.height)}</p>
          </div>
          <div>
            <p><strong>Percentage Coordinates:</strong></p>
            <p>Position: X={imageDimensions.width > 0 ? ((qrPosition.x / imageDimensions.width) * 100).toFixed(1) : 0}%, Y={imageDimensions.height > 0 ? ((qrPosition.y / imageDimensions.height) * 100).toFixed(1) : 0}%</p>
            <p>Size: W={imageDimensions.width > 0 ? ((qrPosition.width / imageDimensions.width) * 100).toFixed(1) : 0}%, H={imageDimensions.height > 0 ? ((qrPosition.height / imageDimensions.height) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400">
          <p>Image Dimensions: {imageDimensions.width} × {imageDimensions.height}</p>
          <p>Is Dragging: {isDragging ? 'Yes' : 'No'}</p>
          <p>Design URL: {designImageUrl ? 'Available' : 'Not Available'}</p>
        </div>
      </div>

      {/* Save Button */}
      <div className="text-center">
        <button
          onClick={saveQRPosition}
          disabled={isSaving}
          className="btn-primary inline-flex items-center px-6 sm:px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation text-sm sm:text-base"
        >
          <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          {isSaving ? 'Saving...' : 'Save QR Position'}
        </button>
        
        {/* Debug Test Buttons */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 space-x-2">
            <button
              onClick={() => {
                console.log('=== Manual Level Complete Test ===');
                console.log('Calling onComplete directly with:', qrPosition);
                onComplete(qrPosition);
              }}
              className="px-4 py-2 bg-neon-yellow text-slate-900 rounded-lg hover:bg-neon-yellow/80"
            >
              🧪 Test Level Complete
            </button>
            <button
              onClick={() => {
                console.log('=== Force Advance Test ===');
                if (window.debugLevels) {
                  window.debugLevels.forceAdvance();
                } else {
                  console.log('Debug functions not available');
                }
              }}
              className="px-4 py-2 bg-neon-green text-slate-900 rounded-lg hover:bg-neon-green/80"
            >
              🚀 Force Advance
            </button>
            <button
              onClick={() => {
                console.log('=== Current State Debug ===');
                console.log('Current level:', window.debugLevels?.getCurrentLevel());
                console.log('Completed levels:', window.debugLevels?.getCompletedLevels());
                console.log('Level data:', window.debugLevels?.getLevelData());
                console.log('Level 2 completed:', window.debugLevels?.isLevelCompleted(2));
              }}
              className="px-4 py-2 bg-neon-blue text-slate-900 rounded-lg hover:bg-neon-blue/80"
            >
              🔍 Debug State
            </button>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-6 sm:mt-8 bg-blue-900/20 border border-neon-blue/30 rounded-lg p-3 sm:p-4">
        <div className="flex items-start">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neon-blue mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-neon-blue mb-1 text-sm sm:text-base">💡 Pro Tips</h4>
            <ul className="text-xs sm:text-sm text-slate-300 space-y-1">
              <li>• Tap and drag the blue area to position your QR code</li>
              <li>• Use the input fields for precise positioning</li>
              <li>• Make sure the QR code area doesn't overlap important content</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRPositionLevel;
