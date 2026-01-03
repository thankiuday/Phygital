/**
 * QR-Link Page
 * Simple QR code creation with single link
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateQRCode, uploadAPI } from '../../utils/api'
import { generateAdvancedQRCode, downloadQRCode } from '../../utils/qrGenerator'
import { useAuth } from '../../contexts/AuthContext'
import { generateHumanReadableCampaignName } from '../../utils/campaignNameGenerator'
import QRDesignCustomizer from '../../components/QR/QRDesignCustomizer'
import { 
  QrCode, 
  Link as LinkIcon,
  Tag,
  CheckCircle,
  ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../../components/UI/LoadingSpinner'
import PhygitalizedFooter from '../../components/Phygitalized/PhygitalizedFooter'

const QRLinkPage = () => {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [campaignName, setCampaignName] = useState('')
  const [url, setUrl] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [projectId, setProjectId] = useState(null)
  const [qrDesign, setQrDesign] = useState(null)
  const [currentStep, setCurrentStep] = useState(1) // Wizard step: 1 = Enter details, 2 = Design QR
  const [qrGenerated, setQrGenerated] = useState(false) // Track if QR was successfully generated

  // Auto-generate campaign name based on username with uniqueness check
  useEffect(() => {
    if (user?.username && !campaignName) {
      const existingProjects = user?.projects || []
      const autoName = generateHumanReadableCampaignName(user.username, 'qr-link', existingProjects)
      setCampaignName(autoName)
    }
  }, [user?.username, campaignName, user?.projects])

  const handleContinueToDesign = () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }
    if (!url.trim()) {
      toast.error('Please enter a URL')
      return
    }
    
    // Validate URL format
    try {
      const finalUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`
      new URL(finalUrl)
      setCurrentStep(2)
    } catch {
      toast.error('Please enter a valid URL')
    }
  }

  const handleGenerate = async () => {
    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name')
      return
    }

    if (!url.trim()) {
      toast.error('Please enter a URL')
      return
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      // If URL doesn't have protocol, add https://
      const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`
      setUrl(urlWithProtocol)
      
      try {
        new URL(urlWithProtocol)
      } catch {
        toast.error('Please enter a valid URL')
        return
      }
    }

    try {
      setIsGenerating(true)
      const finalUrl = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`
      
      // Create campaign/project in backend first to get projectId
      let savedProjectId = null
      try {
        const projectResponse = await uploadAPI.createProject({
          name: campaignName.trim(),
          description: `QR-Link campaign: ${finalUrl}`,
          campaignType: 'qr-link',
          phygitalizedData: {
            targetUrl: finalUrl,
            qrDesign: qrDesign
            // QR code URL will be set after generation
          }
        })
        
        if (projectResponse.data?.data?.user) {
          updateUser(projectResponse.data.data.user)
        }
        
        if (projectResponse.data?.data?.project?.id) {
          savedProjectId = projectResponse.data.data.project.id
          setProjectId(savedProjectId)
        } else {
          throw new Error('Failed to get project ID from response')
        }
      } catch (projectError) {
        console.error('Error creating campaign:', projectError)
        toast.error('Failed to create campaign. Please try again.')
        setIsGenerating(false)
        return
      }

      // Generate redirect URL pointing to our branded redirect page
      const redirectUrl = `${window.location.origin}/#/phygitalized/redirect/${savedProjectId}`
      
      // Generate QR code with redirect URL (not the target URL directly)
      let qrDataUrl
      if (qrDesign) {
        qrDataUrl = await generateAdvancedQRCode(redirectUrl, qrDesign, 512)
      } else {
        qrDataUrl = await generateQRCode(redirectUrl, { size: 512 })
      }
      setQrCodeUrl(qrDataUrl)
      
      // Update project with the generated QR code URL
      try {
        await uploadAPI.updateProject(savedProjectId, {
          phygitalizedData: {
            targetUrl: finalUrl,
            qrCodeUrl: qrDataUrl,
            qrDesign: qrDesign
          }
        })
      } catch (updateError) {
        console.error('Error updating project with QR code:', updateError)
        // Continue even if update fails - QR code is still generated
      }
      
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
          Single Link QR
        </h1>
        <p className="text-slate-300">
          Create a simple QR code that points to a single link
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
          <div className="card-glass rounded-2xl shadow-dark-large border border-slate-600/30 p-4 sm:p-6 lg:p-8">
            <div className="mb-6 pb-4 border-b border-slate-600/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div className="flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-100 flex items-center">
                    <LinkIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-neon-blue" />
                    Step 1: Enter Your Link
                  </h2>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Provide the campaign name and URL for your QR code
                  </p>
                </div>
                <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700 self-start sm:self-auto">
                  Step 1 of 2
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
                  placeholder="Enter campaign name (e.g., Summer Sale 2024)"
                  className="w-full px-4 py-3 sm:py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent touch-manipulation"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleContinueToDesign()
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  URL *
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com or example.com"
                  className="w-full px-4 py-3 sm:py-3 bg-slate-800/50 border border-slate-600/50 rounded-lg text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-neon-blue focus:border-transparent touch-manipulation"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleContinueToDesign()
                    }
                  }}
                />
              </div>

              <button
                onClick={handleContinueToDesign}
                disabled={!campaignName.trim() || !url.trim()}
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
              previewUrl={url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`}
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
                      setCurrentStep(1)
                      setCampaignName('')
                      setUrl('')
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
                    if (!url.trim()) {
                      toast.error('Please enter a URL')
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
              Enter a campaign name and URL for your QR code
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
      <PhygitalizedFooter />
    </div>
  )
}

export default QRLinkPage

