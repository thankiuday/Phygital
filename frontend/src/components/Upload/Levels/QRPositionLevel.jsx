import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { uploadAPI, qrAPI } from '../../../utils/api';
import { generateQRSticker } from '../../../utils/qrStickerGenerator';
import { QrCode, CheckCircle, AlertCircle, MapPin, MousePointer } from 'lucide-react';
import MindFileGenerationLoader from '../../UI/MindFileGenerationLoader';
import FrameCustomizer from '../../QR/FrameCustomizer';
import toast from 'react-hot-toast';

// Minimum dimensions for scannable QR code
// QR code itself needs ~80-100px minimum, plus border (8px) + padding (32px) = ~120px sticker width minimum
// Height includes "SCAN ME" text (~40px), so minimum height ~160px
const MIN_STICKER_WIDTH = 120;
const MIN_STICKER_HEIGHT = 160;

// Wrapper component to handle async QR data URL conversion
const FrameCustomizerWrapper = ({ qrImageUrl, frameConfig, onFrameConfigChange }) => {
  const [qrDataUrl, setQrDataUrl] = React.useState(null);

  React.useEffect(() => {
    const convertBlobToDataUrl = async () => {
      if (qrImageUrl.startsWith('blob:')) {
        try {
          const response = await fetch(qrImageUrl);
          const blob = await response.blob();
          const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          setQrDataUrl(dataUrl);
        } catch (error) {
          console.error('Failed to convert blob URL:', error);
        }
      } else {
        setQrDataUrl(qrImageUrl);
      }
    };
    convertBlobToDataUrl();
  }, [qrImageUrl]);

  if (!qrDataUrl) {
    return (
      <div className="mb-6 bg-slate-800/50 border border-slate-600 rounded-xl p-4 sm:p-6">
        <div className="text-center text-slate-400">Loading frame customizer...</div>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-slate-800/50 border border-slate-600 rounded-xl p-4 sm:p-6">
      <FrameCustomizer
        qrCodeDataUrl={qrDataUrl}
        onFrameConfigChange={onFrameConfigChange}
        initialConfig={frameConfig}
      />
    </div>
  );
};

const QRPositionLevel = ({ onComplete, currentPosition, designUrl, forceStartFromLevel1 = false, upgradeMode = false, onLoadingStart, onLoadingEnd }) => {
  const { user, updateUser } = useAuth();
  const [qrPosition, setQrPosition] = useState({
    x: currentPosition?.x || user?.qrPosition?.x || 100,
    y: currentPosition?.y || user?.qrPosition?.y || 100,
    width: currentPosition?.width || user?.qrPosition?.width || MIN_STICKER_WIDTH,
    height: currentPosition?.height || user?.qrPosition?.height || MIN_STICKER_HEIGHT
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [captureCompositeFunction, setCaptureCompositeFunction] = useState(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [stickerImageUrl, setStickerImageUrl] = useState(null);
  const [stickerAspectRatio, setStickerAspectRatio] = useState(1); // Default to 1:1, will be updated when sticker is generated
  const [frameConfig, setFrameConfig] = useState(() => {
    // Load frame config from current project or user defaults
    const project = user?.projects?.find(p => p.id === user?.currentProject);
    const projectConfig = project?.qrFrameConfig;
    
    // If project has config, normalize color (convert black to white for default)
    if (projectConfig) {
      return {
        ...projectConfig,
        textStyle: {
          ...(projectConfig.textStyle || {}),
          // Normalize: if color is black, missing, or undefined, use white as default
          color: (projectConfig.textStyle?.color && projectConfig.textStyle.color !== '#000000') 
            ? projectConfig.textStyle.color 
            : '#FFFFFF',
          // Ensure other textStyle properties have defaults
          bold: projectConfig.textStyle?.bold !== false,
          italic: projectConfig.textStyle?.italic || false,
          gradient: projectConfig.textStyle?.gradient || null
        }
      };
    }
    
    // Default config with white color
    return {
      frameType: 1,
      textContent: 'SCAN ME',
      textStyle: {
        bold: true,
        italic: false,
        color: '#FFFFFF',
        gradient: null
      },
      transparentBackground: false
    };
  });
  const [showFrameCustomizer, setShowFrameCustomizer] = useState(false);
  
  const imageRef = useRef(null);
  const qrRef = useRef(null);
  const scrollPositionRef = useRef({ x: 0, y: 0 });


  const designImageUrl = designUrl || user?.uploadedFiles?.design?.url;
  

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

  // Generate sticker design from QR code when available
  useEffect(() => {
    const generateSticker = async () => {
      if (!qrImageUrl) {
        setStickerImageUrl(null);
        setStickerAspectRatio(1);
        return;
      }

      try {
        // Calculate sticker aspect ratio based on default dimensions
        // Sticker dimensions: width = qrSize + padding*2 + borderWidth*2, height = qrSize + padding*2 + borderWidth*2 + textHeight
        const defaultQrSize = 200; // Reference size for aspect ratio calculation
        const padding = 16;
        const borderWidth = 4;
        const textHeight = 40;
        const stickerWidth = defaultQrSize + padding * 2 + borderWidth * 2;
        const stickerHeight = defaultQrSize + padding * 2 + borderWidth * 2 + textHeight;
        const aspectRatio = stickerHeight / stickerWidth;
        setStickerAspectRatio(aspectRatio);

        // Convert blob URL to data URL if needed
        let qrDataUrl = qrImageUrl;
        if (qrImageUrl.startsWith('blob:')) {
          const response = await fetch(qrImageUrl);
          const blob = await response.blob();
          qrDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        }

        // Generate sticker with a reasonable QR size based on current position width
        const qrSize = Math.max(100, Math.round(qrPosition.width * 0.8)); // Use 80% of position width as QR size
        // Ensure text color is white (not black) for visibility
        const normalizedTextStyle = {
          ...frameConfig.textStyle,
          color: (frameConfig.textStyle?.color && 
                  frameConfig.textStyle.color !== '#000000' && 
                  frameConfig.textStyle.color !== '#000' &&
                  frameConfig.textStyle.color.trim() !== '') 
            ? frameConfig.textStyle.color 
            : '#FFFFFF'
        };
        
        const stickerDataUrl = await generateQRSticker(qrDataUrl, {
          frameType: frameConfig.frameType,
          textContent: frameConfig.textContent,
          textStyle: normalizedTextStyle,
          transparentBackground: frameConfig.transparentBackground || false,
          qrSize: qrSize,
          borderWidth: 4,
          padding: 16
        });
        setStickerImageUrl(stickerDataUrl);
        console.log('[Level QR] Generated sticker design for positioning');
      } catch (error) {
        console.error('[Level QR] Failed to generate sticker:', error);
        setStickerImageUrl(null);
        setStickerAspectRatio(1);
      }
    };

    generateSticker();
  }, [qrImageUrl, qrPosition.width, frameConfig]);

  // Capture composite image (design + QR sticker with custom frame)
  const captureCompositeImage = React.useCallback(async () => {
    try {
      const imageElement = document.querySelector('img[alt="Design preview"]');
      if (!imageElement) {
        throw new Error('Image not loaded');
      }

      if (!qrImageUrl) {
        throw new Error('QR code not loaded');
      }

      // Load design image with CORS
      const designImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load design image'));
        img.src = imageElement.src;
      });

      // Convert QR blob URL to data URL if needed
      let qrDataUrl = qrImageUrl;
      if (qrImageUrl.startsWith('blob:')) {
        const response = await fetch(qrImageUrl);
        const blob = await response.blob();
        qrDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }

      // Calculate QR sticker size based on position dimensions
      // The sticker should fit within qrPosition.width x qrPosition.height
      // We'll use the width as the base and maintain aspect ratio
      const qrSizeForSticker = Math.max(100, Math.round(qrPosition.width * 0.8));
      
      console.log('[Level QR] Generating QR sticker with frame config:', frameConfig);
      console.log('[Level QR] QR sticker size:', qrSizeForSticker);
      console.log('[Level QR] QR position:', qrPosition);

      // Ensure text color is white (not black) for visibility on dark backgrounds
      const normalizedTextStyle = {
        ...frameConfig.textStyle,
        color: (frameConfig.textStyle?.color && 
                frameConfig.textStyle.color !== '#000000' && 
                frameConfig.textStyle.color !== '#000' &&
                frameConfig.textStyle.color.trim() !== '') 
          ? frameConfig.textStyle.color 
          : '#FFFFFF'
      };
      
      // Generate QR sticker with custom frame
      const stickerDataUrl = await generateQRSticker(qrDataUrl, {
        frameType: frameConfig.frameType,
        textContent: frameConfig.textContent,
        textStyle: normalizedTextStyle,
        transparentBackground: frameConfig.transparentBackground || false,
        qrSize: qrSizeForSticker,
        borderWidth: 4,
        padding: 16
      });

      // Load the generated sticker
      const stickerImage = await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load QR sticker'));
        img.src = stickerDataUrl;
      });

      // Create canvas for composite image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas dimensions to match the design image
      canvas.width = designImage.naturalWidth || designImage.width;
      canvas.height = designImage.naturalHeight || designImage.height;
      
      console.log('[Level QR] Composite canvas dimensions:', {
        width: canvas.width,
        height: canvas.height
      });
      
      // Draw the design image
      ctx.drawImage(designImage, 0, 0);
      
      // Calculate sticker position and size on the canvas
      // The sticker should be drawn at qrPosition coordinates
      const stickerX = qrPosition.x;
      const stickerY = qrPosition.y;
      const stickerWidth = qrPosition.width;
      const stickerHeight = qrPosition.height;
      
      // Draw the QR sticker at the correct position
      ctx.drawImage(stickerImage, stickerX, stickerY, stickerWidth, stickerHeight);
      
      // Convert to base64
      const compositeDataUrl = canvas.toDataURL('image/png', 1.0);
      
      console.log('[Level QR] Composite image generated successfully');
      return compositeDataUrl;
      
    } catch (error) {
      console.error('[Level QR] Failed to capture composite image:', error);
      throw error;
    }
  }, [qrPosition, qrImageUrl, frameConfig]);

  // Set the capture function when component mounts
  React.useEffect(() => {
    setCaptureCompositeFunction(() => captureCompositeImage);
  }, [captureCompositeImage]);
  
  // Improved handleImageLoad
  const handleImageLoad = useCallback((e) => {
    const img = e.target;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    // Constrain initial position
    setQrPosition(prev => constrainPositionToImage(prev));
  }, []);
  
  // Function to constrain position to image boundaries with minimum scannable size
  const constrainPositionToImage = (position, imgDims = imageDimensions) => {
    if (imgDims.width === 0 || imgDims.height === 0) return position;
    
    // Ensure minimum scannable dimensions
    const constrainedWidth = Math.max(MIN_STICKER_WIDTH, Math.min(position.width, imgDims.width));
    const constrainedHeight = Math.max(MIN_STICKER_HEIGHT, Math.min(position.height, imgDims.height));
    
    const maxX = Math.max(0, imgDims.width - constrainedWidth);
    const maxY = Math.max(0, imgDims.height - constrainedHeight);
    
    return {
      x: Math.max(0, Math.min(position.x, maxX)),
      y: Math.max(0, Math.min(position.y, maxY)),
      width: constrainedWidth,
      height: constrainedHeight
    };
  };

  // Improved screenToImageCoords using pageX/pageY for reliable coordinates across scroll
  // pageX/pageY include scroll offset, getBoundingClientRect() is relative to viewport
  const screenToImageCoords = useCallback((pageX, pageY) => {
    const img = imageRef.current;
    if (!img || imageDimensions.width === 0) return { x: 0, y: 0 };

    const rect = img.getBoundingClientRect();
    const scaleX = imageDimensions.width / rect.width;
    const scaleY = imageDimensions.height / rect.height;
    // Convert pageX/pageY (includes scroll) to viewport coordinates, then to image coordinates
    // Ensure we account for scroll position correctly for both X and Y
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const clientX = pageX - scrollX;
    const clientY = pageY - scrollY;
    const imageX = (clientX - rect.left) * scaleX;
    const imageY = (clientY - rect.top) * scaleY;

    return {
      x: Math.max(0, Math.min(imageX, imageDimensions.width)),
      y: Math.max(0, Math.min(imageY, imageDimensions.height))
    };
  }, [imageDimensions]);

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
    }
  }, [currentPosition, user?.qrPosition, designUrl, designImageUrl, qrPosition, imageDimensions]);

  // Add global mouse listeners to handle mouse events outside the image
  React.useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging || isResizing) {
        console.log('Global mouse up - stopping drag/resize');

        // Restore scroll behavior and touch action for both body and html
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.touchAction = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.position = '';

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

    // Old touch/mouse event listeners removed - using pointer events instead
    // This useEffect is kept for compatibility but doesn't add listeners anymore
  }, [isDragging, isResizing, dragStart, resizeHandle, qrPosition.width, qrPosition.height, imageDimensions]);

  // Handle resize start for pointer events
  const handleResizeStart = useCallback((e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    
    const pointerId = e.pointerId;
    const pageX = e.pageX;
    const pageY = e.pageY;
    
    // Store current scroll position
    scrollPositionRef.current = {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset
    };

    // Prevent scroll behavior during resize
    document.body.style.overscrollBehavior = 'none';
    // Don't set overflow: hidden or touchAction: 'none' as it interferes with vertical drag on mobile

    setIsResizing(true);
    setResizeHandle(handle);
    
    const imageCoords = screenToImageCoords(pageX, pageY);
    setDragStart({
      pointerId,
      startX: pageX,
      startY: pageY,
      imageStartX: imageCoords.x,
      imageStartY: imageCoords.y,
      initialX: qrPosition.x,
      initialY: qrPosition.y,
      initialWidth: qrPosition.width,
      initialHeight: qrPosition.height
    });
    
    // Capture pointer for consistent tracking
    try {
      if (qrRef.current && qrRef.current.setPointerCapture) {
        qrRef.current.setPointerCapture(pointerId);
      }
    } catch (err) {
      console.warn('Pointer capture failed:', err);
    }
  }, [qrPosition, screenToImageCoords]);

  // Detect resize handle (improved for touch: larger hit area)
  const getResizeHandle = useCallback((clientX, clientY, qrScreenRect) => {
    const handleSize = window.innerWidth < 768 ? 20 : 8; // Larger on mobile
    const relX = clientX - qrScreenRect.left;
    const relY = clientY - qrScreenRect.top;

    // Corner checks
    if (relX <= handleSize && relY <= handleSize) return 'nw';
    if (relX >= qrScreenRect.width - handleSize && relY <= handleSize) return 'ne';
    if (relX <= handleSize && relY >= qrScreenRect.height - handleSize) return 'sw';
    if (relX >= qrScreenRect.width - handleSize && relY >= qrScreenRect.height - handleSize) return 'se';

    // Edge checks (middle of edges)
    const edgeThreshold = handleSize / 2;
    if (relY <= handleSize && relX > handleSize && relX < qrScreenRect.width - handleSize) return 'n';
    if (relY >= qrScreenRect.height - handleSize && relX > handleSize && relX < qrScreenRect.width - handleSize) return 's';
    if (relX <= handleSize && relY > handleSize && relY < qrScreenRect.height - handleSize) return 'w';
    if (relX >= qrScreenRect.width - handleSize && relY > handleSize && relY < qrScreenRect.height - handleSize) return 'e';

    return null;
  }, []);

  // Unified pointer down handler
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const pointerId = e.pointerId;
    const pageX = e.pageX;
    const pageY = e.pageY;
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Store current scroll position for ALL pointer types (mouse and touch)
    scrollPositionRef.current = {
      x: window.scrollX || window.pageXOffset,
      y: window.scrollY || window.pageYOffset
    };

    // Prevent scroll behavior during drag for ALL pointer types using CSS
    // Use 'overscroll-behavior' instead of 'overflow: hidden' to allow touch events
    document.body.style.overscrollBehavior = 'none';
    // Don't set overflow: hidden as it can interfere with touch events on mobile
    // Instead, use touchAction to prevent scrolling while allowing our drag
    
    // Additional touch-specific handling
    if (e.pointerType === 'touch') {
      // Don't set touchAction: 'none' on body as it can interfere with vertical drag
      // Instead, rely on preventDefault in the move handler and touchAction on specific elements
      // This allows vertical drag to work properly on mobile
    }

    const img = imageRef.current;
    if (!img) return;

    const imgRect = img.getBoundingClientRect();
    const qrScreenRect = {
      left: imgRect.left + (qrPosition.x / imageDimensions.width) * imgRect.width,
      top: imgRect.top + (qrPosition.y / imageDimensions.height) * imgRect.height,
      width: (qrPosition.width / imageDimensions.width) * imgRect.width,
      height: (qrPosition.height / imageDimensions.height) * imgRect.height
    };

    const handle = getResizeHandle(clientX, clientY, qrScreenRect);

    if (handle) {
      // Resize start - use pageX/pageY for consistent coordinates
      setIsResizing(true);
      setResizeHandle(handle);
      const imageCoords = screenToImageCoords(pageX, pageY);
      setDragStart({
        pointerId,
        startX: pageX,
        startY: pageY,
        imageStartX: imageCoords.x,
        imageStartY: imageCoords.y,
        initialX: qrPosition.x,
        initialY: qrPosition.y,
        initialWidth: qrPosition.width,
        initialHeight: qrPosition.height
      });
      qrRef.current?.setPointerCapture(pointerId);
    } else {
      // Drag start - check if touch is within QR bounds (with tolerance for mobile)
      // Use a larger tolerance area on mobile for easier dragging
      const tolerance = e.pointerType === 'touch' ? 10 : 0;
      const isWithinBounds = 
        clientX >= qrScreenRect.left - tolerance &&
        clientX <= qrScreenRect.left + qrScreenRect.width + tolerance &&
        clientY >= qrScreenRect.top - tolerance &&
        clientY <= qrScreenRect.top + qrScreenRect.height + tolerance;
      
      if (isWithinBounds) {
      // Drag start - use pageX/pageY for consistent coordinates
      setIsDragging(true);
      const imageCoords = screenToImageCoords(pageX, pageY);
      setDragStart({
        pointerId,
        startX: pageX,
        startY: pageY,
        imageStartX: imageCoords.x,
        imageStartY: imageCoords.y,
        offsetX: imageCoords.x - qrPosition.x,
        offsetY: imageCoords.y - qrPosition.y
      });
      // Capture pointer for consistent tracking (works on mobile too)
      try {
        if (qrRef.current && qrRef.current.setPointerCapture) {
          qrRef.current.setPointerCapture(pointerId);
        }
      } catch (err) {
        console.warn('Pointer capture failed:', err);
      }
      }
    }
  }, [qrPosition, imageDimensions, getResizeHandle, screenToImageCoords]);

  // Global pointer move handler
  const handleGlobalPointerMove = useCallback((e) => {
    if (!isDragging && !isResizing) return;
    
    // Prevent default to stop scrolling, but allow our drag to work
    // This is crucial for vertical drag on mobile
    e.preventDefault();
    e.stopPropagation();

    const drag = dragStart;
    if (!drag || drag.pointerId !== e.pointerId) return;
    
    // Ensure pointer is still captured (important for mobile)
    try {
      if (qrRef.current && qrRef.current.hasPointerCapture && !qrRef.current.hasPointerCapture(e.pointerId)) {
        qrRef.current.setPointerCapture(e.pointerId);
      }
    } catch (err) {
      // Ignore capture errors
    }

    // Use pageX/pageY for consistent coordinates that account for scroll
    // On mobile, ensure we're getting the correct coordinates for both horizontal and vertical movement
    const pageX = e.pageX !== undefined ? e.pageX : (e.clientX + (window.scrollX || window.pageXOffset));
    const pageY = e.pageY !== undefined ? e.pageY : (e.clientY + (window.scrollY || window.pageYOffset));
    
    const imageCoords = screenToImageCoords(pageX, pageY);

    if (isResizing) {
      // Calculate deltas in image coordinate space for accurate resize
      // Use the difference between current and start image coordinates
      const currentImageX = imageCoords.x;
      const currentImageY = imageCoords.y;
      const deltaX = currentImageX - drag.imageStartX;
      const deltaY = currentImageY - drag.imageStartY;

      let newX = drag.initialX;
      let newY = drag.initialY;
      let newWidth = drag.initialWidth;
      let newHeight = drag.initialHeight;

      // Resize logic based on handle - maintain sticker aspect ratio
      let baseSizeChange = 0;
      
      switch (resizeHandle) {
        case 'nw':
          baseSizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
          newWidth = Math.max(MIN_STICKER_WIDTH, drag.initialWidth + baseSizeChange);
          newHeight = newWidth * stickerAspectRatio;
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT;
            newWidth = newHeight / stickerAspectRatio;
          }
          newX = drag.initialX + (drag.initialWidth - newWidth);
          newY = drag.initialY + (drag.initialHeight - newHeight);
          break;
        case 'ne':
          baseSizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : -deltaY;
          newWidth = Math.max(MIN_STICKER_WIDTH, drag.initialWidth + baseSizeChange);
          newHeight = newWidth * stickerAspectRatio;
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT;
            newWidth = newHeight / stickerAspectRatio;
          }
          newY = drag.initialY + (drag.initialHeight - newHeight);
          break;
        case 'sw':
          baseSizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? -deltaX : deltaY;
          newWidth = Math.max(MIN_STICKER_WIDTH, drag.initialWidth + baseSizeChange);
          newHeight = newWidth * stickerAspectRatio;
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT;
            newWidth = newHeight / stickerAspectRatio;
          }
          newX = drag.initialX + (drag.initialWidth - newWidth);
          break;
        case 'se':
          baseSizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
          newWidth = Math.max(MIN_STICKER_WIDTH, drag.initialWidth + baseSizeChange);
          newHeight = newWidth * stickerAspectRatio;
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT;
            newWidth = newHeight / stickerAspectRatio;
          }
          break;
        case 'n':
          // Use height change, then calculate width from aspect ratio
          newHeight = Math.max(MIN_STICKER_HEIGHT, drag.initialHeight - deltaY);
          newWidth = newHeight / stickerAspectRatio;
          // Ensure width meets minimum
          if (newWidth < MIN_STICKER_WIDTH) {
            newWidth = MIN_STICKER_WIDTH;
            newHeight = newWidth * stickerAspectRatio;
          }
          newY = drag.initialY + (drag.initialHeight - newHeight);
          newX = drag.initialX + (drag.initialWidth - newWidth);
          break;
        case 's':
          // Use height change, then calculate width from aspect ratio
          newHeight = Math.max(MIN_STICKER_HEIGHT, drag.initialHeight + deltaY);
          newWidth = newHeight / stickerAspectRatio;
          // Ensure width meets minimum
          if (newWidth < MIN_STICKER_WIDTH) {
            newWidth = MIN_STICKER_WIDTH;
            newHeight = newWidth * stickerAspectRatio;
          }
          newX = drag.initialX + (drag.initialWidth - newWidth);
          break;
        case 'w':
          newWidth = Math.max(MIN_STICKER_WIDTH, drag.initialWidth - deltaX);
          newHeight = newWidth * stickerAspectRatio;
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT;
            newWidth = newHeight / stickerAspectRatio;
          }
          newX = drag.initialX + (drag.initialWidth - newWidth);
          newY = drag.initialY + (drag.initialHeight - newHeight);
          break;
        case 'e':
          newWidth = Math.max(MIN_STICKER_WIDTH, drag.initialWidth + deltaX);
          newHeight = newWidth * stickerAspectRatio;
          // Ensure height meets minimum
          if (newHeight < MIN_STICKER_HEIGHT) {
            newHeight = MIN_STICKER_HEIGHT;
            newWidth = newHeight / stickerAspectRatio;
          }
          newY = drag.initialY + (drag.initialHeight - newHeight);
          break;
        default:
          return;
      }

      // Constrain with minimums
      newWidth = Math.max(MIN_STICKER_WIDTH, Math.min(newWidth, imageDimensions.width - newX));
      newHeight = newWidth * stickerAspectRatio; // Maintain sticker aspect ratio
      // Ensure height meets minimum
      if (newHeight < MIN_STICKER_HEIGHT) {
        newHeight = MIN_STICKER_HEIGHT;
        newWidth = newHeight / stickerAspectRatio;
      }
      newHeight = Math.max(MIN_STICKER_HEIGHT, Math.min(newHeight, imageDimensions.height - newY));
      newWidth = newHeight / stickerAspectRatio; // Re-sync width if height was constrained
      // Ensure width still meets minimum after re-sync
      if (newWidth < MIN_STICKER_WIDTH) {
        newWidth = MIN_STICKER_WIDTH;
        newHeight = newWidth * stickerAspectRatio;
      }
      newX = Math.max(0, Math.min(newX, imageDimensions.width - newWidth));
      newY = Math.max(0, Math.min(newY, imageDimensions.height - newHeight));

      // Final check: ensure we don't exceed bounds, but maintain minimums
      if (newX + newWidth > imageDimensions.width) {
        newWidth = Math.max(MIN_STICKER_WIDTH, imageDimensions.width - newX);
        newHeight = newWidth * stickerAspectRatio;
        if (newHeight < MIN_STICKER_HEIGHT) {
          newHeight = MIN_STICKER_HEIGHT;
          newWidth = newHeight / stickerAspectRatio;
        }
      }
      if (newY + newHeight > imageDimensions.height) {
        newHeight = Math.max(MIN_STICKER_HEIGHT, imageDimensions.height - newY);
        newWidth = newHeight / stickerAspectRatio;
        if (newWidth < MIN_STICKER_WIDTH) {
          newWidth = MIN_STICKER_WIDTH;
          newHeight = newWidth * stickerAspectRatio;
        }
        // Re-adjust X position if needed
        if (resizeHandle === 'n' || resizeHandle === 'w' || resizeHandle === 'nw' || resizeHandle === 'sw') {
          newX = drag.initialX + (drag.initialWidth - newWidth);
        }
      }
      
      // Final check: ensure minimums are met
      newWidth = Math.max(MIN_STICKER_WIDTH, newWidth);
      newHeight = Math.max(MIN_STICKER_HEIGHT, newHeight);

      setQrPosition({ x: newX, y: newY, width: newWidth, height: newHeight });
    } else if (isDragging) {
      const newX = Math.max(0, Math.min(imageCoords.x - drag.offsetX, imageDimensions.width - qrPosition.width));
      const newY = Math.max(0, Math.min(imageCoords.y - drag.offsetY, imageDimensions.height - qrPosition.height));
      setQrPosition(prev => ({ ...prev, x: newX, y: newY }));
    }
  }, [isDragging, isResizing, dragStart, resizeHandle, qrPosition.width, qrPosition.height, imageDimensions, stickerAspectRatio, screenToImageCoords]);

  // Global pointer up handler
  const handleGlobalPointerUp = useCallback((e) => {
    if (dragStart && e.pointerId !== dragStart.pointerId) return;

    // Release pointer capture
    try {
      if (qrRef.current && qrRef.current.releasePointerCapture) {
        qrRef.current.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // Ignore errors if pointer was already released
    }

    // Restore body scroll and touch behavior
    document.body.style.overscrollBehavior = '';
    document.body.style.touchAction = '';
    document.documentElement.style.touchAction = '';

    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setDragStart(null);
  }, [dragStart]);

  // Prevent scroll during state updates when dragging/resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      // Prevent scroll using CSS (already set in handlePointerDown)
      // No need for JavaScript scroll locking which causes jumps
      return () => {
        // Cleanup handled in handleGlobalPointerUp
      };
    }
  }, [isDragging, isResizing]);

  // Add/remove global listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      // Use pointer events for both mouse and touch (works on mobile)
      document.addEventListener('pointermove', handleGlobalPointerMove, { passive: false });
      document.addEventListener('pointerup', handleGlobalPointerUp, { passive: false });
      document.addEventListener('pointercancel', handleGlobalPointerUp, { passive: false });
      
      return () => {
        document.removeEventListener('pointermove', handleGlobalPointerMove);
        document.removeEventListener('pointerup', handleGlobalPointerUp);
        document.removeEventListener('pointercancel', handleGlobalPointerUp);
      };
    }
  }, [isDragging, isResizing, handleGlobalPointerMove, handleGlobalPointerUp]);

  // Prevent unwanted touch behaviors on mobile - but allow our own events
  // Removed conflicting touch listeners that were interfering with vertical drag
  // Pointer events handle everything now without conflicts

  // Save QR position
  const saveQRPosition = async () => {
    let successFlow = false; // Track if we're in the success flow
    
    try {
      // Show loader immediately when button is clicked
      setIsSaving(true);
      onLoadingStart('Saving your design...');
      
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
      
      // Validate minimum size requirements for scannability
      if (qrPosition.width < MIN_STICKER_WIDTH || qrPosition.height < MIN_STICKER_HEIGHT) {
        console.error('QR position too small:', qrPosition);
        toast.error(
          `Scanner size is too small! Minimum size required: ${MIN_STICKER_WIDTH}×${MIN_STICKER_HEIGHT}px for reliable scanning. Please resize the scanner to make it scannable.`,
          { duration: 6000 }
        );
        setIsSaving(false);
        onLoadingEnd();
        return;
      }
      
      
      onLoadingStart('Generating composite design with custom frame...');
      
      // Generate composite image with custom frame on frontend
      let compositeImageDataUrl = null;
      try {
        console.log('[Level QR] Generating composite image with custom frame...');
        compositeImageDataUrl = await captureCompositeImage();
        console.log('[Level QR] Composite image generated successfully');
        
        // Upload composite image to Cloudinary
        onLoadingStart('Uploading composite design...');
        await uploadAPI.saveCompositeDesign(compositeImageDataUrl, qrPosition);
        console.log('[Level QR] Composite image uploaded successfully');
      } catch (compositeError) {
        console.error('[Level QR] Failed to generate/upload composite image:', compositeError);
        // Continue with QR position save even if composite fails
        toast.error('Failed to generate composite image, but QR position will still be saved');
      }
      
      onLoadingStart('Preparing your AR experience...');
      
      // Save QR position and frame config
      const response = await uploadAPI.setQRPosition({
        ...qrPosition,
        qrFrameConfig: frameConfig
      });
      
      onLoadingStart('Verifying your AR experience...');
      
      // Update user context with the response data
      if (response.data?.data?.user) {
        console.log('Updating user with response data');
        updateUser(response.data.data.user);
      } else {
        console.log('Using fallback: updating qrPosition field only');
        updateUser({ qrPosition, qrFrameConfig: frameConfig });
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
          onLoadingStart('✅ Your AR experience is ready!');
          
          // Mark that we're in the success flow since we have the .mind file
          successFlow = true;
        } else {
          // Server didn't generate .mind file - try client-side generation
          // Show specialized loader for .mind generation
          console.log('🔍 Signaling parent to show loader for .mind generation');
          onLoadingStart('Your Augmented Reality is getting ready...');
          toast.loading('✨ Your Augmented Reality is getting ready...', { id: 'mind-gen' });
          console.log('🔍 Loader should now be visible with message: Your Augmented Reality is getting ready...');
          
          // Add a small delay to ensure state updates are processed
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Mark that we're in the success flow as soon as we start .mind generation
          // This ensures the loader stays visible until Level 3 is ready
          successFlow = true;
          
          // Check for composite URL (new response structure first, then fallback)
          const compositeUrl = response.data?.data?.compositeDesign?.url || 
                              response.data?.data?.user?.uploadedFiles?.compositeDesign?.url;
          
          
          if (!compositeUrl) {
            onLoadingEnd();
            throw new Error('No composite image available for .mind generation. Please try uploading your design again.');
          }
          
          onLoadingStart('Preparing AR tools...');
          const mindarModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image.prod.js');
          const { Compiler } = mindarModule;
          
          onLoadingStart('Loading your design...');
          const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = 'anonymous';
            let timeoutId;
            
            i.onload = () => {
              clearTimeout(timeoutId); // Clear the timeout since image loaded successfully
              resolve(i);
            };
            i.onerror = (error) => {
              clearTimeout(timeoutId); // Clear the timeout on error
              reject(new Error(`Failed to load composite image: ${error}`));
            };
            i.src = compositeUrl;
            timeoutId = setTimeout(() => {
              reject(new Error('Image load timeout after 30 seconds'));
            }, 30000);
          });
          
          onLoadingStart('Processing your AR experience...');
          const compiler = new Compiler();
          console.log('[Level QR] Starting image compilation...');
          await compiler.compileImageTargets([img], (progress) => {
            // Normalize progress to 0-1 range in case compiler returns values > 1
            const normalizedProgress = Math.min(Math.max(progress, 0), 1);
            const percentage = (normalizedProgress * 100).toFixed(0);
            console.log(`[Level QR] .mind compilation progress: ${percentage}% (raw: ${progress})`);
            onLoadingStart(`Preparing your AR experience: ${percentage}%`);
          });
          console.log('[Level QR] Image compilation completed successfully');
          
          onLoadingStart('Finalizing your AR experience...');
          console.log('[Level QR] Exporting compiled data...');
          const buf = await compiler.exportData();
          console.log('[Level QR] Data export completed successfully');
          
          onLoadingStart('Preparing final files...');
          // Convert ArrayBuffer -> data URL (base64) safely via Blob + FileReader
          const blob = new Blob([buf], { type: 'application/octet-stream' });
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(blob);
          });
          
          onLoadingStart('Uploading your AR experience...');
          const saveRes = await uploadAPI.saveMindTarget(dataUrl);
          mindTargetUrl = saveRes.data?.data?.mindTarget?.url;
          
          console.log('[Level QR] .mind generated and saved via /upload/save-mind-target', saveRes.data);
          toast.success('✅ Your AR experience is ready!', { id: 'mind-gen' });
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
          onLoadingStart('⏱️ This is taking a bit longer...');
          
          // Show user-friendly timeout message
          toast.error('⏱️ This is taking a bit longer than expected', { id: 'mind-gen' });
          toast.error(
            'Your AR experience is being prepared. Please wait a bit longer or try again.\n\nIf this continues, please contact support.',
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
          onLoadingStart('❌ Something went wrong...');
          
          // Show user-friendly error with action
          const errorMessage = clientMindErr?.message || clientMindErr?.toString() || 'Unknown error';
          toast.error('❌ Something went wrong while preparing your AR experience', { id: 'mind-gen' });
          toast.error(
            `Cannot proceed to the next step: ${errorMessage}\n\nPlease try saving QR position again or contact support.`,
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
        toast.error('⚠️ Your AR experience could not be prepared. Cannot proceed to the next step.');
        toast.error('Please try clicking "Save QR Position" again.', { duration: 6000 });
        setIsSaving(false);
        onLoadingEnd();
        return; // DON'T advance without .mind file
      }
      
      console.log('[Level QR] ✅ .mind file verified:', mindTargetUrl);
      
      // Mark that we're in the success flow
      successFlow = true;
      
      // Show final success message on the loader
      onLoadingStart('✅ Your AR experience is ready!');
      
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

  // Auto-complete the level if position exists and we're not forcing a fresh start (move useEffect outside conditional to fix hooks violation)
  // In upgrade mode, always require fresh QR position (don't auto-complete)
  useEffect(() => {
    // Only auto-complete if:
    // 1. Not forcing fresh start
    // 2. Not in upgrade mode (in upgrade mode, Level 2 must be completed fresh)
    // 3. No current position (meaning we haven't completed this level yet)
    // 4. User has an existing QR position
    if (!forceStartFromLevel1 && !upgradeMode && !currentPosition && user?.qrPosition) {
      console.log('Auto-completing Level 2 with existing QR position');
      toast.success('📍 QR position found! Level 2 completed automatically.');
      onComplete(user.qrPosition);
    }
  }, [forceStartFromLevel1, upgradeMode, currentPosition, user?.qrPosition?.x, user?.qrPosition?.y, onComplete]);

  // If position already exists and we're not forcing a fresh start, show completion UI
  // In upgrade mode, always show interactive UI (force user to re-set QR position)
  if (!forceStartFromLevel1 && !upgradeMode && (currentPosition || user?.qrPosition)) {
    const position = currentPosition || user.qrPosition;
    
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
    <div 
      className="max-w-4xl mx-auto" 
      style={{ 
        overscrollBehavior: 'none'
      }}
    >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neon-blue/20 mb-4 shadow-glow-blue">
            <QrCode className="w-8 h-8 text-neon-blue" />
          </div>
        <h3 className="text-xl font-semibold text-slate-100 mb-2">
          Position Your QR Sticker
        </h3>
        <p className="text-slate-300">
          {stickerImageUrl ? `Click and drag the QR sticker to position it on your design. The preview shows the complete sticker including "SCAN ME" text. Minimum size: ${MIN_STICKER_WIDTH}×${MIN_STICKER_HEIGHT}px to ensure reliable scanning.` : 'Click and drag the QR code area to position it on your design'}
        </p>
      </div>

      {/* Interactive Design Preview */}
      <div className="bg-slate-800/50 border-2 border-slate-600/30 rounded-xl p-3 sm:p-6 mb-4 sm:mb-6" style={{ overscrollBehavior: 'none', touchAction: 'manipulation' }}>
        <div
          className="relative inline-block"
          style={{
            touchAction: 'manipulation',
            overscrollBehavior: 'none'
          }}
        >
          <img
            ref={imageRef}
            src={designImageUrl}
            alt="Design preview"
            className="max-w-full h-auto rounded-lg shadow-sm touch-manipulation"
            style={{ touchAction: 'none', userSelect: 'none' }}
            crossOrigin="anonymous"
            onLoad={handleImageLoad}
          />
          <div
            ref={qrRef}
            className={`absolute border-2 bg-neon-blue bg-opacity-20 cursor-move transition-all duration-200 touch-manipulation ${
              isDragging || isResizing ? 'border-neon-blue scale-105 shadow-glow-blue' : 'border-neon-blue'
            }`}
            style={{
              left: imageDimensions.width > 0 ? `${Math.max(0, Math.min((qrPosition.x / imageDimensions.width) * 100, 100))}%` : `${qrPosition.x}px`,
              top: imageDimensions.height > 0 ? `${Math.max(0, Math.min((qrPosition.y / imageDimensions.height) * 100, 100))}%` : `${qrPosition.y}px`,
              width: imageDimensions.width > 0 ? `${Math.max(0, Math.min((qrPosition.width / imageDimensions.width) * 100, 100))}%` : `${qrPosition.width}px`,
              height: imageDimensions.height > 0 ? `${Math.max(0, Math.min((qrPosition.height / imageDimensions.height) * 100, 100))}%` : `${qrPosition.height}px`,
              touchAction: 'none',
              userSelect: 'none'
            }}
            onPointerDown={handlePointerDown}
          >
            {/* Resize Handles */}
            {/* Corner handles - larger on mobile for easier interaction */}
            <div 
              className="absolute bg-neon-blue border border-white cursor-nw-resize hover:scale-125 transition-transform" 
              style={{ 
                top: window.innerWidth < 768 ? '-8px' : '-6px', 
                left: window.innerWidth < 768 ? '-8px' : '-6px',
                width: window.innerWidth < 768 ? '16px' : '12px',
                height: window.innerWidth < 768 ? '16px' : '12px',
                touchAction: 'none', 
                userSelect: 'none',
                zIndex: 10
              }} 
              onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'nw'); }}
            ></div>
            <div 
              className="absolute bg-neon-blue border border-white cursor-ne-resize hover:scale-125 transition-transform" 
              style={{ 
                top: window.innerWidth < 768 ? '-8px' : '-6px', 
                right: window.innerWidth < 768 ? '-8px' : '-6px',
                width: window.innerWidth < 768 ? '16px' : '12px',
                height: window.innerWidth < 768 ? '16px' : '12px',
                touchAction: 'none', 
                userSelect: 'none',
                zIndex: 10
              }} 
              onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'ne'); }}
            ></div>
            <div 
              className="absolute bg-neon-blue border border-white cursor-sw-resize hover:scale-125 transition-transform" 
              style={{ 
                bottom: window.innerWidth < 768 ? '-8px' : '-6px', 
                left: window.innerWidth < 768 ? '-8px' : '-6px',
                width: window.innerWidth < 768 ? '16px' : '12px',
                height: window.innerWidth < 768 ? '16px' : '12px',
                touchAction: 'none', 
                userSelect: 'none',
                zIndex: 10
              }} 
              onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'sw'); }}
            ></div>
            <div 
              className="absolute bg-neon-blue border border-white cursor-se-resize hover:scale-125 transition-transform" 
              style={{ 
                bottom: window.innerWidth < 768 ? '-8px' : '-6px', 
                right: window.innerWidth < 768 ? '-8px' : '-6px',
                width: window.innerWidth < 768 ? '16px' : '12px',
                height: window.innerWidth < 768 ? '16px' : '12px',
                touchAction: 'none', 
                userSelect: 'none',
                zIndex: 10
              }} 
              onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'se'); }}
            ></div>

            {/* Edge handles - larger on mobile */}
            <div 
              className="absolute bg-neon-blue border border-white cursor-n-resize hover:scale-125 transition-transform" 
              style={{ 
                top: window.innerWidth < 768 ? '-8px' : '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: window.innerWidth < 768 ? '24px' : '12px',
                height: window.innerWidth < 768 ? '8px' : '8px',
                touchAction: 'none', 
                userSelect: 'none',
                zIndex: 10
              }} 
              onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'n'); }}
            ></div>
            <div 
              className="absolute bg-neon-blue border border-white cursor-s-resize hover:scale-125 transition-transform" 
              style={{ 
                bottom: window.innerWidth < 768 ? '-8px' : '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: window.innerWidth < 768 ? '24px' : '12px',
                height: window.innerWidth < 768 ? '8px' : '8px',
                touchAction: 'none', 
                userSelect: 'none',
                zIndex: 10
              }} 
              onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 's'); }}
            ></div>
            <div 
              className="absolute bg-neon-blue border border-white cursor-w-resize hover:scale-125 transition-transform" 
              style={{ 
                left: window.innerWidth < 768 ? '-8px' : '-6px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: window.innerWidth < 768 ? '8px' : '8px',
                height: window.innerWidth < 768 ? '24px' : '12px',
                touchAction: 'none', 
                userSelect: 'none',
                zIndex: 10
              }} 
              onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'w'); }}
            ></div>
            <div 
              className="absolute bg-neon-blue border border-white cursor-e-resize hover:scale-125 transition-transform" 
              style={{ 
                right: window.innerWidth < 768 ? '-8px' : '-6px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: window.innerWidth < 768 ? '8px' : '8px',
                height: window.innerWidth < 768 ? '24px' : '12px',
                touchAction: 'none', 
                userSelect: 'none',
                zIndex: 10
              }} 
              onPointerDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'e'); }}
            ></div>

            <div className="absolute -top-6 left-0 text-xs bg-neon-blue text-slate-900 px-2 py-1 rounded whitespace-nowrap">
              {stickerImageUrl ? `QR Sticker (Min: ${MIN_STICKER_WIDTH}×${MIN_STICKER_HEIGHT}px)` : 'QR Code Area'}
            </div>
            {stickerImageUrl ? (
              <img
                src={stickerImageUrl}
                alt="QR sticker preview"
                className="w-full h-full object-contain pointer-events-none"
                style={{ pointerEvents: 'none' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <QrCode className="w-4 h-4 sm:w-6 sm:h-6 text-neon-blue" />
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Frame Customization Toggle */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={() => setShowFrameCustomizer(!showFrameCustomizer)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 transition-all duration-200 flex items-center gap-2"
        >
          <QrCode className="w-4 h-4" />
          <span>{showFrameCustomizer ? 'Hide' : 'Customize'} Frame Style</span>
        </button>
      </div>

      {/* Frame Customizer Panel */}
      {showFrameCustomizer && qrImageUrl && <FrameCustomizerWrapper qrImageUrl={qrImageUrl} frameConfig={frameConfig} onFrameConfigChange={setFrameConfig} />}

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
        
      </div>

      {/* Tips */}
      <div className="mt-6 sm:mt-8 bg-blue-900/20 border border-neon-blue/30 rounded-lg p-3 sm:p-4">
        <div className="flex items-start">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-neon-blue mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-neon-blue mb-1 text-sm sm:text-base">💡 Pro Tips</h4>
            <ul className="text-xs sm:text-sm text-slate-300 space-y-1">
              <li>• Tap and drag the blue area to position your QR sticker</li>
              <li>• Use the resize handles to adjust size (minimum: {MIN_STICKER_WIDTH}×{MIN_STICKER_HEIGHT}px for reliable scanning)</li>
              <li>• Make sure the QR sticker doesn't overlap important content</li>
              <li>• The preview shows the complete sticker design including "SCAN ME" text</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRPositionLevel;
