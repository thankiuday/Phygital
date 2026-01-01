/**
 * QR-Links-Video Page
 * QR code with video content and links
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

const QRLinksVideoPage = () => {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [campaignName, setCampaignName] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [fileType, setFileType] = useState('video') // Only 'video'
  const [isUploading, setIsUploading] = useState(false)
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
      const autoName = generateHumanReadableCampaignName(user.username, 'qr-links-video', existingProjects)
      setCampaignName(autoName)
    }
  }, [user?.username, campaignName, user?.projects])

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const onFileDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]
    const isVideo = file.type.startsWith('video/')

    if (!isVideo) {
      toast.error('Please upload a video file (MP4, MOV, AVI, WEBM, MKV, FLV, etc.)')
      return
    }

    // Check file size (50MB limit for QR Links Video campaigns)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
      toast.error(`Video file size must be less than 50MB. Your file is ${fileSizeMB}MB. Please compress your video or use a shorter clip.`, { duration: 5000 })
      return
    }

    // Need projectId to upload file - store file for later upload when project is created
    if (!projectId) {
      toast('Video will be uploaded to Cloudinary when you generate the QR code', { icon: 'ℹ️' })
      setUploadedFile(file)
      setFileType('video')
      // Store a preview URL for display purposes
      const previewUrl = URL.createObjectURL(file)
      setFileUrl(previewUrl)
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const variation = 'qr-links-video'
      
      const response = await phygitalizedAPI.uploadFile(variation, projectId, file, 'video')
      
      if (response.data?.success && response.data?.data?.file) {
        setFileUrl(response.data.data.file.url)
        setFileType('video')
        setUploadedFile(file)
        setUploadProgress(100)
        toast.success('Video uploaded successfully!')
      } else {
        throw new Error('Upload failed')
      }
      
      setTimeout(() => {
        setUploadProgress(0)
        setIsUploading(false)
      }, 1000)
    } catch (error) {
      console.error('File upload error:', error)
      
      // Extract user-friendly error message
      let errorMessage = 'Failed to upload video file'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.code === 'FILE_TOO_LARGE') {
        const maxSizeMB = error.response.data.maxSizeMB || 50
        errorMessage = `Video file size exceeds ${maxSizeMB}MB limit. Please compress your video or use a smaller file.`
      } else if (error.response?.status === 413 || error.message?.includes('too large') || error.message?.includes('File too large')) {
        errorMessage = 'Video file size exceeds 50MB limit. Please compress your video or use a smaller file.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(errorMessage, { duration: 5000 })
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [projectId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v', '.3gp', '.ogv', '.ts', '.mts']
    },
    maxFiles: 1
  })

  const removeFile = () => {
    setUploadedFile(null)
    setFileUrl('')
    setFileType('video')
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

    // Check if file exists (either uploaded to Cloudinary or waiting to be uploaded)
    if (!uploadedFile && !fileUrl) {
      toast.error('Please upload a video first')
      return
    }
    
    // Ensure we have fileType if we have uploadedFile
    if (uploadedFile && !fileType) {
      setFileType('video')
    }

    // Create project immediately to get projectId for preview
    if (!projectId) {
      try {
        setIsGenerating(true)
        toast.loading('Preparing preview...', { id: 'preview-loading' })
        
        const projectResponse = await uploadAPI.createProject({
          name: campaignName.trim(),
          description: `QR-Links-Video campaign with ${links.length} additional link(s)`,
          campaignType: 'qr-links-video',
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
          const previewLandingPageUrl = `${window.location.origin}/#/phygitalized/video/${createdProjectId}`
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

    // Check if file exists (either uploaded to Cloudinary or waiting to be uploaded)
    if (!uploadedFile && !fileUrl) {
      toast.error('Please upload a video first')
      return
    }
    
    // Ensure we have fileType if we have uploadedFile
    if (uploadedFile && !fileType) {
      setFileType('video')
    }

    try {
      setIsGenerating(true)
      
      // Use existing projectId if available (created in handleContinueToDesign), otherwise create new project
      let createdProjectId = projectId
      if (!createdProjectId) {
        try {
          const projectResponse = await uploadAPI.createProject({
            name: campaignName.trim(),
            description: `QR-Links-Video campaign with ${links.length} additional link(s)`,
            campaignType: 'qr-links-video',
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
            hasSocialLinks: Object.keys(socialLinks || {}).length > 0,
            socialLinksKeys: Object.keys(socialLinks || {})
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

      // Upload video to Cloudinary if not already uploaded
      let finalFileUrl = fileUrl
      // Check if file needs to be uploaded (either no fileUrl or it's a blob/data URL)
      if (uploadedFile && (!fileUrl || fileUrl.startsWith('blob:') || fileUrl.startsWith('data:'))) {
        try {
          const variation = 'qr-links-video'
          
          toast('Uploading video to Cloudinary...', { icon: '⏳' })
          
          const uploadResponse = await phygitalizedAPI.uploadFile(variation, createdProjectId, uploadedFile, 'video')
          
          console.log('📤 Upload response:', uploadResponse.data)
          
          if (uploadResponse.data?.success && uploadResponse.data?.data?.file) {
            finalFileUrl = uploadResponse.data.data.file.url
            setFileUrl(finalFileUrl) // Update state with Cloudinary URL
            
            // Clean up blob URL if it was a preview
            if (fileUrl && fileUrl.startsWith('blob:')) {
              URL.revokeObjectURL(fileUrl)
            }
            
            // Update project with video URL
            const fileUrlKey = 'video'
            const determinedFileType = 'video'
            
            // Update fileType state if not set
            if (!fileType) {
              setFileType('video')
            }
            
            // Prepare file data object with all necessary fields
            const fileDataObject = {
              url: uploadResponse.data.data.file.url,
              filename: uploadResponse.data.data.file.filename || uploadedFile.name,
              originalName: uploadedFile.name,
              size: uploadResponse.data.data.file.size || uploadedFile.size,
              uploadedAt: new Date(),
              format: uploadResponse.data.data.file.format || uploadedFile.type,
              resource_type: uploadResponse.data.data.file.resource_type
            }
            
            const firstUpdatePayload = {
              campaignType: 'qr-links-video', // Ensure campaignType is set
              phygitalizedData: {
                fileUrl: finalFileUrl,
                fileType: determinedFileType
              },
              fileUrls: {
                [fileUrlKey]: fileDataObject
              }
            }
            
            console.log('📤 First update - Saving file to project:', {
              projectId: createdProjectId,
              fileUrl: finalFileUrl,
              fileType: determinedFileType,
              fileUrlKey: fileUrlKey,
              payload: firstUpdatePayload
            })
            
            try {
              const firstUpdateResponse = await phygitalizedAPI.updateCampaign(createdProjectId, firstUpdatePayload)
              
              console.log('✅ File saved to project:', {
                projectId: createdProjectId,
                fileUrl: finalFileUrl,
                fileType: determinedFileType,
                fileUrlKey: fileUrlKey,
                updateResponse: firstUpdateResponse.data
              })
            } catch (updateError) {
              console.error('❌ Error in first update:', updateError)
              throw updateError
            }
            
            toast.success('File uploaded to Cloudinary successfully!')
          } else {
            throw new Error('Upload failed - no file data returned')
          }
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError)
          toast.error('Failed to upload file to Cloudinary. Please try again.')
          setIsGenerating(false)
          return
        }
      }

      // Generate landing page URL using projectId
      const landingPageUrl = `${window.location.origin}/#/phygitalized/video/${createdProjectId}`
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
        // Determine final file type - ensure we have it
        const finalFileType = 'video'
        
        // Determine fileUrlKey for fileUrls
        const fileUrlKey = 'video'
        
        // Ensure we have finalFileUrl - if not, something went wrong
        if (!finalFileUrl || finalFileUrl.startsWith('blob:') || finalFileUrl.startsWith('data:')) {
          console.error('❌ No valid file URL found:', { finalFileUrl, fileUrl, uploadedFile })
          toast.error('File URL not found. Please try uploading the file again.')
          setIsGenerating(false)
          return
        }
        
        const updatePayload = {
          campaignType: 'qr-links-video', // Ensure campaignType is set
          qrCodeUrl: qrDataUrl,
          landingPageUrl: landingPageUrl,
          phygitalizedData: {
            fileUrl: finalFileUrl, // Always include fileUrl
            fileType: finalFileType, // Always include fileType
            links: links.map(link => ({
              label: link.label,
              url: link.url.startsWith('http://') || link.url.startsWith('https://') 
                ? link.url 
                : `https://${link.url}`
            })),
            socialLinks: socialLinks,
            qrDesign: qrDesign
          },
          // Always include fileUrls to ensure it's stored
          fileUrls: {
            [fileUrlKey]: {
              url: finalFileUrl,
              filename: uploadedFile?.name || 'file',
              originalName: uploadedFile?.name || 'file',
              size: uploadedFile?.size || 0,
              format: uploadedFile?.type || 'application/octet-stream',
              uploadedAt: new Date()
            }
          }
        }
        
        console.log('📤 Final update - Saving campaign data:', {
          projectId: createdProjectId,
          fileUrl: finalFileUrl,
          fileType: finalFileType,
          fileUrlKey: fileUrlKey,
          socialLinks: socialLinks,
          hasSocialLinks: Object.keys(socialLinks || {}).length > 0,
          socialLinksKeys: Object.keys(socialLinks || {}),
          hasLinks: links.length > 0,
          updatePayload: updatePayload
        })
        
        const updateResponse = await phygitalizedAPI.updateCampaign(createdProjectId, updatePayload)
        
        console.log('✅ Campaign updated successfully:', {
          response: updateResponse.data,
          phygitalizedData: updatePayload.phygitalizedData,
          socialLinks: updatePayload.phygitalizedData?.socialLinks,
          hasSocialLinks: Object.keys(updatePayload.phygitalizedData?.socialLinks || {}).length > 0,
          socialLinksKeys: Object.keys(updatePayload.phygitalizedData?.socialLinks || {}),
          fileUrls: updatePayload.fileUrls
        })
        
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
        console.error('❌ Error updating campaign:', updateError)
        console.error('Update error details:', {
          message: updateError.message,
          response: updateError.response?.data,
          status: updateError.response?.status
        })
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-2">
          Links & Video QR
        </h1>
        <p className="text-sm sm:text-base text-slate-300">
          Create a QR code with video content and additional links
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
                    Provide campaign name, upload content, and add links
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
                  placeholder="Enter campaign name (e.g., Product Demo Video)"
                  className="w-full px-4 py-3 sm:py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent touch-manipulation"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleContinueToDesign()
                    }
                  }}
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
                  <Video className="w-4 h-4 mr-2 text-neon-blue" />
                  Upload Video *
                </label>
                {uploadedFile ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Video className="w-5 h-5 mr-3 text-neon-pink" />
                          <div>
                            <p className="text-slate-100 font-medium">{uploadedFile.name}</p>
                            <p className="text-sm text-slate-400">
                              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={removeFile}
                          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                    {fileUrl && (
                      <video
                        src={fileUrl}
                        controls
                        className="w-full rounded-lg"
                      />
                    )}
                  </div>
                ) : (
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-6 sm:p-8 text-center cursor-pointer transition-colors
                      ${isDragActive 
                        ? 'border-neon-pink bg-neon-pink/10' 
                        : 'border-slate-600/50 hover:border-neon-pink/50'
                      }
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input {...getInputProps()} />
                    {isUploading ? (
                      <div>
                        <LoadingSpinner size="lg" />
                        <p className="text-slate-300 mt-4">Uploading... {uploadProgress}%</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-slate-400 mb-3 sm:mb-4" />
                        <p className="text-sm sm:text-base text-slate-300 mb-2">
                          {isDragActive ? 'Drop the video here' : 'Drag & drop a video here'}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-400">
                          or click to browse
                        </p>
                        <p className="text-xs text-slate-500 mt-2 px-2">
                          Supports: MP4, MOV, AVI, WEBM, MKV, FLV, WMV, M4V, 3GP, OGV, TS, MTS
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
                        <p className="text-slate-100 font-medium">{link.label}</p>
                        <p className="text-sm text-slate-400 truncate">{link.url}</p>
                      </div>
                      <button
                        onClick={() => removeLink(link.id)}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
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
                disabled={!campaignName.trim() || (!uploadedFile && !fileUrl)}
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 flex items-center">
                    <QrCode className="w-5 h-5 mr-2 text-neon-purple" />
                    Step 2: Design the QR
                  </h2>
                  <p className="text-slate-300 text-sm mt-1">
                    Customize your QR code with frames, patterns, corners, and logos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-sm text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
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
              previewUrl={landingPageUrl || (projectId ? `${window.location.origin}/#/phygitalized/video/${projectId}` : '')}
              disabled={isGenerating}
            />
            
            {/* Generate Button at Bottom */}
            <div className="p-6 border-t border-slate-700/50 bg-slate-800/30">
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
                      setUploadedFile(null)
                      setFileUrl('')
                      setFileType('')
                      setLinks([])
                      setNewLink({ label: '', url: '' })
                      setSocialLinks({})
                      setQrDesign(null)
                    }}
                    className="w-full btn-primary flex items-center justify-center"
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
                    if (!uploadedFile && !fileUrl) {
                      toast.error('Please upload a video first')
                      return
                    }
                    handleGenerate()
                  }}
                  disabled={isGenerating}
                  className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed py-3 sm:py-3 text-sm sm:text-base touch-manipulation min-h-[44px] sm:min-h-0"
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
              Enter a campaign name, upload a video, and add your links
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

export default QRLinksVideoPage

