/**
 * QR-Links-AR Video Page
 * Enhanced wizard-based flow with design upload, QR positioning, video, documents, and contact info
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { generateQRCode, uploadAPI, phygitalizedAPI } from '../../utils/api'
import { downloadQRCode, generateAdvancedQRCode } from '../../utils/qrGenerator'
import { useAuth } from '../../contexts/AuthContext'
import { generateHumanReadableCampaignName } from '../../utils/campaignNameGenerator'
import QRPositioningOverlay from '../../components/QRPositioning/QRPositioningOverlay'
import { getUserFriendlyError, getFileError } from '../../utils/userFriendlyErrors'
import { generateQRSticker } from '../../utils/qrStickerGenerator'
import { 
  QrCode, 
  Download, 
  CheckCircle,
  Video,
  Upload,
  X,
  Share2,
  ExternalLink,
  Sparkles,
  Tag,
  Image,
  FileText,
  Phone,
  MessageCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import SocialLinksInput from '../../components/Phygitalized/SocialLinksInput'

// Minimum dimensions for scannable QR code sticker
const MIN_STICKER_WIDTH = 120
const MIN_STICKER_HEIGHT = 160

const QRLinksARVideoPage = () => {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const [qrGenerated, setQrGenerated] = useState(false)
  
  // Step 1: Campaign Name
  const [campaignName, setCampaignName] = useState('')
  
  // Step 2: Design Upload
  const [designFile, setDesignFile] = useState(null)
  const [designUrl, setDesignUrl] = useState('')
  const [isUploadingDesign, setIsUploadingDesign] = useState(false)
  const [designUploadProgress, setDesignUploadProgress] = useState(0)
  
  // Step 3: QR Position
  const [qrPosition, setQrPosition] = useState({
    x: 0,
    y: 0,
    width: MIN_STICKER_WIDTH,
    height: MIN_STICKER_HEIGHT
  })
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [captureCompositeFunction, setCaptureCompositeFunction] = useState(null)
  const captureCompositeFunctionRef = useRef(null) // Use ref to persist function across renders
  const [qrPositionSet, setQrPositionSet] = useState(false) // Track if user has actually set the position
  
  // Step 4: Video Upload
  const [arVideoFile, setArVideoFile] = useState(null)
  const [arVideoUrl, setArVideoUrl] = useState('')
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [videoUploadProgress, setVideoUploadProgress] = useState(0)
  
  // Step 5: Documents Upload
  const [documentFiles, setDocumentFiles] = useState([])
  const [documentUrls, setDocumentUrls] = useState([])
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false)
  
  // Step 6: Contact & Social
  const [phoneNumber, setPhoneNumber] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [socialLinks, setSocialLinks] = useState({})
  
  // Step 7: Final Design
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [arExperienceUrl, setArExperienceUrl] = useState('')
  const [projectId, setProjectId] = useState(null)
  const [compositeDesignUrl, setCompositeDesignUrl] = useState('')

  // Auto-generate campaign name with uniqueness check
  useEffect(() => {
    if (user?.username && !campaignName) {
      const existingProjects = user?.projects || []
      const autoName = generateHumanReadableCampaignName(user.username, 'QR Links AR Video', existingProjects)
      setCampaignName(autoName)
    }
  }, [user?.username, campaignName, user?.projects])

  // Design upload dropzone
  const onDesignDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const maxSizeMB = 20
    const fileError = getFileError(file, maxSizeMB, ['jpg', 'jpeg'])
    
    if (fileError) {
      toast.error(fileError.message, { duration: 5000 })
      return
    }

    // Store file for later upload (after project creation)
    setDesignFile(file)
    const previewUrl = URL.createObjectURL(file)
    setDesignUrl(previewUrl)
    toast.success('Design file selected. It will be uploaded when you generate the QR code.')
  }, [])

  const { getRootProps: getDesignRootProps, getInputProps: getDesignInputProps, isDragActive: isDesignDragActive } = useDropzone({
    onDrop: onDesignDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg']
    },
    maxFiles: 1
  })

  const removeDesign = () => {
    if (designUrl && designUrl.startsWith('blob:')) {
      URL.revokeObjectURL(designUrl)
    }
    setDesignFile(null)
    setDesignUrl('')
  }

  // Video upload dropzone
  const onVideoDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file')
      return
    }

    setArVideoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setArVideoUrl(previewUrl)
    toast.success('Video file selected. It will be uploaded when you generate the QR code.')
  }, [])

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1
  })

  const removeVideo = () => {
    if (arVideoUrl && arVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(arVideoUrl)
    }
    setArVideoFile(null)
    setArVideoUrl('')
  }

  // Documents upload dropzone
  const onDocumentsDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const newFiles = acceptedFiles.filter(file => {
      // Allow PDF, Word docs, images, and other common document types
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'text/plain'
      ]
      return allowedTypes.includes(file.type) || file.name.match(/\.(pdf|doc|docx|txt|png|jpg|jpeg)$/i)
    })

    if (newFiles.length === 0) {
      toast.error('Please upload valid document files (PDF, Word, images, or text files)')
      return
    }

    setDocumentFiles(prev => [...prev, ...newFiles])
    const newUrls = newFiles.map(file => URL.createObjectURL(file))
    setDocumentUrls(prev => [...prev, ...newUrls])
    toast.success(`${newFiles.length} document(s) selected. They will be uploaded when you generate the QR code.`)
  }, [])

  const { getRootProps: getDocumentsRootProps, getInputProps: getDocumentsInputProps, isDragActive: isDocumentsDragActive } = useDropzone({
    onDrop: onDocumentsDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'text/plain': ['.txt']
    },
    multiple: true
  })

  const removeDocument = (index) => {
    if (documentUrls[index] && documentUrls[index].startsWith('blob:')) {
      URL.revokeObjectURL(documentUrls[index])
    }
    setDocumentFiles(prev => prev.filter((_, i) => i !== index))
    setDocumentUrls(prev => prev.filter((_, i) => i !== index))
  }

  // QR Position handlers
  const handleQrPositionChange = useCallback((newPosition) => {
    setQrPosition(prev => {
      const updated = { ...prev, ...newPosition }
      if (newPosition.width !== undefined) {
        updated.width = Math.max(MIN_STICKER_WIDTH, updated.width)
      }
      if (newPosition.height !== undefined) {
        updated.height = Math.max(MIN_STICKER_HEIGHT, updated.height)
      }
      // Mark that position has been set whenever position changes
      // This ensures that if user drags or resizes, we know they've interacted with it
      if (Object.keys(newPosition).length > 0) {
        setQrPositionSet(true)
      }
      return updated
    })
  }, [])

  const handleQrSizeChange = useCallback((newSize) => {
    setQrPosition(prev => {
      let width = prev.width
      let height = prev.height
      
      if (newSize.width !== undefined) {
        width = Math.max(MIN_STICKER_WIDTH, newSize.width)
        const stickerAspectRatio = prev.height / prev.width || 160 / 120
        height = width * stickerAspectRatio
        if (height < MIN_STICKER_HEIGHT) {
          height = MIN_STICKER_HEIGHT
          width = height / stickerAspectRatio
        }
      } else if (newSize.height !== undefined) {
        height = Math.max(MIN_STICKER_HEIGHT, newSize.height)
        const stickerAspectRatio = prev.height / prev.width || 160 / 120
        width = height / stickerAspectRatio
        if (width < MIN_STICKER_WIDTH) {
          width = MIN_STICKER_WIDTH
          height = width * stickerAspectRatio
        }
      } else {
        width = Math.max(MIN_STICKER_WIDTH, prev.width)
        height = Math.max(MIN_STICKER_HEIGHT, prev.height)
      }
      
      // Mark that position has been set
      setQrPositionSet(true)
      
      return { ...prev, width, height }
    })
  }, [])

  // Generate QR code image for positioning (always generate when design is available)
  useEffect(() => {
    if (designUrl) {
      // Generate a temporary QR code for positioning preview
      // The actual AR experience URL will be set when project is created
      const tempUrl = projectId 
        ? `${window.location.origin}/#/ar-experience/${projectId}`
        : `${window.location.origin}/#/ar-experience/temp`
      generateQRCode(tempUrl, { size: 200 }).then(dataUrl => {
        setQrImageUrl(dataUrl)
      }).catch(err => {
        console.error('Error generating QR for positioning:', err)
      })
    }
  }, [designUrl, projectId])

  // Memoized callback to receive capture function from QRPositioningOverlay
  // Use ref to avoid infinite loops - only update state once when function is first received
  const handleCaptureCompositeReady = useCallback((func) => {
    if (func && typeof func === 'function') {
      // Store in ref immediately (always update ref to latest function)
      captureCompositeFunctionRef.current = func
      // Only update state if it's not already set (one-time initialization)
      setCaptureCompositeFunction(prev => {
        if (!prev || typeof prev !== 'function') {
          return func
        }
        return prev // Keep existing state to avoid re-renders
      })
    }
  }, [])

  // Ensure captureCompositeFunction is set when design and QR image are available
  useEffect(() => {
    if (designUrl && qrImageUrl && !captureCompositeFunction) {
      console.log('🔄 Design and QR image available, waiting for QRPositioningOverlay to initialize...')
    }
  }, [designUrl, qrImageUrl, captureCompositeFunction])

  // Step navigation handlers
  const handleContinueToStep2 = () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }
    setCurrentStep(2)
  }

  const handleContinueToStep3 = () => {
    if (!designFile && !designUrl) {
      toast.error('Please upload a design image first')
      return
    }
    setCurrentStep(3)
  }

  const handleContinueToStep4 = () => {
    if (!qrPosition || qrPosition.width < MIN_STICKER_WIDTH || qrPosition.height < MIN_STICKER_HEIGHT) {
      toast.error(`QR position size is too small! Minimum size: ${MIN_STICKER_WIDTH}×${MIN_STICKER_HEIGHT}px`)
      return
    }
    
    // If user hasn't explicitly set position, mark it as set now (they've at least seen it)
    if (!qrPositionSet) {
      setQrPositionSet(true)
    }
    
    // Ensure we have the capture function
    if (!captureCompositeFunction && !captureCompositeFunctionRef.current) {
      toast.error('QR positioning tool is still initializing. Please wait a moment and try again.')
      return
    }
    
    setCurrentStep(4)
  }

  const handleContinueToStep5 = () => {
    if (!arVideoFile && !arVideoUrl) {
      toast.error('Please upload an AR video first')
      return
    }
    setCurrentStep(5)
  }

  const handleContinueToStep6 = () => {
    // Documents are optional, so we can continue
    setCurrentStep(6)
  }

  const handleContinueToStep7 = () => {
    // Contact and social links are optional
    setCurrentStep(7)
  }

  // Final generation and download
  const handleGenerateAndDownload = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    if (!designFile && !designUrl) {
      toast.error('Please upload a design image')
      return
    }

    if (!arVideoFile && !arVideoUrl) {
      toast.error('Please upload an AR video')
      return
    }

    // Check if QR position has been set (user has interacted with it)
    if (!qrPositionSet) {
      toast.error('Please go to Step 3 and drag the QR code to set its position on your design.')
      return
    }

      // Get the composite function (try state first, then ref)
      const compositeFunction = captureCompositeFunction || captureCompositeFunctionRef.current
    
    if (!compositeFunction || typeof compositeFunction !== 'function') {
      console.error('Composite function not available:', { 
        captureCompositeFunction: typeof captureCompositeFunction,
        refFunction: typeof captureCompositeFunctionRef.current,
        qrPositionSet 
      })
      toast.error('QR positioning function not ready. Please go back to Step 3 and wait for the positioning tool to load.')
      return
    }

    try {
      setIsGenerating(true)
      
      // Create project first
      let createdProjectId = null
      try {
        const projectResponse = await uploadAPI.createProject({
          name: campaignName.trim(),
          description: `QR-Links-AR Video campaign with design, video, documents, and contact info`,
          campaignType: 'qr-links-ar-video',
          phygitalizedData: {
            phoneNumber: phoneNumber.trim(),
            whatsappNumber: whatsappNumber.trim(),
            socialLinks: Object.fromEntries(
              Object.entries(socialLinks).map(([key, value]) => [
                key,
                value && value.trim()
                  ? (value.startsWith('http://') || value.startsWith('https://') 
                      ? value 
                      : `https://${value}`)
                  : ''
              ])
            ),
            qrPosition: qrPosition,
            documentUrls: []
          }
        })
        
        if (projectResponse.data?.data?.user) {
          updateUser(projectResponse.data.data.user)
        }
        
        if (projectResponse.data?.data?.project?.id) {
          createdProjectId = projectResponse.data.data.project.id
          setProjectId(createdProjectId)
        }
      } catch (projectError) {
        console.error('Error creating project:', projectError)
        toast.error('Failed to create campaign. Please try again.')
        setIsGenerating(false)
        return
      }

      // Upload design to Cloudinary
      let finalDesignUrl = designUrl
      if (designFile && (!designUrl || designUrl.startsWith('blob:') || designUrl.startsWith('data:'))) {
        try {
          const formData = new FormData()
          formData.append('design', designFile)
          const designResponse = await uploadAPI.uploadDesign(formData)
          if (designResponse.data?.data?.user?.uploadedFiles?.design?.url) {
            finalDesignUrl = designResponse.data.data.user.uploadedFiles.design.url
            setDesignUrl(finalDesignUrl)
            updateUser(designResponse.data.data.user)
          }
        } catch (designError) {
          console.error('Error uploading design:', designError)
          toast.error('Failed to upload design to Cloudinary')
        }
      }

      // Upload video to Cloudinary
      let finalVideoUrl = arVideoUrl
      if (arVideoFile && (!arVideoUrl || arVideoUrl.startsWith('blob:'))) {
        try {
          console.log('Uploading video file:', {
            fileName: arVideoFile.name,
            fileSize: arVideoFile.size,
            fileType: arVideoFile.type,
            projectId: createdProjectId
          })
          
          const variation = 'qr-links-ar-video'
          const uploadResponse = await phygitalizedAPI.uploadFile(variation, createdProjectId, arVideoFile, 'video')
          
          console.log('Video upload response:', uploadResponse)
          
          if (uploadResponse.data?.success && uploadResponse.data?.data?.file) {
            finalVideoUrl = uploadResponse.data.data.file.url
            setArVideoUrl(finalVideoUrl)
            console.log('Video uploaded successfully:', finalVideoUrl)
          } else {
            throw new Error('Upload response did not contain file URL')
          }
        } catch (uploadError) {
          console.error('Error uploading video:', uploadError)
          console.error('Error details:', {
            message: uploadError.message,
            code: uploadError.code,
            response: uploadError.response?.data,
            status: uploadError.response?.status
          })
          
          // Check if it's a timeout error
          if (uploadError.code === 'ECONNABORTED' || uploadError.message?.includes('timeout')) {
            toast.error('Video upload is taking longer than expected. Please try again with a smaller file or check your internet connection.')
          } else {
            const errorMessage = uploadError.response?.data?.message || 
                                uploadError.response?.data?.error || 
                                uploadError.message || 
                                'Failed to upload video to Cloudinary'
            toast.error(errorMessage)
          }
          
          // Continue with existing URL if available, otherwise throw
          if (!finalVideoUrl) {
            throw new Error('Video upload failed and no existing video URL available')
          }
        }
      }

      // Upload documents to Cloudinary
      const finalDocumentUrls = []
      for (let i = 0; i < documentFiles.length; i++) {
        const docFile = documentFiles[i]
        try {
          const variation = 'qr-links-ar-video'
          const docType = docFile.type === 'application/pdf' ? 'pdf' : 'document'
          const uploadResponse = await phygitalizedAPI.uploadFile(variation, createdProjectId, docFile, docType)
          if (uploadResponse.data?.success && uploadResponse.data?.data?.file) {
            finalDocumentUrls.push(uploadResponse.data.data.file.url)
          }
        } catch (docError) {
          console.error('Error uploading document:', docError)
          toast.error(`Failed to upload document: ${docFile.name}`)
        }
      }

      // Generate AR experience URL - use new route for QR Links AR Video
      const arExperienceUrl = `${window.location.origin}/#/ar/qr-links-ar-video/user/${user._id}/project/${createdProjectId}`
      setArExperienceUrl(arExperienceUrl)
      
      // Generate final design with QR code embedded (replicating upload page logic)
      let finalDesignDataUrl = null
      let finalCompositeUrl = ''
      let qrDataUrl = '' // Declare outside try block so it's accessible later
      
      // Replicate upload page's final design generation logic
      try {
        // Create canvas for final design
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Load the original design image
        const designImg = document.createElement('img')
        designImg.crossOrigin = 'anonymous'
        
        if (!finalDesignUrl) {
          throw new Error('Design image URL not found')
        }
        
        await new Promise((resolve, reject) => {
          designImg.onload = resolve
          designImg.onerror = reject
          designImg.src = finalDesignUrl
        })
        
        // Set canvas to image dimensions
        canvas.width = designImg.naturalWidth
        canvas.height = designImg.naturalHeight
        
        // Draw the design image
        ctx.drawImage(designImg, 0, 0)
        
        // Get QR position - already in actual image coordinates
        const qrPos = qrPosition
        let actualQrX, actualQrY, actualQrWidth, actualQrHeight
        
        // Check if position needs scaling (if values are > naturalWidth, they're in display coordinates)
        if (qrPos.width > designImg.naturalWidth || qrPos.height > designImg.naturalHeight) {
          // Position appears to be in display coordinates, need to scale
          const maxDisplayWidth = 800 // Match QRPositioningOverlay display width
          const imageAspectRatio = designImg.naturalWidth / designImg.naturalHeight
          let displayWidth, displayHeight
          
          if (imageAspectRatio > 1) {
            displayWidth = maxDisplayWidth
            displayHeight = maxDisplayWidth / imageAspectRatio
          } else {
            displayHeight = 600 // Match QRPositioningOverlay display height
            displayWidth = 600 * imageAspectRatio
            if (displayWidth > maxDisplayWidth) {
              displayWidth = maxDisplayWidth
              displayHeight = maxDisplayWidth / imageAspectRatio
            }
          }
          
          actualQrX = (qrPos.x / displayWidth) * designImg.naturalWidth
          actualQrY = (qrPos.y / displayHeight) * designImg.naturalHeight
          actualQrWidth = (qrPos.width / displayWidth) * designImg.naturalWidth
          actualQrHeight = (qrPos.height / displayHeight) * designImg.naturalHeight
        } else {
          // Position is already in actual image coordinates
          actualQrX = qrPos.x
          actualQrY = qrPos.y
          actualQrWidth = qrPos.width
          actualQrHeight = qrPos.height
        }
        
        // Use the AR experience URL we already generated (with correct route for QR Links AR Video)
        const qrCodeUrl = arExperienceUrl
        console.log('🔗 Generated QR code URL for download:', qrCodeUrl)
        
        // Calculate QR code size to match positioned sticker dimensions
        const padding = 16
        const borderWidth = 4
        const MIN_QR_CODE_SIZE = 80
        const qrCodeSize = Math.max(MIN_QR_CODE_SIZE, Math.round(actualQrWidth - (padding * 2 + borderWidth * 2)))
        
        // Generate plain QR code
        qrDataUrl = await generateQRCode(qrCodeUrl, {
          size: qrCodeSize,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        setQrCodeUrl(qrDataUrl)
        
        // Generate sticker with gradient border and "SCAN ME" text
        const stickerDataUrl = await generateQRSticker(qrDataUrl, {
          variant: 'purple',
          qrSize: qrCodeSize,
          borderWidth: 4,
          padding: 16
        })
        
        // Load sticker image
        const stickerImg = document.createElement('img')
        stickerImg.crossOrigin = 'anonymous'
        await new Promise((resolve, reject) => {
          stickerImg.onload = resolve
          stickerImg.onerror = reject
          stickerImg.src = stickerDataUrl
        })
        
        // Draw sticker at exact positioned location and size
        const stickerX = Math.max(0, Math.min(actualQrX, canvas.width - actualQrWidth))
        const stickerY = Math.max(0, Math.min(actualQrY, canvas.height - actualQrHeight))
        
        // Draw sticker on canvas
        ctx.drawImage(stickerImg, stickerX, stickerY, actualQrWidth, actualQrHeight)
        
        // Convert to data URL for download
        finalDesignDataUrl = canvas.toDataURL('image/png', 1.0)
        console.log('✅ Final design generated with QR code embedded')
        
        // Upload composite design to Cloudinary
        try {
          // Convert data URL to Blob, then to File
          const response = await fetch(finalDesignDataUrl)
          const blob = await response.blob()
          const compositeFile = new File([blob], `composite-${createdProjectId}-${Date.now()}.png`, { type: 'image/png' })
          
          // Upload composite image using phygitalized API
          const variation = 'qr-links-ar-video'
          const compositeUploadResponse = await phygitalizedAPI.uploadFile(variation, createdProjectId, compositeFile, 'image')
          
          if (compositeUploadResponse.data?.success && compositeUploadResponse.data?.data?.file?.url) {
            finalCompositeUrl = compositeUploadResponse.data.data.file.url
            setCompositeDesignUrl(finalCompositeUrl)
            console.log('✅ Composite design uploaded successfully:', finalCompositeUrl)
          } else {
            throw new Error('Composite upload response did not contain file URL')
          }
        } catch (compositeError) {
          console.error('Error uploading composite design:', compositeError)
          toast.error('Failed to upload composite design. The campaign will be saved without it.')
        }
      } catch (designError) {
        console.error('Error generating final design:', designError)
        toast.error('Failed to generate final design with QR code. Please try again.')
        setIsGenerating(false)
        return
      }

      // Update project with all data
      try {
        await phygitalizedAPI.updateCampaign(createdProjectId, {
          qrCodeUrl: qrDataUrl || '', // Use empty string if QR generation failed
          arExperienceUrl: arExperienceUrl,
          phygitalizedData: {
            videoUrl: finalVideoUrl,
            designUrl: finalDesignUrl,
            compositeDesignUrl: finalCompositeUrl, // This is needed for AR image detection
            documentUrls: finalDocumentUrls,
            phoneNumber: phoneNumber.trim() || '',
            whatsappNumber: whatsappNumber.trim() || '',
            socialLinks: Object.fromEntries(
              Object.entries(socialLinks).map(([key, value]) => [
                key,
                value && value.trim()
                  ? (value.startsWith('http://') || value.startsWith('https://') 
                      ? value 
                      : `https://${value}`)
                  : ''
              ])
            ),
            qrPosition: qrPosition
          },
          fileUrls: {
            video: { url: finalVideoUrl },
            design: { url: finalDesignUrl },
            compositeDesign: { 
              url: finalCompositeUrl,
              filename: `composite-${createdProjectId}`,
              originalName: `composite-design.png`,
              uploadedAt: new Date().toISOString()
            }, // Save composite in uploadedFiles for easy access
            // Note: documents are stored in phygitalizedData.documentUrls array
            // Individual document files are uploaded but we store URLs in the array
          }
        })
        
        setQrGenerated(true)
        
        // Download final design with QR code embedded (replicating upload page logic)
        if (finalDesignDataUrl) {
          try {
            const blob = await fetch(finalDesignDataUrl).then(r => r.blob())
            const filename = `${campaignName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()}_final-design.png`
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
            toast.success('Final design downloaded and campaign saved successfully!', {
              duration: 4000,
              icon: '✅'
            })
          } catch (downloadError) {
            console.error('Download error:', downloadError)
            toast.success('Campaign saved! Download failed, but design is available in campaign history.', {
              duration: 4000
            })
          }
        } else {
          toast.success('Campaign saved successfully!', { duration: 4000 })
        }
      } catch (updateError) {
        console.error('Error updating campaign:', updateError)
        toast.error('Failed to save campaign. Please try again.')
      }
    } catch (error) {
      console.error('Generation error:', error)
      toast.error('Failed to generate campaign')
    } finally {
      setIsGenerating(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setCurrentStep(1)
    setQrGenerated(false)
    setCampaignName('')
    removeDesign()
    removeVideo()
    documentFiles.forEach((_, i) => removeDocument(i))
    setPhoneNumber('')
    setWhatsappNumber('')
    setSocialLinks({})
    setQrPosition({ x: 0, y: 0, width: MIN_STICKER_WIDTH, height: MIN_STICKER_HEIGHT })
    setQrPositionSet(false)
    setCaptureCompositeFunction(null)
    setProjectId(null)
    setArExperienceUrl('')
    setQrCodeUrl('')
    setCompositeDesignUrl('')
  }

  // Step indicator component
  const StepIndicator = () => {
    const steps = [
      { num: 1, label: 'Campaign Name' },
      { num: 2, label: 'Upload Design' },
      { num: 3, label: 'Set QR Position' },
      { num: 4, label: 'Upload Video' },
      { num: 5, label: 'Upload Documents' },
      { num: 6, label: 'Contact & Social' },
      { num: 7, label: 'Download Design' }
    ]

    return (
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center justify-center gap-2 min-w-max">
          {steps.map((step, index) => (
            <React.Fragment key={step.num}>
              <div className={`flex items-center gap-2 ${currentStep >= step.num ? 'text-neon-blue' : 'text-slate-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  currentStep >= step.num 
                    ? 'bg-neon-blue/20 border-neon-blue text-neon-blue' 
                    : 'bg-slate-800/50 border-slate-600 text-slate-500'
                }`}>
                  {currentStep > step.num ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-semibold">{step.num}</span>
                  )}
                </div>
                <span className="text-xs font-medium hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 w-8 sm:w-12 ${currentStep > step.num ? 'bg-neon-blue' : 'bg-slate-700'}`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2 flex items-center">
          <Sparkles className="w-8 h-8 mr-3" style={{ color: 'var(--theme-primary, #00D4FF)' }} />
          QR-Links-AR Video
        </h1>
        <p className="text-slate-300">
          Create a QR code with AR video experience, documents, and contact information
        </p>
      </div>

      {/* Always keep QRPositioningOverlay mounted (hidden) when design is available to maintain captureCompositeFunction */}
      {designUrl && (
        <div style={{ position: 'absolute', left: '-9999px', width: '800px', height: '600px', overflow: 'hidden', pointerEvents: 'none' }}>
          <QRPositioningOverlay
            imageUrl={designUrl}
            qrPosition={qrPosition}
            onPositionChange={handleQrPositionChange}
            onSizeChange={handleQrSizeChange}
            onCaptureComposite={handleCaptureCompositeReady}
            qrImageUrl={qrImageUrl}
            imageWidth={800}
            imageHeight={600}
          />
        </div>
      )}

      <StepIndicator />

      {/* Step 1: Campaign Name */}
      {currentStep === 1 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <Tag className="w-5 h-5 mr-2 text-neon-blue" />
                    Step 1: Campaign Name
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Enter a name for your campaign
                  </p>
                </div>
                <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                  Step 1 of 7
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-neon-blue" />
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name (e.g., AR Product Launch)"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                />
              </div>

              <button
                onClick={handleContinueToStep2}
                disabled={!campaignName.trim()}
                className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Upload Design */}
      {currentStep === 2 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <Image className="w-5 h-5 mr-2 text-neon-blue" />
                    Step 2: Upload Design
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Upload your design image (JPG/JPEG only, max 20MB)
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    Step 2 of 7
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {designFile ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Image className="w-5 h-5 mr-3 text-neon-cyan" />
                        <div>
                          <p className="text-slate-100 font-medium">{designFile.name}</p>
                          <p className="text-sm text-slate-400">
                            {(designFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeDesign}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  {designUrl && (
                    <img
                      src={designUrl}
                      alt="Design preview"
                      className="w-full rounded-lg border border-slate-600/30"
                    />
                  )}
                </div>
              ) : (
                <div
                  {...getDesignRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDesignDragActive 
                      ? 'border-neon-cyan bg-neon-cyan/10' 
                      : 'border-slate-600/50 hover:border-neon-cyan/50'
                    }
                  `}
                >
                  <input {...getDesignInputProps()} />
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-300 mb-2">
                    {isDesignDragActive ? 'Drop the design here' : 'Drag & drop a design image here'}
                  </p>
                  <p className="text-sm text-slate-400">
                    or click to browse
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Only JPG/JPEG format supported (max 20MB)
                  </p>
                </div>
              )}

              <button
                onClick={handleContinueToStep3}
                disabled={!designFile && !designUrl}
                className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Set QR Position */}
      {currentStep === 3 && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <QrCode className="w-5 h-5 mr-2 text-neon-purple" />
                    Step 3: Set QR Position
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Drag and resize the QR code to position it on your design
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    Step 3 of 7
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {designUrl ? (
                <div className="bg-slate-800/30 p-4 rounded-lg">
                  <QRPositioningOverlay
                    imageUrl={designUrl}
                    qrPosition={qrPosition}
                    onPositionChange={handleQrPositionChange}
                    onSizeChange={handleQrSizeChange}
                    onCaptureComposite={handleCaptureCompositeReady}
                    qrImageUrl={qrImageUrl}
                    imageWidth={800}
                    imageHeight={600}
                  />
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">Please upload a design first</p>
                </div>
              )}

              {(!captureCompositeFunction && !captureCompositeFunctionRef.current) && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                  <p className="text-xs text-yellow-400">
                    ⏳ QR positioning tool is initializing... Please wait a moment.
                  </p>
                </div>
              )}

              <button
                onClick={handleContinueToStep4}
                disabled={(!captureCompositeFunction && !captureCompositeFunctionRef.current) || qrPosition.width < MIN_STICKER_WIDTH || qrPosition.height < MIN_STICKER_HEIGHT}
                className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Upload Video */}
      {currentStep === 4 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <Video className="w-5 h-5 mr-2 text-neon-blue" />
                    Step 4: Upload AR Video
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Upload the video that will play in the AR experience
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    Step 4 of 7
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {arVideoFile ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Video className="w-5 h-5 mr-3 text-neon-cyan" />
                        <div>
                          <p className="text-slate-100 font-medium">{arVideoFile.name}</p>
                          <p className="text-sm text-slate-400">
                            {(arVideoFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeVideo}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  {arVideoUrl && (
                    <video
                      src={arVideoUrl}
                      controls
                      className="w-full rounded-lg"
                    />
                  )}
                </div>
              ) : (
                <div
                  {...getVideoRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isVideoDragActive 
                      ? 'border-neon-cyan bg-neon-cyan/10' 
                      : 'border-slate-600/50 hover:border-neon-cyan/50'
                    }
                  `}
                >
                  <input {...getVideoInputProps()} />
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-300 mb-2">
                    {isVideoDragActive ? 'Drop the video here' : 'Drag & drop an AR video here'}
                  </p>
                  <p className="text-sm text-slate-400">
                    or click to browse
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Supports: MP4, MOV, AVI, WEBM
                  </p>
                </div>
              )}

              <button
                onClick={handleContinueToStep5}
                disabled={!arVideoFile && !arVideoUrl}
                className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5: Upload Documents */}
      {currentStep === 5 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-neon-blue" />
                    Step 5: Upload Documents (Optional)
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Upload PDFs, Word documents, images, or text files
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    Step 5 of 7
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {documentFiles.length > 0 && (
                <div className="space-y-2">
                  {documentFiles.map((file, index) => (
                    <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 mr-3 text-neon-cyan" />
                          <div>
                            <p className="text-slate-100 font-medium">{file.name}</p>
                            <p className="text-sm text-slate-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeDocument(index)}
                          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div
                {...getDocumentsRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDocumentsDragActive 
                    ? 'border-neon-cyan bg-neon-cyan/10' 
                    : 'border-slate-600/50 hover:border-neon-cyan/50'
                  }
                `}
              >
                <input {...getDocumentsInputProps()} />
                <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-300 mb-2">
                  {isDocumentsDragActive ? 'Drop documents here' : 'Drag & drop documents here'}
                </p>
                <p className="text-sm text-slate-400">
                  or click to browse
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Supports: PDF, DOC, DOCX, images, TXT
                </p>
              </div>

              <button
                onClick={handleContinueToStep6}
                className="w-full btn-primary flex items-center justify-center"
              >
                <span>Continue</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 6: Contact & Social Links */}
      {currentStep === 6 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <Share2 className="w-5 h-5 mr-2 text-neon-blue" />
                    Step 6: Contact & Social Links (Optional)
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Add your contact information and social media links
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    Step 6 of 7
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-neon-cyan" />
                  Contact Information
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                  />
                </div>
              </div>

              {/* Social Links */}
              <div>
                <SocialLinksInput
                  value={socialLinks}
                  onChange={setSocialLinks}
                  showSelection={true}
                />
              </div>

              <button
                onClick={handleContinueToStep7}
                className="w-full btn-primary flex items-center justify-center"
              >
                <span>Continue</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 7: Download Final Design */}
      {currentStep === 7 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <Download className="w-5 h-5 mr-2 text-neon-green" />
                    Step 7: Generate & Download Final Design
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Generate your QR code and download the final composite design
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStep(6)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    Back
                  </button>
                  <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    Step 7 of 7
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {qrGenerated && projectId ? (
                <div className="space-y-4">
                  <div className="bg-neon-green/10 border border-neon-green/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-neon-green" />
                      <p className="text-sm font-medium text-neon-green">Campaign Created Successfully!</p>
                    </div>
                    <p className="text-xs text-slate-300 mb-3">
                      Your final design has been downloaded and saved to your campaign history.
                    </p>
                    <button
                      onClick={() => navigate('/projects')}
                      className="w-full btn-secondary flex items-center justify-center"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View in Campaign History
                    </button>
                  </div>
                  <button
                    onClick={resetForm}
                    className="w-full btn-primary flex items-center justify-center"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Create Another Campaign
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-600/30">
                    <h3 className="text-sm font-semibold text-slate-100 mb-2">Summary</h3>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>✓ Campaign: {campaignName || 'Not set'}</li>
                      <li>✓ Design: {designFile ? designFile.name : 'Not uploaded'}</li>
                      <li>✓ QR Position: {qrPositionSet ? 'Set' : 'Not set - Please go to Step 3'}</li>
                      <li>✓ Video: {arVideoFile ? arVideoFile.name : 'Not uploaded'}</li>
                      <li>✓ Documents: {documentFiles.length} file(s)</li>
                      <li>✓ Contact: {phoneNumber || whatsappNumber ? 'Provided' : 'Not provided'}</li>
                    </ul>
                  </div>

                  {(!qrPositionSet || (!captureCompositeFunction && !captureCompositeFunctionRef.current)) && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                      <p className="text-sm text-yellow-400 mb-2">
                        ⚠️ QR Position not set
                      </p>
                      <p className="text-xs text-slate-300 mb-3">
                        {!qrPositionSet 
                          ? 'Please go back to Step 3 and drag the QR code to position it on your design.'
                          : 'QR positioning function is initializing. Please wait a moment or go back to Step 3.'}
                      </p>
                      <button
                        onClick={() => setCurrentStep(3)}
                        className="w-full btn-secondary flex items-center justify-center"
                      >
                        Go to Step 3
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateAndDownload}
                    disabled={isGenerating || !qrPositionSet || (!captureCompositeFunction && !captureCompositeFunctionRef.current)}
                    className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generate & Download Final Design
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QRLinksARVideoPage
