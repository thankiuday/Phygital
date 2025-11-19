/**
 * Upload Page Component
 * Handles file uploads for design images and videos
 * Includes drag-and-drop functionality and progress tracking
 */

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '../../contexts/AuthContext'
import { uploadAPI, qrAPI, downloadFile, arExperienceAPI, generateQRCode } from '../../utils/api'
import { 
  Upload, 
  Image, 
  Video, 
  X, 
  CheckCircle, 
  AlertCircle,
  QrCode,
  Share2,
  MapPin,
  Download,
  Eye
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import QRPositioningOverlay from '../../components/QRPositioning/QRPositioningOverlay'
import QRSticker from '../../components/QR/QRSticker'
import { generateQRSticker } from '../../utils/qrStickerGenerator'
import toast from 'react-hot-toast'
import { getUserFriendlyError, getFileError } from '../../utils/userFriendlyErrors'

// Minimum dimensions for scannable QR code sticker
// QR code itself needs ~80-100px minimum, plus border (8px) + padding (32px) = ~120px sticker width minimum
// Height includes "SCAN ME" text (~40px), so minimum height ~160px
const MIN_STICKER_WIDTH = 120
const MIN_STICKER_HEIGHT = 160

/**
 * Normalize and construct frontend URL from environment variables
 * Handles various URL formats and ensures valid URL is returned
 * @returns {string} Normalized frontend URL
 */
const getFrontendUrl = () => {
  // Try VITE_FRONTEND_URL first
  let frontendUrl = import.meta.env.VITE_FRONTEND_URL;
  
  // If not set, try VITE_API_URL and remove /api suffix
  if (!frontendUrl && import.meta.env.VITE_API_URL) {
    frontendUrl = import.meta.env.VITE_API_URL
      .replace(/\/api\/?$/, '') // Remove trailing /api or /api/
      .replace(/\/api$/, ''); // Also handle /api at end without trailing slash
  }
  
  // Fallback to window.location.origin
  if (!frontendUrl) {
    frontendUrl = window.location.origin || 'http://localhost:5173';
  }
  
  // Normalize the URL
  // Remove trailing slashes
  frontendUrl = frontendUrl.trim().replace(/\/+$/, '');
  
  // Fix malformed URLs like "https:/.phygital.zone" -> "https://phygital.zone"
  frontendUrl = frontendUrl.replace(/^https:\/\./, 'https://');
  frontendUrl = frontendUrl.replace(/^http:\/\./, 'http://');
  
  // Ensure URL starts with http:// or https://
  if (!frontendUrl.match(/^https?:\/\//)) {
    // If it doesn't start with protocol, add https://
    frontendUrl = `https://${frontendUrl}`;
  }
  
  // Remove any /api that might still be in the path
  frontendUrl = frontendUrl.replace(/\/api\/?$/, '');
  
  return frontendUrl;
};

/**
 * Validate and construct QR code URL
 * @param {string} userId - User ID (must be user._id, not urlCode)
 * @param {string} projectId - Project ID
 * @returns {string} Valid QR code URL
 */
const constructQRCodeUrl = (userId, projectId) => {
  // Validate userId - must be user._id, not urlCode or username
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a valid string (user._id)');
  }
  
  // Validate projectId
  if (!projectId || typeof projectId !== 'string') {
    throw new Error('Project ID is required and must be a valid string');
  }
  
  // Get normalized frontend URL
  const frontendUrl = getFrontendUrl();
  
  // Construct hash-based URL matching backend format: /#/ar/user/{userId}/project/{projectId}
  const qrCodeUrl = `${frontendUrl}/#/ar/user/${userId}/project/${projectId}`;
  
  // Validate the final URL
  try {
    // Check if URL is valid by creating a URL object (for validation only)
    // We can't use URL constructor with hash, so we validate the base URL
    const baseUrl = qrCodeUrl.split('#')[0];
    new URL(baseUrl);
    
    // Additional validation: ensure URL starts with http:// or https://
    if (!qrCodeUrl.match(/^https?:\/\//)) {
      throw new Error(`Invalid URL format: ${qrCodeUrl}`);
    }
    
    // Ensure no double slashes in path (except after protocol)
    if (qrCodeUrl.match(/https?:\/\/[^/]+\/\/+/)) {
      throw new Error(`URL contains double slashes: ${qrCodeUrl}`);
    }
    
    return qrCodeUrl;
  } catch (error) {
    throw new Error(`Invalid QR code URL constructed: ${qrCodeUrl}. Error: ${error.message}`);
  }
};

const UploadPage = () => {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('design')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [qrPosition, setQrPosition] = useState({
    x: user?.qrPosition?.x || 0,
    y: user?.qrPosition?.y || 0,
    width: user?.qrPosition?.width || MIN_STICKER_WIDTH,
    height: user?.qrPosition?.height || MIN_STICKER_HEIGHT
  })
  const [socialLinks, setSocialLinks] = useState({
    instagram: user?.socialLinks?.instagram || '',
    facebook: user?.socialLinks?.facebook || '',
    twitter: user?.socialLinks?.twitter || '',
    linkedin: user?.socialLinks?.linkedin || '',
    website: user?.socialLinks?.website || ''
  })
  const [finalDesignPreview, setFinalDesignPreview] = useState(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [captureCompositeFunction, setCaptureCompositeFunction] = useState(null)
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [isCreatingAR, setIsCreatingAR] = useState(false)
  const [arExperienceId, setArExperienceId] = useState(null)

  // Design upload handler
  const onDesignDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    
    // Additional client-side validation for JPG/JPEG only
    const maxSizeMB = 20;
    const maxSize = maxSizeMB * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg'];
    
    // Check for file errors
    const fileError = getFileError(file, maxSizeMB, ['jpg', 'jpeg']);
    if (fileError) {
      toast.error(fileError.message, { duration: 5000 });
      return;
    }
    
    const formData = new FormData()
    formData.append('design', file)

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await uploadAPI.uploadDesign(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      updateUser(response.data.data.user)
      
      // Show different messages based on AR readiness
      if (response.data.data.arReady) {
        toast.success('Design uploaded successfully! AR target generated 🎯')
      } else if (response.data.data.mindTarget) {
        toast.success('Design uploaded successfully! AR target processing... ⚙️')
      } else {
        toast.success('Design uploaded successfully! AR will use image fallback 📷')
      }
      
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 1000)
    } catch (error) {
      setUploadProgress(0)
      setIsUploading(false)
      const friendlyMessage = getUserFriendlyError(error, 'upload');
      toast.error(friendlyMessage);
      console.error('Design upload error:', error);
    }
  }, [updateUser])

  // Fetch QR image blob for overlay/composite
  useEffect(() => {
    const fetchQR = async () => {
      try {
        if (!user?._id) return
        // Try primary endpoint
        let res = await qrAPI.getMyQR('png', 300)
        let blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'image/png' })
        let url = URL.createObjectURL(blob)
        setQrImageUrl(url)
      } catch (err) {
        console.warn('Failed to fetch QR via my-qr, trying generate...', err)
        try {
          const res2 = await qrAPI.generateQR(user._id, 'png', 300)
          const blob2 = res2.data instanceof Blob ? res2.data : new Blob([res2.data], { type: 'image/png' })
          const url2 = URL.createObjectURL(blob2)
          setQrImageUrl(url2)
        } catch (err2) {
          console.error('Failed to fetch QR for overlay', err2)
        }
      }
    }
    fetchQR()
    return () => {
      if (qrImageUrl) {
        URL.revokeObjectURL(qrImageUrl)
      }
    }
  }, [user?._id])

  // Video upload handler
  const onVideoDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const formData = new FormData()
    formData.append('video', file)

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const response = await uploadAPI.uploadVideo(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setUploadProgress(percentCompleted)
        }
      })
      
      setUploadProgress(100)
      
      updateUser(response.data.data.user)
      toast.success('Video uploaded successfully!')
      
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 1000)
    } catch (error) {
      setUploadProgress(0)
      setIsUploading(false)
      const friendlyMessage = getUserFriendlyError(error, 'upload');
      toast.error(friendlyMessage);
      console.error('Video upload error:', error);
    }
  }, [updateUser])

  // Design dropzone
  const {
    getRootProps: getDesignRootProps,
    getInputProps: getDesignInputProps,
    isDragActive: isDesignDragActive,
    fileRejections: designFileRejections
  } = useDropzone({
    onDrop: onDesignDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 1,
    disabled: isUploading
  })

  // Video dropzone
  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    isDragActive: isVideoDragActive
  } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1,
    disabled: isUploading
  })

  // Handle QR position change - enforce minimums
  const handleQrPositionChange = useCallback((newPosition) => {
    setQrPosition(prev => {
      const updated = { ...prev, ...newPosition }
      // Enforce minimums if size is being changed
      if (newPosition.width !== undefined) {
        updated.width = Math.max(MIN_STICKER_WIDTH, updated.width)
      }
      if (newPosition.height !== undefined) {
        updated.height = Math.max(MIN_STICKER_HEIGHT, updated.height)
      }
      return updated
    })
  }, [])

  // Handle QR size change - maintain sticker aspect ratio and enforce minimums
  const handleQrSizeChange = useCallback((newSize) => {
    setQrPosition(prev => {
      let width = prev.width
      let height = prev.height
      
      // If width is provided, calculate height from sticker aspect ratio
      if (newSize.width !== undefined) {
        width = Math.max(MIN_STICKER_WIDTH, newSize.width)
        // Calculate sticker aspect ratio (height/width) - sticker is taller due to "SCAN ME" text
        // Default aspect ratio: 160/120 = 1.333
        const stickerAspectRatio = prev.height / prev.width || 160 / 120
        height = width * stickerAspectRatio
        // Ensure height meets minimum
        if (height < MIN_STICKER_HEIGHT) {
          height = MIN_STICKER_HEIGHT
          width = height / stickerAspectRatio
        }
      }
      // If height is provided, calculate width from sticker aspect ratio
      else if (newSize.height !== undefined) {
        height = Math.max(MIN_STICKER_HEIGHT, newSize.height)
        // Calculate sticker aspect ratio
        const stickerAspectRatio = prev.height / prev.width || 160 / 120
        width = height / stickerAspectRatio
        // Ensure width meets minimum
        if (width < MIN_STICKER_WIDTH) {
          width = MIN_STICKER_WIDTH
          height = width * stickerAspectRatio
        }
      }
      // If both are provided, enforce minimums
      else if (newSize.width !== undefined && newSize.height !== undefined) {
        width = Math.max(MIN_STICKER_WIDTH, newSize.width)
        height = Math.max(MIN_STICKER_HEIGHT, newSize.height)
      }
      // Fallback: enforce minimums on existing values
      else {
        width = Math.max(MIN_STICKER_WIDTH, prev.width)
        height = Math.max(MIN_STICKER_HEIGHT, prev.height)
      }
      
      return { ...prev, width, height }
    })
  }, [])

  // Save QR position with composite image
  const saveQRPosition = async () => {
    try {
      // Validate minimum size requirements for scannability
      if (qrPosition.width < MIN_STICKER_WIDTH || qrPosition.height < MIN_STICKER_HEIGHT) {
        toast.error(
          `Scanner size is too small! Minimum size required: ${MIN_STICKER_WIDTH}×${MIN_STICKER_HEIGHT}px for reliable scanning. Please resize the scanner to make it scannable.`,
          { duration: 6000 }
        );
        return;
      }
      
      if (!captureCompositeFunction) {
        toast.error('Composite image capture not ready. Please wait a moment and try again.');
        return;
      }

      // Show loading state
      const loadingToast = toast.loading('Saving composite design...');

      // Capture the composite image
      const compositeImageData = await captureCompositeFunction();

      // Save composite design with image data
      const response = await uploadAPI.saveCompositeDesign(compositeImageData, qrPosition);

      // Try to compile and save .mind on the client as a fallback (if server failed to generate)
      try {
        const mindTargetUrlFromServer = response.data?.data?.user?.uploadedFiles?.mindTarget?.url;
        if (!mindTargetUrlFromServer) {
          const mindarModule = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.2/dist/mindar-image.prod.js');
          const { Compiler } = mindarModule;
          const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.crossOrigin = 'anonymous';
            i.onload = () => resolve(i);
            i.onerror = reject;
            i.src = response.data?.data?.user?.uploadedFiles?.compositeDesign?.url || compositeImageData;
          });
          const compiler = new Compiler();
          await compiler.compileImageTargets([img], () => {});
          const buf = await compiler.exportData();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          await uploadAPI.saveMindTarget(`data:application/octet-stream;base64,${base64}`);
        }
      } catch (mindErr) {
        console.warn('Client-side .mind generation failed:', mindErr);
      }

      toast.dismiss(loadingToast);
      toast.success('Composite design saved successfully!');
    } catch (error) {
      toast.dismiss(loadingToast);
      const friendlyMessage = getUserFriendlyError(error, 'save');
      toast.error(friendlyMessage);
      console.error('Save composite design error:', error);
    }
  }

  // Save social links
  const saveSocialLinks = async () => {
    try {
      await uploadAPI.updateSocialLinks(socialLinks)
      toast.success('Social links updated!')
    } catch (error) {
      const friendlyMessage = getUserFriendlyError(error, 'save');
      toast.error(friendlyMessage);
      console.error('Update social links error:', error);
    }
  }

        // Generate preview of final design with sticker design
        const generatePreview = async () => {
          try {
            setIsGeneratingPreview(true)
            
            // Create canvas for preview at native resolution (no DPR scaling to preserve QR code quality)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Load the original design image
            const designImg = document.createElement('img');
            designImg.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              designImg.onload = resolve;
              designImg.onerror = reject;
              designImg.src = user.uploadedFiles.design.url;
            });
            
            // Set canvas to image dimensions at native resolution (no DPR scaling)
            // This ensures QR codes are rendered at exact pixel-perfect quality
            canvas.width = designImg.naturalWidth;
            canvas.height = designImg.naturalHeight;
            
            // Draw the design image at native size
            ctx.drawImage(designImg, 0, 0);
            
            // Get QR position from user data
            const qrPos = user.qrPosition || { x: 100, y: 100, width: 100, height: 100 };
            console.log('📍 QR Position from user:', qrPos);
            console.log('🖼️ Design image dimensions:', {
              naturalWidth: designImg.naturalWidth,
              naturalHeight: designImg.naturalHeight
            });
            
            // QR position is already in actual image coordinates, use directly
            // But we need to scale if the stored position was relative to a different image size
            // Check if position values seem reasonable (if they're > naturalWidth, they're in display coordinates)
            let actualQrX, actualQrY, actualQrWidth, actualQrHeight;
            
            if (qrPos.width > designImg.naturalWidth || qrPos.height > designImg.naturalHeight) {
              // Position appears to be in display coordinates, need to scale
              // Calculate display dimensions based on image aspect ratio
              const maxDisplayWidth = 400;
              const imageAspectRatio = designImg.naturalWidth / designImg.naturalHeight;
              let displayWidth, displayHeight;
              
              if (imageAspectRatio > 1) {
                displayWidth = maxDisplayWidth;
                displayHeight = maxDisplayWidth / imageAspectRatio;
              } else {
                displayHeight = maxDisplayWidth / imageAspectRatio;
                displayWidth = maxDisplayWidth;
                if (displayHeight > 300) {
                  displayHeight = 300;
                  displayWidth = 300 * imageAspectRatio;
                }
              }
              
              actualQrX = (qrPos.x / displayWidth) * designImg.naturalWidth;
              actualQrY = (qrPos.y / displayHeight) * designImg.naturalHeight;
              actualQrWidth = (qrPos.width / displayWidth) * designImg.naturalWidth;
              actualQrHeight = (qrPos.height / displayHeight) * designImg.naturalHeight;
              
              console.log('📐 Scaling from display coordinates:', { displayWidth, displayHeight });
            } else {
              // Position is already in actual image coordinates, use directly
              actualQrX = qrPos.x;
              actualQrY = qrPos.y;
              actualQrWidth = qrPos.width;
              actualQrHeight = qrPos.height;
              
              console.log('📐 Using position directly (already in actual image coordinates)');
            }
      
      console.log('📏 Calculated QR position:', {
        actualQrX,
        actualQrY,
        actualQrWidth,
        actualQrHeight,
        displayWidth,
        displayHeight
      });
      
      // Generate QR code URL for the user's personalized page
      // Use user._id consistently to match backend format (not urlCode or username)
      const userIdentifier = user._id;
      if (!userIdentifier || typeof userIdentifier !== 'string') {
        throw new Error('User ID (user._id) is required and must be a valid string to generate QR code');
      }
      
      // Use currentProject directly (backend uses user.currentProject || 'default')
      const projectId = user.currentProject || 'default';
      
      // Construct and validate QR code URL using helper function
      const qrCodeUrl = constructQRCodeUrl(userIdentifier, projectId);
      
      console.log('🔗 Generated QR code URL:', qrCodeUrl);
      console.log('📋 URL components:', { 
        frontendUrl: getFrontendUrl(), 
        userIdentifier, 
        projectId,
        urlFormat: 'hash-based',
        urlValid: true
      });
      
      // Calculate QR code size needed to match the positioned sticker dimensions EXACTLY
      // Sticker dimensions: width = qrSize + padding*2 + borderWidth*2, height = qrSize + padding*2 + borderWidth*2 + textHeight
      // To avoid scaling, we need: stickerNaturalSize = stickerDisplaySize
      // So: qrSize = actualQrWidth - (padding*2 + borderWidth*2)
      // Minimum QR code size for reliable scanning: 300px (increased for better scannability)
      const padding = 16;
      const borderWidth = 4;
      const textHeight = 40;
      const MIN_QR_CODE_SIZE = 300; // Minimum QR code size for reliable scanning (increased to 300px)
      const MIN_STICKER_WIDTH = MIN_QR_CODE_SIZE + padding * 2 + borderWidth * 2; // ~340px minimum
      const MIN_FINAL_QR_SIZE = 250; // Minimum QR code size in final output (after all scaling)
      const QR_RESOLUTION_MULTIPLIER = 2; // Generate at 2x resolution for better quality
      
      // Calculate exact QR code size to match display width
      // QR codes must be generated at integer pixel sizes, but we'll match sticker natural size to display size
      const calculatedQrCodeSize = actualQrWidth - (padding * 2 + borderWidth * 2);
      
      // If calculated size is too small, use minimum and let sticker be slightly larger
      let qrCodeSize;
      let stickerDisplayWidth;
      let stickerDisplayHeight;
      
      if (calculatedQrCodeSize < MIN_QR_CODE_SIZE) {
        // Use minimum QR code size - sticker will be slightly larger than positioned size
        qrCodeSize = MIN_QR_CODE_SIZE;
        stickerDisplayWidth = qrCodeSize + padding * 2 + borderWidth * 2;
        stickerDisplayHeight = qrCodeSize + padding * 2 + borderWidth * 2 + textHeight;
        console.warn('⚠️ QR code size too small, using minimum. Sticker will be slightly larger than positioned size.');
      } else {
        // Round QR code size for generation (QR libraries need integers)
        // But calculate exact sticker size to match display dimensions
        qrCodeSize = Math.round(calculatedQrCodeSize);
        const stickerNaturalWidth = qrCodeSize + padding * 2 + borderWidth * 2;
        const stickerNaturalHeight = qrCodeSize + padding * 2 + borderWidth * 2 + textHeight;
        
        // Use sticker natural size as display size to avoid scaling
        stickerDisplayWidth = stickerNaturalWidth;
        stickerDisplayHeight = stickerNaturalHeight;
        
        // Ensure QR code never scales below minimum in final output
        if (qrCodeSize < MIN_FINAL_QR_SIZE) {
          console.warn(`⚠️ QR code size ${qrCodeSize}px is below minimum ${MIN_FINAL_QR_SIZE}px. Increasing to minimum.`);
          qrCodeSize = MIN_FINAL_QR_SIZE;
          stickerDisplayWidth = qrCodeSize + padding * 2 + borderWidth * 2;
          stickerDisplayHeight = qrCodeSize + padding * 2 + borderWidth * 2 + textHeight;
        }
        
        // If there's a mismatch, log it for debugging
        if (Math.abs(stickerNaturalWidth - actualQrWidth) > 1) {
          console.warn(`⚠️ Sticker width mismatch: natural=${stickerNaturalWidth}, display=${actualQrWidth}, diff=${Math.abs(stickerNaturalWidth - actualQrWidth)}`);
        }
      }
      
      // Final quality check - ensure QR code meets minimum size requirement
      if (qrCodeSize < MIN_FINAL_QR_SIZE) {
        console.warn(`⚠️ Final QR code size ${qrCodeSize}px is below minimum ${MIN_FINAL_QR_SIZE}px. This may affect scannability.`);
      }
      
      // Generate QR code at 2x resolution for better quality, then scale down
      const qrCodeGenerationSize = qrCodeSize * QR_RESOLUTION_MULTIPLIER;
      
      console.log('🔲 Calculating QR code size to match positioned dimensions:', {
        actualQrWidth,
        actualQrHeight,
        calculatedQrCodeSize,
        qrCodeSize,
        qrCodeGenerationSize,
        resolutionMultiplier: QR_RESOLUTION_MULTIPLIER,
        expectedStickerWidth: qrCodeSize + padding * 2 + borderWidth * 2,
        expectedStickerHeight: qrCodeSize + padding * 2 + borderWidth * 2 + textHeight,
        stickerDisplayWidth,
        stickerDisplayHeight,
        willScale: Math.abs((qrCodeSize + padding * 2 + borderWidth * 2) - stickerDisplayWidth) > 0.1
      });
      
      try {
        // Validate URL before generating QR code
        if (!qrCodeUrl || typeof qrCodeUrl !== 'string') {
          throw new Error(`Invalid QR code URL: ${qrCodeUrl}`);
        }
        if (!qrCodeUrl.startsWith('http://') && !qrCodeUrl.startsWith('https://')) {
          throw new Error(`QR code URL must start with http:// or https://: ${qrCodeUrl}`);
        }
        console.log('🔗 Full QR code URL to encode:', qrCodeUrl);
        console.log('🔗 URL length:', qrCodeUrl.length);
        
        // Generate plain QR code at 2x resolution for better quality
        const qrDataUrl = await generateQRCode(qrCodeUrl, {
          size: qrCodeGenerationSize,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Validate QR code data URL is valid
        if (!qrDataUrl || !qrDataUrl.startsWith('data:image')) {
          throw new Error('Invalid QR code data URL generated');
        }
        
        console.log('✅ Plain QR code generated:', { 
          size: qrDataUrl.length,
          generationSize: qrCodeGenerationSize,
          targetSize: qrCodeSize,
          url: qrCodeUrl.substring(0, 100) + '...', // Log first 100 chars of URL
          meetsMinimumSize: qrCodeSize >= MIN_FINAL_QR_SIZE,
          qualityCheck: qrCodeSize >= MIN_FINAL_QR_SIZE ? 'PASS' : 'FAIL'
        });
        
        // Quality check - warn if QR code is below minimum size
        if (qrCodeSize < MIN_FINAL_QR_SIZE) {
          console.warn(`⚠️ QR code size ${qrCodeSize}px is below recommended minimum ${MIN_FINAL_QR_SIZE}px. Scannability may be affected.`);
        }

        // Generate sticker with gradient border and "SCAN ME" text
        // Pass the target display size (1x) - sticker generator will scale down from 2x QR code
        console.log('🎨 Generating sticker with QR size:', qrCodeSize, '(QR generated at', qrCodeGenerationSize, 'px, will be scaled down)');
        let stickerDataUrl;
        try {
          stickerDataUrl = await generateQRSticker(qrDataUrl, {
            variant: 'purple',
            qrSize: qrCodeSize, // Target display size (sticker will scale down from 2x QR)
            qrSourceSize: qrCodeGenerationSize, // Actual QR code size (2x resolution)
            borderWidth: 4,
            padding: 16
          });
          console.log('✅ Sticker generated, data URL length:', stickerDataUrl.length, {
          qrCodeSize: qrCodeSize,
          qrCodeGenerationSize: qrCodeGenerationSize,
          stickerTargetSize: qrCodeSize,
          meetsMinimumSize: qrCodeSize >= MIN_FINAL_QR_SIZE
        });
          if (!stickerDataUrl || !stickerDataUrl.startsWith('data:image')) {
            throw new Error('Invalid sticker data URL generated');
          }
        } catch (stickerError) {
          console.error('❌ Sticker generation failed:', stickerError);
          throw new Error(`Failed to generate sticker: ${stickerError.message}`);
        }

        // Load sticker image
        const stickerImg = document.createElement('img');
        stickerImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          stickerImg.onload = () => {
            console.log('✅ Sticker image loaded:', {
              width: stickerImg.width,
              height: stickerImg.height,
              naturalWidth: stickerImg.naturalWidth,
              naturalHeight: stickerImg.naturalHeight,
              qrCodeSize: qrCodeSize,
              expectedStickerWidth: qrCodeSize + padding * 2 + borderWidth * 2,
              expectedStickerHeight: qrCodeSize + padding * 2 + borderWidth * 2 + textHeight,
              sizeMatch: Math.abs(stickerImg.naturalWidth - (qrCodeSize + padding * 2 + borderWidth * 2)) < 2
            });
            if (stickerImg.naturalWidth === 0 || stickerImg.naturalHeight === 0) {
              reject(new Error('Sticker image has zero dimensions'));
              return;
            }
            resolve();
          };
          stickerImg.onerror = (error) => {
            console.error('❌ Sticker image load error:', error);
            reject(new Error('Failed to load sticker image'));
          };
          stickerImg.src = stickerDataUrl;
        });

        // stickerDisplayWidth and stickerDisplayHeight are already calculated above
        // They match the sticker natural size to avoid scaling (or are slightly larger if minimum size was used)

        console.log('📐 Sticker positioning (using calculated dimensions to avoid scaling):', {
          actualQrX,
          actualQrY,
          actualQrWidth,
          actualQrHeight,
          stickerDisplayWidth,
          stickerDisplayHeight,
          stickerNaturalWidth: stickerImg.naturalWidth,
          stickerNaturalHeight: stickerImg.naturalHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          scalingRatio: {
            width: stickerDisplayWidth / stickerImg.naturalWidth,
            height: stickerDisplayHeight / stickerImg.naturalHeight
          }
        });

        // Draw sticker at exact positioned location and size using integer pixel coordinates
        // Using native resolution (no DPR scaling) for pixel-perfect QR code rendering
        const stickerX = Math.max(0, Math.min(Math.round(actualQrX), designImg.naturalWidth - Math.round(stickerDisplayWidth)));
        const stickerY = Math.max(0, Math.min(Math.round(actualQrY), designImg.naturalHeight - Math.round(stickerDisplayHeight)));
        const stickerWidth = Math.round(stickerDisplayWidth);
        const stickerHeight = Math.round(stickerDisplayHeight);

        // Draw sticker on the composite using exact positioned dimensions
        // Disable image smoothing to preserve QR code sharpness and scannability
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'high';
        console.log('🎨 Drawing sticker on canvas with exact positioned dimensions (integer pixels, no DPR scaling)...');
        console.log('🔧 Canvas rendering settings:', {
          canvasSize: { width: canvas.width, height: canvas.height },
          imageSmoothingEnabled: ctx.imageSmoothingEnabled,
          stickerNaturalSize: { width: stickerImg.naturalWidth, height: stickerImg.naturalHeight },
          stickerDisplaySize: { width: stickerWidth, height: stickerHeight },
          stickerPosition: { x: stickerX, y: stickerY },
          scalingRatio: {
            width: stickerWidth / stickerImg.naturalWidth,
            height: stickerHeight / stickerImg.naturalHeight
          },
          qrCodeSize: qrCodeSize,
          meetsMinimumSize: qrCodeSize >= MIN_FINAL_QR_SIZE
        });
        ctx.drawImage(stickerImg, stickerX, stickerY, stickerWidth, stickerHeight);
        // Re-enable image smoothing for other operations if needed
        ctx.imageSmoothingEnabled = true;
        console.log('✅ Sticker drawn at:', { x: stickerX, y: stickerY, width: stickerWidth, height: stickerHeight });

        // Verify sticker was drawn by checking a pixel
        const testX = Math.floor(stickerX + stickerWidth / 2);
        const testY = Math.floor(stickerY + stickerHeight / 2);
        if (testX >= 0 && testX < canvas.width && testY >= 0 && testY < canvas.height) {
          const imageData = ctx.getImageData(testX, testY, 1, 1);
          console.log('🔍 Pixel check at sticker center:', { 
            x: testX, 
            y: testY, 
            rgba: Array.from(imageData.data) 
          });
        }

        // Set preview - use PNG with maximum quality to preserve QR code sharpness
        const previewDataUrl = canvas.toDataURL('image/png', 1.0);
        console.log('✅ Preview generated, data URL length:', previewDataUrl.length, {
          canvasSize: { width: canvas.width, height: canvas.height },
          qrCodeSize: qrCodeSize,
          meetsMinimumSize: qrCodeSize >= MIN_FINAL_QR_SIZE
        });
        
        // Quality check - warn if QR code is too small
        if (qrCodeSize < MIN_FINAL_QR_SIZE) {
          console.error(`❌ QR code size ${qrCodeSize}px is below minimum ${MIN_FINAL_QR_SIZE}px. QR code may not be scannable.`);
        }
        
        setFinalDesignPreview(previewDataUrl);
        toast.success('Preview generated with sticker design!');
      } catch (qrError) {
        console.error('QR loading failed:', qrError);
        toast.error('Failed to generate QR code for preview');
      }
    } catch (error) {
      const friendlyMessage = getUserFriendlyError(error, 'load');
      toast.error(friendlyMessage);
      console.error('Generate preview error:', error);
    } finally {
      setIsGeneratingPreview(false)
    }
  }

        // Download final design with sticker design
        const downloadFinalDesign = async () => {
          try {
            setIsDownloading(true)
            
            // Create a fresh composite image with sticker design
            // Create canvas for download at native resolution (no DPR scaling to preserve QR code quality)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Load the original design image
            const designImg = document.createElement('img');
            designImg.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              designImg.onload = resolve;
              designImg.onerror = reject;
              designImg.src = user.uploadedFiles.design.url;
            });
            
            // Set canvas to image dimensions at native resolution (no DPR scaling)
            // This ensures QR codes are rendered at exact pixel-perfect quality
            canvas.width = designImg.naturalWidth;
            canvas.height = designImg.naturalHeight;
            
            // Draw the design image at native size
            ctx.drawImage(designImg, 0, 0);
            
            // Get QR position from user data
            const qrPos = user.qrPosition || { x: 100, y: 100, width: 100, height: 100 };
            console.log('📍 QR Position from user:', qrPos);
            console.log('🖼️ Design image dimensions:', {
              naturalWidth: designImg.naturalWidth,
              naturalHeight: designImg.naturalHeight
            });
            
            // QR position is already in actual image coordinates, use directly
            // But we need to scale if the stored position was relative to a different image size
            // Check if position values seem reasonable (if they're > naturalWidth, they're in display coordinates)
            let actualQrX, actualQrY, actualQrWidth, actualQrHeight;
            
            if (qrPos.width > designImg.naturalWidth || qrPos.height > designImg.naturalHeight) {
              // Position appears to be in display coordinates, need to scale
              // Calculate display dimensions based on image aspect ratio
              const maxDisplayWidth = 400;
              const imageAspectRatio = designImg.naturalWidth / designImg.naturalHeight;
              let displayWidth, displayHeight;
              
              if (imageAspectRatio > 1) {
                displayWidth = maxDisplayWidth;
                displayHeight = maxDisplayWidth / imageAspectRatio;
              } else {
                displayHeight = maxDisplayWidth / imageAspectRatio;
                displayWidth = maxDisplayWidth;
                if (displayHeight > 300) {
                  displayHeight = 300;
                  displayWidth = 300 * imageAspectRatio;
                }
              }
              
              actualQrX = (qrPos.x / displayWidth) * designImg.naturalWidth;
              actualQrY = (qrPos.y / displayHeight) * designImg.naturalHeight;
              actualQrWidth = (qrPos.width / displayWidth) * designImg.naturalWidth;
              actualQrHeight = (qrPos.height / displayHeight) * designImg.naturalHeight;
              
              console.log('📐 Scaling from display coordinates:', { displayWidth, displayHeight });
            } else {
              // Position is already in actual image coordinates, use directly
              actualQrX = qrPos.x;
              actualQrY = qrPos.y;
              actualQrWidth = qrPos.width;
              actualQrHeight = qrPos.height;
              
              console.log('📐 Using position directly (already in actual image coordinates)');
            }
      
      console.log('📏 Calculated QR position:', {
        actualQrX,
        actualQrY,
        actualQrWidth,
        actualQrHeight,
        displayWidth,
        displayHeight
      });
      
      // Generate QR code URL for the user's personalized page
      // Use user._id consistently to match backend format (not urlCode or username)
      const userIdentifier = user._id;
      if (!userIdentifier || typeof userIdentifier !== 'string') {
        throw new Error('User ID (user._id) is required and must be a valid string to generate QR code');
      }
      
      // Use currentProject directly (backend uses user.currentProject || 'default')
      const projectId = user.currentProject || 'default';
      
      // Construct and validate QR code URL using helper function
      const qrCodeUrl = constructQRCodeUrl(userIdentifier, projectId);
      
      console.log('🔗 Generated QR code URL for download:', qrCodeUrl);
      console.log('📋 URL components:', { 
        frontendUrl: getFrontendUrl(), 
        userIdentifier, 
        projectId,
        urlFormat: 'hash-based',
        urlValid: true
      });
      
      // Calculate QR code size needed to match the positioned sticker dimensions EXACTLY
      // Sticker dimensions: width = qrSize + padding*2 + borderWidth*2, height = qrSize + padding*2 + borderWidth*2 + textHeight
      // To avoid scaling, we need: stickerNaturalSize = stickerDisplaySize
      // So: qrSize = actualQrWidth - (padding*2 + borderWidth*2)
      // Minimum QR code size for reliable scanning: 300px (increased for better scannability)
      const padding = 16;
      const borderWidth = 4;
      const textHeight = 40;
      const MIN_QR_CODE_SIZE = 300; // Minimum QR code size for reliable scanning (increased to 300px)
      const MIN_STICKER_WIDTH = MIN_QR_CODE_SIZE + padding * 2 + borderWidth * 2; // ~340px minimum
      const MIN_FINAL_QR_SIZE = 250; // Minimum QR code size in final output (after all scaling)
      const QR_RESOLUTION_MULTIPLIER = 2; // Generate at 2x resolution for better quality
      
      // Calculate exact QR code size to match display width
      // QR codes must be generated at integer pixel sizes, but we'll match sticker natural size to display size
      const calculatedQrCodeSize = actualQrWidth - (padding * 2 + borderWidth * 2);
      
      // If calculated size is too small, use minimum and let sticker be slightly larger
      let qrCodeSize;
      let stickerDisplayWidth;
      let stickerDisplayHeight;
      
      if (calculatedQrCodeSize < MIN_QR_CODE_SIZE) {
        // Use minimum QR code size - sticker will be slightly larger than positioned size
        qrCodeSize = MIN_QR_CODE_SIZE;
        stickerDisplayWidth = qrCodeSize + padding * 2 + borderWidth * 2;
        stickerDisplayHeight = qrCodeSize + padding * 2 + borderWidth * 2 + textHeight;
        console.warn('⚠️ QR code size too small, using minimum. Sticker will be slightly larger than positioned size.');
      } else {
        // Round QR code size for generation (QR libraries need integers)
        // But calculate exact sticker size to match display dimensions
        qrCodeSize = Math.round(calculatedQrCodeSize);
        const stickerNaturalWidth = qrCodeSize + padding * 2 + borderWidth * 2;
        const stickerNaturalHeight = qrCodeSize + padding * 2 + borderWidth * 2 + textHeight;
        
        // Use sticker natural size as display size to avoid scaling
        stickerDisplayWidth = stickerNaturalWidth;
        stickerDisplayHeight = stickerNaturalHeight;
        
        // Ensure QR code never scales below minimum in final output
        if (qrCodeSize < MIN_FINAL_QR_SIZE) {
          console.warn(`⚠️ QR code size ${qrCodeSize}px is below minimum ${MIN_FINAL_QR_SIZE}px. Increasing to minimum.`);
          qrCodeSize = MIN_FINAL_QR_SIZE;
          stickerDisplayWidth = qrCodeSize + padding * 2 + borderWidth * 2;
          stickerDisplayHeight = qrCodeSize + padding * 2 + borderWidth * 2 + textHeight;
        }
        
        // If there's a mismatch, log it for debugging
        if (Math.abs(stickerNaturalWidth - actualQrWidth) > 1) {
          console.warn(`⚠️ Sticker width mismatch: natural=${stickerNaturalWidth}, display=${actualQrWidth}, diff=${Math.abs(stickerNaturalWidth - actualQrWidth)}`);
        }
      }
      
      // Final quality check - ensure QR code meets minimum size requirement
      if (qrCodeSize < MIN_FINAL_QR_SIZE) {
        console.warn(`⚠️ Final QR code size ${qrCodeSize}px is below minimum ${MIN_FINAL_QR_SIZE}px. This may affect scannability.`);
      }
      
      // Generate QR code at 2x resolution for better quality, then scale down
      const qrCodeGenerationSize = qrCodeSize * QR_RESOLUTION_MULTIPLIER;
      
      console.log('🔲 Calculating QR code size to match positioned dimensions for download:', {
        actualQrWidth,
        actualQrHeight,
        calculatedQrCodeSize,
        qrCodeSize,
        qrCodeGenerationSize,
        resolutionMultiplier: QR_RESOLUTION_MULTIPLIER,
        expectedStickerWidth: qrCodeSize + padding * 2 + borderWidth * 2,
        expectedStickerHeight: qrCodeSize + padding * 2 + borderWidth * 2 + textHeight,
        stickerDisplayWidth,
        stickerDisplayHeight,
        willScale: Math.abs((qrCodeSize + padding * 2 + borderWidth * 2) - stickerDisplayWidth) > 0.1
      });
      
      // Try to load and draw the QR code sticker
      try {
        // Validate URL before generating QR code
        if (!qrCodeUrl || typeof qrCodeUrl !== 'string') {
          throw new Error(`Invalid QR code URL: ${qrCodeUrl}`);
        }
        if (!qrCodeUrl.startsWith('http://') && !qrCodeUrl.startsWith('https://')) {
          throw new Error(`QR code URL must start with http:// or https://: ${qrCodeUrl}`);
        }
        console.log('🔗 Full QR code URL to encode for download:', qrCodeUrl);
        console.log('🔗 URL length:', qrCodeUrl.length);
        
        // Generate plain QR code at 2x resolution for better quality
        const qrDataUrl = await generateQRCode(qrCodeUrl, {
          size: qrCodeGenerationSize,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        // Validate QR code data URL is valid
        if (!qrDataUrl || !qrDataUrl.startsWith('data:image')) {
          throw new Error('Invalid QR code data URL generated');
        }
        
        console.log('✅ Plain QR code generated for download:', { 
          size: qrDataUrl.length,
          generationSize: qrCodeGenerationSize,
          targetSize: qrCodeSize,
          url: qrCodeUrl.substring(0, 100) + '...', // Log first 100 chars of URL
          meetsMinimumSize: qrCodeSize >= MIN_FINAL_QR_SIZE,
          qualityCheck: qrCodeSize >= MIN_FINAL_QR_SIZE ? 'PASS' : 'FAIL'
        });
        
        // Quality check - warn if QR code is below minimum size
        if (qrCodeSize < MIN_FINAL_QR_SIZE) {
          console.warn(`⚠️ QR code size ${qrCodeSize}px is below recommended minimum ${MIN_FINAL_QR_SIZE}px. Scannability may be affected.`);
        }

        // Generate sticker with gradient border and "SCAN ME" text
        // Pass the target display size (1x) - sticker generator will scale down from 2x QR code
        console.log('🎨 Generating sticker with QR size:', qrCodeSize, '(QR generated at', qrCodeGenerationSize, 'px, will be scaled down)');
        let stickerDataUrl;
        try {
          stickerDataUrl = await generateQRSticker(qrDataUrl, {
            variant: 'purple',
            qrSize: qrCodeSize, // Target display size (sticker will scale down from 2x QR)
            qrSourceSize: qrCodeGenerationSize, // Actual QR code size (2x resolution)
            borderWidth: 4,
            padding: 16
          });
          console.log('✅ Sticker generated for download, data URL length:', stickerDataUrl.length);
          if (!stickerDataUrl || !stickerDataUrl.startsWith('data:image')) {
            throw new Error('Invalid sticker data URL generated');
          }
        } catch (stickerError) {
          console.error('❌ Sticker generation failed:', stickerError);
          throw new Error(`Failed to generate sticker: ${stickerError.message}`);
        }

        // Load sticker image
        const stickerImg = document.createElement('img');
        stickerImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          stickerImg.onload = () => {
          console.log('✅ Sticker image loaded for download:', {
            width: stickerImg.width,
            height: stickerImg.height,
            naturalWidth: stickerImg.naturalWidth,
            naturalHeight: stickerImg.naturalHeight,
            qrCodeSize: qrCodeSize,
            expectedStickerWidth: qrCodeSize + padding * 2 + borderWidth * 2,
            expectedStickerHeight: qrCodeSize + padding * 2 + borderWidth * 2 + textHeight,
            sizeMatch: Math.abs(stickerImg.naturalWidth - (qrCodeSize + padding * 2 + borderWidth * 2)) < 2
          });
            if (stickerImg.naturalWidth === 0 || stickerImg.naturalHeight === 0) {
              reject(new Error('Sticker image has zero dimensions'));
              return;
            }
            resolve();
          };
          stickerImg.onerror = (error) => {
            console.error('❌ Sticker image load error:', error);
            reject(new Error('Failed to load sticker image'));
          };
          stickerImg.src = stickerDataUrl;
        });

        // stickerDisplayWidth and stickerDisplayHeight are already calculated above
        // They match the sticker natural size to avoid scaling (or are slightly larger if minimum size was used)

        console.log('📐 Sticker positioning for download (using calculated dimensions to avoid scaling):', {
          actualQrX,
          actualQrY,
          actualQrWidth,
          actualQrHeight,
          stickerDisplayWidth,
          stickerDisplayHeight,
          stickerNaturalWidth: stickerImg.naturalWidth,
          stickerNaturalHeight: stickerImg.naturalHeight,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          scalingRatio: {
            width: stickerDisplayWidth / stickerImg.naturalWidth,
            height: stickerDisplayHeight / stickerImg.naturalHeight
          }
        });

        // Draw sticker at exact positioned location and size using integer pixel coordinates
        // Using native resolution (no DPR scaling) for pixel-perfect QR code rendering
        const stickerX = Math.max(0, Math.min(Math.round(actualQrX), designImg.naturalWidth - Math.round(stickerDisplayWidth)));
        const stickerY = Math.max(0, Math.min(Math.round(actualQrY), designImg.naturalHeight - Math.round(stickerDisplayHeight)));
        const stickerWidth = Math.round(stickerDisplayWidth);
        const stickerHeight = Math.round(stickerDisplayHeight);

        // Draw sticker on the composite using exact positioned dimensions
        // Disable image smoothing to preserve QR code sharpness and scannability
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'high';
        console.log('🎨 Drawing sticker on canvas for download with exact positioned dimensions (integer pixels, no DPR scaling)...');
        console.log('🔧 Canvas rendering settings:', {
          canvasSize: { width: canvas.width, height: canvas.height },
          imageSmoothingEnabled: ctx.imageSmoothingEnabled,
          stickerNaturalSize: { width: stickerImg.naturalWidth, height: stickerImg.naturalHeight },
          stickerDisplaySize: { width: stickerWidth, height: stickerHeight },
          stickerPosition: { x: stickerX, y: stickerY },
          scalingRatio: {
            width: stickerWidth / stickerImg.naturalWidth,
            height: stickerHeight / stickerImg.naturalHeight
          },
          qrCodeSize: qrCodeSize,
          meetsMinimumSize: qrCodeSize >= MIN_FINAL_QR_SIZE
        });
        ctx.drawImage(stickerImg, stickerX, stickerY, stickerWidth, stickerHeight);
        // Re-enable image smoothing for other operations if needed
        ctx.imageSmoothingEnabled = true;
        console.log('✅ Sticker drawn for download at:', { x: stickerX, y: stickerY, width: stickerWidth, height: stickerHeight });

        // Verify sticker was drawn by checking a pixel
        const testX = Math.floor(stickerX + stickerWidth / 2);
        const testY = Math.floor(stickerY + stickerHeight / 2);
        if (testX >= 0 && testX < canvas.width && testY >= 0 && testY < canvas.height) {
          const imageData = ctx.getImageData(testX, testY, 1, 1);
          console.log('🔍 Pixel check at sticker center:', { 
            x: testX, 
            y: testY, 
            rgba: Array.from(imageData.data) 
          });
        }
        
        // Convert to blob with maximum quality for download (better than toDataURL for large images)
        // Use PNG format with maximum quality (1.0) to preserve QR code sharpness
        canvas.toBlob((blob) => {
          if (!blob) {
            throw new Error('Failed to generate blob from canvas');
          }
          console.log('✅ Canvas converted to blob:', { 
            size: blob.size, 
            type: blob.type,
            canvasSize: { width: canvas.width, height: canvas.height },
            qrCodeSize: qrCodeSize,
            meetsMinimumSize: qrCodeSize >= MIN_FINAL_QR_SIZE
          });
          
          // Quality check - warn if QR code is too small
          if (qrCodeSize < MIN_FINAL_QR_SIZE) {
            console.error(`❌ QR code size ${qrCodeSize}px is below minimum ${MIN_FINAL_QR_SIZE}px. QR code may not be scannable.`);
          }
          
          const filename = `phygital-design-${user.username}.png`;
          
          // Use the downloadFile utility
          downloadFile(blob, filename);
          
          toast.success('Final design downloaded with sticker design!');
          setIsDownloading(false);
        }, 'image/png', 1.0);
      } catch (qrError) {
        console.error('QR loading failed:', qrError);
        toast.error('Failed to generate QR code for download');
        setIsDownloading(false);
      }
      
    } catch (error) {
      console.error('Download preparation failed:', error);
      const friendlyMessage = getUserFriendlyError(error, 'download');
      toast.error(friendlyMessage);
      setIsDownloading(false);
    }
  }

  // Create AR experience
  const createARExperience = async () => {
    try {
      setIsCreatingAR(true);
      const loadingToast = toast.loading('Creating AR experience...');
      
      const response = await uploadAPI.createARExperience();
      
      const { arExperienceId, qrData } = response.data.data;
      setArExperienceId(arExperienceId);
      
      toast.dismiss(loadingToast);
      toast.success('AR experience created successfully!');
      
      // Generate QR code for the AR experience with sticker design
      if (qrData) {
        try {
          // Generate plain QR code on frontend (no watermark)
          const qrDataUrl = await generateQRCode(qrData, {
            size: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          // Generate sticker with gradient border and "SCAN ME" text
          const stickerDataUrl = await generateQRSticker(qrDataUrl, {
            variant: 'purple',
            qrSize: 200,
            borderWidth: 4,
            padding: 16
          });
          
          setQrImageUrl(stickerDataUrl);
        } catch (qrError) {
          console.warn('Failed to generate QR code:', qrError);
        }
      }
      
    } catch (error) {
      console.error('Create AR experience error:', error);
      const friendlyMessage = getUserFriendlyError(error, 'upload');
      toast.error(friendlyMessage);
    } finally {
      setIsCreatingAR(false);
    }
  };

  const tabs = [
    { id: 'design', name: 'Design', icon: Image },
    { id: 'video', name: 'Video', icon: Video },
    { id: 'qr', name: 'QR Position', icon: QrCode },
    { id: 'social', name: 'Social Links', icon: Share2 },
    { id: 'ar', name: 'AR Experience', icon: QrCode },
    { id: 'final', name: 'Final Design', icon: Download }
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Upload Your Content
            </h1>
            <p className="text-gray-600 mt-2">
              Upload your design, video, and configure your QR code settings
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Uploading...
            </span>
            <span className="text-sm font-medium text-gray-700">
              {uploadProgress}%
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors duration-200 whitespace-nowrap min-w-0 ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="card">
        {/* Design Upload */}
        {activeTab === 'design' && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                <Image className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Your Design
              </h2>
              <p className="text-gray-600">
                Choose an image file to get started with your Phygital creation
              </p>
            </div>

            {user?.uploadedFiles?.design?.url ? (
              <div className="mb-6">
                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Design uploaded successfully
                    </p>
                    <p className="text-xs text-green-600">
                      {user.uploadedFiles.design.originalName}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <img
                    src={user.uploadedFiles.design.url}
                    alt="Uploaded design"
                    className="max-w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            ) : (
              <div
                {...getDesignRootProps()}
                className={`upload-zone ${isDesignDragActive ? 'active' : ''}`}
              >
                <input {...getDesignInputProps()} />
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDesignDragActive
                    ? 'Drop your design here'
                    : 'Drag & drop your design image here'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  or click to browse files
                </p>
                <p className="text-xs text-gray-500">
                  Only JPG/JPEG format supported (max 20MB)
                </p>
              </div>
            )}
            
            {/* Design File Rejection Errors */}
            {designFileRejections.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-red-800 mb-2">❌ Invalid File Format</h4>
                    <p className="text-sm text-red-700 mb-2">
                      Only JPG/JPEG files are supported (max 20MB). Please convert your image to JPG/JPEG format and ensure it's under 20MB.
                    </p>
                    <p className="text-xs text-red-600">
                      Supported formats: .jpg, .jpeg (max 20MB)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Video Upload */}
        {activeTab === 'video' && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                <Video className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Upload Your Video
              </h2>
              <p className="text-gray-600">
                Add a video that will play when users scan your QR code
              </p>
            </div>

            {user?.uploadedFiles?.video?.url ? (
              <div className="mb-6">
                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Video uploaded successfully
                    </p>
                    <p className="text-xs text-green-600">
                      {user.uploadedFiles.video.originalName}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <video
                    src={user.uploadedFiles.video.url}
                    controls
                    className="max-w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            ) : (
              <div
                {...getVideoRootProps()}
                className={`upload-zone ${isVideoDragActive ? 'active' : ''}`}
              >
                <input {...getVideoInputProps()} />
                <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isVideoDragActive
                    ? 'Drop your video here'
                    : 'Drag & drop your video here'}
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  or click to browse files
                </p>
                <p className="text-xs text-gray-500">
                  Supports: MP4, MOV, AVI, WebM (max 50MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* QR Position */}
        {activeTab === 'qr' && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                <QrCode className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Position Your QR Code
              </h2>
              <p className="text-gray-600">
                Drag and resize the QR code to place it perfectly on your design
              </p>
            </div>

            {user?.uploadedFiles?.design?.url ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Interactive QR Code Positioning
                  </h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Drag the QR code overlay to move it, or use the resize handles to change its size.
                  </p>
                  
                <QRPositioningOverlay
                  imageUrl={user.uploadedFiles.design.url}
                  qrPosition={qrPosition}
                  onPositionChange={handleQrPositionChange}
                  onSizeChange={handleQrSizeChange}
                  onCaptureComposite={setCaptureCompositeFunction}
                  qrImageUrl={qrImageUrl}
                  imageWidth={400}
                  imageHeight={300}
                />
                </div>

                {/* Manual Input Controls (Optional) */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Manual Position Controls
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">X Position</label>
                      <input
                        type="number"
                        value={qrPosition.x}
                        onChange={(e) => setQrPosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Y Position</label>
                      <input
                        type="number"
                        value={qrPosition.y}
                        onChange={(e) => setQrPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Width (Min: {MIN_STICKER_WIDTH}px)</label>
                      <input
                        type="number"
                        value={qrPosition.width}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const newWidth = inputValue === '' ? MIN_STICKER_WIDTH : Math.max(MIN_STICKER_WIDTH, parseInt(inputValue) || MIN_STICKER_WIDTH);
                          handleQrSizeChange({ width: newWidth });
                        }}
                        className="input"
                        min={MIN_STICKER_WIDTH}
                        title={`Minimum width: ${MIN_STICKER_WIDTH}px for reliable scanning`}
                      />
                    </div>
                    <div>
                      <label className="label">Height (Min: {MIN_STICKER_HEIGHT}px)</label>
                      <input
                        type="number"
                        value={qrPosition.height}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          const newHeight = inputValue === '' ? MIN_STICKER_HEIGHT : Math.max(MIN_STICKER_HEIGHT, parseInt(inputValue) || MIN_STICKER_HEIGHT);
                          handleQrSizeChange({ height: newHeight });
                        }}
                        className="input"
                        min={MIN_STICKER_HEIGHT}
                        title={`Minimum height: ${MIN_STICKER_HEIGHT}px for reliable scanning`}
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={saveQRPosition}
                  className="btn-primary"
                  disabled={!captureCompositeFunction}
                >
                  {captureCompositeFunction ? 'Save Composite Design' : 'Loading...'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600">
                  Please upload a design image first to set QR code position
                </p>
              </div>
            )}
          </div>
        )}

        {/* Social Links */}
        {activeTab === 'social' && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                <Share2 className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Add Social Links
              </h2>
              <p className="text-gray-600">
                Connect your social media profiles to your personalized page
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Instagram</label>
                <input
                  type="url"
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                  placeholder="https://instagram.com/yourusername"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Facebook</label>
                <input
                  type="url"
                  value={socialLinks.facebook}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, facebook: e.target.value }))}
                  placeholder="https://facebook.com/yourpage"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Twitter</label>
                <input
                  type="url"
                  value={socialLinks.twitter}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                  placeholder="https://twitter.com/yourusername"
                  className="input"
                />
              </div>
              <div>
                <label className="label">LinkedIn</label>
                <input
                  type="url"
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Website</label>
                <input
                  type="url"
                  value={socialLinks.website}
                  onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://yourwebsite.com"
                  className="input"
                />
              </div>
            </div>

            <button
              onClick={saveSocialLinks}
              className="btn-primary mt-6"
            >
              Save Social Links
            </button>
          </div>
        )}

        {/* AR Experience */}
        {activeTab === 'ar' && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                <QrCode className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Create AR Experience
              </h2>
              <p className="text-gray-600">
                Generate an AR experience that overlays your video on the tracked image
              </p>
            </div>

            {user?.uploadedFiles?.design?.url && user?.uploadedFiles?.video?.url && user?.qrPosition ? (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">Ready to create AR experience</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    All required files are uploaded and QR position is set
                  </p>
                </div>

                {!arExperienceId ? (
                  <div className="text-center">
                    <button
                      onClick={createARExperience}
                      disabled={isCreatingAR}
                      className="btn-primary flex items-center justify-center mx-auto"
                    >
                      {isCreatingAR ? (
                        <>
                          <LoadingSpinner size="sm" />
                          <span className="ml-2">Creating AR Experience...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Create AR Experience
                        </>
                      )}
                    </button>
                    <p className="text-gray-500 text-sm mt-2">
                      This will generate a .mind file and create a QR code for AR scanning
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                        <span className="text-blue-800 font-medium">AR Experience Created!</span>
                      </div>
                      <p className="text-blue-700 text-sm mt-1">
                        Experience ID: {arExperienceId}
                      </p>
                    </div>

                    {qrImageUrl && (
                      <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Your AR QR Code</h3>
                        <QRSticker 
                          qrCodeUrl={qrImageUrl}
                          variant="purple"
                          size="medium"
                        />
                        <p className="text-gray-600 text-sm mt-2">
                          Scan this QR code to view your AR experience
                        </p>
                        <div className="mt-4">
                          <a
                            href={`/scan/${arExperienceId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary inline-flex items-center"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Preview AR Experience
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800 font-medium">Requirements not met</span>
                </div>
                <ul className="text-yellow-700 text-sm mt-2 space-y-1">
                  {!user?.uploadedFiles?.design?.url && <li>• Upload a design image</li>}
                  {!user?.uploadedFiles?.video?.url && <li>• Upload a video</li>}
                  {!user?.qrPosition && <li>• Set QR code position</li>}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Final Design */}
        {activeTab === 'final' && (
          <div>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
                <Download className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Download Your Design
              </h2>
              <p className="text-gray-600">
                Generate and download your final design with the QR code overlaid
              </p>
            </div>

            {user?.uploadedFiles?.design?.url && user?.qrPosition ? (
              <div className="space-y-6">
                {/* Preview Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Preview
                    </h3>
                    <button
                      onClick={generatePreview}
                      disabled={isGeneratingPreview}
                      className="btn-secondary flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {isGeneratingPreview ? 'Generating...' : 'Generate Preview'}
                    </button>
                  </div>
                  
                  {finalDesignPreview ? (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <img
                        src={finalDesignPreview}
                        alt="Final design with QR code"
                        className="max-w-full h-auto rounded-lg shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Eye className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600">
                        Click "Generate Preview" to see your final design with QR code
                      </p>
                    </div>
                  )}
                </div>

                {/* Download Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Download
                      </h3>
                      <p className="text-sm text-gray-600">
                        Download your final design as a PNG file
                      </p>
                    </div>
                    <button
                      onClick={downloadFinalDesign}
                      disabled={isDownloading}
                      className="btn-primary flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isDownloading ? 'Downloading...' : 'Download Design'}
                    </button>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">
                          Ready to download!
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Your design will be downloaded as "phygital-design-{user.username}.png"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">
                  Complete the setup first
                </p>
                <p className="text-sm text-gray-500">
                  Upload a design and set QR code position to generate your final design
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadPage
