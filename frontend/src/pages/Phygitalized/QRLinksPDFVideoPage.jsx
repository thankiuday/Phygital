/**
 * QR-Links-PDF/Link-Video Page
 * Combined QR code with PDF, links, and video
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { generateQRCode, uploadAPI, phygitalizedAPI } from '../../utils/api'
import { downloadQRCode, generateAdvancedQRCode } from '../../utils/qrGenerator'
import { useAuth } from '../../contexts/AuthContext'
import { generateHumanReadableCampaignName } from '../../utils/campaignNameGenerator'
import QRDesignCustomizer from '../../components/QR/QRDesignCustomizer'
import { 
  QrCode, 
  Download, 
  Copy, 
  CheckCircle,
  Video,
  FileText,
  Upload,
  X,
  Link as LinkIcon,
  Plus,
  ExternalLink,
  Tag
} from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import SocialLinksInput from '../../components/Phygitalized/SocialLinksInput'

const QRLinksPDFVideoPage = () => {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [campaignName, setCampaignName] = useState('')
  const [pdfFiles, setPdfFiles] = useState([]) // Array of PDF files
  const [pdfUrls, setPdfUrls] = useState([]) // Array of PDF URLs
  const [videoFiles, setVideoFiles] = useState([]) // Array of video files
  const [videoUrls, setVideoUrls] = useState([]) // Array of video URLs
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({}) // Object to track progress per file
  const [links, setLinks] = useState([])
  const [newLink, setNewLink] = useState({ label: '', url: '' })
  const [socialLinks, setSocialLinks] = useState({})
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [landingPageUrl, setLandingPageUrl] = useState('')
  const [projectId, setProjectId] = useState(null)
  const [qrDesign, setQrDesign] = useState(null)
  const [currentStep, setCurrentStep] = useState(1) // Wizard step: 1 = Enter details, 2 = Design QR
  const [qrGenerated, setQrGenerated] = useState(false) // Track if QR was successfully generated

  // Auto-generate campaign name based on username with uniqueness check
  useEffect(() => {
    if (user?.username && !campaignName) {
      const existingProjects = user?.projects || []
      const autoName = generateHumanReadableCampaignName(user.username, 'qr-links-pdf-video', existingProjects)
      setCampaignName(autoName)
    }
  }, [user?.username, campaignName, user?.projects])

  const onPdfDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    // Validate all files are PDFs and filter out duplicates
    const validFiles = []
    const errors = []
    
    acceptedFiles.forEach(file => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        errors.push(`"${file.name}" is not a PDF file`)
        return
      }
      
      // Check if file is already selected (by name and size)
      const isDuplicate = pdfFiles.some(f => f.name === file.name && f.size === file.size)
      if (isDuplicate) {
        errors.push(`"${file.name}" is already selected`)
        return
      }
      
      // Check file limit (max 5)
      if (pdfFiles.length + validFiles.length >= 5) {
        errors.push('Maximum 5 PDF files allowed')
        return
      }
      
      validFiles.push(file)
    })

    if (errors.length > 0) {
      toast.error(errors[0])
    }

    if (validFiles.length === 0) return

    // Store files for later upload or upload immediately if projectId exists
    const newPdfFiles = [...pdfFiles, ...validFiles]
    setPdfFiles(newPdfFiles)

    // Create preview URLs for display
    const newPdfUrls = validFiles.map(file => URL.createObjectURL(file))
    setPdfUrls(prev => [...prev, ...newPdfUrls])

    if (!projectId) {
      toast(`📄 ${validFiles.length} PDF file(s) selected. They will be uploaded when you generate the QR code.`, { icon: 'ℹ️' })
      console.log('📄 PDF files stored for later upload:', validFiles.map(f => f.name))
      return
    }

    // Upload files immediately if projectId exists using the multiple documents endpoint
    try {
      setIsUploadingPdf(true)
      
      const formData = new FormData()
      validFiles.forEach(file => {
        formData.append('documents', file)
      })
      // Note: uploadAPI.uploadDocuments will append projectId if provided as second parameter
      
      const response = await uploadAPI.uploadDocuments(formData, projectId)
      
      if (response.data?.status === 'success' && response.data?.data?.documents) {
        const uploadedDocuments = response.data.data.documents
        const uploadedUrls = uploadedDocuments.map(doc => doc.url)
        
        // Update PDF URLs with uploaded URLs
        setPdfUrls(prev => {
          const updated = [...prev]
          // Replace preview URLs with uploaded URLs
          const startIndex = prev.length - validFiles.length
          validFiles.forEach((file, index) => {
            if (uploadedUrls[index]) {
              updated[startIndex + index] = uploadedUrls[index]
            }
          })
          return updated
        })
        
        toast.success(`${validFiles.length} PDF file(s) uploaded successfully!`)
      } else {
        throw new Error('Upload failed')
      }
      
      setTimeout(() => {
        setIsUploadingPdf(false)
      }, 1000)
    } catch (error) {
      console.error('PDF upload error:', error)
      toast.error(`Failed to upload PDF file(s): ${error.message}`)
      setIsUploadingPdf(false)
      // Remove failed files from state
      setPdfFiles(pdfFiles)
      setPdfUrls(pdfUrls)
    }
  }, [projectId, pdfFiles, pdfUrls])

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const onVideoDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    // Validate all files are videos and filter out duplicates
    const validFiles = []
    const errors = []
    const maxSize = 50 * 1024 * 1024 // 50MB limit per video for QR Links PDF/Video campaigns
    
    acceptedFiles.forEach(file => {
      const isVideo = file.type.startsWith('video/') || 
                     /\.(mp4|mov|avi|webm|mkv|flv|wmv)$/i.test(file.name)
      
      if (!isVideo) {
        errors.push(`"${file.name}" is not a video file`)
        return
      }
      
      // Check file size (50MB limit per video)
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
        errors.push(`"${file.name}" is ${fileSizeMB}MB. Maximum file size is 50MB per video. Please compress your video or use a shorter clip.`)
        return
      }
      
      // Check if file is already selected (by name and size)
      const isDuplicate = videoFiles.some(f => f.name === file.name && f.size === file.size)
      if (isDuplicate) {
        errors.push(`"${file.name}" is already selected`)
        return
      }
      
      // Check file limit (max 5)
      if (videoFiles.length + validFiles.length >= 5) {
        errors.push('Maximum 5 video files allowed')
        return
      }
      
      validFiles.push(file)
    })

    if (errors.length > 0) {
      toast.error(errors[0])
    }

    if (validFiles.length === 0) return

    // Store files for later upload or upload immediately if projectId exists
    const newVideoFiles = [...videoFiles, ...validFiles]
    setVideoFiles(newVideoFiles)

    // Create preview URLs for display
    const newVideoUrls = validFiles.map(file => URL.createObjectURL(file))
    setVideoUrls(prev => [...prev, ...newVideoUrls])

    if (!projectId) {
      toast(`🎥 ${validFiles.length} video file(s) selected. They will be uploaded when you generate the QR code.`, { icon: 'ℹ️' })
      console.log('🎥 Video files stored for later upload:', validFiles.map(f => f.name))
      return
    }

    // Upload files immediately if projectId exists using the multiple videos endpoint
    try {
      setIsUploadingVideo(true)
      
      const formData = new FormData()
      validFiles.forEach(file => {
        formData.append('videos', file)
      })
      formData.append('projectId', projectId)
      
      // Specify campaign type for 50MB limit
      const response = await uploadAPI.uploadVideos(formData, projectId, 'qr-links-pdf-video')
      
      if (response.data?.status === 'success' && response.data?.data?.videos) {
        const uploadedVideos = response.data.data.videos
        const uploadedUrls = uploadedVideos.map(v => v.url)
        
        // Update video URLs with uploaded URLs
        setVideoUrls(prev => {
          const updated = [...prev]
          // Replace preview URLs with uploaded URLs
          const startIndex = prev.length - validFiles.length
          validFiles.forEach((file, index) => {
            if (uploadedUrls[index]) {
              updated[startIndex + index] = uploadedUrls[index]
            }
          })
          return updated
        })
        
        toast.success(`${validFiles.length} video file(s) uploaded successfully!`)
      } else {
        throw new Error('Upload failed')
      }
      
      setTimeout(() => {
        setIsUploadingVideo(false)
      }, 1000)
    } catch (error) {
      console.error('Video upload error:', error)
      
      // Extract user-friendly error message
      let errorMessage = 'Failed to upload video file(s)'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.code === 'FILE_TOO_LARGE') {
        const maxSizeMB = error.response.data.maxSizeMB || 50
        errorMessage = `Video file size exceeds ${maxSizeMB}MB limit. Please compress your video or use a smaller file.`
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.response?.status === 413 || error.message?.includes('too large') || error.message?.includes('File too large')) {
        errorMessage = 'Video file size exceeds 50MB limit. Please compress your video or use a smaller file.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Check for specific error codes
      if (error.response?.data?.code === 'FILE_TOO_LARGE') {
        const maxSizeMB = error.response.data.maxSizeMB || 50
        errorMessage = `Video file size exceeds ${maxSizeMB}MB limit. Please compress your video or use a smaller file.`
      } else if (error.response?.data?.code === 'TOO_MANY_FILES') {
        errorMessage = 'Too many files. Maximum 5 videos allowed.'
      } else if (error.response?.status === 413 || error.message.includes('too large') || error.message.includes('File too large')) {
        errorMessage = 'Video file size exceeds 100MB limit. Please compress your video or use a smaller file.'
      }
      
      toast.error(errorMessage, { duration: 5000 })
      setIsUploadingVideo(false)
      // Remove failed files from state
      setVideoFiles(videoFiles)
      setVideoUrls(videoUrls)
    }
  }, [projectId, videoFiles, videoUrls])

  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps, isDragActive: isPdfDragActive } = useDropzone({
    onDrop: onPdfDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 5,
    multiple: true
  })

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv']
    },
    maxFiles: 5,
    multiple: true
  })

  const removePdf = (index) => {
    const newPdfFiles = pdfFiles.filter((_, i) => i !== index)
    const newPdfUrls = pdfUrls.filter((_, i) => i !== index)
    // Revoke the URL if it's a preview URL (blob URL)
    if (pdfUrls[index] && pdfUrls[index].startsWith('blob:')) {
      URL.revokeObjectURL(pdfUrls[index])
    }
    setPdfFiles(newPdfFiles)
    setPdfUrls(newPdfUrls)
  }

  const removeVideo = (index) => {
    const newVideoFiles = videoFiles.filter((_, i) => i !== index)
    const newVideoUrls = videoUrls.filter((_, i) => i !== index)
    // Revoke the URL if it's a preview URL (blob URL)
    if (videoUrls[index] && videoUrls[index].startsWith('blob:')) {
      URL.revokeObjectURL(videoUrls[index])
    }
    setVideoFiles(newVideoFiles)
    setVideoUrls(newVideoUrls)
  }

  const addLink = () => {
    if (!newLink.label.trim() || !newLink.url.trim()) {
      toast.error('Please fill in both label and URL')
      return
    }
    setLinks([...links, { ...newLink, id: Date.now() }])
    setNewLink({ label: '', url: '' })
  }

  const removeLink = (id) => {
    setLinks(links.filter(link => link.id !== id))
  }

  const handleContinueToDesign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    // Check if at least one file is available
    const hasPdf = pdfFiles.length > 0 || pdfUrls.length > 0
    const hasVideo = videoFiles.length > 0 || videoUrls.length > 0
    
    if (!hasPdf && !hasVideo) {
      toast.error('Please upload at least one file (PDF or video)')
      return
    }

    // Create project immediately to get projectId for preview
    if (!projectId) {
      try {
        setIsGenerating(true)
        toast.loading('Preparing preview...', { id: 'preview-loading' })
        
        const projectResponse = await uploadAPI.createProject({
          name: campaignName.trim(),
          description: `QR-Links-PDF/Video campaign with ${links.length} additional link(s)`,
          campaignType: 'qr-links-pdf-video',
          phygitalizedData: {
            links: links.map(link => ({
              label: link.label,
              url: link.url.startsWith('http://') || link.url.startsWith('https://') 
                ? link.url 
                : `https://${link.url}`
            })),
            socialLinks: socialLinks || {}
          }
        })
        
        if (projectResponse.data?.data?.user) {
          updateUser(projectResponse.data.data.user)
        }
        
        if (projectResponse.data?.data?.project?.id) {
          const createdProjectId = projectResponse.data.data.project.id
          setProjectId(createdProjectId)
          // Generate landing page URL for preview
          const previewLandingPageUrl = `${window.location.origin}/#/phygitalized/pdf-video/${createdProjectId}`
          setLandingPageUrl(previewLandingPageUrl)
          toast.success('Preview ready!', { id: 'preview-loading' })
        }
      } catch (projectError) {
        console.error('Error creating project for preview:', projectError)
        toast.error('Failed to create campaign. Please try again.', { id: 'preview-loading' })
        setIsGenerating(false)
        return
      } finally {
        setIsGenerating(false)
      }
    }
    
    setCurrentStep(2)
  }

  const handleGenerate = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    // Check if at least one file is available (either file object or URL)
    const hasPdf = pdfFiles.length > 0 || pdfUrls.length > 0
    const hasVideo = videoFiles.length > 0 || videoUrls.length > 0
    
    console.log('🔍 File validation check:', {
      pdfFilesCount: pdfFiles.length,
      pdfUrlsCount: pdfUrls.length,
      videoFilesCount: videoFiles.length,
      videoUrlsCount: videoUrls.length,
      hasPdf,
      hasVideo
    })

    if (!hasPdf && !hasVideo) {
      toast.error('Please upload at least a PDF or video')
      return
    }

    try {
      setIsGenerating(true)
      
      // Use existing projectId if available (created in handleContinueToDesign), otherwise create new project
      let createdProjectId = projectId
      if (!createdProjectId) {
        try {
          const projectResponse = await uploadAPI.createProject({
            name: campaignName.trim(),
            description: `QR-Links-PDF/Video campaign with ${links.length} additional link(s)`,
            campaignType: 'qr-links-pdf-video',
            phygitalizedData: {
              links: links.map(link => ({
                label: link.label,
                url: link.url.startsWith('http://') || link.url.startsWith('https://') 
                  ? link.url 
                  : `https://${link.url}`
              })),
              socialLinks: socialLinks || {}
            }
          })
          
          console.log('📝 Project created with socialLinks:', {
            socialLinks,
            hasSocialLinks: Object.keys(socialLinks || {}).length > 0
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
      }

      // Upload files to Cloudinary if not already uploaded
      let finalPdfUrls = [...pdfUrls]
      let finalVideoUrls = [...videoUrls]
      
      // Upload PDFs that haven't been uploaded yet (still have blob URLs)
      const pdfsToUpload = pdfFiles.filter((file, index) => {
        const url = pdfUrls[index]
        return !url || url.startsWith('blob:') || url.startsWith('data:')
      })
      
      if (pdfsToUpload.length > 0) {
        try {
          toast(`Uploading ${pdfsToUpload.length} PDF file(s) to Cloudinary...`, { icon: '⏳' })
          const formData = new FormData()
          pdfsToUpload.forEach(file => {
            formData.append('documents', file)
          })
          // Note: uploadAPI.uploadDocuments will append projectId if provided as second parameter
          
          const uploadResponse = await uploadAPI.uploadDocuments(formData, createdProjectId)
          
          if (uploadResponse.data?.status === 'success' && uploadResponse.data?.data?.documents) {
            const uploadedDocs = uploadResponse.data.data.documents
            const uploadedDocUrls = uploadedDocs.map(doc => doc.url)
            
            // Update finalPdfUrls array with uploaded URLs
            let uploadedIndex = 0
            finalPdfUrls = pdfUrls.map((url, index) => {
              if (url && (url.startsWith('blob:') || url.startsWith('data:'))) {
                const uploadedUrl = uploadedDocUrls[uploadedIndex++]
                if (uploadedUrl) {
                  // Clean up blob URL
                  URL.revokeObjectURL(url)
                  return uploadedUrl
                }
              }
              return url
            })
            setPdfUrls(finalPdfUrls)
            
            toast.success(`${pdfsToUpload.length} PDF file(s) uploaded successfully!`)
          } else {
            throw new Error('Upload failed - no file data returned')
          }
        } catch (uploadError) {
          console.error('Error uploading PDFs:', uploadError)
          toast.error('Failed to upload PDF file(s) to Cloudinary')
          // Don't return - continue with video upload if available
        }
      }

      // Upload videos that haven't been uploaded yet (still have blob URLs)
      const videosToUpload = videoFiles.filter((file, index) => {
        const url = videoUrls[index]
        return !url || url.startsWith('blob:') || url.startsWith('data:')
      })
      
      if (videosToUpload.length > 0) {
        try {
          toast(`Uploading ${videosToUpload.length} video file(s) to Cloudinary...`, { icon: '⏳' })
          const formData = new FormData()
          videosToUpload.forEach(file => {
            formData.append('videos', file)
          })
          formData.append('projectId', createdProjectId)
          
          // Specify campaign type for 50MB limit
          const uploadResponse = await uploadAPI.uploadVideos(formData, createdProjectId, 'qr-links-pdf-video')
          
          if (uploadResponse.data?.status === 'success' && uploadResponse.data?.data?.videos) {
            const uploadedVideos = uploadResponse.data.data.videos
            const uploadedVideoUrls = uploadedVideos.map(v => v.url)
            
            // Update finalVideoUrls array with uploaded URLs
            let uploadedIndex = 0
            finalVideoUrls = videoUrls.map((url, index) => {
              if (url && (url.startsWith('blob:') || url.startsWith('data:'))) {
                const uploadedUrl = uploadedVideoUrls[uploadedIndex++]
                if (uploadedUrl) {
                  // Clean up blob URL
                  URL.revokeObjectURL(url)
                  return uploadedUrl
                }
              }
              return url
            })
            setVideoUrls(finalVideoUrls)
            
            toast.success(`${videosToUpload.length} video file(s) uploaded successfully!`)
          } else {
            throw new Error('Upload failed - no file data returned')
          }
        } catch (uploadError) {
          console.error('Error uploading videos:', uploadError)
          
          // Extract user-friendly error message
          let errorMessage = 'Failed to upload video file(s) to Cloudinary'
          
          if (uploadError.response?.data?.message) {
            errorMessage = uploadError.response.data.message
          } else if (uploadError.response?.data?.code === 'FILE_TOO_LARGE') {
            const maxSizeMB = uploadError.response.data.maxSizeMB || 100
            errorMessage = `Video file size exceeds ${maxSizeMB}MB limit. Please compress your video or use a smaller file.`
          } else if (uploadError.response?.status === 413 || uploadError.message?.includes('too large')) {
            errorMessage = 'Video file size exceeds 100MB limit. Please compress your video or use a smaller file.'
          }
          
          toast.error(errorMessage, { duration: 5000 })
          // Don't return - continue with QR generation if PDFs were uploaded
        }
      }
      
      // Ensure we have at least one file URL after upload attempts
      if (finalPdfUrls.length === 0 && finalVideoUrls.length === 0) {
        console.error('❌ No files uploaded:', { pdfFilesCount: pdfFiles.length, videoFilesCount: videoFiles.length })
        toast.error('Failed to upload files. Please try again.')
        setIsGenerating(false)
        return
      }

      // Generate landing page URL using projectId
      const landingPageUrl = `${window.location.origin}/#/phygitalized/pdf-video/${createdProjectId}`
      setLandingPageUrl(landingPageUrl)
      
      // Generate QR code with design options if available
      let qrDataUrl
      if (qrDesign) {
        qrDataUrl = await generateAdvancedQRCode(landingPageUrl, qrDesign, 512)
      } else {
        qrDataUrl = await generateQRCode(landingPageUrl, { size: 512 })
      }
      setQrCodeUrl(qrDataUrl)
      
      // Update project with QR code URL, landing page URL, and file data
      try {
        const fileUrlsPayload = {}
        
        // Add PDF files data if available (for backward compatibility, also include first PDF as pdfUrl)
        if (finalPdfUrls.length > 0) {
          fileUrlsPayload.documents = finalPdfUrls.map((url, index) => ({
            url: url,
            filename: pdfFiles[index]?.name || `document-${index + 1}.pdf`,
            originalName: pdfFiles[index]?.name || `document-${index + 1}.pdf`,
            size: pdfFiles[index]?.size || 0,
            format: pdfFiles[index]?.type || 'application/pdf',
            uploadedAt: new Date()
          }))
          // For backward compatibility, also set first PDF as pdf
          fileUrlsPayload.pdf = fileUrlsPayload.documents[0]
        }
        
        // Add video files data if available (for backward compatibility, also include first video as videoUrl)
        if (finalVideoUrls.length > 0) {
          fileUrlsPayload.videos = finalVideoUrls.map((url, index) => ({
            url: url,
            filename: videoFiles[index]?.name || `video-${index + 1}.mp4`,
            originalName: videoFiles[index]?.name || `video-${index + 1}.mp4`,
            size: videoFiles[index]?.size || 0,
            format: videoFiles[index]?.type || 'video/mp4',
            uploadedAt: new Date()
          }))
          // For backward compatibility, also set first video as video
          fileUrlsPayload.video = fileUrlsPayload.videos[0]
        }
        
        const updatePayload = {
          campaignType: 'qr-links-pdf-video',
          qrCodeUrl: qrDataUrl,
          landingPageUrl: landingPageUrl,
          phygitalizedData: {
            // For backward compatibility, include first PDF and video URLs
            pdfUrl: finalPdfUrls.length > 0 ? finalPdfUrls[0] : null,
            videoUrl: finalVideoUrls.length > 0 ? finalVideoUrls[0] : null,
            // New: include arrays for multiple files
            pdfUrls: finalPdfUrls.length > 0 ? finalPdfUrls : null,
            videoUrls: finalVideoUrls.length > 0 ? finalVideoUrls : null,
            links: links.map(link => ({
              label: link.label,
              url: link.url.startsWith('http://') || link.url.startsWith('https://') 
                ? link.url 
                : `https://${link.url}`
            })),
            socialLinks: socialLinks,
            qrDesign: qrDesign
          },
          fileUrls: fileUrlsPayload
        }
        
        console.log('📤 Final update - Saving campaign data:', {
          projectId: createdProjectId,
          pdfUrls: finalPdfUrls,
          videoUrls: finalVideoUrls,
          pdfUrlsCount: finalPdfUrls.length,
          videoUrlsCount: finalVideoUrls.length,
          socialLinks: socialLinks,
          hasSocialLinks: Object.keys(socialLinks || {}).length > 0,
          socialLinksKeys: Object.keys(socialLinks || {}),
          payload: updatePayload
        })
        
        await phygitalizedAPI.updateCampaign(createdProjectId, updatePayload)
        
        console.log('✅ Campaign updated successfully')
        
        setQrGenerated(true)
        
        // Auto-download QR code
        try {
          const filename = `${campaignName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr-code.png`
          downloadQRCode(qrDataUrl, filename)
          toast.success('QR code generated, downloaded, and campaign saved successfully!', {
            duration: 4000,
            icon: '✅'
          })
        } catch (downloadError) {
          console.error('Download error:', downloadError)
          toast.success('QR code generated and campaign saved! Download failed, but QR code is available in campaign history.', {
            duration: 4000
          })
        }
      } catch (updateError) {
        console.error('Error updating campaign:', updateError)
        // Still download even if update fails
        try {
          const filename = `${campaignName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr-code.png`
          downloadQRCode(qrDataUrl, filename)
          toast.success('QR code generated and downloaded! Failed to save campaign.', { duration: 4000 })
        } catch (downloadError) {
          console.error('Download error:', downloadError)
          toast.success('QR code generated successfully!', { duration: 3000 })
          toast.error('Failed to save campaign and download. QR code is still available.', { duration: 4000 })
        }
      }
    } catch (error) {
      console.error('QR generation error:', error)
      toast.error('Failed to generate QR code')
    } finally {
      setIsGenerating(false)
    }
  }


  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          Links, PDF & Video QR
        </h1>
        <p className="text-slate-300">
          Create a QR code with PDF, links, and video content
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-neon-blue' : 'text-slate-500'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              currentStep >= 1 
                ? 'bg-neon-blue/20 border-neon-blue text-neon-blue' 
                : 'bg-slate-800/50 border-slate-600 text-slate-500'
            }`}>
              {currentStep > 1 ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <span className="text-sm font-semibold">1</span>
              )}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Enter Details</span>
          </div>
          <div className={`h-0.5 w-16 sm:w-24 ${currentStep >= 2 ? 'bg-neon-blue' : 'bg-slate-700'}`}></div>
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-neon-purple' : 'text-slate-500'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              currentStep >= 2 
                ? 'bg-neon-purple/20 border-neon-purple text-neon-purple' 
                : 'bg-slate-800/50 border-slate-600 text-slate-500'
            }`}>
              <span className="text-sm font-semibold">2</span>
            </div>
            <span className="text-sm font-medium hidden sm:inline">Design QR</span>
          </div>
        </div>
      </div>

      {/* Step 1: Enter Details */}
      {currentStep === 1 && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8">
            <div className="mb-6 pb-4 border-b border-slate-600/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-100 flex items-center">
                    <Tag className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-neon-blue" />
                    Step 1: Enter Your Details
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Provide campaign name, upload files, and add links
                  </p>
                </div>
                <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700 self-start sm:self-auto">
                  Step 1 of 2
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Campaign Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-2 text-neon-blue" />
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name (e.g., Product Catalog 2024)"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleContinueToDesign()
                    }
                  }}
                />
              </div>

              {/* PDF Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-neon-blue" />
                  Upload PDF Documents (Optional) {pdfFiles.length > 0 && <span className="text-slate-400 ml-2">({pdfFiles.length}/5)</span>}
                </label>
                {pdfFiles.length > 0 ? (
                  <div className="space-y-3">
                    {pdfFiles.map((file, index) => (
                      <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <FileText className="w-5 h-5 mr-3 text-neon-orange flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-slate-100 font-medium truncate">{file.name}</p>
                              <p className="text-sm text-slate-400">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removePdf(index)}
                            className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors ml-2 flex-shrink-0"
                          >
                            <X className="w-4 h-4 text-slate-400" />
                          </button>
                        </div>
                        {pdfUrls[index] && (
                          <a
                            href={pdfUrls[index]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center text-sm text-neon-orange hover:text-neon-orange/80"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            Open PDF
                          </a>
                        )}
                        {uploadProgress[`pdf-${file.name}`] !== undefined && uploadProgress[`pdf-${file.name}`] < 100 && (
                          <div className="mt-3">
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-neon-orange h-2 rounded-full transition-all"
                                style={{ width: `${uploadProgress[`pdf-${file.name}`]}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Uploading... {uploadProgress[`pdf-${file.name}`]}%</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {pdfFiles.length < 5 && (
                      <div
                        {...getPdfRootProps()}
                        className={`
                          border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors
                          ${isPdfDragActive 
                            ? 'border-neon-orange bg-neon-orange/10' 
                            : 'border-slate-600/50 hover:border-neon-orange/50'
                          }
                          ${isUploadingPdf ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input {...getPdfInputProps()} />
                        <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                        <p className="text-xs text-slate-300">
                          {isPdfDragActive ? 'Drop PDF files here' : 'Add more PDF files'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    {...getPdfRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-colors
                      ${isPdfDragActive 
                        ? 'border-neon-orange bg-neon-orange/10' 
                        : 'border-slate-600/50 hover:border-neon-orange/50'
                      }
                      ${isUploadingPdf ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input {...getPdfInputProps()} />
                    {isUploadingPdf ? (
                      <div>
                        <LoadingSpinner size="sm" />
                        <p className="text-slate-300 mt-2 text-sm">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-xs sm:text-sm text-slate-300">
                          {isPdfDragActive ? 'Drop PDF files here' : 'Drag & drop PDF files or click to browse (up to 5)'}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                  <Video className="w-4 h-4 mr-2 text-neon-blue" />
                  Upload Videos (Optional) {videoFiles.length > 0 && <span className="text-slate-400 ml-2">({videoFiles.length}/5)</span>}
                </label>
                {videoFiles.length > 0 ? (
                  <div className="space-y-4">
                    {videoFiles.map((file, index) => (
                      <div key={index} className="space-y-2">
                        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1 min-w-0">
                              <Video className="w-5 h-5 mr-3 text-neon-pink flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-slate-100 font-medium truncate">{file.name}</p>
                                <p className="text-sm text-slate-400">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeVideo(index)}
                              className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors ml-2 flex-shrink-0"
                            >
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                        {videoUrls[index] && (
                          <video
                            src={videoUrls[index]}
                            controls
                            className="w-full rounded-lg"
                          />
                        )}
                      </div>
                    ))}
                    {videoFiles.length < 5 && (
                      <div
                        {...getVideoRootProps()}
                        className={`
                          border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors
                          ${isVideoDragActive 
                            ? 'border-neon-pink bg-neon-pink/10' 
                            : 'border-slate-600/50 hover:border-neon-pink/50'
                          }
                          ${isUploadingVideo ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <input {...getVideoInputProps()} />
                        <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                        <p className="text-xs text-slate-300">
                          {isVideoDragActive ? 'Drop video files here' : 'Add more video files'}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    {...getVideoRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-colors
                      ${isVideoDragActive 
                        ? 'border-neon-pink bg-neon-pink/10' 
                        : 'border-slate-600/50 hover:border-neon-pink/50'
                      }
                      ${isUploadingVideo ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input {...getVideoInputProps()} />
                    {isUploadingVideo ? (
                      <div>
                        <LoadingSpinner size="sm" />
                        <p className="text-slate-300 mt-2 text-sm">Uploading...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-xs sm:text-sm text-slate-300">
                          {isVideoDragActive ? 'Drop video files here' : 'Drag & drop video files or click to browse (up to 5)'}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Social Links Section */}
              <div>
                <SocialLinksInput
                  value={socialLinks}
                  onChange={setSocialLinks}
                  showSelection={true}
                />
              </div>

              {/* Links Section */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                  <LinkIcon className="w-4 h-4 mr-2 text-neon-blue" />
                  Additional Links
                </label>
                <div className="space-y-2">
                  {links.map((link) => (
                    <div key={link.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-2 p-3 bg-slate-800/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-slate-100 font-medium text-sm sm:text-base">{link.label}</p>
                        <p className="text-xs sm:text-sm text-slate-400 truncate">{link.url}</p>
                      </div>
                      <button
                        onClick={() => removeLink(link.id)}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors touch-manipulation min-h-[44px] sm:min-h-0 flex items-center justify-center"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
                    <input
                      type="text"
                      value={newLink.label}
                      onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                      placeholder="Link label"
                      className="flex-1 px-4 py-3 sm:py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent touch-manipulation"
                    />
                    <input
                      type="text"
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      placeholder="URL"
                      className="flex-1 px-4 py-3 sm:py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent touch-manipulation"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addLink()
                        }
                      }}
                    />
                    <button
                      onClick={addLink}
                      className="px-4 py-3 bg-neon-purple/20 hover:bg-neon-purple/30 text-neon-purple rounded-lg transition-colors touch-manipulation min-h-[44px] sm:min-h-0 flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinueToDesign}
                disabled={!campaignName.trim() || (pdfFiles.length === 0 && pdfUrls.length === 0 && videoFiles.length === 0 && videoUrls.length === 0)}
                className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed py-3 sm:py-3 text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-0"
              >
                <span>Continue to Design</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Design QR Code */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8 lg:col-span-2">
            <div className="mb-6 pb-4 border-b border-slate-600/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-100 flex items-center">
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-neon-purple" />
                    Step 2: Design the QR
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Customize your QR code with frames, patterns, corners, and logos
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-xs sm:text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 px-2 py-1 sm:px-0 sm:py-0 touch-manipulation"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                  </button>
                  <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    Step 2 of 2
                  </div>
                </div>
              </div>
            </div>
            <QRDesignCustomizer
              onDesignChange={setQrDesign}
              previewUrl={landingPageUrl || (projectId ? `${window.location.origin}/#/phygitalized/pdf-video/${projectId}` : '')}
              disabled={isGenerating}
            />
            
            {/* Generate Button at Bottom */}
            <div className="p-4 sm:p-6 border-t border-slate-700/50 bg-slate-800/30">
              {qrGenerated && projectId ? (
                <div className="space-y-4">
                  <div className="bg-neon-green/10 border border-neon-green/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-neon-green" />
                      <p className="text-sm font-medium text-neon-green">QR Code Generated Successfully!</p>
                    </div>
                    <p className="text-xs text-slate-300 mb-3">
                      Your QR code has been downloaded and saved to your campaign history.
                    </p>
                    <button
                      onClick={() => navigate('/projects')}
                      className="w-full btn-secondary flex items-center justify-center py-3 sm:py-3 text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-0"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View in Campaign History
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setQrGenerated(false)
                      setQrCodeUrl('')
                      setProjectId(null)
                      setLandingPageUrl('')
                      setCurrentStep(1)
                      setCampaignName('')
                      setPdfFile(null)
                      setPdfUrl('')
                      setVideoFile(null)
                      setVideoUrl('')
                      setLinks([])
                      setNewLink({ label: '', url: '' })
                      setSocialLinks({})
                      setQrDesign(null)
                    }}
                    className="w-full btn-primary flex items-center justify-center py-3 sm:py-3 text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-0"
                  >
                    <QrCode className="w-4 h-4 mr-2" />
                    Create Another QR Code
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    if (!campaignName.trim()) {
                      toast.error('Please enter a campaign name')
                      return
                    }
                    if ((pdfFiles.length === 0 && pdfUrls.length === 0) && (videoFiles.length === 0 && videoUrls.length === 0)) {
                      toast.error('Please upload at least a PDF or video')
                      return
                    }
                    handleGenerate()
                  }}
                  disabled={isGenerating}
                  className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Generating...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-2" />
                      Generate QR Code
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Instructions */}
      <div className="mt-8 card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8">
        <div className="mb-6 pb-4 border-b border-slate-600/30">
          <h2 className="text-xl font-semibold text-slate-100">
            How to Use
          </h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-neon-blue/20 text-neon-blue rounded-full flex items-center justify-center text-sm font-medium border border-neon-blue/30">
              1
            </div>
            <p className="text-sm text-slate-300">
              Enter a campaign name, upload PDF and/or video files, and add your links
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-neon-purple/20 text-neon-purple rounded-full flex items-center justify-center text-sm font-medium border border-neon-purple/30">
              2
            </div>
            <p className="text-sm text-slate-300">
              Click "Continue to Design" to customize your QR code appearance
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-neon-green/20 text-neon-green rounded-full flex items-center justify-center text-sm font-medium border border-neon-green/30">
              3
            </div>
            <p className="text-sm text-slate-300">
              Customize frames, patterns, corners, and add your logo
            </p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-neon-orange/20 text-neon-orange rounded-full flex items-center justify-center text-sm font-medium border border-neon-orange/30">
              4
            </div>
            <p className="text-sm text-slate-300">
              Click "Generate QR Code" to create your customized QR code
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default QRLinksPDFVideoPage

