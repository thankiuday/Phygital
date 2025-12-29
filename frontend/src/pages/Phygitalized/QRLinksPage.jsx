/**
 * QR-Links Page
 * QR code pointing to a landing page with multiple social links
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Share2,
  Link as LinkIcon,
  Plus,
  X,
  ExternalLink,
  Tag
} from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import SocialLinksInput from '../../components/Phygitalized/SocialLinksInput'

const QRLinksPage = () => {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [campaignName, setCampaignName] = useState('')
  const [socialLinks, setSocialLinks] = useState({})
  const [customLinks, setCustomLinks] = useState([])
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
      const autoName = generateHumanReadableCampaignName(user.username, 'QR Links', existingProjects)
      setCampaignName(autoName)
    }
  }, [user?.username, campaignName, user?.projects])

  const addCustomLink = () => {
    setCustomLinks([...customLinks, { id: Date.now(), label: '', url: '' }])
  }

  const removeCustomLink = (id) => {
    setCustomLinks(customLinks.filter(link => link.id !== id))
  }

  const updateCustomLink = (id, field, value) => {
    setCustomLinks(customLinks.map(link => 
      link.id === id ? { ...link, [field]: value } : link
    ))
  }

  const handleContinueToDesign = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    // Convert social links to array format
    // Exclude phone numbers (contactNumber, whatsappNumber) from links array
    const contactInfoKeys = new Set(['contactNumber', 'whatsappNumber'])
    const socialLinksArray = Object.entries(socialLinks)
      .filter(([key, value]) => {
        // Exclude contact info keys and empty values
        if (contactInfoKeys.has(key)) return false
        return value && value.trim() !== ''
      })
      .map(([key, value]) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
        url: value.startsWith('http://') || value.startsWith('https://') 
          ? value 
          : `https://${value}`
      }))
    
    // Combine social links and custom links
    const allLinks = [...socialLinksArray, ...customLinks]
    const validLinks = allLinks.filter(link => link.url && link.url.trim())
    
    if (validLinks.length === 0) {
      toast.error('Please add at least one link')
      return
    }

    // Create project immediately to get projectId for preview
    if (!projectId) {
      try {
        setIsGenerating(true)
        toast.loading('Preparing preview...', { id: 'preview-loading' })
        
        const projectResponse = await uploadAPI.createProject({
          name: campaignName.trim(),
          description: `QR-Links campaign with ${validLinks.length} link(s)`,
          campaignType: 'qr-links',
          phygitalizedData: {
            links: validLinks.map(link => ({
              label: link.label || 'Link',
              url: link.url.startsWith('http://') || link.url.startsWith('https://') 
                ? link.url 
                : `https://${link.url}`
            })),
            socialLinks: socialLinks
          }
        })
        
        if (projectResponse.data?.data?.user) {
          updateUser(projectResponse.data.data.user)
        }
        
        if (projectResponse.data?.data?.project?.id) {
          const createdProjectId = projectResponse.data.data.project.id
          setProjectId(createdProjectId)
          // Generate landing page URL for preview
          const previewLandingPageUrl = `${window.location.origin}/#/phygitalized/links/${createdProjectId}`
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

    // Convert social links to array format
    // Exclude phone numbers (contactNumber, whatsappNumber) from links array
    const contactInfoKeys = new Set(['contactNumber', 'whatsappNumber'])
    const socialLinksArray = Object.entries(socialLinks)
      .filter(([key, value]) => {
        // Exclude contact info keys and empty values
        if (contactInfoKeys.has(key)) return false
        return value && value.trim() !== ''
      })
      .map(([key, value]) => ({
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim(),
        url: value.startsWith('http://') || value.startsWith('https://') 
          ? value 
          : `https://${value}`
      }))
    
    // Combine social links and custom links
    const allLinks = [...socialLinksArray, ...customLinks]
    const validLinks = allLinks.filter(link => link.url && link.url.trim())
    
    if (validLinks.length === 0) {
      toast.error('Please add at least one link')
      return
    }

    try {
      setIsGenerating(true)
      
      // In a real implementation, you would:
      // 1. Create a landing page with these links
      // 2. Get the URL of that landing page
      // 3. Generate QR code for that URL
      
      // For now, we'll create a data URL that represents the landing page
      // In production, this would be stored in the backend and return a real URL
      const landingPageData = {
        type: 'qr-links',
        links: validLinks.map(link => ({
          label: link.label || 'Link',
          url: link.url.startsWith('http://') || link.url.startsWith('https://') 
            ? link.url 
            : `https://${link.url}`
        }))
      }
      
      // Use existing projectId if available (created in handleContinueToDesign), otherwise create new project
      let createdProjectId = projectId
      if (!createdProjectId) {
        try {
          const projectResponse = await uploadAPI.createProject({
            name: campaignName.trim(),
            description: `QR-Links campaign with ${validLinks.length} link(s)`,
            campaignType: 'qr-links',
            phygitalizedData: {
              links: validLinks.map(link => ({
                label: link.label || 'Link',
                url: link.url.startsWith('http://') || link.url.startsWith('https://') 
                  ? link.url 
                  : `https://${link.url}`
              })),
              socialLinks: socialLinks
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
      }

      // Generate landing page URL using projectId
      const landingPageUrl = `${window.location.origin}/#/phygitalized/links/${createdProjectId}`
      if (!landingPageUrl || landingPageUrl !== landingPageUrl) {
        setLandingPageUrl(landingPageUrl)
      }
      
      // Generate QR code with design options if available
      let qrDataUrl
      if (qrDesign) {
        qrDataUrl = await generateAdvancedQRCode(landingPageUrl, qrDesign, 512)
      } else {
        qrDataUrl = await generateQRCode(landingPageUrl, { size: 512 })
      }
      setQrCodeUrl(qrDataUrl)
      
      // Update project with QR code URL and landing page URL
      let savedProjectId = createdProjectId
      try {
        await phygitalizedAPI.updateCampaign(createdProjectId, {
          qrCodeUrl: qrDataUrl,
          landingPageUrl: landingPageUrl,
          phygitalizedData: {
            links: validLinks.map(link => ({
              label: link.label || 'Link',
              url: link.url.startsWith('http://') || link.url.startsWith('https://') 
                ? link.url 
                : `https://${link.url}`
            })),
            socialLinks: socialLinks,
            qrDesign: qrDesign
          }
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
        console.error('Error updating campaign with QR code:', updateError)
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
          QR-Links
        </h1>
        <p className="text-sm sm:text-base text-slate-300">
          Create a QR code that points to a landing page with multiple social links
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
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="card-header">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-100 flex items-center">
                    <Share2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-neon-blue" />
                    Step 1: Enter Your Links
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Provide the campaign name and add your social links
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
                  placeholder="Enter campaign name (e.g., Social Media Hub)"
                  className="w-full px-4 py-3 sm:py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent touch-manipulation"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleContinueToDesign()
                    }
                  }}
                />
              </div>

              {/* Social Links Input */}
              <SocialLinksInput
                value={socialLinks}
                onChange={setSocialLinks}
                showSelection={true}
              />

              {/* Custom Links */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Custom Links
                </label>
                {customLinks.map((link) => (
                  <div key={link.id} className="flex flex-col sm:flex-row gap-2 sm:space-x-2 mb-2">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateCustomLink(link.id, 'label', e.target.value)}
                      placeholder="Link label"
                      className="flex-1 px-4 py-3 sm:py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent touch-manipulation"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateCustomLink(link.id, 'url', e.target.value)}
                      placeholder="URL"
                      className="flex-1 px-4 py-3 sm:py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent touch-manipulation"
                    />
                    <button
                      onClick={() => removeCustomLink(link.id)}
                      className="p-3 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors touch-manipulation min-h-[44px] sm:min-h-0 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addCustomLink}
                  className="w-full btn-secondary flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Link
                </button>
              </div>

              <button
                onClick={handleContinueToDesign}
                disabled={!campaignName.trim()}
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
              previewUrl={landingPageUrl || (projectId ? `${window.location.origin}/#/phygitalized/links/${projectId}` : '')}
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
                      className="w-full btn-secondary flex items-center justify-center"
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
                      setSocialLinks({})
                      setCustomLinks([])
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
              Enter a campaign name and add your social media links and other URLs
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

export default QRLinksPage

