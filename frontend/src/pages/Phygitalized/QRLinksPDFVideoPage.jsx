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
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfUrl, setPdfUrl] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
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
      const autoName = generateHumanReadableCampaignName(user.username, 'QR Links PDF Video', existingProjects)
      setCampaignName(autoName)
    }
  }, [user?.username, campaignName, user?.projects])

  const onPdfDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file')
      return
    }

    // Need projectId to upload file - store file for later upload
    if (!projectId) {
      toast('PDF will be uploaded when you generate the QR code', { icon: 'ℹ️' })
      setPdfFile(file)
      // Create preview URL for display
      const previewUrl = URL.createObjectURL(file)
      setPdfUrl(previewUrl)
      console.log('📄 PDF file stored for later upload:', file.name)
      return
    }

    try {
      setIsUploadingPdf(true)
      setUploadProgress(0)

      const variation = 'qr-links-pdf-video'
      const response = await phygitalizedAPI.uploadFile(variation, projectId, file, 'pdf')
      
      if (response.data?.success && response.data?.data?.file) {
        setPdfUrl(response.data.data.file.url)
        setPdfFile(file)
        setUploadProgress(100)
        toast.success('PDF uploaded successfully!')
      } else {
        throw new Error('Upload failed')
      }
      
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploadingPdf(false)
      }, 1000)
    } catch (error) {
      setUploadProgress(0)
      setIsUploadingPdf(false)
      console.error('PDF upload error:', error)
      toast.error('Failed to upload PDF')
    }
  }, [projectId])

  const onVideoDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    if (!file.type.startsWith('video/')) {
      toast.error('Please upload a video file')
      return
    }

    // Need projectId to upload file - store file for later upload
    if (!projectId) {
      toast('Video will be uploaded when you generate the QR code', { icon: 'ℹ️' })
      setVideoFile(file)
      // Create preview URL for display
      const previewUrl = URL.createObjectURL(file)
      setVideoUrl(previewUrl)
      console.log('🎥 Video file stored for later upload:', file.name)
      return
    }

    try {
      setIsUploadingVideo(true)
      setUploadProgress(0)

      const variation = 'qr-links-pdf-video'
      const response = await phygitalizedAPI.uploadFile(variation, projectId, file, 'video')
      
      if (response.data?.success && response.data?.data?.file) {
        setVideoUrl(response.data.data.file.url)
        setVideoFile(file)
        setUploadProgress(100)
        toast.success('Video uploaded successfully!')
      } else {
        throw new Error('Upload failed')
      }
      
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploadingVideo(false)
      }, 1000)
    } catch (error) {
      setUploadProgress(0)
      setIsUploadingVideo(false)
      console.error('Video upload error:', error)
      toast.error('Failed to upload video')
    }
  }, [projectId])

  const { getRootProps: getPdfRootProps, getInputProps: getPdfInputProps, isDragActive: isPdfDragActive } = useDropzone({
    onDrop: onPdfDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  })

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
    onDrop: onVideoDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxFiles: 1
  })

  const removePdf = () => {
    setPdfFile(null)
    setPdfUrl('')
  }

  const removeVideo = () => {
    setVideoFile(null)
    setVideoUrl('')
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
    const hasPdf = pdfFile || pdfUrl
    const hasVideo = videoFile || videoUrl
    
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
    const hasPdf = pdfFile || pdfUrl
    const hasVideo = videoFile || videoUrl
    
    console.log('🔍 File validation check:', {
      pdfFile: !!pdfFile,
      pdfUrl: !!pdfUrl,
      videoFile: !!videoFile,
      videoUrl: !!videoUrl,
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
      let finalPdfUrl = pdfUrl
      let finalVideoUrl = videoUrl
      const variation = 'qr-links-pdf-video'
      
      // Upload PDF if we have a file and it's not already uploaded to Cloudinary
      if (pdfFile && (!pdfUrl || pdfUrl.startsWith('blob:') || pdfUrl.startsWith('data:'))) {
        try {
          toast('Uploading PDF to Cloudinary...', { icon: '⏳' })
          const uploadResponse = await phygitalizedAPI.uploadFile(variation, createdProjectId, pdfFile, 'pdf')
          if (uploadResponse.data?.success && uploadResponse.data?.data?.file) {
            finalPdfUrl = uploadResponse.data.data.file.url
            setPdfUrl(finalPdfUrl) // Update state with Cloudinary URL
            
            // Clean up blob URL if it was a preview
            if (pdfUrl && pdfUrl.startsWith('blob:')) {
              URL.revokeObjectURL(pdfUrl)
            }
            
            toast.success('PDF uploaded to Cloudinary successfully!')
          } else {
            throw new Error('Upload failed - no file data returned')
          }
        } catch (uploadError) {
          console.error('Error uploading PDF:', uploadError)
          toast.error('Failed to upload PDF to Cloudinary')
          // Don't return - continue with video upload if available
        }
      }

      // Upload video if we have a file and it's not already uploaded to Cloudinary
      if (videoFile && (!videoUrl || videoUrl.startsWith('blob:') || videoUrl.startsWith('data:'))) {
        try {
          toast('Uploading video to Cloudinary...', { icon: '⏳' })
          const uploadResponse = await phygitalizedAPI.uploadFile(variation, createdProjectId, videoFile, 'video')
          if (uploadResponse.data?.success && uploadResponse.data?.data?.file) {
            finalVideoUrl = uploadResponse.data.data.file.url
            setVideoUrl(finalVideoUrl) // Update state with Cloudinary URL
            
            // Clean up blob URL if it was a preview
            if (videoUrl && videoUrl.startsWith('blob:')) {
              URL.revokeObjectURL(videoUrl)
            }
            
            toast.success('Video uploaded to Cloudinary successfully!')
          } else {
            throw new Error('Upload failed - no file data returned')
          }
        } catch (uploadError) {
          console.error('Error uploading video:', uploadError)
          toast.error('Failed to upload video to Cloudinary')
          // Don't return - continue with QR generation if PDF was uploaded
        }
      }
      
      // Ensure we have at least one file URL after upload attempts
      if (!finalPdfUrl && !finalVideoUrl) {
        console.error('❌ No files uploaded:', { pdfFile: !!pdfFile, videoFile: !!videoFile, pdfUrl, videoUrl })
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
        
        // Add PDF file data if available
        if (finalPdfUrl && pdfFile) {
          fileUrlsPayload.pdf = {
            url: finalPdfUrl,
            filename: pdfFile.name,
            originalName: pdfFile.name,
            size: pdfFile.size,
            format: pdfFile.type,
            uploadedAt: new Date()
          }
        }
        
        // Add video file data if available
        if (finalVideoUrl && videoFile) {
          fileUrlsPayload.video = {
            url: finalVideoUrl,
            filename: videoFile.name,
            originalName: videoFile.name,
            size: videoFile.size,
            format: videoFile.type,
            uploadedAt: new Date()
          }
        }
        
        const updatePayload = {
          campaignType: 'qr-links-pdf-video',
          qrCodeUrl: qrDataUrl,
          landingPageUrl: landingPageUrl,
          phygitalizedData: {
            pdfUrl: finalPdfUrl || null,
            videoUrl: finalVideoUrl || null,
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
          pdfUrl: finalPdfUrl,
          videoUrl: finalVideoUrl,
          hasPdf: !!finalPdfUrl,
          hasVideo: !!finalVideoUrl,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          QR-Links-PDF/Link-Video
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
          <div className="card">
            <div className="card-header">
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
                  Upload PDF Document (Optional)
                </label>
                {pdfFile ? (
                  <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 mr-3 text-neon-orange" />
                        <div>
                          <p className="text-slate-100 font-medium">{pdfFile.name}</p>
                          <p className="text-sm text-slate-400">
                            {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removePdf}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center text-sm text-neon-orange hover:text-neon-orange/80"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open PDF
                    </a>
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
                        <p className="text-slate-300 mt-2 text-sm">Uploading... {uploadProgress}%</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-xs sm:text-sm text-slate-300">
                          {isPdfDragActive ? 'Drop PDF here' : 'Drag & drop PDF or click to browse'}
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
                  Upload Video (Optional)
                </label>
                {videoFile ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Video className="w-5 h-5 mr-3 text-neon-pink" />
                          <div>
                            <p className="text-slate-100 font-medium">{videoFile.name}</p>
                            <p className="text-sm text-slate-400">
                              {(videoFile.size / 1024 / 1024).toFixed(2)} MB
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
                    {videoUrl && (
                      <video
                        src={videoUrl}
                        controls
                        className="w-full rounded-lg"
                      />
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
                        <p className="text-slate-300 mt-2 text-sm">Uploading... {uploadProgress}%</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <p className="text-xs sm:text-sm text-slate-300">
                          {isVideoDragActive ? 'Drop video here' : 'Drag & drop video or click to browse'}
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
                disabled={!campaignName.trim() || (!pdfFile && !pdfUrl && !videoFile && !videoUrl)}
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
          <div className="card lg:col-span-2">
            <div className="card-header">
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
                    if (!pdfUrl && !videoUrl) {
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
      <div className="mt-8 card">
        <div className="card-header">
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
  )
}

export default QRLinksPDFVideoPage

