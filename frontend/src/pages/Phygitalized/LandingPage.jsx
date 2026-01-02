/**
 * Landing Page Component
 * Displays landing pages for Phygitalized QR codes
 * Handles different types: links, video, pdf-video, ar-experience
 */

import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Globe,
  Video,
  FileText,
  ExternalLink,
  Link as LinkIcon,
  Sparkles,
  Phone,
  MessageCircle,
  Lock,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import { phygitalizedAPI } from '../../utils/api'
import ThemeRenderer from '../../components/Templates/ThemeRenderer'
import {
  trackLandingPageScan,
  trackLandingPageView,
  trackSocialMediaClick,
  trackContactClick,
  trackWhatsAppClick,
  trackDocumentView,
  trackVideoPlay,
  trackVideoProgress,
  trackVideoComplete,
  trackLinkClick,
  trackPageViewDuration,
  trackVideoProgressMilestone
} from '../../utils/landingPageAnalytics'
import { startTimeTracking, stopTimeTracking } from '../../utils/timeTracking'
import { trackVideoProgress as trackVideoProgressUtil } from '../../utils/videoProgressTracker'

const LandingPage = () => {
  const { pageId } = useParams()
  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isCampaignPaused, setIsCampaignPaused] = useState(false)
  const [pausedCampaignName, setPausedCampaignName] = useState(null)
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const videoRef = useRef(null)
  const videoRefPdfVideo = useRef(null)
  const videoRefArVideo = useRef(null)
  const videoProgressIntervalRef = useRef(null)
  const userIdRef = useRef(null)
  const projectIdRef = useRef(null)
  const videoCleanupRef = useRef(null)
  const timeTrackingStartedRef = useRef(false)
  const scanTrackedRef = useRef(false)
  const pageViewTrackedRef = useRef(false)
  
  // Multiple video support
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [videos, setVideos] = useState([])

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setLoading(true)
        
        // Fetch campaign data from backend API
        // pageId is the projectId
        const response = await phygitalizedAPI.getPublicCampaign(pageId)
        
        if (response.data?.success && response.data?.data) {
          const campaignData = response.data.data
          
          // Transform backend data to match frontend format
          // Check all possible locations for file URL
          let foundFileUrl = null
          let foundFileType = null
          
          // Check uploadedFiles first (most reliable) - but exclude design/compositeDesign/mindTarget
          if (campaignData.uploadedFiles) {
            // Check for document first (for qr-links-video with documents)
            if (campaignData.uploadedFiles.document?.url) {
              foundFileUrl = campaignData.uploadedFiles.document.url
              foundFileType = 'document'
            } else if (campaignData.uploadedFiles.pdf?.url) {
              foundFileUrl = campaignData.uploadedFiles.pdf.url
              foundFileType = 'document'
            } else if (campaignData.uploadedFiles.documents?.length > 0) {
              // Check documents array (documents are stored as an array)
              const firstDocument = campaignData.uploadedFiles.documents[0]
              if (firstDocument?.url) {
                foundFileUrl = firstDocument.url
                foundFileType = 'document'
              }
            } else if (campaignData.uploadedFiles.video?.url) {
              // Only use video if it's not from the regular upload flow (check if it has Phygitalized context)
              // For now, use it if document/pdf don't exist
              foundFileUrl = campaignData.uploadedFiles.video.url
              foundFileType = 'video'
            }
          }
          
          // Fallback to phygitalizedData
          if (!foundFileUrl && campaignData.phygitalizedData?.fileUrl) {
            foundFileUrl = campaignData.phygitalizedData.fileUrl
            foundFileType = campaignData.phygitalizedData.fileType || foundFileType
          }
          
          // Get base links from phygitalizedData
          const baseLinks = campaignData.phygitalizedData?.links || []
          
          // Get social links and filter out contact info
          const contactInfoKeys = new Set(['contactNumber', 'whatsappNumber'])
          const socialLinks = Object.fromEntries(
            Object.entries(campaignData.phygitalizedData?.socialLinks || {})
              .filter(([key, value]) => {
                if (!value) return false
                // Handle string values
                if (typeof value === 'string') {
                  return value.trim() !== ''
                }
                // Handle other types (shouldn't happen, but be safe)
                return !!value
              })
          )
          
          // Convert social links (excluding contact info) to links array format
          const socialLinksAsCustomLinks = Object.entries(socialLinks)
            .filter(([key]) => !contactInfoKeys.has(key))
            .map(([key, value]) => ({
              label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
              url: value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
            }))
          
          // Combine social links with custom links (ensure we preserve all links)
          // Use a Map to deduplicate by URL
          const normalizeUrl = (url) => {
            try {
              const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
              return urlObj.hostname + urlObj.pathname.replace(/\/$/, '')
            } catch {
              return url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
            }
          }
          
          const linksMap = new Map()
          
          // First add base links (from upgrade, custom links, etc.)
          baseLinks.forEach(link => {
            if (link && link.url) {
              const normalized = normalizeUrl(link.url)
              if (!linksMap.has(normalized)) {
                linksMap.set(normalized, {
                  label: link.label || 'Link',
                  url: (link.url || '').startsWith('http://') || (link.url || '').startsWith('https://')
                    ? link.url
                    : `https://${link.url}`
                })
              }
            }
          })
          
          // Then add social links (they can add new links or update existing ones)
          socialLinksAsCustomLinks.forEach(link => {
            if (link && link.url) {
              const normalized = normalizeUrl(link.url)
              linksMap.set(normalized, link) // Overwrite if duplicate
            }
          })
          
          // Convert back to array
          let combinedLinks = Array.from(linksMap.values())
          
          // Fallback: Check for original link URL if no links found or for qr-links campaigns
          // This ensures we display the original link even if it wasn't properly migrated
          if (combinedLinks.length === 0 || campaignData.campaignType === 'qr-links') {
            const originalLinkUrl = campaignData.phygitalizedData?.linkUrl || 
                                    campaignData.targetUrl ||
                                    campaignData.phygitalizedData?.redirectUrl
            
            if (originalLinkUrl) {
              // Check if original link already exists
              const originalExists = combinedLinks.some(link => {
                if (!link || !link.url) return false
                return normalizeUrl(link.url) === normalizeUrl(originalLinkUrl)
              })
              
              if (!originalExists) {
                const originalLink = {
                  label: 'Link 1',
                  url: originalLinkUrl.startsWith('http://') || originalLinkUrl.startsWith('https://') 
                    ? originalLinkUrl 
                    : `https://${originalLinkUrl}`
                }
                
                // Add original link first
                combinedLinks = [originalLink, ...combinedLinks]
                
                console.log('✅ LandingPage: Added fallback original link:', {
                  originalLink,
                  totalLinks: combinedLinks.length
                })
              }
            }
          }
          
          const transformedData = {
            type: campaignData.type || campaignData.campaignType || 'qr-links-video', // Use campaignType as fallback
            fileUrl: foundFileUrl,
            fileType: foundFileType || campaignData.phygitalizedData?.fileType,
            // For qr-links-pdf-video - check multiple sources
            pdfUrl: campaignData.uploadedFiles?.pdf?.url || 
                    campaignData.pdfUrl || 
                    campaignData.phygitalizedData?.pdfUrl,
            // Include documents array for multiple PDFs
            documents: campaignData.uploadedFiles?.documents || [],
            videoUrl: campaignData.uploadedFiles?.video?.url || 
                      campaignData.videoUrl || 
                      campaignData.phygitalizedData?.videoUrl,
            // Include videos array for multiple videos
            videos: campaignData.uploadedFiles?.videos || [],
            links: combinedLinks, // Use combined links (base links + social links)
            // Filter out empty social links - handle both string and formatted phone numbers
            socialLinks: socialLinks, // Keep social links separate for contact info display
            // Add template data
            templateId: campaignData.phygitalizedData?.templateId || 'default',
            templateConfig: campaignData.phygitalizedData?.templateConfig || {}
          }
          
          console.log('📦 Campaign data loaded:', {
            rawCampaignData: campaignData,
            type: transformedData.type,
            fileUrl: transformedData.fileUrl,
            fileType: foundFileType,
            baseLinks: baseLinks,
            socialLinksAsCustomLinks: socialLinksAsCustomLinks,
            combinedLinks: combinedLinks,
            linksCount: combinedLinks.length,
            uploadedFiles: campaignData.uploadedFiles,
            uploadedFilesVideo: campaignData.uploadedFiles?.video,
            uploadedFilesPdf: campaignData.uploadedFiles?.pdf,
            videoUrlFromUploadedFiles: campaignData.uploadedFiles?.video?.url,
            videoUrlFromProject: campaignData.videoUrl,
            videoUrlFromPhygitalizedData: campaignData.phygitalizedData?.videoUrl,
            pdfUrlFromUploadedFiles: campaignData.uploadedFiles?.pdf?.url,
            pdfUrlFromProject: campaignData.pdfUrl,
            pdfUrlFromPhygitalizedData: campaignData.phygitalizedData?.pdfUrl,
            finalVideoUrl: transformedData.videoUrl,
            finalPdfUrl: transformedData.pdfUrl,
            phygitalizedData: campaignData.phygitalizedData,
            phygitalizedDataLinks: campaignData.phygitalizedData?.links,
            phygitalizedDataSocialLinks: campaignData.phygitalizedData?.socialLinks,
            templateId: campaignData.phygitalizedData?.templateId,
            templateConfig: campaignData.phygitalizedData?.templateConfig,
            customBackgroundColor: campaignData.phygitalizedData?.templateConfig?.customBackgroundColor,
            transformedTemplateId: transformedData.templateId,
            transformedTemplateConfig: transformedData.templateConfig,
            transformedCustomBackgroundColor: transformedData.templateConfig?.customBackgroundColor,
            foundFileUrl: foundFileUrl,
            foundFileType: foundFileType,
            hasLinks: transformedData.links?.length > 0,
            hasSocialLinks: Object.keys(transformedData.socialLinks || {}).length > 0,
            socialLinksKeys: Object.keys(transformedData.socialLinks || {}),
            socialLinks: transformedData.socialLinks
          })
          
          // Extract userId and projectId for analytics
          userIdRef.current = campaignData.userId || null
          projectIdRef.current = pageId
          
          // Initialize videos array (check videos array first, fallback to single video)
          const videosArray = campaignData.uploadedFiles?.videos || []
          if (videosArray.length > 0) {
            setVideos(videosArray)
            setCurrentVideoIndex(0)
          } else if (campaignData.uploadedFiles?.video?.url) {
            // Convert single video to array format for consistency
            setVideos([campaignData.uploadedFiles.video])
            setCurrentVideoIndex(0)
          } else if (transformedData.videoUrl || transformedData.fileUrl) {
            // Fallback to videoUrl/fileUrl if available
            const singleVideo = transformedData.videoUrl || transformedData.fileUrl
            setVideos([{ url: singleVideo }])
            setCurrentVideoIndex(0)
          } else {
            setVideos([])
            setCurrentVideoIndex(0)
          }
          
          setPageData(transformedData)
          setLoading(false)
        } else {
          // Fallback to localStorage for backward compatibility
          const storedData = localStorage.getItem(`landing-page-${pageId}`)
          if (storedData) {
            const data = JSON.parse(storedData)
            setPageData(data)
            setLoading(false)
            return
          }

          // Try AR experience data
          const arData = localStorage.getItem(`ar-experience-${pageId}`)
          if (arData) {
            const data = JSON.parse(arData)
            if (!data.type) {
              data.type = 'qr-links-ar-video'
            }
            setPageData(data)
            setLoading(false)
            return
          }

          setError('Landing page not found')
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading landing page:', err)
        
        // Check if this is a 403 error (campaign paused)
        if (err.response?.status === 403 && err.response?.data?.isDisabled) {
          const errorData = err.response.data
          setIsCampaignPaused(true)
          setPausedCampaignName(errorData.projectName || null)
          setError(null)
          setLoading(false)
          return
        }
        
        // Fallback to localStorage for other errors
        try {
          const storedData = localStorage.getItem(`landing-page-${pageId}`)
          if (storedData) {
            const data = JSON.parse(storedData)
            setPageData(data)
            setLoading(false)
            return
          }

          const arData = localStorage.getItem(`ar-experience-${pageId}`)
          if (arData) {
            const data = JSON.parse(arData)
            if (!data.type) {
              data.type = 'qr-links-ar-video'
            }
            setPageData(data)
            setLoading(false)
            return
          }
        } catch (fallbackErr) {
          console.error('Fallback error:', fallbackErr)
        }
        
        // Use API error message if available, otherwise default message
        const errorMessage = err.response?.data?.message || 'Failed to load landing page'
        setError(errorMessage)
        setLoading(false)
      }
    }

    loadPageData()
  }, [pageId])

  // Track scan, page view and start time tracking when page data is loaded
  useEffect(() => {
    if (!pageData || !userIdRef.current || !projectIdRef.current) return

    // Track QR scan first (when user visits landing page from QR code scan)
    if (!scanTrackedRef.current) {
      scanTrackedRef.current = true
      trackLandingPageScan(userIdRef.current, projectIdRef.current).catch(err => {
        console.error('Failed to track scan:', err)
        scanTrackedRef.current = false // Reset on error so it can retry
      })
    }

    // Track page view only once per page load (async, includes location)
    if (!pageViewTrackedRef.current) {
      pageViewTrackedRef.current = true
      trackLandingPageView(userIdRef.current, projectIdRef.current).catch(err => {
        console.error('Failed to track page view:', err)
        pageViewTrackedRef.current = false // Reset on error so it can retry
      })
    }

    // Start time tracking (async, includes location)
    if (!timeTrackingStartedRef.current) {
      startTimeTracking(userIdRef.current, projectIdRef.current).catch(err => {
        console.error('Failed to start time tracking:', err)
      })
      timeTrackingStartedRef.current = true
    }

    // Cleanup on unmount
    return () => {
      if (timeTrackingStartedRef.current) {
        stopTimeTracking(userIdRef.current, projectIdRef.current)
        timeTrackingStartedRef.current = false
      }
      if (videoCleanupRef.current) {
        videoCleanupRef.current()
        videoCleanupRef.current = null
      }
    }
  }, [pageData])

  // Set up video progress tracking for qr-links-video
  useEffect(() => {
    if (!pageData || pageData.type !== 'qr-links-video') return
    if (!videoRef.current || !userIdRef.current || !projectIdRef.current) return

    // Clean up previous tracking
    if (videoCleanupRef.current) {
      videoCleanupRef.current()
    }

    // Set up video progress tracking
    videoCleanupRef.current = trackVideoProgressUtil(
      videoRef.current,
      userIdRef.current,
      projectIdRef.current,
      async (eventType, milestone, progress, duration) => {
        const currentVideo = videos[currentVideoIndex]
        const videoUrl = currentVideo?.url || pageData.fileUrl
        const videoId = currentVideo?.videoId || null
        const videoIndex = videos.length > 1 ? currentVideoIndex : null
        
        if (eventType === 'play') {
          await trackVideoPlay(userIdRef.current, projectIdRef.current, videoUrl, videoIndex, videoId)
        } else if (eventType === 'milestone') {
          await trackVideoProgressMilestone(userIdRef.current, projectIdRef.current, milestone.toString(), progress, duration, videoIndex, videoId, videoUrl)
        } else if (eventType === 'complete') {
          await trackVideoComplete(userIdRef.current, projectIdRef.current, duration, videoIndex, videoId, videoUrl)
        }
      }
    )

    return () => {
      if (videoCleanupRef.current) {
        videoCleanupRef.current()
        videoCleanupRef.current = null
      }
    }
  }, [pageData, pageData?.fileUrl, pageData?.type, videos, currentVideoIndex])

  // Set up video progress tracking for qr-links-pdf-video
  useEffect(() => {
    if (!pageData || pageData.type !== 'qr-links-pdf-video') return
    if (!videoRefPdfVideo.current || !userIdRef.current || !projectIdRef.current) return

    // Clean up previous tracking
    if (videoCleanupRef.current) {
      videoCleanupRef.current()
    }

    // Set up video progress tracking
    videoCleanupRef.current = trackVideoProgressUtil(
      videoRefPdfVideo.current,
      userIdRef.current,
      projectIdRef.current,
      async (eventType, milestone, progress, duration) => {
        const currentVideo = videos[currentVideoIndex]
        const videoUrl = currentVideo?.url || pageData.videoUrl
        const videoId = currentVideo?.videoId || null
        const videoIndex = videos.length > 1 ? currentVideoIndex : null
        
        if (eventType === 'play') {
          await trackVideoPlay(userIdRef.current, projectIdRef.current, videoUrl, videoIndex, videoId)
        } else if (eventType === 'milestone') {
          await trackVideoProgressMilestone(userIdRef.current, projectIdRef.current, milestone.toString(), progress, duration, videoIndex, videoId, videoUrl)
        } else if (eventType === 'complete') {
          await trackVideoComplete(userIdRef.current, projectIdRef.current, duration, videoIndex, videoId, videoUrl)
        }
      }
    )

    return () => {
      if (videoCleanupRef.current) {
        videoCleanupRef.current()
        videoCleanupRef.current = null
      }
    }
  }, [pageData, pageData?.videoUrl, pageData?.type, videos, currentVideoIndex])

  // Set up video progress tracking for qr-links-ar-video
  useEffect(() => {
    if (!pageData || pageData.type !== 'qr-links-ar-video') return
    if (!videoRefArVideo.current || !userIdRef.current || !projectIdRef.current) return

    // Clean up previous tracking
    if (videoCleanupRef.current) {
      videoCleanupRef.current()
    }

    // Set up video progress tracking
    videoCleanupRef.current = trackVideoProgressUtil(
      videoRefArVideo.current,
      userIdRef.current,
      projectIdRef.current,
      async (eventType, milestone, progress, duration) => {
        const currentVideo = videos[currentVideoIndex]
        const videoUrl = currentVideo?.url || pageData.videoUrl
        const videoId = currentVideo?.videoId || null
        const videoIndex = videos.length > 1 ? currentVideoIndex : null
        
        if (eventType === 'play') {
          await trackVideoPlay(userIdRef.current, projectIdRef.current, videoUrl, videoIndex, videoId)
        } else if (eventType === 'milestone') {
          await trackVideoProgressMilestone(userIdRef.current, projectIdRef.current, milestone.toString(), progress, duration, videoIndex, videoId, videoUrl)
        } else if (eventType === 'complete') {
          await trackVideoComplete(userIdRef.current, projectIdRef.current, duration, videoIndex, videoId, videoUrl)
        }
      }
    )

    return () => {
      if (videoCleanupRef.current) {
        videoCleanupRef.current()
        videoCleanupRef.current = null
      }
    }
  }, [pageData, pageData?.videoUrl, pageData?.type, videos, currentVideoIndex])

  const getSocialIcon = (platform) => {
    const platformLower = platform.toLowerCase()
    switch (platformLower) {
      case 'instagram':
        return Instagram
      case 'facebook':
        return Facebook
      case 'twitter':
        return Twitter
      case 'linkedin':
        return Linkedin
      case 'website':
        return Globe
      case 'contactnumber':
        return Phone
      case 'whatsappnumber':
        return MessageCircle
      case 'tiktok':
        return LinkIcon // You can add a TikTok icon if available
      default:
        return LinkIcon
    }
  }

  const getPlatformLabel = (platform) => {
    const platformLower = platform.toLowerCase()
    switch (platformLower) {
      case 'instagram':
        return 'Instagram'
      case 'facebook':
        return 'Facebook'
      case 'twitter':
        return 'Twitter'
      case 'linkedin':
        return 'LinkedIn'
      case 'website':
        return 'Website'
      case 'contactnumber':
        return 'Contact Number'
      case 'whatsappnumber':
        return 'WhatsApp'
      case 'tiktok':
        return 'TikTok'
      default:
        return platform.charAt(0).toUpperCase() + platform.slice(1).replace(/([A-Z])/g, ' $1').trim()
    }
  }
  
  const splitSocialLinks = (socialLinks = {}) => {
    const contactInfoKeys = new Set(['contactNumber', 'whatsappNumber'])
    const contactInfo = {}
    const social = {}
    
    Object.entries(socialLinks || {}).forEach(([key, value]) => {
      if (!value || (typeof value === 'string' && value.trim() === '')) return
      if (contactInfoKeys.has(key)) contactInfo[key] = value
      else social[key] = value
    })
    
    return { contactInfo, social }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Show paused campaign message
  if (isCampaignPaused) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Phygital Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl shadow-glow-lg mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gradient mb-2">
              Phygital
            </h1>
            <p className="text-sm text-slate-400">
              Interactive Digital Campaigns
            </p>
          </div>

          {/* Status Card */}
          <div className="card-glass rounded-xl shadow-dark-large border border-slate-600/30 p-6 mb-6">
            <div className="flex flex-col items-center text-center">
              {/* Lock Icon */}
              <div className="w-16 h-16 bg-yellow-900/30 rounded-full flex items-center justify-center mb-4 border-2 border-yellow-600/30">
                <Lock className="w-8 h-8 text-yellow-400" />
              </div>
              
              {/* Message */}
              <h2 className="text-xl font-bold text-slate-100 mb-3">
                Campaign Currently Paused
              </h2>
              
              {pausedCampaignName && (
                <p className="text-slate-300 mb-4">
                  The campaign <strong className="text-neon-blue">"{pausedCampaignName}"</strong> has been temporarily paused by its owner.
                </p>
              )}
              
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600/30 w-full">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-sm text-slate-300 mb-2">
                      <strong>Why am I seeing this?</strong>
                    </p>
                    <p className="text-xs text-slate-400">
                      The creator has chosen to pause this campaign. 
                      This could be temporary maintenance, content updates, or the campaign may be temporarily unavailable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-600/20">
            <p className="text-xs text-slate-400 text-center mb-3">
              If you're the campaign owner, you can activate this campaign from your Campaigns page.
            </p>
            <div className="flex justify-center gap-2">
              <Link
                to="/"
                className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                Go to Homepage
              </Link>
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-neon-blue to-neon-purple hover:shadow-glow-blue rounded-lg transition-all"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-500">
              Powered by <span className="text-gradient font-semibold">Phygital</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !pageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">Page Not Found</h1>
          <p className="text-slate-300">{error || 'The landing page you are looking for does not exist.'}</p>
        </div>
      </div>
    )
  }

  // Get template ID and config
  const templateId = pageData.templateId || 'default'
  const templateConfig = pageData.templateConfig || {}
  
  console.log('🎨 LandingPage passing to ThemeRenderer:', {
    templateId,
    templateConfig,
    hasCustomBackgroundColor: !!templateConfig?.customBackgroundColor,
    customBackgroundColor: templateConfig?.customBackgroundColor,
    fullPageData: pageData
  })

  return (
    <ThemeRenderer template={templateId} templateConfig={templateConfig}>
      <div className="min-h-screen" style={{ backgroundColor: 'transparent', background: 'transparent' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header - Removed Welcome text and description */}

        {/* Content based on page type */}
        {pageData.type === 'qr-links' && (
          <div className="space-y-6">
            {/* Contact Information */}
            {(() => {
              const { contactInfo } = splitSocialLinks(pageData.socialLinks || {})
              const hasContact = Object.keys(contactInfo).length > 0
              return hasContact ? (
                <div>
                  <h2 className="text-xl font-semibold text-slate-100 mb-4">Contact Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {Object.entries(contactInfo).map(([platform, value]) => {
                      const Icon = getSocialIcon(platform)
                      const href = platform === 'whatsappNumber' 
                        ? `https://wa.me/${String(value).replace(/\D/g, '')}`
                        : `tel:${String(value).replace(/\s+/g, '')}`
                      return (
                        <a
                          key={platform}
                          href={href}
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            
                            if (userIdRef.current && projectIdRef.current) {
                              try {
                                if (platform === 'contactNumber') {
                                  console.log('📞 Tracking contact click:', { userId: userIdRef.current, projectId: projectIdRef.current, value })
                                  await trackContactClick(userIdRef.current, projectIdRef.current, value, 'contactNumber')
                                } else if (platform === 'whatsappNumber') {
                                  console.log('💬 Tracking WhatsApp click:', { userId: userIdRef.current, projectId: projectIdRef.current, value })
                                  await trackWhatsAppClick(userIdRef.current, projectIdRef.current, value)
                                }
                                // Small delay to ensure tracking completes
                                await new Promise(resolve => setTimeout(resolve, 100))
                              } catch (error) {
                                console.error('Failed to track click:', error)
                              }
                            }
                            
                            // Navigate after tracking
                            window.location.href = href
                          }}
                          className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                          style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                        >
                          <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-all" style={{ background: 'var(--theme-card, rgba(148, 163, 184, 0.2))' }}>
                            <Icon className="w-6 h-6" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                          </div>
                          <div className="flex-1">
                            <p className="text-slate-100 font-semibold">{getPlatformLabel(platform)}</p>
                            <p className="text-sm text-slate-400 truncate">{value}</p>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              ) : null
            })()}
            
            {/* Links Grid */}
            {pageData.links && pageData.links.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-4">Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pageData.links.map((link, index) => {
                    const Icon = getSocialIcon(link.label)
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          if (userIdRef.current && projectIdRef.current) {
                            trackLinkClick(userIdRef.current, projectIdRef.current, link.label, link.url)
                          }
                        }}
                        className="flex items-center p-6 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                        style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                      >
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-all" style={{ background: 'var(--theme-card, rgba(148, 163, 184, 0.2))' }}>
                          <Icon className="w-6 h-6" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-slate-100 font-semibold text-lg mb-1">
                            {getPlatformLabel(link.label)}
                          </h3>
                          <p className="text-sm text-slate-400 truncate">{link.url}</p>
                        </div>
                        <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-neon-purple transition-colors" />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {pageData.type === 'qr-links-video' && (
          <div className="space-y-6">
            {/* Video/Document */}
            {pageData.fileType === 'video' && videos.length > 0 && (
              <div className="backdrop-blur-sm rounded-xl border border-slate-600/30 p-6 mb-6" style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Video className="w-6 h-6 mr-2" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                    <h2 className="text-xl font-semibold text-slate-100">Video Content</h2>
                  </div>
                  {videos.length > 1 && (
                    <span className="text-sm text-slate-400">
                      Video {currentVideoIndex + 1} of {videos.length}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <video
                    ref={videoRef}
                    src={videos[currentVideoIndex]?.url || videos[currentVideoIndex]?.fileUrl}
                    controls
                    className="w-full rounded-lg"
                    key={currentVideoIndex} // Force re-render when video changes
                  />
                  {videos.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <button
                        onClick={() => {
                          if (currentVideoIndex > 0) {
                            setCurrentVideoIndex(currentVideoIndex - 1)
                          }
                        }}
                        disabled={currentVideoIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 rounded-lg transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        Previous
                      </button>
                      <button
                        onClick={() => {
                          if (currentVideoIndex < videos.length - 1) {
                            setCurrentVideoIndex(currentVideoIndex + 1)
                          }
                        }}
                        disabled={currentVideoIndex === videos.length - 1}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 rounded-lg transition-all"
                      >
                        Next
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {pageData.fileType === 'document' && pageData.fileUrl && (
              <div className="backdrop-blur-sm rounded-xl border border-slate-600/30 p-6 mb-6" style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}>
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 mr-2" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                  <h2 className="text-xl font-semibold text-slate-100">Document</h2>
                </div>
                <a
                  href={pageData.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg hover:shadow-glow-lg transition-all"
                  onClick={() => {
                    if (userIdRef.current && projectIdRef.current) {
                      trackDocumentView(userIdRef.current, projectIdRef.current, pageData.fileUrl, 'view')
                    }
                  }}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Open Document
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            )}
            
            {/* Show file if fileUrl exists but fileType is not set or is pdf */}
            {!pageData.fileType && pageData.fileUrl && (
              <div className="backdrop-blur-sm rounded-xl border border-slate-600/30 p-6 mb-6" style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}>
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 mr-2" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                  <h2 className="text-xl font-semibold text-slate-100">File</h2>
                </div>
                <a
                  href={pageData.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-neon-pink to-neon-purple text-white rounded-lg hover:shadow-glow-lg transition-all"
                  onClick={() => {
                    if (userIdRef.current && projectIdRef.current) {
                      trackDocumentView(userIdRef.current, projectIdRef.current, pageData.fileUrl, 'view')
                    }
                  }}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Open File
                  <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </div>
            )}

            {/* Contact Info + Social Links */}
            {(() => {
              const { contactInfo, social } = splitSocialLinks(pageData.socialLinks)
              const hasContact = Object.keys(contactInfo).length > 0
              const hasSocial = Object.keys(social).length > 0
              
              if (!hasContact && !hasSocial) return null
              
              return (
                <div className="space-y-6">
                  {/* Contact Information */}
                  {hasContact && (
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100 mb-4">Contact Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(contactInfo).map(([platform, value]) => {
                          const Icon = getSocialIcon(platform)
                          const href = platform === 'whatsappNumber' 
                            ? `https://wa.me/${String(value).replace(/\D/g, '')}`
                            : `tel:${String(value).replace(/\s+/g, '')}`
                          return (
                            <a
                              key={platform}
                              href={href}
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                
                                if (userIdRef.current && projectIdRef.current) {
                                  try {
                                    if (platform === 'contactNumber') {
                                      console.log('📞 Tracking contact click:', { userId: userIdRef.current, projectId: projectIdRef.current, value })
                                      await trackContactClick(userIdRef.current, projectIdRef.current, value, 'contactNumber')
                                    } else if (platform === 'whatsappNumber') {
                                      console.log('💬 Tracking WhatsApp click:', { userId: userIdRef.current, projectId: projectIdRef.current, value })
                                      await trackWhatsAppClick(userIdRef.current, projectIdRef.current, value)
                                    }
                                    await new Promise(resolve => setTimeout(resolve, 100))
                                  } catch (error) {
                                    console.error('Failed to track click:', error)
                                  }
                                }
                                
                                window.location.href = href
                              }}
                              className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                              style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                            >
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-all" style={{ background: 'var(--theme-card, rgba(148, 163, 184, 0.2))' }}>
                                <Icon className="w-6 h-6" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                              </div>
                              <div className="flex-1">
                                <p className="text-slate-100 font-semibold">{getPlatformLabel(platform)}</p>
                                <p className="text-sm text-slate-400 truncate">{value}</p>
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {hasSocial && (
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100 mb-4">Social Links</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(social).map(([platform, value]) => {
                          const Icon = getSocialIcon(platform)
                          const href = String(value).startsWith('http://') || String(value).startsWith('https://')
                            ? value
                            : `https://${value}`
                          return (
                            <a
                              key={platform}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (userIdRef.current && projectIdRef.current) {
                                  trackSocialMediaClick(userIdRef.current, projectIdRef.current, platform, href)
                                }
                              }}
                              className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                              style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                            >
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-all" style={{ background: 'var(--theme-card, rgba(148, 163, 184, 0.2))' }}>
                                <Icon className="w-6 h-6" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                              </div>
                              <div className="flex-1">
                                <p className="text-slate-100 font-semibold">{getPlatformLabel(platform)}</p>
                                <p className="text-sm text-slate-400 truncate">{value}</p>
                              </div>
                              <ExternalLink className="w-5 h-5 text-slate-400 transition-colors" style={{ color: 'var(--theme-secondary, #EC4899)' }} />
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Links */}
            {pageData.links && pageData.links.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-4">Additional Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pageData.links.map((link, index) => {
                    const Icon = getSocialIcon(link.label)
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                        style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                      >
                        <Icon className="w-5 h-5 mr-3" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                        <div className="flex-1">
                          <p className="text-slate-100 font-medium">{link.label}</p>
                          <p className="text-sm text-slate-400 truncate">{link.url}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 transition-colors" style={{ color: 'var(--theme-secondary, #EC4899)' }} />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {pageData.type === 'qr-links-pdf-video' && (
          <div className="space-y-6">
            {/* Video - Display with navigation if multiple videos */}
            {videos.length > 0 && (
              <div className="backdrop-blur-sm rounded-xl border border-slate-600/30 p-6" style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Video className="w-6 h-6 mr-2" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                    <h2 className="text-xl font-semibold text-slate-100">Video Content</h2>
                  </div>
                  {videos.length > 1 && (
                    <span className="text-sm text-slate-400">
                      Video {currentVideoIndex + 1} of {videos.length}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <video
                    ref={videoRefPdfVideo}
                    src={videos[currentVideoIndex]?.url || videos[currentVideoIndex]?.fileUrl}
                    controls
                    className="w-full rounded-lg"
                    key={currentVideoIndex} // Force re-render when video changes
                  />
                  {videos.length > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <button
                        onClick={() => {
                          if (currentVideoIndex > 0) {
                            setCurrentVideoIndex(currentVideoIndex - 1)
                          }
                        }}
                        disabled={currentVideoIndex === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 rounded-lg transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        Previous
                      </button>
                      <button
                        onClick={() => {
                          if (currentVideoIndex < videos.length - 1) {
                            setCurrentVideoIndex(currentVideoIndex + 1)
                          }
                        }}
                        disabled={currentVideoIndex === videos.length - 1}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-100 rounded-lg transition-all"
                      >
                        Next
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Info + Social Links */}
            {(() => {
              const { contactInfo, social } = splitSocialLinks(pageData.socialLinks)
              const hasContact = Object.keys(contactInfo).length > 0
              const hasSocial = Object.keys(social).length > 0
              
              if (!hasContact && !hasSocial) return null
              
              return (
                <div className="space-y-6">
                  {/* Contact Information */}
                  {hasContact && (
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100 mb-4">Contact Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(contactInfo).map(([platform, value]) => {
                          const Icon = getSocialIcon(platform)
                          const href = platform === 'whatsappNumber' 
                            ? `https://wa.me/${String(value).replace(/\D/g, '')}`
                            : `tel:${String(value).replace(/\s+/g, '')}`
                          return (
                            <a
                              key={platform}
                              href={href}
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                
                                if (userIdRef.current && projectIdRef.current) {
                                  try {
                                    if (platform === 'contactNumber') {
                                      console.log('📞 Tracking contact click:', { userId: userIdRef.current, projectId: projectIdRef.current, value })
                                      await trackContactClick(userIdRef.current, projectIdRef.current, value, 'contactNumber')
                                    } else if (platform === 'whatsappNumber') {
                                      console.log('💬 Tracking WhatsApp click:', { userId: userIdRef.current, projectId: projectIdRef.current, value })
                                      await trackWhatsAppClick(userIdRef.current, projectIdRef.current, value)
                                    }
                                    await new Promise(resolve => setTimeout(resolve, 100))
                                  } catch (error) {
                                    console.error('Failed to track click:', error)
                                  }
                                }
                                
                                window.location.href = href
                              }}
                              className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                              style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                            >
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-all" style={{ background: 'var(--theme-card, rgba(148, 163, 184, 0.2))' }}>
                                <Icon className="w-6 h-6" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                              </div>
                              <div className="flex-1">
                                <p className="text-slate-100 font-semibold">{getPlatformLabel(platform)}</p>
                                <p className="text-sm text-slate-400 truncate">{value}</p>
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {hasSocial && (
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100 mb-4">Social Links</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(social).map(([platform, value]) => {
                          const Icon = getSocialIcon(platform)
                          const href = String(value).startsWith('http://') || String(value).startsWith('https://')
                            ? value
                            : `https://${value}`
                          return (
                            <a
                              key={platform}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={async (e) => {
                                if (userIdRef.current && projectIdRef.current) {
                                  try {
                                    await trackSocialMediaClick(userIdRef.current, projectIdRef.current, platform, href)
                                  } catch (error) {
                                    console.error('Failed to track social click:', error)
                                  }
                                }
                              }}
                              className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                              style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                            >
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-all" style={{ background: 'var(--theme-card, rgba(148, 163, 184, 0.2))' }}>
                                <Icon className="w-6 h-6" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                              </div>
                              <div className="flex-1">
                                <p className="text-slate-100 font-semibold">{getPlatformLabel(platform)}</p>
                                <p className="text-sm text-slate-400 truncate">{value}</p>
                              </div>
                              <ExternalLink className="w-5 h-5 text-slate-400 transition-colors" style={{ color: 'var(--theme-secondary, #EC4899)' }} />
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Additional Links - Display after social links if available */}
            {pageData.links && pageData.links.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-slate-100 mb-4">Additional Links</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pageData.links.map((link, index) => {
                    const Icon = getSocialIcon(link.label)
                    return (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={async (e) => {
                          if (userIdRef.current && projectIdRef.current) {
                            try {
                              await trackLinkClick(userIdRef.current, projectIdRef.current, link.label, link.url)
                            } catch (error) {
                              console.error('Failed to track link click:', error)
                            }
                          }
                        }}
                        className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                        style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                      >
                        <Icon className="w-5 h-5 mr-3" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                        <div className="flex-1">
                          <p className="text-slate-100 font-medium">{link.label}</p>
                          <p className="text-sm text-slate-400 truncate">{link.url}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-neon-purple transition-colors" />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* PDF Documents - Display all documents if available */}
            {((pageData.documents && pageData.documents.length > 0) || pageData.pdfUrl) && (
              <div className="backdrop-blur-sm rounded-xl border border-slate-600/30 p-6" style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}>
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 mr-2" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                  <h2 className="text-xl font-semibold text-slate-100">
                    {pageData.documents && pageData.documents.length > 1 ? 'PDF Documents' : 'PDF Document'}
                  </h2>
                </div>
                <div className="space-y-3">
                  {/* Display all documents from array */}
                  {pageData.documents && pageData.documents.length > 0 && pageData.documents.map((document, index) => (
                    <a
                      key={index}
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (userIdRef.current && projectIdRef.current) {
                          trackDocumentView(userIdRef.current, projectIdRef.current, document.url, 'view')
                        }
                      }}
                      className="block w-full px-4 py-3 bg-slate-800/50 rounded-lg border border-slate-600/30 hover:border-neon-orange/50 hover:bg-slate-800/70 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1 min-w-0">
                          <FileText className="w-5 h-5 mr-3 text-neon-orange flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-slate-100 font-medium truncate">
                              {document.originalName || document.filename || `Document ${index + 1}`}
                            </p>
                            {document.size && (
                              <p className="text-xs text-slate-400 mt-1">
                                {(document.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0" />
                      </div>
                    </a>
                  ))}
                  {/* Fallback: Display single PDF URL if no documents array */}
                  {(!pageData.documents || pageData.documents.length === 0) && pageData.pdfUrl && (
                    <a
                      href={pageData.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (userIdRef.current && projectIdRef.current) {
                          trackDocumentView(userIdRef.current, projectIdRef.current, pageData.pdfUrl, 'view')
                        }
                      }}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-neon-orange to-neon-pink text-white rounded-lg hover:shadow-glow-lg transition-all"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Open PDF
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {pageData.type === 'qr-links-ar-video' && (
          <div className="space-y-6">
            {/* AR Video */}
            {pageData.videoUrl && (
              <div className="backdrop-blur-sm rounded-xl border border-slate-600/30 p-6 mb-6" style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}>
                <div className="flex items-center mb-4">
                  <Sparkles className="w-6 h-6 mr-2" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                  <h2 className="text-xl font-semibold text-slate-100">AR Experience Video</h2>
                </div>
                <video
                  src={pageData.videoUrl}
                  controls
                  className="w-full rounded-lg"
                />
              </div>
            )}

            {/* Contact Info + Social Links */}
            {(() => {
              const { contactInfo, social } = splitSocialLinks(pageData.socialLinks)
              const hasContact = Object.keys(contactInfo).length > 0
              const hasSocial = Object.keys(social).length > 0
              
              if (!hasContact && !hasSocial) return null
              
              return (
                <div className="space-y-6">
                  {/* Contact Information */}
                  {hasContact && (
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100 mb-4">Contact Information</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(contactInfo).map(([platform, value]) => {
                          const Icon = getSocialIcon(platform)
                          const href = platform === 'whatsappNumber' 
                            ? `https://wa.me/${String(value).replace(/\D/g, '')}`
                            : `tel:${String(value).replace(/\s+/g, '')}`
                          return (
                            <a
                              key={platform}
                              href={href}
                              onClick={async (e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                
                                if (userIdRef.current && projectIdRef.current) {
                                  try {
                                    if (platform === 'contactNumber') {
                                      console.log('📞 Tracking contact click:', { userId: userIdRef.current, projectId: projectIdRef.current, value })
                                      await trackContactClick(userIdRef.current, projectIdRef.current, value, 'contactNumber')
                                    } else if (platform === 'whatsappNumber') {
                                      console.log('💬 Tracking WhatsApp click:', { userId: userIdRef.current, projectId: projectIdRef.current, value })
                                      await trackWhatsAppClick(userIdRef.current, projectIdRef.current, value)
                                    }
                                    await new Promise(resolve => setTimeout(resolve, 100))
                                  } catch (error) {
                                    console.error('Failed to track click:', error)
                                  }
                                }
                                
                                window.location.href = href
                              }}
                              className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                              style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                            >
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-all" style={{ background: 'var(--theme-card, rgba(148, 163, 184, 0.2))' }}>
                                <Icon className="w-6 h-6" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                              </div>
                              <div className="flex-1">
                                <p className="text-slate-100 font-semibold">{getPlatformLabel(platform)}</p>
                                <p className="text-sm text-slate-400 truncate">{value}</p>
                              </div>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Social Links */}
                  {hasSocial && (
                    <div>
                      <h2 className="text-xl font-semibold text-slate-100 mb-4">Social Links</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(social).map(([platform, value]) => {
                          const Icon = getSocialIcon(platform)
                          const href = String(value).startsWith('http://') || String(value).startsWith('https://')
                            ? value
                            : `https://${value}`
                          return (
                            <a
                              key={platform}
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center p-4 backdrop-blur-sm rounded-xl border border-slate-600/30 transition-all duration-300 group"
                              style={{ backgroundColor: 'var(--theme-card, rgba(148, 163, 184, 0.1))' }}
                            >
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-all" style={{ background: 'var(--theme-card, rgba(148, 163, 184, 0.2))' }}>
                                <Icon className="w-6 h-6" style={{ color: 'var(--theme-primary, #A855F7)' }} />
                              </div>
                              <div className="flex-1">
                                <p className="text-slate-100 font-semibold">{getPlatformLabel(platform)}</p>
                                <p className="text-sm text-slate-400 truncate">{value}</p>
                              </div>
                              <ExternalLink className="w-5 h-5 text-slate-400 transition-colors" style={{ color: 'var(--theme-secondary, #EC4899)' }} />
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}
        </div>
      </div>
    </ThemeRenderer>
  )
}

export default LandingPage

